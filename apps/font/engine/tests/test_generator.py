# -*- coding: utf-8 -*-
"""generator 모듈 테스트 (계약 v2: woff/ttf)."""
import base64
import io
import math

from fontTools.ttLib import TTFont

import generator


def test_clamp_params_in_range():
    """범위 밖 입력이 클램프되는지."""
    p = generator.clamp_params(weight=5000, slant=-100, curvature=99)
    assert p.weight == 900       # max 클램프
    assert p.slant == -15.0      # min 클램프
    assert p.curvature == 1.0    # max 클램프

    p2 = generator.clamp_params(weight=-10, slant=10, curvature=-3)
    assert p2.weight == 100      # min 클램프
    assert p2.slant == 0.0       # max 클램프
    assert p2.curvature == 0.0   # min 클램프


def test_clamp_params_invalid_values():
    """None/NaN/Inf 같은 잘못된 값은 기본값으로."""
    p = generator.clamp_params(weight=None, slant=float("nan"), curvature="x")
    assert p.weight == 400.0
    assert p.slant == 0.0
    assert p.curvature == 0.0

    p2 = generator.clamp_params(
        weight=float("inf"), slant=float("-inf"), curvature=float("nan")
    )
    assert p2.weight == 400.0
    assert p2.slant == 0.0
    assert p2.curvature == 0.0


def test_generate_default_is_valid_woff(base_font_path):
    """기본 파라미터 결과가 유효한 WOFF인지 + base64 디코드 + 재오픈."""
    b64, family, applied, fmt = generator.generate_font_base64(
        base_font_path, weight=400, slant=0, curvature=0, fmt="woff"
    )

    raw = base64.b64decode(b64)
    assert raw[:4] == b"wOFF"          # WOFF 매직넘버
    assert fmt == "woff"
    font = TTFont(io.BytesIO(raw))
    assert font.flavor == "woff"
    assert "glyf" in font or "CFF " in font

    assert family.startswith("UserFont-")
    assert applied.weight == 400.0


def test_generate_ttf(base_font_path):
    """format=ttf면 플레인 TTF(sfnt 매직)로 인코딩되는지."""
    b64, family, applied, fmt = generator.generate_font_base64(
        base_font_path, weight=700, slant=-8, curvature=0.5, fmt="ttf"
    )
    raw = base64.b64decode(b64)
    assert fmt == "ttf"
    # TTF/sfnt 매직: 0x00010000 / 'true' / 'OTTO'
    assert raw[:4] in (b"\x00\x01\x00\x00", b"true", b"OTTO")
    font = TTFont(io.BytesIO(raw))
    assert font.flavor is None        # flavor 없음(플레인 TTF)
    # 라틴 서브셋 유지 확인: 'A'가 cmap에 존재.
    assert ord("A") in font.getBestCmap()


def test_generate_applies_axes(base_font_path):
    """범위 밖 입력으로 호출해도 클램프된 값이 적용되는지."""
    b64, family, applied, fmt = generator.generate_font_base64(
        base_font_path, weight=5000, slant=-99, curvature=2, fmt="woff"
    )
    raw = base64.b64decode(b64)
    assert raw[:4] == b"wOFF"
    assert applied.weight == 900.0
    assert applied.slant == -15.0
    assert applied.curvature == 1.0


def test_image_png_ignored(base_font_path):
    """imagePng를 줘도 Phase 1에서는 무시하고 정상 생성."""
    b64, _, _, _ = generator.generate_font_base64(
        base_font_path, weight=400, slant=0, curvature=0, fmt="woff",
        image_png="data:image/png;base64,AAAA",
    )
    assert base64.b64decode(b64)[:4] == b"wOFF"
