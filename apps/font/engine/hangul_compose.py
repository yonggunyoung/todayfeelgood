# -*- coding: utf-8 -*-
"""
한글 자모 손글씨 → 음절 "조합"(모아쓰기) — 비AI, 정직: 조합 글씨.

[비용 가드] 이 모듈은 로컬 fontTools + 표준 math만 사용한다.
외부 유료 API(LLM/이미지 생성 등) 호출이 전혀 없고, 운영 비용은 0이다.
handwriting.py 의 검증된 "획→곡선 외곽선" 파이프라인을 그대로 재사용한다.

정직성(핵심):
  - 사용자는 **기본 자모 24자**(자음 14 + 모음 10)만 그린다.
  - 음절은 그 낱자 글리프를 affine(scale+translate)으로 모아써서 "조합"한다.
  - 겹자모(ㄲ/ㅘ/ㅐ 등)는 기본 자모 조합으로 **근사**한다(예: ㄲ=ㄱ+ㄱ, ㅘ=ㅗ+ㅏ).
  - 완벽한 8벌 조판은 포기한다. "읽히는 수준"의 조합 글씨가 목표다.

파이프라인:
  text의 한글 음절 → 초/중/종 인덱스로 분해
    → 인덱스를 (그릴 수 있는) 기본 자모 char 시퀀스로 변환(겹자모 근사)
    → 각 자모의 그린 획을 handwriting 파이프라인으로 폰트 유닛 좌표화(정렬 없이)
    → 중성 모임유형(세로/가로/복합) + 받침 유무에 따라 박스 분할
    → 각 칸에 자모를 affine 배치(잉크 bbox 기준)
    → 음절 1글리프(여러 컨투어)로 합성 → cmap(음절 코드) 연결 → 폰트 bytes

좌표 규약:
  - 자모 입력 획은 셀 정규화(0..1, y 하향). handwriting._cell_to_font 로 폰트 유닛(y 상향).
  - 음절 박스는 폰트 유닛으로 0..CELL_WIDTH_UNITS (가로) / DESCENDER..ASCENDER (세로).
"""
from __future__ import annotations

import base64
import io
from dataclasses import dataclass
from typing import Dict, List, Sequence, Tuple

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont

import handwriting as hw
from handwriting import (
    ASCENDER,
    DESCENDER,
    LINE_GAP,
    UPM,
    Point,
    RefineParams,
    _FIXED_TIMESTAMP,
    _flavor_for_format,
    _nib_half_width,
    _prepare_strokes_font_units,
    _stroke_outline,
    _to_quad_contour,
)

FontFormat = hw.FontFormat
ALLOWED_FORMATS = hw.ALLOWED_FORMATS

# ---------------- 한글 분해 상수(조합용 자모 인덱스 순) ----------------
# 초성 19 (유니코드 표준 순서). 쌍자음은 기본 자모 조합으로 근사.
CHO_LIST = [
    "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ",
    "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
]
# 중성 21. 겹모음은 기본 모음 조합으로 근사.
JUNG_LIST = [
    "ㅏ", "ㅐ", "ㅑ", "ㅒ", "ㅓ", "ㅔ", "ㅕ", "ㅖ", "ㅗ", "ㅘ",
    "ㅙ", "ㅚ", "ㅛ", "ㅜ", "ㅝ", "ㅞ", "ㅟ", "ㅠ", "ㅡ", "ㅢ", "ㅣ",
]
# 종성 28 (0=받침없음). 겹받침은 기본 자모 조합으로 근사.
JONG_LIST = [
    "", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ",
    "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ",
    "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
]

# 그릴 수 있는 기본 자모(packages/core BASIC_JAMO 와 동일).
BASIC_CONSONANTS = ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"]
BASIC_VOWELS = ["ㅏ", "ㅑ", "ㅓ", "ㅕ", "ㅗ", "ㅛ", "ㅜ", "ㅠ", "ㅡ", "ㅣ"]
BASIC_JAMO = set(BASIC_CONSONANTS + BASIC_VOWELS)

