# -*- coding: utf-8 -*-
"""
자동 채우기(autofill) — "노동↓" + "정직성".

사용자가 안 그린 글자/자모를, 그린 획에서 추출한 스타일(굵기/기울기/크기)에
맞춘 **공개 베이스 폰트**(라틴=Recursive, 한글=Pretendard)로 자동 채워 완성도를
높인다. 단 어떤 글자가 "내가 그림"인지 "자동 채움"인지 응답에서 구분해 정직하게
고지할 수 있게 한다.

[비용 가드] 로컬 fontTools 연산 + 디스크 캐시된 OFL 폰트만 사용한다.
외부 유료 API(LLM/이미지 생성) 호출이 전혀 없으며 운영 비용은 0이다. AI 미사용.

[정직성] 채운 글자는 "내가 그린 글씨"가 아니라 "내 획 스타일(굵기/기울기)에
맞춘 공개 폰트 글리프"다. 응답의 drawnChars/filledChars 로 구분된다.

스타일 추출(전통/통계):
  - slant(기울기): 그린 획 중 '세로에 가까운' 세그먼트들의 평균 기울기 각도.
  - weight(굵기): 사용자가 설정한 refine.nib 를 베이스 폰트 wght 축으로 매핑
    (nib 가 곧 펜 굵기이므로 가장 정직한 추정).
  - size(크기): 그린 글자들의 평균 잉크 높이 → 베이스 글리프를 같은 톤으로 스케일.
"""
from __future__ import annotations

import functools
import math
from dataclasses import dataclass
from typing import Dict, List, Optional, Sequence, Tuple

from fontTools.pens.basePen import BasePen
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

import handwriting as hw
from handwriting import (
    ASCENDER,
    CAP_HEIGHT,
    DESCENDER,
    NIB_HALF_MAX,
    NIB_HALF_MIN,
    Point,
    X_HEIGHT,
    _cell_to_font,
    _nib_half_width,
)

# 채울 수 있는 라틴 글자 + 공통 특수문자(프론트 SPECIAL_CHARS와 동일 집합).
# 안 그린 칸은 베이스 폰트(Recursive)의 해당 글리프로 채운다.
LATIN_FILL_CHARS = (
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    ".,!?:;'\"-()&@#"
)

# 굵기 추정용 기준 상수.
# 사람이 "보통 굵기"로 느끼는 획폭/잉크높이 비율(대략). 이 비율을 UI weight 400
# (Regular)에 대응시킨다. 그린 글자의 실제 비율이 이보다 작으면(가늘면) 가벼운
# weight, 크면 무거운 weight로 매핑한다.
_REF_THICKNESS_RATIO = 0.085   # half-width / ink-height ≈ 이 값을 Regular(400)로
# 비율→weight 매핑 시 1 단위 비율 변화에 대한 민감도(스케일). 경험적.
_THICKNESS_RATIO_SPAN = 0.085  # ±이 폭이면 weight 100..900 양끝에 도달
# 추정 weight 합리적 클램프(과도하게 가늘/굵지 않게).
_WEIGHT_MIN = 130.0
_WEIGHT_MAX = 820.0


@dataclass
class DrawnStyle:
    """그린 글리프들에서 추출한 스타일 통계."""
    slant_deg: float          # 기울기(도). 음수=오른쪽 기울임(라틴 slnt 규약과 동일).
    nib: float                # 펜 굵기(refine.nib, 0.2~1).
    avg_ink_height: float     # 평균 잉크 높이(폰트 유닛). 베이스 글리프 스케일 기준.
    glyph_count: int          # 통계에 쓰인 글리프 수.
    weight: float = 400.0     # 추정 UI weight(100~900). 실제 획 굵기 기반(아래 참고).


