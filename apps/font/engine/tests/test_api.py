# -*- coding: utf-8 -*-
"""API(main.py) 테스트 — 계약 v3 응답, 검증, 413/422/503."""
import base64

import pytest
from fastapi.testclient import TestClient

import font_loader
import main


@pytest.fixture(scope="module")
def client():
    # lifespan을 타며 startup에서 폰트 로드 시도(오프라인이면 가용 False).
    with TestClient(main.app) as c:
        yield c


@pytest.fixture(scope="module")
def font_ready():
    if font_loader.ensure_font() is None:
        pytest.skip("라틴 폰트를 받지 못해(오프라인) 생성 API 테스트를 건너뜁니다.")
    return True


@pytest.fixture(scope="module")
def hangul_ready():
    if font_loader.ensure_hangul_font() is None:
        pytest.skip("한글 폰트를 받지 못해(오프라인) 한글 API 테스트를 건너뜁니다.")
    return True


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert "font_loaded" in body
    assert "hangul_font_loaded" in body


def test_generate_woff_v3_shape(client, font_ready):
    r = client.post(
        "/generate",
        json={"params": {"weight": 400, "slant": 0, "curvature": 0}, "format": "woff"},
    )
    assert r.status_code == 200
    body = r.json()
    assert set(body.keys()) >= {
        "fontBase64", "format", "script", "fontFamily", "generatedBy", "appliedParams"
    }
    assert body["format"] == "woff"
    assert body["script"] == "latin"
    assert body["generatedBy"] == "baseFontVariation"
    assert base64.b64decode(body["fontBase64"])[:4] == b"wOFF"


def test_generate_with_new_params(client, font_ready):
    r = client.post(
        "/generate",
        json={
            "params": {
                "weight": 600, "slant": -6, "curvature": 0.5,
                "mono": 0.8, "cursive": 1, "weirdness": 30,
                "seed": 42, "letterSpacing": 0.05,
            },
            "format": "woff",
        },
    )
    assert r.status_code == 200
    ap = r.json()["appliedParams"]
    assert ap["mono"] == 0.8
    assert ap["weirdness"] == 30
    assert ap["seed"] == 42


def test_generate_with_v4_params(client, font_ready):
    """v4 심화 컨트롤이 응답 appliedParams에 그대로 반영되고 woff 생성."""
    r = client.post(
        "/generate",
        json={
            "params": {
                "weight": 500, "slant": -6,
                "waviness": 0.6, "waveFreq": 3, "contrast": 0.4, "roundness": 0.5,
            },
            "format": "woff",
        },
    )
    assert r.status_code == 200
    ap = r.json()["appliedParams"]
    assert ap["waviness"] == 0.6
    assert ap["waveFreq"] == 3
    assert ap["contrast"] == 0.4
    assert ap["roundness"] == 0.5
    assert base64.b64decode(r.json()["fontBase64"])[:4] == b"wOFF"


def test_v4_param_out_of_range_422(client):
    # waviness le=1 위반.
    r = client.post(
        "/generate",
        json={"params": {"weight": 400, "slant": 0, "waviness": 5}},
    )
    assert r.status_code == 422
    # waveFreq ge=0.5 위반.
    r2 = client.post(
        "/generate",
        json={"params": {"weight": 400, "slant": 0, "waveFreq": 0.1}},
    )
    assert r2.status_code == 422
    # contrast le=1 위반.
    r3 = client.post(
        "/generate",
        json={"params": {"weight": 400, "slant": 0, "contrast": 9}},
    )
    assert r3.status_code == 422


def test_generate_ttf_v3(client, font_ready):
    r = client.post(
        "/generate",
        json={"params": {"weight": 700, "slant": -8, "curvature": 0.5}, "format": "ttf"},
    )
    assert r.status_code == 200
    raw = base64.b64decode(r.json()["fontBase64"])
    assert raw[:4] in (b"\x00\x01\x00\x00", b"true", b"OTTO")


def test_generate_default_format_is_woff(client, font_ready):
    r = client.post("/generate", json={"params": {"weight": 400, "slant": 0, "curvature": 0}})
    assert r.status_code == 200
    body = r.json()
    assert body["format"] == "woff"
    assert body["script"] == "latin"


# ---------------- hangul ----------------

def test_generate_hangul_woff(client, hangul_ready):
    r = client.post(
        "/generate",
        json={"params": {"weight": 500, "slant": -6}, "format": "woff", "script": "hangul"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["script"] == "hangul"
    assert base64.b64decode(body["fontBase64"])[:4] == b"wOFF"


def test_generate_hangul_ttf(client, hangul_ready):
    r = client.post(
        "/generate",
        json={"params": {"weight": 400, "slant": 0}, "format": "ttf", "script": "hangul"},
    )
    assert r.status_code == 200
    raw = base64.b64decode(r.json()["fontBase64"])
    assert raw[:4] in (b"\x00\x01\x00\x00", b"true", b"OTTO")


# ---------------- 검증(422/413/잘못된 값) ----------------

def test_invalid_format_422(client):
    # eot는 미지원 → 422 (woff/woff2/ttf/otf만 허용).
    r = client.post(
        "/generate",
        json={"params": {"weight": 400, "slant": 0, "curvature": 0}, "format": "eot"},
    )
    assert r.status_code == 422


def test_generate_woff2(client, font_ready):
    """woff2 포맷 생성 + 매직(wOF2)."""
    r = client.post(
        "/generate",
        json={"params": {"weight": 500, "slant": 0}, "format": "woff2"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["format"] == "woff2"
    assert base64.b64decode(body["fontBase64"])[:4] == b"wOF2"


def test_generate_otf(client, font_ready):
    """otf 포맷 생성 + sfnt 매직."""
    r = client.post(
        "/generate",
        json={"params": {"weight": 600, "slant": -4}, "format": "otf"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["format"] == "otf"
    assert base64.b64decode(body["fontBase64"])[:4] in (
        b"\x00\x01\x00\x00", b"true", b"OTTO",
    )


def test_invalid_script_422(client):
    r = client.post(
        "/generate",
        json={"params": {"weight": 400, "slant": 0}, "script": "japanese"},
    )
    assert r.status_code == 422


def test_out_of_range_param_422(client):
    r = client.post("/generate", json={"params": {"weight": 5000, "slant": 0}})
    assert r.status_code == 422


def test_new_param_out_of_range_422(client):
    # weirdness le=100 위반.
    r = client.post(
        "/generate",
        json={"params": {"weight": 400, "slant": 0, "weirdness": 500}},
    )
    assert r.status_code == 422
    # letterSpacing le=0.6 위반.
    r2 = client.post(
        "/generate",
        json={"params": {"weight": 400, "slant": 0, "letterSpacing": 2}},
    )
    assert r2.status_code == 422


def test_nan_param_422(client):
    r = client.post(
        "/generate",
        json={"params": {"weight": "not-a-number", "slant": 0}},
    )
    assert r.status_code == 422


def test_image_png_too_large_413(client, font_ready):
    big = "A" * (main.MAX_IMAGE_PNG_BYTES + 1)
    r = client.post(
        "/generate",
        json={"params": {"weight": 400, "slant": 0}, "format": "woff", "imagePng": big},
    )
    assert r.status_code == 413
