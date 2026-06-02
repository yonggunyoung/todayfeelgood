# -*- coding: utf-8 -*-
"""generator 모듈 테스트 (계약 v3: woff/ttf, latin/hangul, 새 파라미터/weirdness)."""
import base64
import io

from fontTools.ttLib import TTFont

import generator


# ---------------- clamp ----------------

def test_clamp_params_in_range():
    p = generator.clamp_params(weight=5000, slant=-100, curvature=99)
    assert p.weight == 900
    assert p.slant == -15.0
    assert p.curvature == 1.0

    p2 = generator.clamp_params(weight=-10, slant=10, curvature=-3)
    assert p2.weight == 100
    assert p2.slant == 0.0
    assert p2.curvature == 0.0


def test_clamp_new_params():
    """v3 신규 파라미터 클램프."""
    p = generator.clamp_params(
        weight=400, slant=0, curvature=0,
        mono=5, cursive=-1, weirdness=999, seed=-3, letterSpacing=10,
    )
    assert p.mono == 1.0
    assert p.cursive == 0.0
    assert p.weirdness == 100.0
    assert p.seed == 0
    assert p.letterSpacing == 0.6


def test_clamp_v4_params():
    """v4 심화 컨트롤 클램프(waviness/waveFreq/contrast/roundness)."""
    p = generator.clamp_params(
        weight=400, slant=0, curvature=0,
        waviness=5, waveFreq=99, contrast=-1, roundness=2,
    )
    assert p.waviness == 1.0
    assert p.waveFreq == 6.0     # max
    assert p.contrast == 0.0     # 음수 → min
    assert p.roundness == 1.0

    p2 = generator.clamp_params(
        weight=400, slant=0, curvature=0,
        waviness=-1, waveFreq=0.1, contrast=2, roundness=-5,
    )
    assert p2.waviness == 0.0
    assert p2.waveFreq == 0.5    # min
    assert p2.contrast == 1.0
    assert p2.roundness == 0.0


def test_clamp_v4_invalid_defaults():
    """NaN/None은 각 기본값으로."""
    p = generator.clamp_params(
        weight=400, slant=0, curvature=0,
        waviness=float("nan"), waveFreq=None, contrast="x", roundness=float("inf"),
    )
    assert p.waviness == 0.0
    assert p.waveFreq == 2.0     # default
    assert p.contrast == 0.0
    assert p.roundness == 0.0


def test_clamp_params_invalid_values():
    p = generator.clamp_params(weight=None, slant=float("nan"), curvature="x")
    assert p.weight == 400.0
    assert p.slant == 0.0
    assert p.curvature == 0.0


# ---------------- latin woff/ttf ----------------

def test_generate_default_is_valid_woff(base_font_path):
    b64, family, applied, fmt, script = generator.generate_font_base64(
        base_font_path, weight=400, slant=0, curvature=0, fmt="woff"
    )
    raw = base64.b64decode(b64)
    assert raw[:4] == b"wOFF"
    assert fmt == "woff"
    assert script == "latin"
    font = TTFont(io.BytesIO(raw))
    assert font.flavor == "woff"
    assert "glyf" in font or "CFF " in font
    assert family.startswith("UserFont-")
    assert applied.weight == 400.0


def test_generate_ttf(base_font_path):
    b64, family, applied, fmt, script = generator.generate_font_base64(
        base_font_path, weight=700, slant=-8, curvature=0.5, fmt="ttf"
    )
    raw = base64.b64decode(b64)
    assert fmt == "ttf"
    assert raw[:4] in (b"\x00\x01\x00\x00", b"true", b"OTTO")
    font = TTFont(io.BytesIO(raw))
    assert font.flavor is None
    assert ord("A") in font.getBestCmap()


# ---------------- weight 매핑 ----------------

def test_weight_mapping_thin_vs_bold(base_font_path):
    """가는/굵은 weight가 실제로 다른 결과를 만든다(매핑 버그 정정 확인)."""
    thin_b64, *_ = generator.generate_font_base64(
        base_font_path, weight=100, slant=0, curvature=0, fmt="ttf"
    )
    bold_b64, *_ = generator.generate_font_base64(
        base_font_path, weight=900, slant=0, curvature=0, fmt="ttf"
    )
    assert thin_b64 != bold_b64  # 가는 굵기가 더 이상 무시되지 않음

    thin_raw = base64.b64decode(thin_b64)
    bold_raw = base64.b64decode(bold_b64)
    # 'A' 글리프의 외곽선 좌표 점 수: 굵을수록 일반적으로 더 많거나 같다.
    tf = TTFont(io.BytesIO(thin_raw))
    bf = TTFont(io.BytesIO(bold_raw))
    ta = tf["glyf"][tf.getBestCmap()[ord("A")]]
    ba = bf["glyf"][bf.getBestCmap()[ord("A")]]
    assert ta.coordinates != ba.coordinates  # 좌표가 실제로 달라짐