# ---------------- 스타일 추출 ----------------
def _segment_slant_deg(strokes: Sequence[Sequence[Point]]) -> Optional[float]:
    """
    한 글리프 획들에서 '세로에 가까운' 세그먼트들의 기울기 각도(도)를 추정.
    수직(↑)에서 좌우로 얼마나 기울었는지. 오른쪽 기울임이면 음수(라틴 slnt 규약).
    셀 좌표(y 하향)에서 계산하므로 폰트 y 상향 규약으로 부호를 맞춘다.
    """
    dxs = 0.0
    dys = 0.0
    for s in strokes:
        for i in range(1, len(s)):
            x0, y0 = s[i - 1]
            x1, y1 = s[i]
            dx = x1 - x0
            dy = y1 - y0  # 셀 좌표: 아래로 갈수록 +y
            seg = math.hypot(dx, dy)
            if seg < 1e-6:
                continue
            # '세로에 가까운' 세그먼트만(|dy| > |dx|): 기울기 신호가 분명.
            if abs(dy) <= abs(dx):
                continue
            # 항상 아래로 향하도록 정규화(부호 일관).
            if dy < 0:
                dx, dy = -dx, -dy
            dxs += dx
            dys += dy
    if dys < 1e-6:
        return None
    # 셀에서 아래로 내려갈 때 x가 +로 가면(왼쪽 위→오른쪽 아래) 이탤릭(오른쪽 기울임).
    # 폰트 slnt 규약: 오른쪽 기울임 = 음수 → -atan2.
    return -math.degrees(math.atan2(dxs, dys))


def _glyph_ink_height(strokes: Sequence[Sequence[Point]]) -> Optional[float]:
    """한 글리프의 잉크(중심선) 세로 범위를 폰트 유닛으로 반환(점이 2개 미만이면 None)."""
    ys = [
        _cell_to_font((float(x), float(y)))[1]
        for s in strokes
        for (x, y) in s
    ]
    if len(ys) < 2:
        return None
    return max(ys) - min(ys)


def _ratio_to_weight(ratio: float) -> float:
    """
    실제 획폭/잉크높이 비율 → UI weight(100~900) 추정.
    기준 비율(_REF_THICKNESS_RATIO)을 Regular(400)에 대응시키고, 비율이
    ±_THICKNESS_RATIO_SPAN 만큼 벗어나면 양끝(100/900)에 가깝게 선형 매핑.
    가는 획(작은 비율) → 가벼운 weight, 굵은 획 → 무거운 weight.
    """
    if _THICKNESS_RATIO_SPAN <= 1e-9:
        return 400.0
    # 기준 대비 정규화(-1..+1 근방)를 400±400로 매핑.
    norm = (ratio - _REF_THICKNESS_RATIO) / _THICKNESS_RATIO_SPAN
    return 400.0 + norm * 400.0


def _estimate_weight(nib: float, heights: Sequence[float]) -> float:
    """
    그린 글자의 **실제 획 굵기**를 추정해 UI weight(100~900)로 매핑.

    획폭(half-width)은 nib(펜 굵기)에서 오고, 사람이 느끼는 굵기는 그
    획폭을 글자 크기(잉크 높이)로 나눈 *상대 비율*이다. 같은 nib라도 글자를
    크게 그리면 가늘어 보이고 작게 그리면 굵어 보인다. 그래서 단순 nib→weight
    대신 (half-width / ink-height) 비율을 weight로 매핑해, 가는 a·e·o를
    그렸을 때 채움 글자도 비슷하게 가늘어지도록 한다.

    글자가 없거나 높이를 못 구하면(가로획만 등) nib 단독 매핑으로 폴백.
    drawn 글자가 1~3자로 적어도 비율 평균이라 안정적이다.
    """
    half = _nib_half_width(nib)  # 폰트 유닛(NIB_HALF_MIN..MAX)
    valid = [h for h in heights if h and h > 1e-3]
    if not valid:
        # 잉크 높이 추정 불가 → nib 단독(기존 동작) 매핑.
        t = (max(0.2, min(1.0, nib)) - 0.2) / 0.8
        return 100.0 + t * 800.0
    avg_h = sum(valid) / len(valid)
    ratio = half / avg_h
    w = _ratio_to_weight(ratio)
    return max(_WEIGHT_MIN, min(_WEIGHT_MAX, w))