# 겹자모/복합 모음 → 기본 자모 조합 근사(전부 BASIC_JAMO 원소로만 분해).
JAMO_DECOMPOSE: Dict[str, List[str]] = {
    # 쌍자음(초성/종성)
    "ㄲ": ["ㄱ", "ㄱ"],
    "ㄸ": ["ㄷ", "ㄷ"],
    "ㅃ": ["ㅂ", "ㅂ"],
    "ㅆ": ["ㅅ", "ㅅ"],
    "ㅉ": ["ㅈ", "ㅈ"],
    # 겹받침(종성)
    "ㄳ": ["ㄱ", "ㅅ"],
    "ㄵ": ["ㄴ", "ㅈ"],
    "ㄶ": ["ㄴ", "ㅎ"],
    "ㄺ": ["ㄹ", "ㄱ"],
    "ㄻ": ["ㄹ", "ㅁ"],
    "ㄼ": ["ㄹ", "ㅂ"],
    "ㄽ": ["ㄹ", "ㅅ"],
    "ㄾ": ["ㄹ", "ㅌ"],
    "ㄿ": ["ㄹ", "ㅍ"],
    "ㅀ": ["ㄹ", "ㅎ"],
    "ㅄ": ["ㅂ", "ㅅ"],
    # 겹모음(중성) — 단모음/이중모음 조합으로 근사
    "ㅐ": ["ㅏ", "ㅣ"],
    "ㅒ": ["ㅑ", "ㅣ"],
    "ㅔ": ["ㅓ", "ㅣ"],
    "ㅖ": ["ㅕ", "ㅣ"],
    "ㅘ": ["ㅗ", "ㅏ"],
    "ㅙ": ["ㅗ", "ㅏ", "ㅣ"],
    "ㅚ": ["ㅗ", "ㅣ"],
    "ㅝ": ["ㅜ", "ㅓ"],
    "ㅞ": ["ㅜ", "ㅓ", "ㅣ"],
    "ㅟ": ["ㅜ", "ㅣ"],
    "ㅢ": ["ㅡ", "ㅣ"],
}

# 가로모음(초성 위 + 중성 아래). 나머지 단모음은 세로모음.
HORIZONTAL_VOWELS = {"ㅗ", "ㅛ", "ㅜ", "ㅠ", "ㅡ"}
# 복합(섞임) 모음: 가로요소+세로요소 결합.
COMPLEX_VOWELS = {"ㅘ", "ㅙ", "ㅚ", "ㅝ", "ㅞ", "ㅟ", "ㅢ"}

# ---------------- 음절 박스 메트릭(폰트 유닛) ----------------
# 가로: 0..SYL_W. 세로: BASELINE 기준 위로 SYL_TOP, 아래로 SYL_BOT(받침 영역).
SYL_LEFT = 60
SYL_RIGHT = 940
SYL_W = SYL_RIGHT - SYL_LEFT
SYL_TOP = ASCENDER          # 800
SYL_BOTTOM = DESCENDER + 40  # -160 근처(받침 하한)
SYL_H = SYL_TOP - SYL_BOTTOM

# 음절 advance(전각에 가깝게, spacing 반영).
SYL_ADVANCE = 1000


@dataclass
class _Box:
    """음절 내 한 칸(폰트 유닛). 자모 잉크를 이 박스에 맞춰 넣는다."""
    x0: float
    y0: float  # 아래
    x1: float
    y1: float  # 위


