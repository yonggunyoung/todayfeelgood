# -*- coding: utf-8 -*-
"""
폰트 변형 로직 (Phase 2, 전통/비AI 방식 = 기본 가변폰트 변형 + 절차적 펜 디스토션).

파이프라인:
  1) 베이스 가변폰트(라틴=Recursive / 한글=Pretendard VF) 로드.
  2) UI 파라미터를 폰트 실제 fvar 축 범위로 매핑해 인스턴싱(정적 TTF화).
     - weight(UI 100~900) → 폰트 wght 실제 범위로 **선형 매핑**(v2 버그 정정).
     - slant → slnt 축이 있으면 축, 없으면(한글) 합성 shear.
     - curvature → CASL, mono → MONO, cursive → CRSV (폰트에 있는 축만).
  3) 서브셋(라틴 charset / 한글 KS X 1001 2,350자 + ASCII).
  4) 정적 glyf 좌표 직접 변형(2단계: 결정적 효과 → 랜덤 지터):
     [1단계: 결정적·seed무관 효과 — 원본 좌표 기준]
     - roundness>0 : 인접 점 평균 쪽 약한 스무딩으로 모서리 둥글기 근사
     - contrast>0 : y에 비례한 가로 비대칭 스케일로 획 대비 근사(보수적 max 0.6)
     - waviness>0 : 규칙적 사인 물결 워프(dx=amp*sin(y*k), 시드 무관·결정적)
     - 합성 shear(slnt 축 없을 때) : x += y * tan(-slant)
     [2단계: 랜덤 효과 — 마지막에 별도 적용]
     - weirdness>0 : 시드 RNG 기반 점 지터 + 글자별 베이스라인 wobble(불규칙)
     · contrast·waviness는 지터 *전* 좌표로 계산되므로 seed에 불변(계약 보장).
     - letterSpacing : hmtx advanceWidth를 em 비율만큼 가감
  5) WOFF/WOFF2/TTF/OTF 인코딩 → base64.

[비용 가드] 모든 처리는 로컬 fontTools 연산이다. 외부 유료 API 호출이 전혀
없으며 비용은 0이다. 무작위는 표준 라이브러리 random만 사용(numpy 등 금지).
"""
from __future__ import annotations

import base64
import hashlib
import io
import math
import os
import random
import threading
from dataclasses import dataclass
from typing import Literal

from fontTools.ttLib import TTFont
from fontTools.subset import Subsetter, Options
from fontTools.varLib.instancer import instantiateVariableFont

from hangul_charset import ASCII_CHARS, HANGUL_SUBSET_TEXT

# 라틴 타깃 문자셋(계약 TARGET_CHARSET과 동일).
TARGET_CHARSET = (
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    "abcdefghijklmnopqrstuvwxyz"
    "0123456789"
)
# 공백 + 기본 구두점도 라틴 서브셋에 포함.
EXTRA_CHARS = " .,;:!?'\"-()"

FontFormat = Literal["woff", "woff2", "ttf", "otf"]
Script = Literal["latin", "hangul"]

# 허용 출력 포맷(계약 FULL_FORMATS와 동일). 상용화 P0: woff2/otf 추가.
ALLOWED_FORMATS = ("woff", "woff2", "ttf", "otf")

# 파라미터 허용 범위 (계약 PARAM_RANGES와 동일, 서버 방어용 클램프).
# (min, max, default)
# v4: 심화 컨트롤 — waviness/waveFreq/contrast/roundness 추가.
PARAM_RANGES = {
    "weight": (100.0, 900.0, 400.0),
    "slant": (-15.0, 0.0, 0.0),
    "curvature": (0.0, 1.0, 0.0),
    "mono": (0.0, 1.0, 0.0),
    "cursive": (0.0, 1.0, 0.0),
    "weirdness": (0.0, 100.0, 0.0),
    "seed": (0.0, 999999.0, 1.0),
    "letterSpacing": (-0.05, 0.6, 0.0),
    "waviness": (0.0, 1.0, 0.0),
    "waveFreq": (0.5, 6.0, 2.0),
    "contrast": (0.0, 1.0, 0.0),
    "roundness": (0.0, 1.0, 0.0),
}

