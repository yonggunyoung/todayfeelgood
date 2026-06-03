# -*- coding: utf-8 -*-
"""한글 자모 조합(hangul_compose.py + /hangul-compose) 테스트 — 계약 packages/core.

정직성: 결과는 "조합 글씨"(획은 사용자 것, 모아쓰기는 규칙 합성). 비AI·비용 0.
베이스 폰트 불필요(그린 자모만 사용) → 오프라인에서도 항상 실행 가능.
"""
import base64
import io

import pytest
from fastapi.testclient import TestClient
from fontTools.ttLib import TTFont

import hangul_compose as hc
import handwriting
import main
from handwriting import RefineParams


# ---------------- 분해(decompose) 정확성 ----------------
def test_decompose_basic():
    assert hc.decompose_syllable("가") == ("ㄱ", "ㅏ", "")
    assert hc.decompose_syllable("고") == ("ㄱ", "ㅗ", "")
    # 받침 있는 음절.
    assert hc.decompose_syllable("안") == ("ㅇ", "ㅏ", "ㄴ")


def test_decompose_compound_jongseong():
    # '값' = ㄱ(초) + ㅏ(중) + ㅄ(겹받침).
    cho, jung, jong = hc.decompose_syllable("값")
    assert (cho, jung, jong) == ("ㄱ", "ㅏ", "ㅄ")
    # 겹받침 ㅄ → 기본 자모 ㅂ+ㅅ 근사.
    assert hc.expand_jamo(jong) == ["ㅂ", "ㅅ"]


def test_decompose_complex_vowel():
    # '관' = ㄱ + ㅘ + ㄴ. ㅘ → ㅗ+ㅏ 근사.
    cho, jung, jong = hc.decompose_syllable("관")
    assert (cho, jung, jong) == ("ㄱ", "ㅘ", "ㄴ")
    assert hc.expand_jamo(jung) == ["ㅗ", "ㅏ"]


def test_decompose_non_hangul_raises():
    with pytest.raises(ValueError):
        hc.decompose_syllable("A")


def test_expand_double_consonant():
    assert hc.expand_jamo("ㄲ") == ["ㄱ", "ㄱ"]
    assert hc.expand_jamo("ㅆ") == ["ㅅ", "ㅅ"]
    # 기본 자모는 그대로.
    assert hc.expand_jamo("ㄱ") == ["ㄱ"]
    # 모든 분해 결과는 BASIC_JAMO 원소여야 한다(드로잉 가능).
    for k in hc.JAMO_DECOMPOSE:
        for b in hc.expand_jamo(k):
            assert b in hc.BASIC_JAMO, (k, b)


def test_required_basic_jamo():
    assert hc.required_basic_jamo("가나안") == {"ㄱ", "ㅏ", "ㄴ", "ㅇ"}


# ---------------- 합성용 샘플 자모 획(셀 정규화 0..1) ----------------
JAMO_STROKES = {
    "ㄱ": [[(0.2, 0.2), (0.8, 0.2), (0.8, 0.8)]],
    "ㄴ": [[(0.3, 0.2), (0.3, 0.8), (0.8, 0.8)]],
    "ㄷ": [[(0.2, 0.2), (0.8, 0.2)], [(0.2, 0.2), (0.2, 0.8), (0.8, 0.8)]],
    "ㄹ": [[(0.25, 0.2), (0.75, 0.2), (0.75, 0.45), (0.25, 0.45)],
           [(0.25, 0.45), (0.25, 0.7), (0.75, 0.7), (0.75, 0.85), (0.25, 0.85)]],
    "ㅊ": [[(0.35, 0.15), (0.65, 0.15)], [(0.5, 0.15), (0.5, 0.35)],
           [(0.5, 0.4), (0.3, 0.85)], [(0.5, 0.55), (0.7, 0.85)]],
    "ㅁ": [[(0.25, 0.25), (0.75, 0.25), (0.75, 0.75), (0.25, 0.75), (0.25, 0.25)]],
    "ㅂ": [[(0.3, 0.2), (0.3, 0.8)], [(0.7, 0.2), (0.7, 0.8)], [(0.3, 0.8), (0.7, 0.8)]],
    "ㅅ": [[(0.5, 0.2), (0.3, 0.8)], [(0.5, 0.4), (0.7, 0.8)]],
    "ㅇ": [[(0.5, 0.2), (0.72, 0.35), (0.72, 0.65), (0.5, 0.8),
            (0.28, 0.65), (0.28, 0.35), (0.5, 0.2)]],
    "ㅏ": [[(0.5, 0.1), (0.5, 0.9)], [(0.5, 0.5), (0.85, 0.5)]],
    "ㅓ": [[(0.6, 0.1), (0.6, 0.9)], [(0.6, 0.5), (0.25, 0.5)]],
    "ㅗ": [[(0.5, 0.3), (0.5, 0.7)], [(0.2, 0.7), (0.8, 0.7)]],
    "ㅜ": [[(0.5, 0.3), (0.5, 0.7)], [(0.2, 0.3), (0.8, 0.3)]],
    "ㅡ": [[(0.15, 0.5), (0.85, 0.5)]],
    "ㅣ": [[(0.5, 0.1), (0.5, 0.9)]],
}