def extract_style(
    glyphs: Sequence[Tuple[str, Sequence[Sequence[Point]]]],
    nib: float,
) -> DrawnStyle:
    """
    그린 글리프들 → DrawnStyle(slant/nib/size/weight). 비AI 통계.
    slant: 글리프별 세로획 기울기의 평균(이상치 영향 줄이려 글리프 단위 평균).
    avg_ink_height: 셀→폰트 유닛 변환 후 글리프 잉크 높이의 평균.
    weight: **실제 획 굵기**(펜 반폭/잉크높이 비율) 기반 추정 UI weight.
            → 가늘게 그렸으면 가는 weight로 채움 베이스 폰트를 인스턴싱한다.
    """
    slants: List[float] = []
    heights: List[float] = []
    used = 0
    for ch, strokes in glyphs:
        if not strokes:
            continue
        used += 1
        sd = _segment_slant_deg(strokes)
        if sd is not None and math.isfinite(sd):
            # 과도한 값은 제한(±20도). 손떨림 이상치 완화.
            slants.append(max(-20.0, min(20.0, sd)))
        # 잉크 높이(폰트 유닛).
        h = _glyph_ink_height(strokes)
        if h is not None:
            heights.append(h)

    slant_deg = sum(slants) / len(slants) if slants else 0.0
    avg_h = sum(heights) / len(heights) if heights else float(CAP_HEIGHT)
    nib_c = max(0.2, min(1.0, nib))
    weight = _estimate_weight(nib_c, heights)
    return DrawnStyle(
        slant_deg=slant_deg,
        nib=nib_c,
        avg_ink_height=avg_h,
        glyph_count=used,
        weight=weight,
    )


def _nib_to_weight(nib: float) -> float:
    """refine.nib(0.2~1) → UI weight(100~900). 굵기를 베이스 폰트 굵기로 정직 매핑."""
    t = (max(0.2, min(1.0, nib)) - 0.2) / 0.8  # 0..1
    return 100.0 + t * 800.0


def _style_weight(style: DrawnStyle) -> float:
    """DrawnStyle의 추정 weight(없으면 nib 폴백)를 합리적 범위로 클램프."""
    w = getattr(style, "weight", None)
    if w is None or not math.isfinite(w):
        w = _nib_to_weight(style.nib)
    return max(_WEIGHT_MIN, min(_WEIGHT_MAX, float(w)))


# ---------------- 베이스 폰트 인스턴싱 + 글리프 추출 ----------------
@functools.lru_cache(maxsize=12)
def _instanced_bytes(base_font_path: str, wght_b: int, slnt_b: int, casl_pct: int) -> bytes:
    """
    (weight·slant·CASL) 버킷별 **인스턴싱 결과 폰트 바이트** — 캐시.

    [핵심 최적화] instantiateVariableFont 는 무겁다(특히 한글 Pretendard는 수천 글리프를
    인터폴레이션). 자동채움이 매 요청(키 입력마다) 이걸 반복하면 CPU/메모리가 폭주해
    느려지고 502(엔진 5xx)가 난다. weight/slant 를 버킷으로 묶어 결과 바이트를 캐시하면,
    그리기 반복·슬라이더 미세조작에도 같은 버킷이면 인스턴싱을 건너뛴다.
    casl_pct<0 이면 CASL 미적용(예: 한글 Pretendard).
    """
    import io

    data = _read_bytes(base_font_path)
    font = TTFont(io.BytesIO(data), recalcTimestamp=False)
    if "fvar" in font:
        available = {a.axisTag: (a.minValue, a.maxValue) for a in font["fvar"].axes}
        axis_values = {a.axisTag: a.defaultValue for a in font["fvar"].axes}
        if "wght" in available:
            lo, hi = available["wght"]
            t = (float(wght_b) - 100.0) / 800.0
            axis_values["wght"] = lo + max(0.0, min(1.0, t)) * (hi - lo)
        if "slnt" in available:
            lo, hi = available["slnt"]
            axis_values["slnt"] = max(lo, min(hi, float(slnt_b)))
        if casl_pct >= 0 and "CASL" in available:
            lo, hi = available["CASL"]
            axis_values["CASL"] = max(lo, min(hi, casl_pct / 100.0))
        instantiateVariableFont(font, axis_values, inplace=True)
    buf = io.BytesIO()
    font.save(buf)
    return buf.getvalue()


def _instance_latin(base_font_path: str, style: DrawnStyle) -> TTFont:
    """
    Recursive VF를 추출 스타일(weight/slant)로 인스턴싱한 정적 폰트(버킷 캐시 사용).
    UPM은 1000(손글씨와 동일)이라 좌표를 그대로 합칠 수 있다.
    매 요청 캐시된 바이트에서 새 TTFont를 로드 → 동시 추출에도 객체 공유 위험 없음.
    """
    import io

    wb = int(round(_style_weight(style) / 25.0) * 25)
    sb = int(round(max(-20.0, min(20.0, style.slant_deg))))
    data = _instanced_bytes(base_font_path, wb, sb, 35)
    return TTFont(io.BytesIO(data), recalcTimestamp=False)


def _read_bytes(path: str) -> bytes:
    with open(path, "rb") as f:
        return f.read()