# 재현성용 고정 타임스탬프(head.modified). fontTools mac epoch 기준 초.
# 2020-01-01 00:00:00 UTC 근방의 임의 고정값. 같은 입력 → 동일 바이트 보장.
_FIXED_TIMESTAMP = 3786825600


# ------------------- 베이스 폰트 bytes 메모리 캐시 (Dev B2) -------------------
# 매 요청마다 디스크에서 재파싱(TTFont(path))하던 것을 제거한다.
# 원본 폰트의 *직렬화된 bytes*를 (경로, mtime) 키로 메모리에 1회 캐시하고,
# 요청마다 io.BytesIO(cached_bytes)에서 파싱만 한다(디스크 I/O 제거).
# 파싱된 TTFont 객체 자체는 캐시하지 않는다 — 인스턴싱/서브셋이 inplace로
# 원본을 변형하므로 객체를 공유하면 오염되고, deepcopy는 비용이 더 크다.
# bytes에서의 파싱은 lazy(fontTools 기본)라 디스크 재오픈보다 빠르고 결정적이다.
_BASE_BYTES_CACHE: dict[str, tuple[float, bytes]] = {}
_BASE_BYTES_LOCK = threading.Lock()


def _read_base_font_bytes(base_font_path: str) -> bytes:
    """
    베이스 폰트의 원본 bytes를 메모리 캐시에서 반환(없으면 1회 읽어 캐시).
    파일 mtime이 바뀌면(폰트 교체) 캐시를 무효화한다.
    스레드풀(run_in_executor)에서 동시 호출되므로 락으로 보호.
    """
    try:
        mtime = os.path.getmtime(base_font_path)
    except OSError:
        # 경로 확인 실패 시 캐시 없이 직접 읽기 시도(예외는 상위로).
        with open(base_font_path, "rb") as f:
            return f.read()

    with _BASE_BYTES_LOCK:
        cached = _BASE_BYTES_CACHE.get(base_font_path)
        if cached is not None and cached[0] == mtime:
            return cached[1]

    # 락 밖에서 디스크 읽기(블로킹 I/O를 락 안에서 길게 잡지 않음).
    with open(base_font_path, "rb") as f:
        data = f.read()

    with _BASE_BYTES_LOCK:
        _BASE_BYTES_CACHE[base_font_path] = (mtime, data)
    return data


def _load_base_font(base_font_path: str) -> TTFont:
    """
    캐시된 원본 bytes에서 요청별 *사본* TTFont를 파싱해 반환.
    원본 bytes는 불변(읽기 전용)이며, 반환된 TTFont만 인스턴싱/서브셋한다.
    recalcTimestamp=False: 저장 시 head.modified를 현재시각으로 갱신하지 않음(재현성).
    """
    data = _read_base_font_bytes(base_font_path)
    return TTFont(io.BytesIO(data), recalcTimestamp=False)


def warm_font_cache(*base_font_paths: str) -> None:
    """startup 등에서 베이스 폰트 bytes를 미리 메모리에 적재(첫 요청 지연 제거)."""
    for p in base_font_paths:
        if not p:
            continue
        try:
            _read_base_font_bytes(p)
        except OSError:
            # 폰트 미준비(오프라인 등)면 첫 사용 시 다시 시도된다.
            pass

# 우리 파라미터 → 가변폰트 축 매핑(weight는 별도 선형 매핑 처리).
# 폰트에 있는 축만 적용한다(예: 한글 Pretendard는 wght만 → 나머지 무시).
# - slant   → slnt (축 없으면 합성 shear)
# - curvature → CASL, mono → MONO, cursive → CRSV
AXIS_MAP = {
    "slant": "slnt",
    "curvature": "CASL",
    "mono": "MONO",
    "cursive": "CRSV",
}