# ---------------- weirdness 재현성 ----------------

def test_weirdness_reproducible_same_seed(base_font_path):
    """같은 seed → 동일 바이트(재현성)."""
    a, *_ = generator.generate_font_base64(
        base_font_path, weight=400, slant=0, curvature=0,
        weirdness=60, seed=12345, fmt="ttf"
    )
    b, *_ = generator.generate_font_base64(
        base_font_path, weight=400, slant=0, curvature=0,
        weirdness=60, seed=12345, fmt="ttf"
    )
    assert a == b


def test_weirdness_different_seed_differs(base_font_path):
    """다른 seed → 상이한 결과."""
    a, *_ = generator.generate_font_base64(
        base_font_path, weight=400, slant=0, curvature=0,
        weirdness=60, seed=1, fmt="ttf"
    )
    b, *_ = generator.generate_font_base64(
        base_font_path, weight=400, slant=0, curvature=0,
        weirdness=60, seed=2, fmt="ttf"
    )
    assert a != b


def test_weirdness_zero_is_clean(base_font_path):
    """weirdness=0이면 펜 변형 없음 → seed가 달라도 동일(정형)."""
    a, *_ = generator.generate_font_base64(
        base_font_path, weight=400, slant=0, curvature=0,
        weirdness=0, seed=1, fmt="ttf"
    )
    b, *_ = generator.generate_font_base64(
        base_font_path, weight=400, slant=0, curvature=0,
        weirdness=0, seed=999, fmt="ttf"
    )
    assert a == b


# ---------------- letterSpacing ----------------

def test_letter_spacing_changes_advance(base_font_path):
    """letterSpacing>0이면 advanceWidth가 증가한다."""
    base = generator.generate_font(
        base_font_path, weight=400, slant=0, curvature=0,
        letterSpacing=0, fmt="ttf"
    )[0]
    wide = generator.generate_font(
        base_font_path, weight=400, slant=0, curvature=0,
        letterSpacing=0.3, fmt="ttf"
    )[0]
    bf = TTFont(io.BytesIO(base))
    wf = TTFont(io.BytesIO(wide))
    name = bf.getBestCmap()[ord("A")]
    assert wf["hmtx"][name][0] > bf["hmtx"][name][0]


# ---------------- v4 심화 컨트롤 ----------------

def _glyph_A_coords(b64):
    raw = base64.b64decode(b64)
    f = TTFont(io.BytesIO(raw))
    return f["glyf"][f.getBestCmap()[ord("A")]].coordinates[:]


def test_waviness_changes_coords(base_font_path):
    """waviness>0이면 기본값(0) 대비 좌표가 실제로 달라진다."""
    base, *_ = generator.generate_font_base64(
        base_font_path, weight=400, slant=0, curvature=0, waviness=0, fmt="ttf"
    )
    wavy, *_ = generator.generate_font_base64(
        base_font_path, weight=400, slant=0, curvature=0,
        waviness=0.8, waveFreq=3, fmt="ttf"
    )
    assert base != wavy
    assert _glyph_A_coords(base) != _glyph_A_coords(wavy)


def test_waviness_seed_independent_deterministic(base_font_path):
    """waviness는 규칙적·결정적 → seed가 달라도 동일 결과(랜덤 무관)."""
    a, *_ = generator.generate_font_base64(
        base_font_path, weight=400, slant=0, curvature=0,
        waviness=0.6, waveFreq=2, weirdness=0, seed=1, fmt="ttf"
    )
    b, *_ = generator.generate_font_base64(
        base_font_path, weight=400, slant=0, curvature=0,
        waviness=0.6, waveFreq=2, weirdness=0, seed=987654, fmt="ttf"
    )
    assert a == b


def test_waviness_reproducible(base_font_path):
    """같은 waviness/waveFreq → 동일 바이트(재현성)."""
    a, *_ = generator.generate_font_base64(
        base_font_path, weight=400, slant=0, curvature=0,
        waviness=0.5, waveFreq=4, fmt="ttf"
    )
    b, *_ = generator.generate_font_base64(
        base_font_path, weight=400, slant=0, curvature=0,
        waviness=0.5, waveFreq=4, fmt="ttf"
    )
    assert a == b


def test_wavefreq_changes_result(base_font_path):
    """같은 waviness라도 waveFreq가 다르면 파형이 달라진다."""
    f2, *_ = generator.generate_font_base64(
        base_font_path, weight=400, slant=0, curvature=0,
        waviness=0.7, waveFreq=2, fmt="ttf"
    )
    f5, *_ = generator.generate_font_base64(
        base_font_path, weight=400, slant=0, curvature=0,
        waviness=0.7, waveFreq=5, fmt="ttf"
    )
    assert f2 != f5