# ---------------- 분해 ----------------
def decompose_syllable(ch: str) -> Tuple[str, str, str]:
    """한글 음절 → (초성, 중성, 종성) 호환 자모 문자. 종성 없으면 ''."""
    code = ord(ch)
    if not (0xAC00 <= code <= 0xD7A3):
        raise ValueError("한글 음절이 아닙니다.")
    s = code - 0xAC00
    cho = s // 588
    jung = (s // 28) % 21
    jong = s % 28
    return CHO_LIST[cho], JUNG_LIST[jung], JONG_LIST[jong]


def expand_jamo(jamo: str) -> List[str]:
    """겹자모/복합모음 → 기본 자모(BASIC_JAMO) 리스트로 근사. 기본 자모는 그대로."""
    if not jamo:
        return []
    return JAMO_DECOMPOSE.get(jamo, [jamo])


def required_basic_jamo(text: str) -> set:
    """text의 음절을 합성하는 데 필요한 기본 자모 집합(드로잉 가능 여부 점검용)."""
    need: set = set()
    for ch in text:
        if 0xAC00 <= ord(ch) <= 0xD7A3:
            cho, jung, jong = decompose_syllable(ch)
            for j in (cho, jung, jong):
                for b in expand_jamo(j):
                    need.add(b)
    return need


# ---------------- 자모 글리프(잉크) 준비 ----------------
@dataclass
class _JamoInk:
    """
    한 기본 자모의 **스켈레톤(중심선, 폰트 유닛)** + 중심선 bbox.

    [핵심] 외곽선(굵기)을 미리 굽지 않는다. 음절 배치 때 중심선만 칸에 맞춰
    scale/translate 하고, **굵기는 배치 후에 일정한 '같은 펜'으로 입힌다**
    (→ 칸 크기에 따라 획이 굵어졌다 가늘어졌다 하던 문제 제거).
    """
    strokes: List[List[Point]]
    x0: float
    y0: float
    x1: float
    y1: float


def _prepare_jamo_inks(
    jamo: Sequence[Tuple[str, Sequence[Sequence[Point]]]],
    refine: RefineParams,
) -> Dict[str, _JamoInk]:
    """
    그린 기본 자모 → {char: _JamoInk}. 외곽선 폴리곤(폰트 유닛)과 잉크 bbox를 미리 만든다.
    메트릭 정렬(_align_to_guides)은 자모엔 부적합하므로, straighten=0 으로 셀변환만 쓴다.
    (음절 배치 시 우리가 직접 affine으로 칸에 맞춘다.)
    """
    out: Dict[str, _JamoInk] = {}
    for ch, strokes in jamo:
        if ch not in BASIC_JAMO:
            continue
        if ch in out:
            continue
        # 자모는 셀 좌표 그대로(smoothing만), 메트릭 밴드 정렬 없이 폰트 유닛 변환.
        # _prepare_strokes_font_units 의 straighten/align 은 라틴 가이드를 쓰므로
        # ch=""(기타 밴드) 로 호출하되 straighten 효과만 약하게 받게 한다.
        prep_refine = RefineParams(
            smoothing=refine.smoothing,
            nib=refine.nib,
            taper=refine.taper,
            straighten=0.0,  # 자모 자체는 펴지/정렬하지 않음(배치는 우리가 함)
            spacing=refine.spacing,
        )
        font_strokes = _prepare_strokes_font_units(strokes, prep_refine, "")
        # 중심선만 보관(굵기는 배치 후 입힘). bbox 는 중심선 기준.
        sk: List[List[Point]] = []
        xs: List[float] = []
        ys: List[float] = []
        for s in font_strokes:
            pts = [(float(px), float(py)) for px, py in s]
            if len(pts) < 1:
                continue
            sk.append(pts)
            for px, py in pts:
                xs.append(px)
                ys.append(py)
        if not sk or not xs:
            continue
        out[ch] = _JamoInk(sk, min(xs), min(ys), max(xs), max(ys))
    return out


# 자모를 박스에 넣을 때 채우는 비율(여백 = 1-fill). 굵기 여백 포함이라 약간 크게.
PLACE_FILL = 0.92
# "같은 펜" 굵기 배율: 음절 안 자모는 낱자보다 작게 들어가므로, 펜 반경도 그만큼
# 줄여 일정하게 입힌다. 칸 크기와 무관하게 음절 전체가 한 굵기 → 손글씨 일관성.
WEIGHT_SCALE = 0.62


def _place_strokes(
    ink: _JamoInk,
    box: _Box,
    fill: float = PLACE_FILL,
    ax: str = "center",
    ay: str = "center",
) -> List[List[Point]]:
    """
    자모 **중심선**을 box 안에 균일 스케일(종횡비 보존)로 맞춰 정렬한다.

    굵기는 입히지 않는다(배치 후 음절 단위로 일정 굵기 적용). 균일 스케일만 쓰므로
    ㅡ/ㅣ/ㅇ 등의 모양이 늘어나 망가지지 않는다(개성/형태 보존). 가로로 납작하거나
    세로로 가는 자모는 단변이 0에 가까워 0으로 나눠지는 걸 막으려 단변을 1유닛으로 바닥.

    ax/ay: 박스 안 정렬("center"/"left"/"right"/"top"/"bottom"). 예: 세로모음 줄기를
    초성 쪽(왼쪽)에 붙여 초성↔모음 간격을 일정하게.
    """
    iw = max(ink.x1 - ink.x0, 1.0)
    ih = max(ink.y1 - ink.y0, 1.0)
    bw = box.x1 - box.x0
    bh = box.y1 - box.y0
    if bw < 1e-6 or bh < 1e-6:
        return [list(s) for s in ink.strokes]

    # 균일 스케일: 장변을 박스(여백 fill)에 맞춘다 — 비균일 왜곡 없음.
    s = min((bw * fill) / iw, (bh * fill) / ih)

    iw_s, ih_s = iw * s, ih * s
    # 정렬에 따른 목표 중심(스케일된 잉크 크기를 박스 안에 배치).
    if ax == "left":
        cx = box.x0 + iw_s / 2.0 + bw * (1.0 - fill) * 0.5
    elif ax == "right":
        cx = box.x1 - iw_s / 2.0 - bw * (1.0 - fill) * 0.5
    else:
        cx = (box.x0 + box.x1) / 2.0
    if ay == "top":
        cy = box.y1 - ih_s / 2.0 - bh * (1.0 - fill) * 0.5
    elif ay == "bottom":
        cy = box.y0 + ih_s / 2.0 + bh * (1.0 - fill) * 0.5
    else:
        cy = (box.y0 + box.y1) / 2.0
    icx = (ink.x0 + ink.x1) / 2.0
    icy = (ink.y0 + ink.y1) / 2.0
    out: List[List[Point]] = []
    for st in ink.strokes:
        out.append([((px - icx) * s + cx, (py - icy) * s + cy) for px, py in st])
    return out


# ---------------- 모아쓰기(박스 분할) ----------------
# ---- 모아쓰기 비율(전 모임유형 공통, 일관성 핵심) ----
# 받침이 차지하는 세로 비율(음절 전체 높이 T..B 중 아래쪽 밴드). 나머지가 초+중.
# (이전엔 baseline 위 비율로 잘못 잡아 받침이 초중성보다 더 커졌었음 → 전체 높이 기준으로 수정.)
JONG_BAND = 0.32
# 받침 폭(전각 대비) — 너무 퍼지지 않게 가운데로 모은다.
JONG_WIDTH = 0.78
# 받침 채움 비율(초중성보다 약간 작게 — 받침이 글자를 압도하지 않게).
JONG_FILL = 0.78
# 세로모음(ㅏ류): 초성 좌, 중성 우 — 좌우 분할선 위치.
VJUNG_SPLIT_X = 0.6
# 가로모음(ㅗ류): 초성 위, 중성 아래 — 상하 분할선 위치(윗블록 내).
HJUNG_SPLIT_Y = 0.54
# 곁(ㅣ) 칸 폭 비율(겹모음 ㅐ/ㅚ 등의 세로 ㅣ).
ITAIL_W = 0.16


def _layout_boxes(jung: str, has_jong: bool) -> Tuple[List[_Box], List[_Box], List[_Box]]:
    """
    중성 모임유형 + 받침 유무 → (초성 박스들, 중성 박스들, 종성 박스들).
    여러 박스인 경우 expand_jamo 로 펼친 낱자들을 순서대로 채운다.
    좌표는 폰트 유닛.

    [일관성 개선] 모임유형(세로/가로/복합)·받침 유무와 무관하게 동일한
    분할 비율(JONG_SPLIT_RATIO 등)을 써서 음절마다 초/중/종 크기가 들쭉날쭉
    하지 않게 한다. 또 칸들이 서로 겹치지 않게 경계를 명확히 나눠
    ('최' 등 복합모음+초성 겹침 방지) 읽힘을 높인다.
    """
    L, R = float(SYL_LEFT), float(SYL_RIGHT)
    T, B = float(SYL_TOP), float(SYL_BOTTOM)
    BASE = 0.0  # baseline

    # 받침 있으면 윗블록(초+중)은 위쪽 (1-JONG_BAND), 종성은 아래쪽 JONG_BAND 밴드.
    # 음절 전체 높이(T..B) 기준이라 받침이 초중성보다 커지지 않는다.
    if has_jong:
        top_b = T
        mid_b = B + JONG_BAND * (T - B)  # 윗블록 아래선(받침 위)
        jong_top = mid_b
        jong_bot = B
    else:
        top_b = T
        mid_b = B
    _ = BASE  # (baseline 참고용, 현재 분할은 전체 높이 기준)

    cho_boxes: List[_Box] = []
    jung_boxes: List[_Box] = []
    jong_boxes: List[_Box] = []

    is_horizontal = jung in HORIZONTAL_VOWELS
    is_complex = jung in COMPLEX_VOWELS

    if is_complex:
        # 복합모음(ㅘ/ㅚ/ㅝ 등 = 가로요소 + 세로요소[+ㅣ]).
        # 윗블록을 상/하로 나눠: 위=초성+세로요소(좌우), 아래=가로요소(전폭).
        # 이렇게 칸을 겹치지 않게 분리해 초성과 모음이 포개지지 않게 한다('최' 수정).
        h_split = mid_b + 0.46 * (top_b - mid_b)   # 가로요소(아래) ↔ 위 블록 경계
        v_split_x = L + 0.58 * (R - L)             # 위 블록 좌(초성) ↔ 우(세로요소)
        # 초성: 위 블록 좌측.
        cho_boxes.append(_Box(L, h_split, v_split_x, top_b))
        # 중성 칸 순서 = expand_jamo 순서(가로요소, 세로요소[, ㅣ]).
        jung_boxes.append(_Box(L, mid_b, R, h_split))                  # 가로요소(ㅗ/ㅜ/ㅡ) 전폭 하단
        jung_boxes.append(_Box(v_split_x, h_split, R, top_b))          # 세로요소(ㅏ/ㅓ/ㅣ) 우상
        jung_boxes.append(_Box(R - ITAIL_W * (R - L), h_split, R, top_b))  # 추가 ㅣ(있으면)
    elif is_horizontal:
        # 가로모음(ㅗ/ㅛ/ㅜ/ㅠ/ㅡ): 초성 위(전폭), 중성 아래(전폭).
        split = mid_b + HJUNG_SPLIT_Y * (top_b - mid_b)
        cho_boxes.append(_Box(L, split, R, top_b))
        jung_boxes.append(_Box(L, mid_b, R, split))
        # 가로모음이 expand 되면(거의 없음) 같은 칸 재사용.
        jung_boxes.append(_Box(L, mid_b, R, split))
    else:
        # 세로모음(ㅏ/ㅑ/ㅓ/ㅕ/ㅣ): 초성 좌, 중성 우.
        split = L + VJUNG_SPLIT_X * (R - L)
        cho_boxes.append(_Box(L, mid_b, split, top_b))
        jung_boxes.append(_Box(split, mid_b, R, top_b))
        # 세로모음 expand(ㅐ=ㅏ+ㅣ 등): ㅏ 우측 본체 + ㅣ 더 우측.
        jung_boxes.append(_Box(split, mid_b, split + 0.72 * (R - split), top_b))
        jung_boxes.append(_Box(R - ITAIL_W * (R - L), mid_b, R, top_b))

    if has_jong:
        # 종성: 가운데로 모은 폭(JONG_WIDTH), 하단 밴드. 겹받침이면 좌우로 분할.
        cxm = (L + R) / 2.0
        jw = JONG_WIDTH * (R - L)
        jl, jr = cxm - jw / 2.0, cxm + jw / 2.0
        jong_boxes.append(_Box(jl, jong_bot, jr, jong_top))            # 홑받침 가운데
        jong_boxes.append(_Box(jl, jong_bot, cxm, jong_top))           # 겹받침 좌
        jong_boxes.append(_Box(cxm, jong_bot, jr, jong_top))           # 겹받침 우

    return cho_boxes, jung_boxes, jong_boxes


def _fill_boxes(
    chars: List[str],
    boxes: List[_Box],
    inks: Dict[str, _JamoInk],
    fill: float = PLACE_FILL,
    ax: str = "center",
    ay: str = "center",
) -> Tuple[List[List[Point]], bool]:
    """
    펼친 낱자 chars 를 boxes 에 순서대로 배치. 모든 낱자가 그려져 있어야 성공.
    chars 가 1개면 단일 박스(첫 박스 전체)에, 2개면 분할 박스 사용 등.
    ax/ay 는 박스 내 정렬(예: 세로모음 줄기를 왼쪽=초성 쪽으로).
    반환: (배치된 **중심선들**, 모든 낱자 ink 가용 여부). 굵기는 음절 단위로 나중에 입힘.
    """
    out: List[List[Point]] = []
    if not chars:
        return out, True
    # 사용할 박스 선택: 낱자 수에 맞춰. 단일이면 첫(가장 큰) 박스.
    if len(chars) == 1:
        chosen = [boxes[0]]
    else:
        # 분할 박스(인덱스 1..)가 충분하면 그걸로, 아니면 첫 박스에 겹쳐.
        sub = boxes[1:]
        if len(sub) >= len(chars):
            chosen = sub[: len(chars)]
        else:
            chosen = [boxes[0]] * len(chars)
    for ch, box in zip(chars, chosen):
        ink = inks.get(ch)
        if ink is None:
            return out, False
        out.extend(_place_strokes(ink, box, fill, ax, ay))
    return out, True


# ---------------- 음절 합성 ----------------
def _compose_syllable_polys(
    ch: str, inks: Dict[str, _JamoInk], half: float, taper: float
) -> Tuple[List[List[Point]], bool]:
    """
    한 음절 → 배치된 외곽선 폴리곤들. 필요한 기본 자모가 없으면 (.., False).

    [핵심] 자모 중심선을 칸에 맞춰 배치한 뒤, **음절 전체를 한 굵기(half_eff)** 로
    외곽선화한다. 칸 크기와 무관하게 같은 펜이라 획 굵기가 들쭉날쭉하지 않다.
    """
    cho, jung, jong = decompose_syllable(ch)
    cho_chars = expand_jamo(cho)
    jung_chars = expand_jamo(jung)
    jong_chars = expand_jamo(jong) if jong else []

    cho_boxes, jung_boxes, jong_boxes = _layout_boxes(jung, bool(jong))

    # 세로모음(ㅏ류)은 초성 우측에 모음이 오므로, 초성은 오른쪽(모음 쪽)·모음 줄기는
    # 왼쪽(초성 쪽)으로 붙여 초성↔모음 간격을 일정하게(떨어져 보이던 문제 완화).
    is_vert = (jung not in HORIZONTAL_VOWELS) and (jung not in COMPLEX_VOWELS)
    cho_ax = "center"
    jung_ax = "left" if is_vert else "center"

    skeletons: List[List[Point]] = []
    p, ok = _fill_boxes(cho_chars, cho_boxes, inks, ax=cho_ax)
    if not ok:
        return [], False
    skeletons.extend(p)
    p, ok = _fill_boxes(jung_chars, jung_boxes, inks, ax=jung_ax)
    if not ok:
        return [], False
    skeletons.extend(p)
    if jong_chars:
        p, ok = _fill_boxes(jong_chars, jong_boxes, inks, fill=JONG_FILL)
        if not ok:
            return [], False
        skeletons.extend(p)

    # 같은 펜으로 굵기 입히기(일정) — 손글씨 일관성의 핵심.
    half_eff = max(1.0, half * WEIGHT_SCALE)
    polys: List[List[Point]] = []
    for st in skeletons:
        outline = _stroke_outline(list(st), half_eff, taper)
        if len(outline) >= 3:
            polys.append(outline)
    return polys, True


def _syllable_glyph(polys: List[List[Point]]):
    """배치된 폴리곤들 → TTGlyph(2차 베지어 컨투어)."""
    pen = TTGlyphPen(None)
    contours = 0
    for poly in polys:
        if len(poly) < 3:
            continue
        _to_quad_contour(poly, pen)
        contours += 1
    return pen.glyph(), contours


# ---------------- 폰트 빌드 ----------------
def build_hangul_font(
    jamo: Sequence[Tuple[str, Sequence[Sequence[Point]]]],
    text: str,
    refine: RefineParams,
    fmt: FontFormat = "woff",
    autofill: bool = False,
    base_font_path: str | None = None,
) -> Tuple[bytes, str, int, list, list]:
    """
    그린 기본 자모 + text → text에 등장하는 한글 음절만 합성한 폰트 bytes.

    autofill=True 이고 base_font_path 가 주어지면, text 합성에 필요한데 사용자가
    안 그린 기본 자모를, 그린 자모에서 추출한 스타일(굵기)에 맞춘 베이스 한글폰트
    (Pretendard)에서 가져와 조합에 사용한다 → 더 많은 음절을 완성.
    사용자가 그린 자모는 그대로 우선한다.

    [정직성] 반환의 drawn_jamo/filled_jamo 로 "내가 그림" vs "자동 채움"을 구분.
    반환: (font_bytes, font_family, syllable_count, drawn_jamo, filled_jamo).
    """
    if fmt not in ALLOWED_FORMATS:
        fmt = "woff"
    if not jamo:
        raise ValueError("그린 자모가 없습니다.")
    if not text or not text.strip():
        raise ValueError("합성할 텍스트가 없습니다.")

    inks = _prepare_jamo_inks(jamo, refine)
    if not inks:
        raise ValueError("유효한 기본 자모 글리프가 없습니다.")

    drawn_jamo = sorted(inks.keys())
    filled_jamo: list[str] = []

    # ── 자동 채우기: text 합성에 필요한데 안 그린 기본 자모를 베이스 폰트에서 채움 ──
    # [정직성] 채운 자모는 "내 글씨"가 아니라 "내 굵기에 맞춘 공개 폰트 자모".
    if autofill and base_font_path:
        try:
            import autofill as _af

            style = _af.extract_style(jamo, refine.nib)
            needed = required_basic_jamo(text)
            fill_strokes = _af.hangul_fill_jamo_strokes(
                base_font_path, style, needed, skip_jamo=set(inks.keys())
            )
            if fill_strokes:
                fill_inks = _prepare_jamo_inks(
                    list(fill_strokes.items()), refine
                )
                for ch, ink in fill_inks.items():
                    if ch in inks:  # 사용자 자모 우선(안전).
                        continue
                    inks[ch] = ink
                    filled_jamo.append(ch)
                filled_jamo.sort()
        except Exception:
            filled_jamo = []

    # text에서 합성할 음절 수집(중복 제거, 등장 순서 보존). 무료티어 가드: 상한.
    syllables: List[str] = []
    seen_syl: set = set()
    for ch in text:
        if 0xAC00 <= ord(ch) <= 0xD7A3 and ch not in seen_syl:
            seen_syl.add(ch)
            syllables.append(ch)
            if len(syllables) > hw.MAX_TOTAL_GLYPHS:
                raise ValueError(
                    f"음절 수가 상한({hw.MAX_TOTAL_GLYPHS})을 초과했습니다."
                )

    family = f"MyHangul-{_short_id(jamo, text)}"

    glyph_order = [".notdef", "space"]
    char_map: Dict[int, str] = {ord(" "): "space"}
    glyf: Dict[str, object] = {}
    advances: Dict[str, int] = {}
    lsbs: Dict[str, int] = {}

    spacing_units = int(round(refine.spacing * UPM))
    spacing_units = max(-int(0.05 * UPM), min(int(0.4 * UPM), spacing_units))

    glyf[".notdef"] = TTGlyphPen(None).glyph()
    advances[".notdef"] = 600
    lsbs[".notdef"] = 0

    glyf["space"] = TTGlyphPen(None).glyph()
    space_adv = int(round(0.32 * UPM)) + max(0, spacing_units)
    advances["space"] = space_adv
    lsbs["space"] = 0

    # "같은 펜" 굵기 기준(자모 준비 때와 동일한 nib 반경).
    half = _nib_half_width(refine.nib)

    count = 0
    for ch in syllables:
        polys, ok = _compose_syllable_polys(ch, inks, half, refine.taper)
        if not ok or not polys:
            # 필요한 기본 자모가 없으면 이 음절은 스킵(graceful).
            continue
        glyph, contours = _syllable_glyph(polys)
        if contours == 0:
            continue
        gname = f"uni{ord(ch):04X}"
        base = gname
        k = 1
        while gname in glyf:
            gname = f"{base}.{k}"
            k += 1
        glyf[gname] = glyph
        glyph_order.append(gname)
        char_map[ord(ch)] = gname
        # 한글은 전각 advance(고정) + spacing.
        adv = SYL_ADVANCE + max(0, spacing_units)
        advances[gname] = max(adv, 1)
        lsbs[gname] = 0
        count += 1

    if count == 0:
        raise ValueError("그린 자모로 합성할 수 있는 음절이 없습니다.")

    fb = FontBuilder(UPM, isTTF=True)
    fb.setupGlyphOrder(glyph_order)
    fb.setupCharacterMap(char_map)
    fb.setupGlyf(glyf)

    metrics = {name: (advances[name], lsbs.get(name, 0)) for name in glyph_order}
    fb.setupHorizontalMetrics(metrics)
    fb.setupHorizontalHeader(ascent=ASCENDER, descent=DESCENDER, lineGap=LINE_GAP)

    name_strings = {
        "familyName": family,
        "styleName": "Regular",
        "fullName": family,
        "psName": family.replace("-", ""),
        "version": "1.0",
        "uniqueFontIdentifier": f"{family};1.0",
        "copyright": "Composed from user-drawn jamo (조합 글씨). No AI.",
    }
    fb.setupNameTable(name_strings)
    fb.setupOS2(
        sTypoAscender=ASCENDER,
        sTypoDescender=DESCENDER,
        sTypoLineGap=LINE_GAP,
        usWinAscent=ASCENDER,
        usWinDescent=abs(DESCENDER),
        achVendID="MYHD",
    )
    fb.setupPost()

    font = fb.font
    if "head" in font:
        font["head"].modified = _FIXED_TIMESTAMP

    font.flavor = _flavor_for_format(fmt)
    buf = io.BytesIO()
    font.save(buf)
    return buf.getvalue(), family, count, drawn_jamo, filled_jamo


def _short_id(
    jamo: Sequence[Tuple[str, Sequence[Sequence[Point]]]], text: str
) -> str:
    """그린 자모 + text 기반 결정적 짧은 ID(재현성)."""
    import hashlib
    import struct

    h = hashlib.sha1()
    h.update(text.encode("utf-8"))
    for ch, strokes in jamo:
        h.update(ch.encode("utf-8"))
        for s in strokes:
            for x, y in s:
                h.update(struct.pack("<ff", round(float(x), 4), round(float(y), 4)))
    return h.hexdigest()[:8]


def build_hangul_font_base64(
    jamo: Sequence[Tuple[str, Sequence[Sequence[Point]]]],
    text: str,
    refine: RefineParams,
    fmt: FontFormat = "woff",
    autofill: bool = False,
    base_font_path: str | None = None,
) -> Tuple[str, str, int, list, list]:
    """build_hangul_font 결과를 base64로. (b64, family, count, drawn, filled)"""
    font_bytes, family, count, drawn, filled = build_hangul_font(
        jamo, text, refine, fmt, autofill, base_font_path
    )
    return base64.b64encode(font_bytes).decode("ascii"), family, count, drawn, filled
