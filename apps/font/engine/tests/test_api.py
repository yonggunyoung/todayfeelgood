# -*- coding: utf-8 -*-
"""API(main.py) 테스트 — 계약 v2 응답, 검증, 413/422/503."""
import base64

import pytest
from fastapi.testclient import TestClient

import font_loader
import main


@pytest.fixture(scope="module")
def client():
    # lifespan을 타며 startup에서 폰트 로드 시도(오프라인이면 _FONT_AVAILABLE=False).
    with TestClient(main.app) as c:
        yield c


@pytest.fixture(scope="module")
def font_ready():
    """폰트가 없으면(오프라인 등) 생성 경로 테스트는 skip."""
    if font_loader.ensure_font() is None:
        pytest.skip("기본 폰트를 받지 못해(오프라인) 생성 API 테스트를 건너뜁니다.")
    return True


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert "font_loaded" in body


def test_generate_woff_v2_shape(client, font_ready):
    r = client.post(
        "/generate",
        json={"params": {"weight": 400, "slant": 0, "curvature": 0}, "format": "woff"},
    )
    assert r.status_code == 200
    body = r.json()
    # 계약 v2 필드.
    assert set(body.keys()) >= {
        "fontBase64", "format", "fontFamily", "generatedBy", "appliedParams"
    }
    assert "fontWoffBase64" not in body  # 구 필드 폐기.
    assert body["format"] == "woff"
    assert body["generatedBy"] == "traditional"
    assert base64.b64decode(body["fontBase64"])[:4] == b"wOFF"


def test_generate_ttf_v2(client, font_ready):
    r = client.post(
        "/generate",
        json={"params": {"weight": 700, "slant": -8, "curvature": 0.5}, "format": "ttf"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["format"] == "ttf"
    raw = base64.b64decode(body["fontBase64"])
    assert raw[:4] in (b"\x00\x01\x00\x00", b"true", b"OTTO")


def test_generate_default_format_is_woff(client, font_ready):
    r = client.post(
        "/generate",
        json={"params": {"weight": 400, "slant": 0, "curvature": 0}},
    )
    assert r.status_code == 200
    assert r.json()["format"] == "woff"


def test_invalid_format_422(client):
    r = client.post(
        "/generate",
        json={"params": {"weight": 400, "slant": 0, "curvature": 0}, "format": "otf"},
    )
    assert r.status_code == 422


def test_out_of_range_param_422(client):
    # weight 5000은 pydantic le=900 위반 → 422.
    r = client.post(
        "/generate",
        json={"params": {"weight": 5000, "slant": 0, "curvature": 0}},
    )
    assert r.status_code == 422


def test_nan_param_422(client):
    # JSON에는 NaN 리터럴이 없으므로 문자열로 보내 float 변환/검증 실패 유도.
    r = client.post(
        "/generate",
        json={"params": {"weight": "not-a-number", "slant": 0, "curvature": 0}},
    )
    assert r.status_code == 422


def test_image_png_too_large_413(client, font_ready):
    big = "A" * (main.MAX_IMAGE_PNG_BYTES + 1)
    r = client.post(
        "/generate",
        json={
            "params": {"weight": 400, "slant": 0, "curvature": 0},
            "format": "woff",
            "imagePng": big,
        },
    )
    assert r.status_code == 413
