# -*- coding: utf-8 -*-
"""
기본 가변폰트(Recursive VF) 다운로드/캐시 담당 모듈.

[비용 가드] 이 모듈은 공개 GitHub raw 미러에서 정적 폰트 파일만 받는다.
외부 유료 API 호출이 전혀 없으며, 비용은 0이다. 한 번 받으면 디스크에 캐시한다.

보안 강화(security 보고서 M3/M4/L3 반영):
- HTTPS URL만 허용.
- 스트리밍 다운로드 + 누적 바이트 상한(MAX_DOWNLOAD_BYTES)으로 메모리 폭증 방지.
- 리다이렉트 횟수 제한 + content-type 확인.
- 받은 파일 무결성 검증: 알려진 SHA-256 핀(있으면) 또는 sfnt 매직 + 최소 크기.
- /health용 상태 점검은 전체 파일 read 금지(헤더 일부만 읽음).
"""
from __future__ import annotations

from pathlib import Path
from urllib.parse import urlparse

import requests

# assets/ 디렉터리에 폰트를 캐시한다. ttf는 .gitignore로 무시됨(받는 코드만 커밋).
ASSETS_DIR = Path(__file__).resolve().parent / "assets"
FONT_FILENAME = "Recursive_VF.ttf"
FONT_PATH = ASSETS_DIR / FONT_FILENAME

# 후보 URL을 순서대로 시도한다. 첫 번째가 실패하면 다음 미러로 폴백.
# HTTPS만 사용(아래에서 스킴 검증).
FONT_URLS = [
    "https://github.com/arrowtype/recursive/raw/main/fonts/ArrowType-Recursive-1.085/Recursive_Desktop/Recursive_VF_1.085.ttf",
    # 공개 미러 폴백 (jsDelivr가 GitHub raw를 그대로 서빙)
    "https://cdn.jsdelivr.net/gh/arrowtype/recursive@main/fonts/ArrowType-Recursive-1.085/Recursive_Desktop/Recursive_VF_1.085.ttf",
]

# 다운로드 안전 상한/제약
MAX_DOWNLOAD_BYTES = 10 * 1024 * 1024  # 10MB (Recursive VF는 ~3.6MB)
MAX_REDIRECTS = 3
DOWNLOAD_TIMEOUT = 30  # 초

# TTF 매직넘버 후보 (sfnt: 0x00010000, 'true', 'ttcf', 'OTTO')
_TTF_MAGICS = (b"\x00\x01\x00\x00", b"true", b"ttcf", b"OTTO")

# 알려진 정상 폰트의 SHA-256 핀(공급망 무결성 강화, security M4).
# 값이 None이면 핀 검증을 건너뛰고 매직+크기 검증만 수행한다.
# (버전 1.085 고정이므로 운영 전 해시를 채워 핀하는 것을 권장.)
EXPECTED_SHA256: str | None = None

# 모듈 로드 시 1회 계산하는 캐시된 가용 상태(앱 startup에서 갱신).
_FONT_AVAILABLE: bool = False


def _looks_like_font_bytes(head: bytes, size: int) -> bool:
    return size > 1024 and head[:4] in _TTF_MAGICS


def _is_https(url: str) -> bool:
    return urlparse(url).scheme == "https"


def _download_one(url: str) -> bytes | None:
    """
    단일 URL에서 폰트를 스트리밍으로 받는다.
    - HTTPS만 허용.
    - 누적 바이트 상한 초과 시 중단(메모리 폭증 방지).
    - content-length 헤더가 상한 초과면 즉시 거부.
    실패/거부 시 None.
    """
    if not _is_https(url):
        return None

    session = requests.Session()
    session.max_redirects = MAX_REDIRECTS
    try:
        with session.get(
            url, timeout=DOWNLOAD_TIMEOUT, stream=True, allow_redirects=True
        ) as resp:
            resp.raise_for_status()

            # content-type 확인(폰트/바이너리만 허용, HTML 에러 페이지 등 거부).
            ctype = resp.headers.get("content-type", "").lower()
            if ctype and ("text/html" in ctype or "application/json" in ctype):
                return None

            # content-length가 명시되어 있고 상한 초과면 즉시 거부.
            clen = resp.headers.get("content-length")
            if clen is not None:
                try:
                    if int(clen) > MAX_DOWNLOAD_BYTES:
                        return None
                except ValueError:
                    pass

            chunks: list[bytes] = []
            total = 0
            for chunk in resp.iter_content(chunk_size=64 * 1024):
                if not chunk:
                    continue
                total += len(chunk)
                if total > MAX_DOWNLOAD_BYTES:
                    # 상한 초과: 중단하고 폐기.
                    return None
                chunks.append(chunk)

            return b"".join(chunks)
    except requests.TooManyRedirects:
        return None
    except Exception:
        return None
    finally:
        session.close()


def _verify_integrity(data: bytes) -> bool:
    """다운로드분 무결성 검증: SHA-256 핀(있으면) + sfnt 매직 + 최소 크기."""
    if not _looks_like_font_bytes(data[:4], len(data)):
        return False
    if EXPECTED_SHA256:
        import hashlib

        digest = hashlib.sha256(data).hexdigest()
        if digest.lower() != EXPECTED_SHA256.lower():
            return False
    return True


def ensure_font() -> Path | None:
    """
    기본 가변폰트를 확보한다(다운로드 시도 포함).
    - 이미 캐시돼 있고 검증 통과면 그 경로 반환.
    - 없으면 후보 URL을 차례로 안전 다운로드.
    - 모두 실패하면 None 반환(서비스는 떠야 하므로 예외를 던지지 않음).

    이 함수는 앱 startup에서만 호출해 캐시를 채운다(요청 경로에서 호출 금지).
    """
    global _FONT_AVAILABLE
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)

    # 기존 캐시 검증(헤더 일부만 읽되, 핀이 설정된 경우엔 전체 검증 필요).
    if FONT_PATH.exists():
        if EXPECTED_SHA256:
            try:
                if _verify_integrity(FONT_PATH.read_bytes()):
                    _FONT_AVAILABLE = True
                    return FONT_PATH
            except OSError:
                pass
        elif _header_looks_like_font(FONT_PATH):
            _FONT_AVAILABLE = True
            return FONT_PATH

    for url in FONT_URLS:
        data = _download_one(url)
        if data is None:
            continue
        if not _verify_integrity(data):
            # 깨진/변조 응답은 건너뛴다.
            continue
        try:
            FONT_PATH.write_bytes(data)
        except OSError:
            continue
        _FONT_AVAILABLE = True
        return FONT_PATH

    _FONT_AVAILABLE = False
    return None


def _header_looks_like_font(path: Path) -> bool:
    """전체 파일을 읽지 않고 헤더 일부 + 크기만으로 폰트 여부 점검(security L3)."""
    try:
        size = path.stat().st_size
        if size <= 1024:
            return False
        with path.open("rb") as f:
            head = f.read(4)
        return head[:4] in _TTF_MAGICS
    except OSError:
        return False


def font_is_available() -> bool:
    """
    /health 용: 다운로드 시도 없이, 전체 파일 read 없이 캐시된 상태만 반환.
    startup의 ensure_font()가 _FONT_AVAILABLE를 채운다.
    """
    return _FONT_AVAILABLE
