# -*- coding: utf-8 -*-
"""손글씨 코어(handwriting.py + /handwriting) 테스트 — 계약 packages/core."""
import base64
import io
import math

import pytest
from fastapi.testclient import TestClient
from fontTools.ttLib import TTFont

import handwriting
import main


def _circle(cx=0.5, cy=0.5, r=0.3, n=24):
    """합성 원(셀 정규화). 'o' 등 닫힌 곡선 글자용."""
    return [
        (cx + r * math.cos(2 * math.pi * k / n), cy + r * math.sin(2 * math.pi * k / n))
        for k in range(n + 1)
    ]


def _glyf_for(raw: bytes, ch: str):
    """폰트 bytes에서 ch의 glyf 객체를 얻는다(bounds 재계산 포함)."""
    f = TTFont(io.BytesIO(raw))
    glyf = f["glyf"]
    g = glyf[f.getBestCmap()[ord(ch)]]
    g.recalcBounds(glyf)
    return g


def _off_curve_count(g) -> int:
    """글리프의 off-curve(2차 베지어 컨트롤) 점 수."""
    if not hasattr(g, "flags") or g.flags is None:
        return 0
    return sum(1 for fl in g.flags if not (fl & 0x01))


@pytest.fixture(scope="module")
def client():
    with TestClient(main.app) as c:
        yield c


# 합성 획(셀 정규화 0..1). 베이스폰트 불필요 → 항상 실행 가능(오프라인 OK).
VERTICAL_STROKE = {"points": [[0.5, 0.1], [0.5, 0.9]]}  # 세로획 'I' 비슷
L_STROKES = [
    {"points": [[0.3, 0.1], [0.3, 0.9]]},   # 세로
    {"points": [[0.3, 0.9], [0.7, 0.9]]},   # 가로(아래)
]
CURVE_STROKE = {
    "points": [[0.2, 0.5], [0.35, 0.25], [0.6, 0.25], [0.75, 0.5], [0.6, 0.75], [0.35, 0.75], [0.2, 0.5]]
}


def _open(font_b64: str) -> TTFont:
    return TTFont(io.BytesIO(base64.b64decode(font_b64)))


# ---------------- 모듈 직접(build) 테스트 ----------------
def test_build_basic_ttf_reopen():
    glyphs = [
        ("a", [[(0.5, 0.1), (0.5, 0.9)]]),
        ("b", [[(0.3, 0.1), (0.3, 0.9)], [(0.3, 0.9), (0.7, 0.9)]]),
    ]
    refine = handwriting.RefineParams()
    raw, family, count = handwriting.build_handwriting_font(glyphs, refine, "ttf")
    assert raw[:4] in (b"\x00\x01\x00\x00", b"true")
    assert count == 2
    assert family.startswith("MyHand-")
    assert handwriting.reopen_ok(raw)
    # cmap에 a,b 존재.
    font = TTFont(io.BytesIO(raw))
    cmap = font.getBestCmap()
    assert ord("a") in cmap and ord("b") in cmap


def test_refine_changes_output():
    glyphs = [("a", [[(0.2, 0.2), (0.4, 0.5), (0.3, 0.8), (0.6, 0.6)]])]
    raw0, _, _ = handwriting.build_handwriting_font(
        glyphs, handwriting.RefineParams(smoothing=0, nib=0.2, taper=0), "ttf"
    )
    raw1, _, _ = handwriting.build_handwriting_font(
        glyphs, handwriting.RefineParams(smoothing=1, nib=1, taper=1), "ttf"
    )
    assert raw0 != raw1  # refine 0 vs 1 결과 상이


def test_reproducible_same_input():
    glyphs = [("a", [[(0.5, 0.1), (0.5, 0.9)]])]
    r = handwriting.RefineParams()
    a, _, _ = handwriting.build_handwriting_font(glyphs, r, "ttf")
    b, _, _ = handwriting.build_handwriting_font(glyphs, r, "ttf")
    assert a == b  # head.modified 고정 → 동일 바이트


