# -*- coding: utf-8 -*-
"""pytest 공용 픽스처: 기본 폰트를 한 번 확보(없으면 다운로드 시도)."""
import os
import sys

import pytest

# 엔진 루트를 import 경로에 추가.
ENGINE_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ENGINE_ROOT not in sys.path:
    sys.path.insert(0, ENGINE_ROOT)

import font_loader  # noqa: E402


@pytest.fixture(scope="session")
def base_font_path():
    """
    기본 가변폰트 경로를 반환. 다운로드/캐시에 실패하면(오프라인 등)
    해당 픽스처를 쓰는 테스트는 skip 된다.
    """
    path = font_loader.ensure_font()
    if path is None:
        pytest.skip("기본 가변폰트를 받지 못해(오프라인 등) 생성 테스트를 건너뜁니다.")
    return str(path)