def _extract_glyph(font: TTFont, glyphset, glyph_name: str):
    """베이스 폰트 글리프를 컴포지트까지 분해해 TTGlyph로 복제."""
    rec = DecomposingRecordingPen(glyphset)
    glyphset[glyph_name].draw(rec)
    pen = TTGlyphPen(None)
    rec.replay(pen)
    return pen.glyph()


@dataclass
class FilledGlyph:
    """자동 채운 한 글자(폰트 유닛 TTGlyph + 메트릭)."""
    char: str
    glyph: object
    advance: int
    lsb: int


def latin_fill_glyphs(
    base_font_path: str,
    style: DrawnStyle,
    skip_chars: set,
    spacing_units: int = 0,
) -> List[FilledGlyph]:
    """
    안 그린 라틴 글자(LATIN_FILL_CHARS - skip_chars)를 추출 스타일로 인스턴싱한
    Recursive 글리프로 채운다. 사용자 글리프(skip_chars)는 건드리지 않는다.

    반환: FilledGlyph 리스트(폰트 유닛, UPM 1000). 호출자가 glyf/cmap에 합친다.
    """
    font = _instance_latin(base_font_path, style)
    if "glyf" not in font:
        return []
    glyf = font["glyf"]
    cmap = font.getBestCmap()
    glyphset = font.getGlyphSet()
    hmtx = font["hmtx"]
    upem = float(font["head"].unitsPerEm) if "head" in font else 1000.0
    scale = 1000.0 / upem if upem > 0 else 1.0

    out: List[FilledGlyph] = []
    for ch in LATIN_FILL_CHARS:
        if ch in skip_chars:
            continue
        cp = ord(ch)
        if cp not in cmap:
            continue
        gname = cmap[cp]
        try:
            glyph = _extract_glyph(font, glyphset, gname)
        except Exception:
            continue
        if getattr(glyph, "numberOfContours", 0) <= 0:
            continue
        adv, lsb = hmtx[gname]
        # UPM 정규화(보통 1000이라 scale=1).
        if abs(scale - 1.0) > 1e-6:
            _scale_glyph(glyph, scale)
            adv = int(round(adv * scale))
            lsb = int(round(lsb * scale))
        adv = max(1, int(adv) + max(0, spacing_units))
        out.append(FilledGlyph(char=ch, glyph=glyph, advance=adv, lsb=int(lsb)))
    return out


def _scale_glyph(glyph, scale: float) -> None:
    """글리프 좌표를 균일 스케일(UPM 정규화용)."""
    if getattr(glyph, "numberOfContours", 0) <= 0:
        return
    coords = glyph.coordinates
    for i in range(len(coords)):
        x, y = coords[i]
        coords[i] = (round(x * scale), round(y * scale))


# ---------------- 한글: 베이스 폰트에서 자모 잉크 추출 ----------------
class _FlattenPen(BasePen):
    """
    글리프 외곽선을 곡선까지 평탄화해 contour별 폴리라인(점열)로 수집한다.
    베이스 폰트(Pretendard) 자모를 사용자 자모와 같은 '셀 정규화 폴리라인'으로
    바꿔, 조합 파이프라인(_to_quad_contour 등)이 동일하게 쓰게 한다.
    좌표는 입력 단위 그대로(호출자가 셀 정규화). 곡선은 일정 개수로 샘플링.
    """

    def __init__(self, glyphSet, steps: int = 8):
        super().__init__(glyphSet)
        self.contours: List[List[Point]] = []
        self._cur: List[Point] = []
        self._last: Optional[Point] = None
        self._steps = steps

    def _moveTo(self, p):
        if self._cur:
            self.contours.append(self._cur)
        self._cur = [p]
        self._last = p

    def _lineTo(self, p):
        self._cur.append(p)
        self._last = p

    def _curveToOne(self, c1, c2, p):
        # 3차 베지어 샘플링.
        p0 = self._last
        for k in range(1, self._steps + 1):
            t = k / self._steps
            mt = 1 - t
            x = (mt**3) * p0[0] + 3 * (mt**2) * t * c1[0] + 3 * mt * (t**2) * c2[0] + (t**3) * p[0]
            y = (mt**3) * p0[1] + 3 * (mt**2) * t * c1[1] + 3 * mt * (t**2) * c2[1] + (t**3) * p[1]
            self._cur.append((x, y))
        self._last = p

    def _qCurveToOne(self, c, p):
        # 2차 베지어 샘플링.
        p0 = self._last
        for k in range(1, self._steps + 1):
            t = k / self._steps
            mt = 1 - t
            x = (mt**2) * p0[0] + 2 * mt * t * c[0] + (t**2) * p[0]
            y = (mt**2) * p0[1] + 2 * mt * t * c[1] + (t**2) * p[1]
            self._cur.append((x, y))
        self._last = p

    def _closePath(self):
        if self._cur:
            self.contours.append(self._cur)
        self._cur = []

    def _endPath(self):
        self._closePath()