@dataclass
class FontParams:
    weight: float = 400.0
    slant: float = 0.0
    curvature: float = 0.0
    mono: float = 0.0
    cursive: float = 0.0
    weirdness: float = 0.0
    seed: int = 1
    letterSpacing: float = 0.0
    # v4 심화 컨트롤
    waviness: float = 0.0
    waveFreq: float = 2.0
    contrast: float = 0.0
    roundness: float = 0.0


def clamp_params(
    weight: float,
    slant: float,
    curvature: float,
    mono: float = 0.0,
    cursive: float = 0.0,
    weirdness: float = 0.0,
    seed: float = 1.0,
    letterSpacing: float = 0.0,
    waviness: float = 0.0,
    waveFreq: float = 2.0,
    contrast: float = 0.0,
    roundness: float = 0.0,
) -> FontParams:
    """입력 파라미터를 허용 범위로 강제(NaN/Inf/None 방어 포함)."""

    def c(v, key):
        lo, hi, default = PARAM_RANGES[key]
        try:
            v = float(v)
        except (TypeError, ValueError):
            v = default
        if not math.isfinite(v):  # NaN/Inf → 기본값
            v = default
        return min(hi, max(lo, v))

    return FontParams(
        weight=c(weight, "weight"),
        slant=c(slant, "slant"),
        curvature=c(curvature, "curvature"),
        mono=c(mono, "mono"),
        cursive=c(cursive, "cursive"),
        weirdness=c(weirdness, "weirdness"),
        seed=int(c(seed, "seed")),
        letterSpacing=c(letterSpacing, "letterSpacing"),
        waviness=c(waviness, "waviness"),
        waveFreq=c(waveFreq, "waveFreq"),
        contrast=c(contrast, "contrast"),
        roundness=c(roundness, "roundness"),
    )


def _build_font_family(params: FontParams, script: Script) -> str:
    """파라미터+스크립트 기반의 고유 패밀리명(자체 패밀리명으로 RFN 회피)."""
    sig = (
        f"{script}-{params.weight:.0f}-{params.slant:.0f}-{params.curvature:.2f}"
        f"-{params.mono:.2f}-{params.cursive:.2f}-{params.weirdness:.0f}"
        f"-{params.seed}-{params.letterSpacing:.2f}"
        f"-{params.waviness:.2f}-{params.waveFreq:.1f}"
        f"-{params.contrast:.2f}-{params.roundness:.2f}"
    )
    short = hashlib.sha1(sig.encode("utf-8")).hexdigest()[:8]
    return f"UserFont-{short}"


def _normalize_format(fmt: str | None) -> FontFormat:
    f = (fmt or "woff").lower()
    if f not in ALLOWED_FORMATS:
        return "woff"
    return f  # type: ignore[return-value]


def _flavor_for_format(out_format: FontFormat) -> str | None:
    """
    출력 포맷 → sfnt flavor.
    - woff  : flavor "woff"
    - woff2 : flavor "woff2" (brotli 압축, 의존성 이미 있음)
    - ttf/otf: None(= 비압축 sfnt). 확장자만 다르고 컨테이너는 sfnt 그대로.
      베이스가 glyf(TrueType)면 .otf로 내보내도 내부는 0x00010000 sfnt다.
    """
    if out_format == "woff":
        return "woff"
    if out_format == "woff2":
        return "woff2"
    return None  # ttf, otf


def _normalize_script(script: str | None) -> Script:
    s = (script or "latin").lower()
    if s not in ("latin", "hangul"):
        return "latin"
    return s  # type: ignore[return-value]


def _map_weight_to_axis(ui_weight: float, axis_lo: float, axis_hi: float) -> float:
    """
    UI weight(계약 100~900)를 베이스 폰트 wght 축의 실제 범위로 **선형 매핑**.
    예) Recursive wght 300~1000, Pretendard 45~930.
    UI 하단(가는 굵기)이 안 먹던 v2 버그를 정정한다.
    """
    ui_lo, ui_hi, _ = PARAM_RANGES["weight"]
    if ui_hi == ui_lo:
        return axis_lo
    t = (ui_weight - ui_lo) / (ui_hi - ui_lo)  # 0..1
    t = min(1.0, max(0.0, t))
    return axis_lo + t * (axis_hi - axis_lo)