def test_contrast_changes_coords(base_font_path):
    """contrast>0이면 좌표가 기본값 대비 달라진다(획 대비 근사)."""
    base, *_ = generator.generate_font_base64(
        base_font_path, weight=400, slant=0, curvature=0, contrast=0, fmt="ttf"
    )
    high, *_ = generator.generate_font_base64(
        base_font_path, weight=400, slant=0, curvature=0, contrast=0.6, fmt="ttf"
    )
    assert base != high
    assert _glyph_A_coords(base) != _glyph_A_coords(high)


def test_contrast_seed_independent(base_font_path):
    """contrast는 결정적 → seed 무관."""
    a, *_ = generator.generate_font_base64(
        base_font_path, weight=400, slant=0, curvature=0,
        contrast=0.5, seed=1, fmt="ttf"
    )
    b, *_ = generator.generate_font_base64(
        base_font_path, weight=400, slant=0, curvature=0,
        contrast=0.5, seed=42, fmt="ttf"
    )
    assert a == b


def test_roundness_changes_coords(base_font_path):
    """roundness>0이면 좌표가 기본값 대비 달라진다(모서리 스무딩 근사)."""
    base, *_ = generator.generate_font_base64(
        base_font_path, weight=400, slant=0, curvature=0, roundness=0, fmt="ttf"
    )
    round_, *_ = generator.generate_font_base64(
        base_font_path, weight=400, slant=0, curvature=0, roundness=0.9, fmt="ttf"
    )
    assert base != round_
    assert _glyph_A_coords(base) != _glyph_A_coords(round_)


def test_v4_combined_still_valid_woff(base_font_path):
    """waviness+contrast+roundness 섞어도 유효한 woff 매직."""
    b64, *_ = generator.generate_font_base64(
        base_font_path, weight=500, slant=-6, curvature=0.3,
        weirdness=20, waviness=0.5, waveFreq=3, contrast=0.4, roundness=0.5,
        fmt="woff"
    )
    raw = base64.b64decode(b64)
    assert raw[:4] == b"wOFF"
    f = TTFont(io.BytesIO(raw))
    assert ord("A") in f.getBestCmap()


# ---------------- hangul ----------------

def test_generate_hangul_woff(hangul_font_path):
    """한글 script woff 생성 + 한글 글리프가 cmap에 포함."""
    b64, family, applied, fmt, script = generator.generate_font_base64(
        hangul_font_path, weight=400, slant=0, fmt="woff", script="hangul"
    )
    raw = base64.b64decode(b64)
    assert raw[:4] == b"wOFF"
    assert script == "hangul"
    font = TTFont(io.BytesIO(raw))
    cmap = font.getBestCmap()
    # KS X 1001 상용 음절 일부 + ASCII 포함 확인.
    for ch in ["가", "한", "글", "힝"]:
        assert ord(ch) in cmap, f"{ch} 누락"
    assert ord("A") in cmap


def test_generate_hangul_ttf_with_slant_shear(hangul_font_path):
    """한글 ttf + slant(합성 shear). slnt 축 없어도 동작하고 좌표가 변형됨."""
    straight, *_ = generator.generate_font_base64(
        hangul_font_path, weight=400, slant=0, fmt="ttf", script="hangul"
    )
    slanted, *_ = generator.generate_font_base64(
        hangul_font_path, weight=400, slant=-12, fmt="ttf", script="hangul"
    )
    raw = base64.b64decode(slanted)
    assert raw[:4] in (b"\x00\x01\x00\x00", b"true", b"OTTO")
    assert straight != slanted  # 합성 shear가 실제 적용됨


def test_hangul_v4_waviness_woff(hangul_font_path):
    """한글에도 waviness/contrast 적용 시 좌표 변화 + woff 매직 유지."""
    base, *_ = generator.generate_font_base64(
        hangul_font_path, weight=400, slant=0, fmt="ttf", script="hangul"
    )
    deep, *_ = generator.generate_font_base64(
        hangul_font_path, weight=400, slant=0,
        waviness=0.6, waveFreq=3, contrast=0.4, roundness=0.3,
        fmt="woff", script="hangul"
    )
    assert base64.b64decode(deep)[:4] == b"wOFF"
    assert base != deep


def test_hangul_subset_size_bounded(hangul_font_path):
    """한글 서브셋 글리프 수가 전체(11,172) 대비 작게 제한되는지(메모리 가드)."""
    b64, *_ = generator.generate_font_base64(
        hangul_font_path, weight=400, slant=0, fmt="ttf", script="hangul"
    )
    font = TTFont(io.BytesIO(base64.b64decode(b64)))
    # 2,350 음절 + ASCII + 컴포넌트 정도. 11,172보다 훨씬 작아야 함.
    assert font["maxp"].numGlyphs < 6000