def test_single_point_dot_glyph():
    # 점 하나 → 도트(원형) 글리프로라도 유효 폰트.
    glyphs = [("a", [[(0.5, 0.5)]])]
    raw, _, count = handwriting.build_handwriting_font(glyphs, handwriting.RefineParams(), "ttf")
    assert count == 1
    assert handwriting.reopen_ok(raw)


# ---------------- 곡선 외곽선/오프셋/메트릭 품질 테스트 ----------------
def test_outline_uses_quadratic_curves():
    """외곽선이 직선 폴리라인이 아니라 2차 베지어(qCurveTo) — off-curve 점이 존재."""
    glyphs = [("o", [_circle()])]
    raw, _, _ = handwriting.build_handwriting_font(glyphs, handwriting.RefineParams(), "ttf")
    g = _glyf_for(raw, "o")
    assert _off_curve_count(g) > 0  # 곡선화 증거(직선만이면 0)


def test_synthetic_o_l_e_valid_no_explosion():
    """합성 'o'(원)·'l'(직선)·'e'가 자기교차로 깨지지 않고 유효 폰트 + 점 폭증 없음."""
    glyphs = [
        ("o", [_circle()]),
        ("l", [[(0.5, 0.05), (0.5, 0.95)]]),
        ("e", [[(0.25, 0.55), (0.75, 0.55), (0.72, 0.32), (0.5, 0.25),
                (0.3, 0.35), (0.25, 0.55), (0.35, 0.75), (0.6, 0.78), (0.74, 0.66)]]),
    ]
    for sm in (0.0, 1.0):
        refine = handwriting.RefineParams(smoothing=sm, nib=0.5, taper=0.3)
        raw, _, count = handwriting.build_handwriting_font(glyphs, refine, "ttf")
        assert count == 3
        assert handwriting.reopen_ok(raw)
        for ch in "ole":
            g = _glyf_for(raw, ch)
            assert 1 <= g.numberOfContours <= 4, (ch, g.numberOfContours)
            # 점 폭증 방지(비정상적으로 많은 점 = 자기교차/버그 신호).
            assert len(g.coordinates) < 1500, (ch, len(g.coordinates))
            assert g.yMax > g.yMin  # 빈 글리프 아님


def test_smoothing_zero_vs_one_differ():
    """smoothing 0(약한 자연 곡선)과 1(강한 정리)은 결과가 달라야 한다."""
    glyphs = [("e", [_circle(r=0.28)])]
    r0 = handwriting.RefineParams(smoothing=0, nib=0.5)
    r1 = handwriting.RefineParams(smoothing=1, nib=0.5)
    a, _, _ = handwriting.build_handwriting_font(glyphs, r0, "ttf")
    b, _, _ = handwriting.build_handwriting_font(glyphs, r1, "ttf")
    assert a != b


def test_metric_alignment_bands():
    """가이드 정렬: 'l'(어센더 글자)은 높이, 'o'(x-height)는 낮게, 'g'는 디센더로 내려감."""
    refine = handwriting.RefineParams(straighten=0.5)
    raw_l, _, _ = handwriting.build_handwriting_font(
        [("l", [[(0.5, 0.05), (0.5, 0.95)]])], refine, "ttf")
    raw_o, _, _ = handwriting.build_handwriting_font([("o", [_circle()])], refine, "ttf")
    raw_g, _, _ = handwriting.build_handwriting_font(
        [("g", [_circle(0.5, 0.55, 0.2), [(0.7, 0.4), (0.72, 0.95), (0.45, 0.99), (0.3, 0.9)]])],
        refine, "ttf")
    yl = _glyf_for(raw_l, "l").yMax
    yo = _glyf_for(raw_o, "o").yMax
    gmin = _glyf_for(raw_g, "g").yMin
    assert yl > yo  # 어센더 글자가 x-height 글자보다 높음
    assert gmin < handwriting.BASELINE_Y  # 디센더 글자는 베이스라인 아래


def test_single_glyph_stable():
    """글자 수가 적어도(1개) 안정적으로 유효 폰트."""
    raw, _, count = handwriting.build_handwriting_font(
        [("a", [_circle(r=0.25)])], handwriting.RefineParams(), "woff")
    assert count == 1 and raw[:4] == b"wOFF" and handwriting.reopen_ok(raw)


