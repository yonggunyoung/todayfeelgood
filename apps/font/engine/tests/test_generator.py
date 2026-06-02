# -*- coding: utf-8 -*-
"""generator 모듈 테스트."""
import base64
import io

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
    """None/NaN 같은 잘못된 값은 기본값으로."""
    p = generator.clamp_params(weight=None, slant=float("nan"), curvature="x")
    assert p.weight == 400.0
    assert p.slant == 0.0
    assert p.curvature == 0.0


def test_generate_default_is_valid_woff(base_font_path):
    """기본 파라미터 결과가 유효한 WOFF인지 + base64 디코드 + 재오픈."""
    b64, family, applied = generator.generate_woff_base64(
        base_font_path, weight=400, slant=0, curvature=0
    )

    # base64 디코드 가능
    raw = base64.b64decode(b64)
    # WOFF 매직넘버
    assert raw[:4] == b"wOFF"
    # fontTools로 다시 열림
    font = TTFont(io.BytesIO(raw))
    assert font.flavor == "woff"
    assert "glyf" in font or "CFF " in font

    # 패밀리명 형식
    assert family.startswith("UserFont-")
    assert applied.weight == 400.0


def test_generate_applies_axes(base_font_path):
    """범위 밖 입력으로 호출해도 클램프된 값이 적용되는지."""
    b64, family, applied = generator.generate_woff_base64(
        base_font_path, weight=5000, slant=-99, curvature=2
    )
    raw = base64.b64decode(b64)
    assert raw[:4] == b"wOFF"
    assert applied.weight == 900.0
    assert applied.slant == -15.0
    assert applied.curvature == 1.0


def test_image_png_ignored(base_font_path):
    """imagePng를 줘도 Phase 1에서는 무시하고 정상 생성."""
    b64, _, _ = generator.generate_woff_base64(
        base_font_path, weight=400, slant=0, curvature=0,
        image_png="data:image/png;base64,AAAA",
    )
    assert base64.b64decode(b64)[:4] == b"wOFF"