# ------------------- glyf 좌표 직접 변형 -------------------

def _glyph_seed_rng(global_seed: int, glyph_name: str) -> random.Random:
    """글리프별 결정적 RNG. (seed, glyph_name) 해시로 같은 seed=같은 결과 보장."""
    h = hashlib.sha1(f"{global_seed}:{glyph_name}".encode("utf-8")).digest()
    # 앞 8바이트를 정수 시드로.
    seed_int = int.from_bytes(h[:8], "big")
    return random.Random(seed_int)


def _transform_glyf_coordinates(
    font: TTFont,
    *,
    shear: float,
    weirdness: float,
    seed: int,
    waviness: float = 0.0,
    wave_freq: float = 2.0,
    contrast: float = 0.0,
    roundness: float = 0.0,
) -> None:
    """
    정적 폰트의 glyf 좌표를 직접 변형한다(인스턴싱·서브셋 후 호출).
    - shear: 합성 기울기 계수(x += y * shear). slnt 축이 없을 때만 != 0.
    - weirdness: 0~100. 0이면 랜덤 손떨림 없음(정형).
        · 점 지터: 각 좌표를 시드 RNG로 ±jitter_amp units 이동(불규칙).
        · 베이스라인 wobble: 글자(글리프) 전체를 상하로 약간 오프셋.
    - waviness: 0~1. 규칙적 사인 물결 워프(weirdness의 랜덤과 직교, 결정적).
        · dx = amp * sin(2π * wave_freq * y / upem)  (세로를 따라 좌우로 휨)
        · 시드/랜덤 무관 — 같은 (waviness, wave_freq)면 항상 같은 파형.
        · weirdness와 둘 다 켜져도 waviness는 **지터 전 결정적 y**로 계산되므로
          seed에 영향받지 않는다(W4 수정).
    - contrast: 0~1. 획 대비 근사(진짜 모듈 대비 아님).
        · 글리프 가로 무게중심 기준 x를 y에 비례해 비대칭 스케일 → 위/아래
          가로획과 좌우 세로획의 굵기차를 모사. 가독 위해 max 0.6 수준 보수적.
    - roundness: 0~1. 끝/모서리 둥글기 가벼운 근사.
        · on-curve 점을 인접 점 쪽으로 약하게 끌어 모서리를 부드럽게(스무딩).
          진짜 베지어 코너 라운딩이 아닌 보수적 근사.
    표준 random만 사용. 같은 (seed, weirdness, shear, waviness, wave_freq,
    contrast, roundness) → 동일 결과(재현성). waviness/contrast/roundness는
    seed와 무관하게 결정적이다(weirdness>0이어도 불변 — 2단계 분리 적용).
    """
    if "glyf" not in font:
        return
    do_shear = abs(shear) > 1e-9
    do_weird = weirdness > 0.0
    do_wave = waviness > 0.0
    do_contrast = contrast > 0.0
    do_round = roundness > 0.0
    if not (do_shear or do_weird or do_wave or do_contrast or do_round):
        return

    glyf = font["glyf"]
    upem = float(font["head"].unitsPerEm) if "head" in font else 1000.0
    if upem <= 0:
        upem = 1000.0
    # em 1000 기준 스케일을 실제 upem에 맞춤(가변폰트 upem이 1000이 아닐 수 있음).
    em_scale = upem / 1000.0

    # 강도: weirdness 0~100을 units로. EM 1000 기준 대략적 손맛 스케일.
    w = weirdness / 100.0
    jitter_amp = 22.0 * w * em_scale       # 점 지터 최대 진폭(units)
    baseline_amp = 28.0 * w * em_scale     # 글자별 베이스라인 wobble 최대(units)

    # waviness: 사인 진폭(em 1000 기준 약 0~50 units). 주파수는 wave_freq(주기수).
    wave_amp = 50.0 * waviness * em_scale
    # 2π * wave_freq / upem (y 1 unit당 위상 증가). y가 0~upem이면 wave_freq 주기.
    wave_k = (2.0 * math.pi * wave_freq) / upem

    # contrast: 보수적으로 max 0.6 정도까지만 가로 스케일 차이를 준다.
    # y가 위(어센더)·아래(디센더)로 갈수록 가로폭을 줄여 가로획을 얇게 모사.
    contrast_strength = 0.6 * contrast

    # roundness: 인접 점 평균 쪽으로 끌어당기는 비율(0~약 0.35, 과하지 않게).
    round_factor = 0.35 * roundness

    glyph_order = font.getGlyphOrder()
    for glyph_name in glyph_order:
        glyph = glyf[glyph_name]
        if glyph.isComposite():
            # 컴포지트(합성) 글리프: 좌표 직접 변형은 컴포넌트 단위라 스킵(안전).
            # 베이스 글리프가 변형되면 컴포지트도 따라간다.
            continue
        if getattr(glyph, "numberOfContours", 0) <= 0:
            continue
        coords = glyph.coordinates
        n = len(coords)
        if n == 0:
            continue

        # contrast용 글리프 가로 무게중심(중심 기준 비대칭 스케일).
        cx = 0.0
        if do_contrast:
            cx = sum(float(p[0]) for p in coords) / n

        rng = _glyph_seed_rng(seed, glyph_name) if do_weird else None
        # 글자별 베이스라인 wobble(글리프 전체 수직 오프셋).
        baseline_dy = 0.0
        if do_weird and baseline_amp > 0:
            baseline_dy = rng.uniform(-baseline_amp, baseline_amp)

        # roundness: 스무딩은 원본 좌표 기준으로 계산해야 하므로 먼저 사본을 뜬다.
        # 윤곽(contour) 경계를 넘지 않도록 contour별로 순환 이웃을 쓴다.
        smoothed = None
        if do_round and round_factor > 0:
            orig = [(float(p[0]), float(p[1])) for p in coords]
            ends = glyph.endPtsOfContours or []
            smoothed = list(orig)
            start = 0
            for end in ends:
                clen = end - start + 1
                if clen >= 3:
                    for j in range(start, end + 1):
                        prev_i = start + (j - 1 - start) % clen
                        next_i = start + (j + 1 - start) % clen
                        px, py = orig[prev_i]
                        nxp, nyp = orig[next_i]
                        ox, oy = orig[j]
                        # 이웃 평균 쪽으로 round_factor만큼 끌어당김(약한 스무딩).
                        mx = (px + nxp) / 2.0
                        my = (py + nyp) / 2.0
                        smoothed[j] = (
                            ox + (mx - ox) * round_factor,
                            oy + (my - oy) * round_factor,
                        )
                start = end + 1

        for i in range(n):
            # 1단계: 결정적 효과(roundness → contrast → waviness → shear).
            #   contrast·waviness는 **원본(혹은 roundness만 반영된) 결정적 좌표**
            #   기준으로 계산한다. weirdness(랜덤 지터)는 아래 2단계에서 별도로
            #   적용하므로, seed가 달라져도 contrast·waviness 결과는 불변이다(W4).
            if smoothed is not None:
                nx, ny = smoothed[i]
            else:
                x, y = coords[i]
                nx, ny = float(x), float(y)

            if do_contrast:
                # 획 대비 근사: 중심 기준 가로 거리를, y가 중앙(0.5*upem)에서
                # 멀수록(위/아래 가로획 영역) 더 압축한다. 세로획(중앙 높이)은 유지.
                # y는 결정적 좌표(지터 전)라 seed 무관.
                yt = abs((ny / upem) - 0.5) * 2.0  # 0(중앙)~1(끝)
                scale = 1.0 - contrast_strength * yt
                nx = cx + (nx - cx) * scale

            if do_wave:
                # 규칙적 사인 물결: 결정적 y를 따라 좌우로 휜다(시드 무관·결정적).
                nx += wave_amp * math.sin(wave_k * ny)

            if do_shear:
                # 합성 shear는 결정적 y에 비례해 x 이동(시드 무관).
                nx += ny * shear

            # 2단계: weirdness(랜덤 지터)를 마지막에 별도 적용.
            #   결정적 효과 계산이 끝난 뒤이므로 contrast/waviness/shear에는
            #   전혀 영향을 주지 않는다(seed 불변성 보장).
            if do_weird:
                nx += rng.uniform(-jitter_amp, jitter_amp)
                ny += rng.uniform(-jitter_amp, jitter_amp)
                ny += baseline_dy

            coords[i] = (round(nx), round(ny))

        # 변형 후 bbox 재계산(렌더 정확성).
        try:
            glyph.recalcBounds(glyf)
        except Exception:
            pass