# ---------------- API(/handwriting) 테스트 ----------------
def test_handwriting_woff(client):
    r = client.post(
        "/handwriting",
        json={
            "glyphs": [
                {"char": "a", "strokes": [VERTICAL_STROKE]},
                {"char": "b", "strokes": L_STROKES},
                {"char": "c", "strokes": [CURVE_STROKE]},
            ],
            "refine": {"smoothing": 0.4, "nib": 0.5, "taper": 0.2, "straighten": 0.2, "spacing": 0.05},
            "format": "woff",
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["generatedBy"] == "handwriting"
    assert body["format"] == "woff"
    assert body["glyphCount"] == 3
    assert body["fontFamily"].startswith("MyHand-")
    raw = base64.b64decode(body["fontBase64"])
    assert raw[:4] == b"wOFF"
    cmap = _open(body["fontBase64"]).getBestCmap()
    for ch in "abc":
        assert ord(ch) in cmap


def test_handwriting_default_format_woff(client):
    r = client.post(
        "/handwriting",
        json={"glyphs": [{"char": "a", "strokes": [VERTICAL_STROKE]}]},
    )
    assert r.status_code == 200
    assert r.json()["format"] == "woff"
    assert base64.b64decode(r.json()["fontBase64"])[:4] == b"wOFF"


def test_handwriting_ttf_and_woff2(client):
    for fmt, magic in (("ttf", (b"\x00\x01\x00\x00", b"true")), ("woff2", (b"wOF2",))):
        r = client.post(
            "/handwriting",
            json={"glyphs": [{"char": "a", "strokes": [VERTICAL_STROKE]}], "format": fmt},
        )
        assert r.status_code == 200, fmt
        assert base64.b64decode(r.json()["fontBase64"])[:4] in magic


def test_handwriting_refine_differs_via_api(client):
    glyph = {"char": "a", "strokes": [CURVE_STROKE]}
    r0 = client.post("/handwriting", json={
        "glyphs": [glyph], "format": "ttf",
        "refine": {"smoothing": 0, "nib": 0.2, "taper": 0, "straighten": 0, "spacing": 0},
    })
    r1 = client.post("/handwriting", json={
        "glyphs": [glyph], "format": "ttf",
        "refine": {"smoothing": 1, "nib": 1, "taper": 1, "straighten": 1, "spacing": 0.3},
    })
    assert r0.status_code == 200 and r1.status_code == 200
    assert r0.json()["fontBase64"] != r1.json()["fontBase64"]


def test_handwriting_empty_glyphs_422(client):
    r = client.post("/handwriting", json={"glyphs": []})
    assert r.status_code == 422


def test_handwriting_too_many_points_422(client):
    big = [[0.5, i / (main.MAX_STROKE_POINTS_PER_GLYPH + 1)] for i in range(main.MAX_STROKE_POINTS_PER_GLYPH + 1)]
    r = client.post(
        "/handwriting",
        json={"glyphs": [{"char": "a", "strokes": [{"points": big}]}]},
    )
    assert r.status_code == 422


def test_handwriting_too_many_glyphs_422(client):
    glyphs = [{"char": chr(ord("a") + (i % 26)), "strokes": [VERTICAL_STROKE]} for i in range(main.MAX_TOTAL_GLYPHS + 1)]
    r = client.post("/handwriting", json={"glyphs": glyphs})
    assert r.status_code == 422


def test_handwriting_refine_out_of_range_422(client):
    r = client.post("/handwriting", json={
        "glyphs": [{"char": "a", "strokes": [VERTICAL_STROKE]}],
        "refine": {"nib": 5},
    })
    assert r.status_code == 422


def test_handwriting_invalid_format_422(client):
    r = client.post("/handwriting", json={
        "glyphs": [{"char": "a", "strokes": [VERTICAL_STROKE]}], "format": "eot",
    })
    assert r.status_code == 422


def test_handwriting_bad_point_422(client):
    r = client.post("/handwriting", json={
        "glyphs": [{"char": "a", "strokes": [{"points": [[0.5]]}]}],
    })
    assert r.status_code == 422