def _jamo_list(chars):
    return [(c, JAMO_STROKES[c]) for c in chars]


def _open(raw: bytes) -> TTFont:
    return TTFont(io.BytesIO(raw))


# ---------------- 합성(build) 테스트 ----------------
def test_build_basic_woff_cmap():
    jamo = _jamo_list(["ㄱ", "ㄴ", "ㅇ", "ㅏ"])
    raw, family, count, _drawn, _filled = hc.build_hangul_font(jamo, "가나안", RefineParams(), "woff")
    assert raw[:4] == b"wOFF"
    assert family.startswith("MyHangul-")
    assert count == 3
    assert handwriting.reopen_ok(raw)
    cmap = _open(raw).getBestCmap()
    for ch in "가나안":
        assert ord(ch) in cmap


def test_vertical_horizontal_jongseong_each_produce_glyphs():
    jamo = _jamo_list(["ㄱ", "ㄴ", "ㅇ", "ㅏ", "ㅗ"])
    # 세로모음(가), 가로모음(고), 받침(안) 각각.
    for text in ["가", "고", "안"]:
        raw, _, count, _d, _f = hc.build_hangul_font(jamo, text, RefineParams(), "ttf")
        assert count == 1, text
        assert handwriting.reopen_ok(raw)
        f = _open(raw)
        gname = f.getBestCmap()[ord(text)]
        g = f["glyf"][gname]
        g.recalcBounds(f["glyf"])
        assert g.numberOfContours >= 1, text
        assert g.yMax > g.yMin, text  # 빈 글리프 아님


def test_compound_consonant_approximation():
    # '까' = ㄲ(ㄱ+ㄱ) + ㅏ. ㄱ,ㅏ만 그려도 합성돼야 한다.
    jamo = _jamo_list(["ㄱ", "ㅏ"])
    raw, _, count, _d, _f = hc.build_hangul_font(jamo, "까", RefineParams(), "ttf")
    assert count == 1
    assert handwriting.reopen_ok(raw)
    assert ord("까") in _open(raw).getBestCmap()


def test_compound_vowel_approximation():
    # '과' = ㄱ + ㅘ(ㅗ+ㅏ). ㄱ,ㅗ,ㅏ 그리면 합성.
    jamo = _jamo_list(["ㄱ", "ㅗ", "ㅏ"])
    raw, _, count, _d, _f = hc.build_hangul_font(jamo, "과", RefineParams(), "ttf")
    assert count == 1
    assert ord("과") in _open(raw).getBestCmap()


def test_compound_jongseong_approximation():
    # '값' = ㄱ + ㅏ + ㅄ(ㅂ+ㅅ).
    jamo = _jamo_list(["ㄱ", "ㅏ", "ㅂ", "ㅅ"])
    raw, _, count, _d, _f = hc.build_hangul_font(jamo, "값", RefineParams(), "ttf")
    assert count == 1
    assert ord("값") in _open(raw).getBestCmap()


def test_missing_jamo_graceful_skip():
    # ㅏ만 그림 → '가'(ㄱ 필요)는 합성 불가 → 스킵. '아'(ㅇ+ㅏ)도 ㅇ 없어 스킵.
    # 그릴 수 있는 음절이 하나도 없으면 ValueError.
    jamo = _jamo_list(["ㅏ"])
    with pytest.raises(ValueError):
        hc.build_hangul_font(jamo, "가", RefineParams(), "ttf")