def hangul_fill_jamo_strokes(
    base_font_path: str,
    style: DrawnStyle,
    needed_jamo: set,
    skip_jamo: set,
) -> Dict[str, List[List[Point]]]:
    """
    안 그린 기본 자모(needed_jamo - skip_jamo)를 베이스 한글폰트(Pretendard)에서
    추출해 **셀 정규화(0..1, y 하향) 폴리라인 획**으로 반환한다.
    반환 형식은 사용자가 그린 자모 획(strokes)과 동일 → 기존 조합 파이프라인
    (_prepare_jamo_inks → _place_ink)이 사용자 자모와 똑같이 처리한다.

    호환 자모(ㄱ,ㄴ,ㅏ...)는 유니코드 호환 자모(U+3131~)로 cmap을 조회한다.
    각 자모는 자기 잉크 bbox를 0..1 셀로 정규화(여백 약간)해서, 배치 단계가
    사용자 자모처럼 균일 스케일+여백으로 칸에 안정 배치한다.
    """
    import io

    # 굵기(weight) 버킷별 인스턴싱 결과를 캐시(Pretendard 수천 글리프 인터폴레이션 반복 제거).
    # 한글은 slnt/CASL 축이 없으므로 slnt_b=0, casl_pct=-1.
    wb = int(round(_style_weight(style) / 25.0) * 25)
    data = _instanced_bytes(base_font_path, wb, 0, -1)
    font = TTFont(io.BytesIO(data), recalcTimestamp=False)

    cmap = font.getBestCmap()
    glyphset = font.getGlyphSet()

    out: Dict[str, List[List[Point]]] = {}
    for jamo in needed_jamo:
        if jamo in skip_jamo:
            continue
        cp = ord(jamo)  # 호환 자모 코드포인트(U+3131~U+3163)
        if cp not in cmap:
            continue
        try:
            pen = _FlattenPen(glyphset)
            glyphset[cmap[cp]].draw(pen)
        except Exception:
            continue
        contours = [c for c in pen.contours if len(c) >= 2]
        if not contours:
            continue
        strokes = _contours_to_cell_strokes(contours)
        if strokes:
            out[jamo] = strokes
    return out


# 베이스 자모를 셀로 정규화할 때의 여백(테두리). 사용자 자모와 시각 톤 통일.
_CELL_MARGIN = 0.12


def _contours_to_cell_strokes(contours: List[List[Point]]) -> List[List[Point]]:
    """
    폰트 유닛 contour들 → 셀 정규화(0..1, y 하향) 폴리라인 획.
    전체 contour들의 공통 bbox를 [margin, 1-margin] 셀에 균일 스케일로 맞춘다
    (종횡비 보존). 폰트 y 상향 → 셀 y 하향으로 뒤집는다.
    """
    xs = [x for c in contours for (x, _) in c]
    ys = [y for c in contours for (_, y) in c]
    if not xs or not ys:
        return []
    x0, x1 = min(xs), max(xs)
    y0, y1 = min(ys), max(ys)
    w = x1 - x0
    h = y1 - y0
    if w < 1e-6 and h < 1e-6:
        return []
    span = max(w, h)  # 종횡비 보존(긴 변 기준).
    avail = 1.0 - 2.0 * _CELL_MARGIN
    s = avail / span if span > 1e-6 else 1.0
    # 중앙 정렬 오프셋(셀 0..1 안에서).
    cx = (x0 + x1) / 2.0
    cy = (y0 + y1) / 2.0
    out: List[List[Point]] = []
    for c in contours:
        stroke: List[Point] = []
        for (px, py) in c:
            nx = 0.5 + (px - cx) * s
            # 폰트 y 상향 → 셀 y 하향: 위(큰 y)가 셀 0.
            ny = 0.5 - (py - cy) * s
            stroke.append((nx, ny))
        out.append(stroke)
    return out
