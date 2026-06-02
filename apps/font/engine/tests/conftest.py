# -*- coding: utf-8 -*-
"""pytest 공용 픽스처: 기본 폰트(라틴/한글)를 한 번 확보(없으면 다운로드 시도)."""
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
    """라틴 기본 가변폰트 경로. 실패(오프라인) 시 해당 테스트 skip."""
    path = font_loader.ensure_font()
    if path is None:
        pytest.skip("라틴 기본 폰트를 받지 못해(오프라인 등) 테스트를 건너뜁니다.")
    return str(path)


@pytest.fixture(scope="session")
def hangul_font_path():
    """한글 기본 가변폰트(Pretendard VF) 경로. 실패 시 해당 테스트 skip."""
    path = font_loader.ensure_hangul_font()
    if path is None:
        pytest.skip("한글 폰트를 받지 못해(오프라인 등) 한글 테스트를 건너뜁니다.")
    return str(path)