def test_partial_skip_keeps_buildable():
    # ㄱ,ㅏ만 그림. '가'는 합성 가능, '나'(ㄴ 필요)는 스킵.
    jamo = _jamo_list(["ㄱ", "ㅏ"])
    raw, _, count, _d, _f = hc.build_hangul_font(jamo, "가나", RefineParams(), "ttf")
    assert count == 1  # '가'만
    cmap = _open(raw).getBestCmap()
    assert ord("가") in cmap
    assert ord("나") not in cmap


def test_non_hangul_passthrough_ignored():
    # 영문/숫자/공백은 음절 합성에서 제외(통과). 한글 음절만 글리프화.
    jamo = _jamo_list(["ㄱ", "ㅏ"])
    raw, _, count, _d, _f = hc.build_hangul_font(jamo, "가 A1", RefineParams(), "ttf")
    assert count == 1
    cmap = _open(raw).getBestCmap()
    assert ord("가") in cmap
    assert ord("A") not in cmap
    # space는 항상 존재.
    assert ord(" ") in cmap


def test_reproducible_same_input():
    jamo = _jamo_list(["ㄱ", "ㅏ"])
    r = RefineParams()
    a, _, _, _d, _f = hc.build_hangul_font(jamo, "가", r, "ttf")
    b, _, _, _d, _f = hc.build_hangul_font(jamo, "가", r, "ttf")
    assert a == b  # head.modified 고정 → 동일 바이트


def test_empty_jamo_raises():
    with pytest.raises(ValueError):
        hc.build_hangul_font([], "가", RefineParams(), "ttf")


def test_empty_text_raises():
    with pytest.raises(ValueError):
        hc.build_hangul_font(_jamo_list(["ㄱ", "ㅏ"]), "   ", RefineParams(), "ttf")


def test_dedupe_syllables():
    # 같은 음절 반복 → 글리프는 1개만.
    jamo = _jamo_list(["ㄱ", "ㅏ"])
    raw, _, count, _d, _f = hc.build_hangul_font(jamo, "가가가", RefineParams(), "ttf")
    assert count == 1


# ---------------- API(/hangul-compose) 테스트 ----------------
@pytest.fixture(scope="module")
def client():
    with TestClient(main.app) as c:
        yield c


def _api_jamo(chars):
    return [
        {"char": c, "strokes": [{"points": [[x, y] for (x, y) in s]} for s in JAMO_STROKES[c]]}
        for c in chars
    ]


def test_api_basic(client):
    r = client.post("/hangul-compose", json={
        "jamo": _api_jamo(["ㄱ", "ㄴ", "ㅇ", "ㅏ"]),
        "text": "가나안",
        "refine": {"smoothing": 0.4, "nib": 0.5, "taper": 0.2, "straighten": 0.2, "spacing": 0.05},
        "format": "woff",
    })
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["generatedBy"] == "handwriting"
    assert body["format"] == "woff"
    assert body["glyphCount"] == 3
    assert body["fontFamily"].startswith("MyHangul-")
    raw = base64.b64decode(body["fontBase64"])
    assert raw[:4] == b"wOFF"
    cmap = _open(raw).getBestCmap()
    for ch in "가나안":
        assert ord(ch) in cmap


def test_api_default_format_woff(client):
    r = client.post("/hangul-compose", json={
        "jamo": _api_jamo(["ㄱ", "ㅏ"]), "text": "가",
    })
    assert r.status_code == 200
    assert r.json()["format"] == "woff"


def test_api_ttf(client):
    r = client.post("/hangul-compose", json={
        "jamo": _api_jamo(["ㄱ", "ㅏ"]), "text": "가", "format": "ttf",
    })
    assert r.status_code == 200
    assert base64.b64decode(r.json()["fontBase64"])[:4] in (b"\x00\x01\x00\x00", b"true")


def test_api_non_basic_jamo_422(client):
    # ㄲ(쌍자음)은 직접 그릴 수 없음(엔진이 근사) → 입력 거부.
    r = client.post("/hangul-compose", json={
        "jamo": [{"char": "ㄲ", "strokes": [{"points": [[0.5, 0.1], [0.5, 0.9]]}]}],
        "text": "까",
    })
    assert r.status_code == 422


