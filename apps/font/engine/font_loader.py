# -*- coding: utf-8 -*-
"""
기본 가변폰트(Recursive VF) 다운로드/캐시 담당 모듈.

[비용 가드] 이 모듈은 공개 GitHub raw 미러에서 정적 폰트 파일만 받는다.
외부 유료 API 호출이 전혀 없으며, 비용은 0이다. 한 번 받으면 디스크에 캐시한다.
"""
from __future__ import annotations

import os
from pathlib import Path

import requests

# assets/ 디렉터리에 폰트를 캐시한다. ttf는 .gitignore로 무시됨(받는 코드만 커밋).
ASSETS_DIR = Path(__file__).resolve().parent / "assets"
FONT_FILENAME = "Recursive_VF.ttf"
FONT_PATH = ASSETS_DIR / FONT_FILENAME

# 후보 URL을 순서대로 시도한다. 첫 번째가 실패하면 다음 미러로 폴백.
FONT_URLS = [
    "https://github.com/arrowtype/recursive/raw/main/fonts/ArrowType-Recursive-1.085/Recursive_Desktop/Recursive_VF_1.085.ttf",
    # 공개 미러 폴백 (jsDelivr가 GitHub raw를 그대로 서빙)
    "https://cdn.jsdelivr.net/gh/arrowtype/recursive@main/fonts/ArrowType-Recursive-1.085/Recursive_Desktop/Recursive_VF_1.085.ttf",
]

# TTF 매직넘버 후보 (sfnt: 0x00010000, 'true', 'OTTO')
_TTF_MAGICS = (b"\x00\x01\x00\x00", b"true", b"ttcf", b"OTTO")


def _looks_like_font(data: bytes) -> bool:
    return len(data) > 1024 and data[:4] in _TTF_MAGICS


def ensure_font() -> Path | None:
    """
    기본 가변폰트를 확보한다.
    - 이미 캐시돼 있으면 그 경로를 반환.
    - 없으면 후보 URL을 차례로 다운로드 시도.
    - 모두 실패하면 None 반환(서비스는 떠야 하므로 예외를 던지지 않음).
    """
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)

    if FONT_PATH.exists() and _looks_like_font(FONT_PATH.read_bytes()):
        return FONT_PATH

    for url in FONT_URLS:
        try:
            resp = requests.get(url, timeout=30)
            resp.raise_for_status()
            data = resp.content
            if not _looks_like_font(data):
                # 깨진 응답(HTML 에러 페이지 등)은 건너뛴다.
                continue
            FONT_PATH.write_bytes(data)
            return FONT_PATH
        except Exception:
            # 네트워크/HTTP 오류는 조용히 넘기고 다음 미러로.
            continue

    return None


def font_is_available() -> bool:
    """다운로드 시도 없이 현재 캐시 상태만 확인(/health 용)."""
    return FONT_PATH.exists() and _looks_like_font(FONT_PATH.read_bytes())