def _apply_letter_spacing(font: TTFont, letter_spacing_em: float) -> None:
    """
    letterSpacing(em 비율)을 hmtx advanceWidth에 가감해 글자 간격을 조정한다.
    em(unitsPerEm) 기준 비율 → units 변환. 음수면 좁게.
    공백(advance 0 제외) 포함 모든 글리프에 균일 적용. advance는 0 미만 방지.
    """
    if abs(letter_spacing_em) < 1e-9 or "hmtx" not in font or "head" not in font:
        return
    upem = font["head"].unitsPerEm or 1000
    delta = int(round(letter_spacing_em * upem))
    if delta == 0:
        return
    hmtx = font["hmtx"]
    for name in font.getGlyphOrder():
        try:
            adv, lsb = hmtx[name]
        except KeyError:
            continue
        new_adv = max(0, adv + delta)
        hmtx[name] = (new_adv, lsb)


# ------------------- 메인 생성 -------------------

def generate_font(
    base_font_path: str,
    weight: float,
    slant: float,
    curvature: float = 0.0,
    mono: float = 0.0,
    cursive: float = 0.0,
    weirdness: float = 0.0,
    seed: float = 1.0,
    letterSpacing: float = 0.0,
    waviness: float = 0.0,
    waveFreq: float = 2.0,
    contrast: float = 0.0,
    roundness: float = 0.0,
    fmt: str | None = "woff",
    script: str | None = "latin",
    image_png: str | None = None,  # 미사용(향후 스타일 추출 자리만 마련).
) -> tuple[bytes, str, FontParams, FontFormat, Script]:
    """
    베이스 가변폰트를 변형해 폰트 bytes를 만든다.
    반환: (font_bytes, font_family, applied_params, format, script)
    """
    out_format = _normalize_format(fmt)
    out_script = _normalize_script(script)
    params = clamp_params(
        weight, slant, curvature, mono, cursive, weirdness, seed, letterSpacing,
        waviness, waveFreq, contrast, roundness,
    )

    # 베이스 폰트는 메모리 캐시된 원본 bytes에서 요청별 사본으로 파싱한다(Dev B2).
    # 디스크 재오픈/재I/O 제거. 원본 캐시는 불변이며 아래 인스턴싱/서브셋은 사본에서만.
    # recalcTimestamp=False: 저장 시 head.modified를 현재시각으로 갱신하지 않게 한다
    # (재현성: 같은 입력 → 동일 바이트). 아래에서 modified를 고정값으로 덮는다.
    font = _load_base_font(base_font_path)

    synth_shear = 0.0  # 합성 shear 계수(slnt 축이 없을 때만 사용)

    if "fvar" in font:
        available = {a.axisTag: (a.minValue, a.maxValue) for a in font["fvar"].axes}
        defaults = {a.axisTag: a.defaultValue for a in font["fvar"].axes}

        axis_values: dict[str, float] = dict(defaults)

        # weight → wght : 폰트 실제 범위로 선형 매핑(v2 버그 정정).
        if "wght" in available:
            lo, hi = available["wght"]
            axis_values["wght"] = _map_weight_to_axis(params.weight, lo, hi)

        # 나머지 축: 폰트에 있는 축만 적용(범위 클램프).
        for our_key, axis_tag in AXIS_MAP.items():
            if axis_tag not in available:
                continue
            lo, hi = available[axis_tag]
            val = getattr(params, our_key)
            axis_values[axis_tag] = min(hi, max(lo, val))

        # slnt 축이 없으면(한글 등) 기울기를 합성 shear로 처리.
        if "slnt" not in available and abs(params.slant) > 1e-9:
            # slant는 음수(오른쪽). x += y * tan(-slant) → 오른쪽으로 기울임.
            synth_shear = math.tan(math.radians(-params.slant))

        # 모든 축 핀 → 정적 폰트(gvar/fvar 제거)로 서브셋 안정화.
        instantiateVariableFont(font, axis_values, inplace=True)

    # 서브셋: 스크립트별 텍스트.
    subset_text = (TARGET_CHARSET + EXTRA_CHARS) if out_script == "latin" else HANGUL_SUBSET_TEXT

    options = Options()
    # 서브셋 단계 flavor는 None으로 두고(비압축 sfnt 유지), 압축은 최종 save에서
    # 일괄 적용한다. woff2는 좌표 변형 *후*에 압축해야 하므로 여기선 압축하지 않음.
    options.flavor = None
    options.desubroutinize = True
    options.recalc_bounds = True
    subsetter = Subsetter(options=options)
    subsetter.populate(text=subset_text)
    subsetter.subset(font)

    # glyf 좌표 직접 변형(합성 shear + weirdness). 서브셋 후의 적은 글리프만 대상.
    _transform_glyf_coordinates(
        font,
        shear=synth_shear,
        weirdness=params.weirdness,
        seed=params.seed,
        waviness=params.waviness,
        wave_freq=params.waveFreq,
        contrast=params.contrast,
        roundness=params.roundness,
    )

    # 자간(hmtx) 조정.
    _apply_letter_spacing(font, params.letterSpacing)

    # 재현성: head.modified 타임스탬프를 고정한다(같은 입력 → 동일 바이트 보장).
    # fontTools는 저장 시 modified를 현재시각으로 갱신하므로 고정값으로 덮는다.
    if "head" in font:
        font["head"].modified = _FIXED_TIMESTAMP

    buf = io.BytesIO()
    # 포맷별 flavor: woff/woff2는 압축 컨테이너, ttf/otf는 비압축 sfnt(None).
    # woff2는 brotli 압축(의존성 이미 설치됨). 좌표 변형 후 마지막에 압축한다.
    font.flavor = _flavor_for_format(out_format)
    font.save(buf)
    font_bytes = buf.getvalue()

    family = _build_font_family(params, out_script)
    return font_bytes, family, params, out_format, out_script


def generate_font_base64(
    base_font_path: str,
    weight: float,
    slant: float,
    curvature: float = 0.0,
    mono: float = 0.0,
    cursive: float = 0.0,
    weirdness: float = 0.0,
    seed: float = 1.0,
    letterSpacing: float = 0.0,
    waviness: float = 0.0,
    waveFreq: float = 2.0,
    contrast: float = 0.0,
    roundness: float = 0.0,
    fmt: str | None = "woff",
    script: str | None = "latin",
    image_png: str | None = None,
) -> tuple[str, str, FontParams, FontFormat, Script]:
    """generate_font의 결과를 base64 문자열로 반환."""
    font_bytes, family, params, out_format, out_script = generate_font(
        base_font_path,
        weight,
        slant,
        curvature,
        mono,
        cursive,
        weirdness,
        seed,
        letterSpacing,
        waviness,
        waveFreq,
        contrast,
        roundness,
        fmt,
        script,
        image_png,
    )
    return (
        base64.b64encode(font_bytes).decode("ascii"),
        family,
        params,
        out_format,
        out_script,
    )