def test_api_empty_jamo_422(client):
    r = client.post("/hangul-compose", json={"jamo": [], "text": "가"})
    assert r.status_code == 422


def test_api_empty_text_422(client):
    r = client.post("/hangul-compose", json={"jamo": _api_jamo(["ㄱ", "ㅏ"]), "text": ""})
    assert r.status_code == 422


def test_api_uncomposable_422(client):
    # ㅏ만 그림 → '가' 합성 불가 → 합성 음절 0 → 422.
    r = client.post("/hangul-compose", json={
        "jamo": _api_jamo(["ㅏ"]), "text": "가",
    })
    assert r.status_code == 422


def test_api_invalid_format_422(client):
    r = client.post("/hangul-compose", json={
        "jamo": _api_jamo(["ㄱ", "ㅏ"]), "text": "가", "format": "eot",
    })
    assert r.status_code == 422


# ---------------- 모아쓰기 박스 일관성 ----------------
def _syllable_glyph_bbox(text, jamo_chars):
    """한 음절 폰트 빌드 후 그 음절 글리프의 bbox(폰트 유닛)."""
    jamo = _jamo_list(jamo_chars)
    raw, _, count, _d, _f = hc.build_hangul_font(jamo, text, RefineParams(), "ttf")
    assert count == 1, text
    f = _open(raw)
    g = f["glyf"][f.getBestCmap()[ord(text)]]
    g.recalcBounds(f["glyf"])
    return g


def test_box_min_size_jamo_not_tiny():
    """단변이 납작한 자모(ㅡ/ㅗ 등)도 최소 크기 보장 — 음절이 비정상적으로 작지 않음.
    '글'(받침 ㄹ + 가로모음 ㅡ)이 유독 작아지던 문제 회귀 방지."""
    # '글' = ㄱ + ㅡ + ㄹ. 가로모음 + 받침.
    g = _syllable_glyph_bbox("글", ["ㄱ", "ㅡ", "ㄹ"])
    width = g.xMax - g.xMin
    height = g.yMax - g.yMin
    # 음절이 박스의 상당 부분(가로/세로 모두)을 채워야 한다(쪼그라들지 않음).
    assert width > 0.45 * hc.SYL_W, (width, hc.SYL_W)
    assert height > 0.45 * hc.SYL_H, (height, hc.SYL_H)


def test_box_complex_vowel_no_collapse():
    """복합모음(ㅚ 등) 음절도 칸 분리로 겹쳐 뭉개지지 않고 폭넓게 배치('최' 회귀)."""
    # '최' = ㅊ + ㅚ(ㅗ+ㅣ). 복합모음.
    g = _syllable_glyph_bbox("최", ["ㅊ", "ㅗ", "ㅣ"])
    width = g.xMax - g.xMin
    height = g.yMax - g.yMin
    # 복합모음이 우측+하단으로 퍼져 폭/높이가 충분(한 점에 뭉치지 않음).
    assert width > 0.5 * hc.SYL_W, (width, hc.SYL_W)
    assert height > 0.4 * hc.SYL_H, (height, hc.SYL_H)


def test_box_sizes_consistent_across_syllables():
    """여러 모임유형 음절의 크기가 들쭉날쭉하지 않다(높이 편차 제한)."""
    samples = [
        ("가", ["ㄱ", "ㅏ"]),       # 세로모음
        ("고", ["ㄱ", "ㅗ"]),       # 가로모음
        ("안", ["ㅇ", "ㅏ", "ㄴ"]),  # 받침
        ("글", ["ㄱ", "ㅡ", "ㄹ"]),  # 가로모음 + 받침
    ]
    heights = []
    for text, chars in samples:
        g = _syllable_glyph_bbox(text, chars)
        heights.append(g.yMax - g.yMin)
    # 가장 작은 음절이 가장 큰 음절의 절반 이상(극단적 들쭉날쭉 방지).
    assert min(heights) > 0.5 * max(heights), heights


# ---------------- autofill(자동 채우기) 테스트 ----------------
import autofill  # noqa: E402
import font_loader  # noqa: E402


