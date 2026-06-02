# -*- coding: utf-8 -*-
"""
폰트 변형 로직 (Phase 1, 전통 방식 / 비AI).

기본 가변폰트(Recursive VF)를 입력 파라미터로 인스턴스화 → 라틴 글자만 서브셋 →
WOFF로 인코딩 → base64 반환.

[비용 가드] 이 파일의 모든 처리는 로컬 fontTools 연산이다.
외부 유료 API 호출이 전혀 없으며 비용은 0이다.
"""
from __future__ import annotations

import base64
import hashlib
import io
from dataclasses import dataclass

from fontTools.ttLib import TTFont
from fontTools.subset import Subsetter, Options
from fontTools.varLib.instancer import instantiateVariableFont

# 프론트와 공유하는 계약(packages/core/src/index.ts)과 동일하게 유지할 것.
TARGET_CHARSET = (
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    "abcdefghijklmnopqrstuvwxyz"
    "0123456789"
)
# 공백 + 기본 구두점도 서브셋에 포함.
EXTRA_CHARS = " .,;:!?'\"-()"

# 파라미터 허용 범위 (PARAM_RANGES와 동일, 서버 방어용 클램프).
PARAM_RANGES = {
    "weight": (100.0, 900.0, 400.0),
    "slant": (-15.0, 0.0, 0.0),
    "curvature": (0.0, 1.0, 0.0),
}

# 우리 파라미터 → Recursive 가변폰트 축 매핑.
# - weight  → wght (Recursive 범위 300~1000, 아래에서 폰트 실제 범위로 다시 클램프)
# - slant   → slnt (-15~0)
# - curvature → CASL (0~1, Casual=둥글기)
AXIS_MAP = {
    "weight": "wght",
    "slant": "slnt",
    "curvature": "CASL",
}


@dataclass
class FontParams:
    weight: float = 400.0
    slant: float = 0.0
    curvature: float = 0.0


def clamp_params(weight: float, slant: float, curvature: float) -> FontParams:
    """입력 파라미터를 허용 범위로 강제(NaN/None 방어 포함)."""

    def c(v, key):
        lo, hi, default = PARAM_RANGES[key]
        try:
            v = float(v)
        except (TypeError, ValueError):
            v = default
        if v != v:  # NaN
            v = default
        return min(hi, max(lo, v))

    return FontParams(
        weight=c(weight, "weight"),
        slant=c(slant, "slant"),
        curvature=c(curvature, "curvature"),
    )


def _build_font_family(params: FontParams) -> str:
    """파라미터 기반의 고유 패밀리명 (프론트 @font-face가 바로 사용)."""
    sig = f"{params.weight:.0f}-{params.slant:.0f}-{params.curvature:.2f}"
    short = hashlib.sha1(sig.encode("utf-8")).hexdigest()[:8]
    return f"UserFont-{short}"


def generate_woff(
    base_font_path: str,
    weight: float,
    slant: float,
    curvature: float,
    image_png: str | None = None,  # Phase 1 미사용: 향후 확장(스타일 추출) 자리만 마련.
) -> tuple[bytes, str, FontParams]:
    """
    기본 가변폰트를 변형해 WOFF bytes를 만든다.
    반환: (woff_bytes, font_family, applied_params)
    """
    # image_png는 Phase 1 전통 방식에서는 변형에 쓰지 않는다(받되 무시).

    params = clamp_params(weight, slant, curvature)

    font = TTFont(base_font_path)

    if "fvar" in font:
        available = {a.axisTag: (a.minValue, a.maxValue) for a in font["fvar"].axes}
        defaults = {a.axisTag: a.defaultValue for a in font["fvar"].axes}

        # 모든 축을 핀(pin)해 완전한 정적 인스턴스를 만든다.
        # - 우리가 매핑하는 축(wght/slnt/CASL)은 파라미터 값으로,
        #   폰트 실제 범위로 한 번 더 클램프해 적용.
        # - 매핑하지 않는 축(MONO/CRSV 등)은 폰트 기본값으로 핀한다.
        # 모든 축을 핀해야 gvar/fvar가 제거된 정적 폰트가 되어
        # 이후 서브셋이 깔끔하게 동작한다(부분 인스턴스의 gvar 서브셋 버그 회피).
        axis_values: dict[str, float] = dict(defaults)
        for our_key, axis_tag in AXIS_MAP.items():
            if axis_tag not in available:
                continue
            lo, hi = available[axis_tag]
            val = getattr(params, our_key)
            axis_values[axis_tag] = min(hi, max(lo, val))

        instantiateVariableFont(font, axis_values, inplace=True)

    # 라틴 글자만 서브셋해서 WOFF 크기를 줄인다.
    options = Options()
    options.flavor = "woff"
    options.desubroutinize = True
    options.recalc_bounds = True
    # 이름/메타 테이블은 유지하되 불필요한 레이아웃 기능은 정리.
    subsetter = Subsetter(options=options)
    subsetter.populate(text=TARGET_CHARSET + EXTRA_CHARS)
    subsetter.subset(font)

    buf = io.BytesIO()
    font.flavor = "woff"
    font.save(buf)
    woff_bytes = buf.getvalue()

    family = _build_font_family(params)
    return woff_bytes, family, params


def generate_woff_base64(
    base_font_path: str,
    weight: float,
    slant: float,
    curvature: float,
    image_png: str | None = None,
) -> tuple[str, str, FontParams]:
    """generate_woff의 결과를 base64 문자열로 반환."""
    woff_bytes, family, params = generate_woff(
        base_font_path, weight, slant, curvature, image_png
    )
    return base64.b64encode(woff_bytes).decode("ascii"), family, params
