# -*- coding: utf-8 -*-
"""손글씨 코어(handwriting.py + /handwriting) 테스트 — 계약 packages/core."""
import base64
import io

import pytest
from fastapi.testclient import TestClient
from fontTools.ttLib import TTFont

import handwriting
import main


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