def test_hangul_autofill_module_extracts_missing_jamo():
    """hangul_fill_jamo_strokes: 안 그린 자모만, 셀(0..1) 획으로 추출."""
    path = font_loader.ensure_hangul_font()
    if path is None:
        pytest.skip("한글 베이스 폰트 없음(오프라인).")
    st = autofill.DrawnStyle(slant_deg=0.0, nib=0.5, avg_ink_height=700.0, glyph_count=1)
    needed = hc.required_basic_jamo("안녕")  # {ㅇ,ㅏ,ㄴ,ㅕ,ㅎ...}
    filled = autofill.hangul_fill_jamo_strokes(str(path), st, needed, skip_jamo={"ㅇ"})
    assert "ㅇ" not in filled  # 그린(skip) 자모는 제외
    assert len(filled) > 0
    # 추출 획은 셀 정규화 범위(여유 포함) 안.
    for ch, strokes in filled.items():
        for s in strokes:
            for (x, y) in s:
                assert -0.1 <= x <= 1.1 and -0.1 <= y <= 1.1, (ch, x, y)


def test_build_hangul_autofill_completes_syllables():
    """autofill=True: 일부 자모만 그려도 베이스 폰트로 채워 '안녕하세요' 완성."""
    path = font_loader.ensure_hangul_font()
    if path is None:
        pytest.skip("한글 베이스 폰트 없음(오프라인).")
    # ㄱ, ㅏ 만 그림 — 자체로는 '안녕하세요' 한 음절도 못 만듦.
    jamo = _jamo_list(["ㄱ", "ㅏ"])
    raw, _, count, drawn, filled = hc.build_hangul_font(
        jamo, "안녕하세요", RefineParams(), "ttf", autofill=True, base_font_path=str(path)
    )
    assert handwriting.reopen_ok(raw)
    cmap = _open(raw).getBestCmap()
    # 자동 채움 덕에 모든 음절 완성.
    for ch in "안녕하세요":
        assert ord(ch) in cmap, ch
    assert count == 5
    # 정직성: 그린 자모 vs 채운 자모 구분.
    assert set(drawn) == {"ㄱ", "ㅏ"}
    assert len(filled) > 0
    assert "ㄱ" not in filled and "ㅏ" not in filled


def test_build_hangul_autofill_false_unchanged():
    """autofill=False(기본): 그린 자모로만 — 못 만드는 음절은 스킵, filled 비어있음."""
    jamo = _jamo_list(["ㄱ", "ㅏ"])
    # '가나'에서 '가'만 가능, '나'(ㄴ)는 스킵.
    raw, _, count, drawn, filled = hc.build_hangul_font(
        jamo, "가나", RefineParams(), "ttf", autofill=False
    )
    assert count == 1
    assert filled == []
    assert set(drawn) == {"ㄱ", "ㅏ"}
    cmap = _open(raw).getBestCmap()
    assert ord("가") in cmap and ord("나") not in cmap


def test_api_hangul_autofill(client):
    """API: autofill=True면 일부 자모만으로 음절 완성 + drawn/filled 구분 반환."""
    if not font_loader.hangul_font_is_available():
        pytest.skip("한글 베이스 폰트 없음(오프라인).")
    r = client.post("/hangul-compose", json={
        "jamo": _api_jamo(["ㄱ", "ㅏ"]),
        "text": "안녕하세요",
        "autofill": True,
        "format": "ttf",
    })
    assert r.status_code == 200, r.text
    body = r.json()
    assert set(body["drawnChars"]) == {"ㄱ", "ㅏ"}
    assert len(body["filledChars"]) > 0
    cmap = _open(base64.b64decode(body["fontBase64"])).getBestCmap()
    for ch in "안녕하세요":
        assert ord(ch) in cmap


def test_api_hangul_autofill_default_false(client):
    """API: autofill 기본 False — filledChars 비어있음."""
    r = client.post("/hangul-compose", json={
        "jamo": _api_jamo(["ㄱ", "ㅏ"]), "text": "가", "format": "ttf",
    })
    assert r.status_code == 200
    assert r.json()["filledChars"] == []
    assert set(r.json()["drawnChars"]) == {"ㄱ", "ㅏ"}
