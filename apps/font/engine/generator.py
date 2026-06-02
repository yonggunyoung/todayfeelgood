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
  4) 정적 glyf 좌표 직접 변형:
     - 합성 shear(slnt 축 없을 때) : x += y * tan(-slant)
     - weirdness>0 : 시드 RNG 기반 점 지터 + 글자별 베이스라인 wobble
     - letterSpacing : hmtx advanceWidth를 em 비율만큼 가감
  5) WOFF/TTF 인코딩 → base64.

[비용 가드] 모든 처리는 로컬 fontTools 연산이다. 외부 유료 API 호출이 전혀
없으며 비용은 0이다. 무작위는 표준 라이브러리 random만 사용(numpy 등 금지).
"""
from __future__ import annotations

import base64
import hashlib
import io
import math
import random
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

FontFormat = Literal["woff", "ttf"]
Script = Literal["latin", "hangul"]

# 파라미터 허용 범위 (계약 PARAM_RANGES와 동일, 서버 방어용 클램프).
# (min, max, default)
PARAM_RANGES = {
    "weight": (100.0, 900.0, 400.0),
    "slant": (-15.0, 0.0, 0.0),
    "curvature": (0.0, 1.0, 0.0),
    "mono": (0.0, 1.0, 0.0),
    "cursive": (0.0, 1.0, 0.0),
    "weirdness": (0.0, 100.0, 0.0),
    "seed": (0.0, 999999.0, 1.0),
    "letterSpacing": (-0.05, 0.6, 0.0),
}

# 재현성용 고정 타임스탬프(head.modified). fontTools mac epoch 기준 초.
# 2020-01-01 00:00:00 UTC 근방의 임의 고정값. 같은 입력 → 동일 바이트 보장.
_FIXED_TIMESTAMP = 3786825600

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


def clamp_params(
    weight: float,
    slant: float,
    curvature: float,
    mono: float = 0.0,
    cursive: float = 0.0,
    weirdness: float = 0.0,
    seed: float = 1.0,
    letterSpacing: float = 0.0,
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
    )


def _build_font_family(params: FontParams, script: Script) -> str:
    """파라미터+스크립트 기반의 고유 패밀리명(자체 패밀리명으로 RFN 회피)."""
    sig = (
        f"{script}-{params.weight:.0f}-{params.slant:.0f}-{params.curvature:.2f}"
        f"-{params.mono:.2f}-{params.cursive:.2f}-{params.weirdness:.0f}"
        f"-{params.seed}-{params.letterSpacing:.2f}"
    )
    short = hashlib.sha1(sig.encode("utf-8")).hexdigest()[:8]
    return f"UserFont-{short}"


def _normalize_format(fmt: str | None) -> FontFormat:
    f = (fmt or "woff").lower()
    if f not in ("woff", "ttf"):
        return "woff"
    return f  # type: ignore[return-value]


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
) -> None:
    """
    정적 폰트의 glyf 좌표를 직접 변형한다(인스턴싱·서브셋 후 호출).
    - shear: 합성 기울기 계수(x += y * shear). slnt 축이 없을 때만 != 0.
    - weirdness: 0~100. 0이면 펜 변형 없음(정형).
        · 점 지터: 각 좌표를 시드 RNG로 ±jitter_amp units 이동.
        · 베이스라인 wobble: 글자(글리프) 전체를 상하로 약간 오프셋.
    표준 random만 사용. 같은 (seed, weirdness, shear) → 동일 결과.
    """
    if "glyf" not in font:
        return
    do_shear = abs(shear) > 1e-9
    do_weird = weirdness > 0.0
    if not do_shear and not do_weird:
        return

    glyf = font["glyf"]
    # 강도: weirdness 0~100을 units로. EM 1000 기준 대략적 손맛 스케일.
    w = weirdness / 100.0
    jitter_amp = 22.0 * w          # 점 지터 최대 진폭(units)
    baseline_amp = 28.0 * w        # 글자별 베이스라인 wobble 최대(units)

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

        rng = _glyph_seed_rng(seed, glyph_name) if do_weird else None
        # 글자별 베이스라인 wobble(글리프 전체 수직 오프셋).
        baseline_dy = 0.0
        if do_weird and baseline_amp > 0:
            baseline_dy = rng.uniform(-baseline_amp, baseline_amp)

        for i in range(n):
            x, y = coords[i]
            nx, ny = float(x), float(y)
            if do_weird:
                # 점 지터: 결정적 RNG로 좌우/상하 미세 이동.
                nx += rng.uniform(-jitter_amp, jitter_amp)
                ny += rng.uniform(-jitter_amp, jitter_amp)
                ny += baseline_dy
            if do_shear:
                # 합성 shear는 (지터 적용 후) y에 비례해 x 이동.
                nx += ny * shear
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
        weight, slant, curvature, mono, cursive, weirdness, seed, letterSpacing
    )

    # recalcTimestamp=False: 저장 시 head.modified를 현재시각으로 갱신하지 않게 한다
    # (재현성: 같은 입력 → 동일 바이트). 아래에서 modified를 고정값으로 덮는다.
    font = TTFont(base_font_path, recalcTimestamp=False)

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
    options.flavor = "woff" if out_format == "woff" else None
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
    )

    # 자간(hmtx) 조정.
    _apply_letter_spacing(font, params.letterSpacing)

    # 재현성: head.modified 타임스탬프를 고정한다(같은 입력 → 동일 바이트 보장).
    # fontTools는 저장 시 modified를 현재시각으로 갱신하므로 고정값으로 덮는다.
    if "head" in font:
        font["head"].modified = _FIXED_TIMESTAMP

    buf = io.BytesIO()
    font.flavor = "woff" if out_format == "woff" else None
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
