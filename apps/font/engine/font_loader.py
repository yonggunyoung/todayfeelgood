# -*- coding: utf-8 -*-
"""
기본 가변폰트 다운로드/캐시 담당 모듈 (라틴 + 한글).

[비용 가드] 이 모듈은 공개 GitHub raw 미러에서 OFL 정적 폰트 파일만 받는다.
외부 유료 API 호출이 전혀 없으며, 비용은 0이다. 한 번 받으면 디스크에 캐시한다.

폰트:
- 라틴: Recursive VF (Apache-2.0/OFL 계열, arrowtype). wght/slnt/CASL/MONO/CRSV 축.
- 한글: Pretendard Variable (OFL-1.1, orioncactus). wght 단일 축, 한/영 통합.
  · 라이선스: SIL Open Font License 1.1. 재배포 시 자체 패밀리명(UserFont-*)으로
    빌드해 Reserved Font Name 충돌을 회피한다(RFN 회피). OFL 고지 README에 동봉.

보안 강화(security 보고서 M3/M4/L3 반영):
- HTTPS URL만 허용. jsDelivr는 차단 환경이 있어 github raw 우선.
- 스트리밍 다운로드 + 누적 바이트 상한(스크립트별)으로 메모리 폭증 방지.
- 리다이렉트 횟수 제한 + content-type 확인.
- 받은 파일 무결성 검증: 알려진 SHA-256 핀(있으면) 또는 sfnt 매직 + 최소 크기.
- /health용 상태 점검은 전체 파일 read 금지(헤더 일부만 읽음).
"""
from __future__ import annotations

from pathlib import Path
from urllib.parse import urlparse

import requests

# assets/ 디렉터리에 폰트를 캐시한다(.gitignore로 ttf 무시 권장).
ASSETS_DIR = Path(__file__).resolve().parent / "assets"

# ---- 라틴(Recursive) ----
FONT_FILENAME = "Recursive_VF.ttf"
FONT_PATH = ASSETS_DIR / FONT_FILENAME

# ---- 한글(Pretendard Variable, OFL) ----
HANGUL_FONT_FILENAME = "PretendardVariable.ttf"
HANGUL_FONT_PATH = ASSETS_DIR / HANGUL_FONT_FILENAME

# 라틴 후보 URL(순서대로 시도). HTTPS만(아래에서 검증). github raw 우선.
FONT_URLS = [
    "https://github.com/arrowtype/recursive/raw/main/fonts/ArrowType-Recursive-1.085/Recursive_Desktop/Recursive_VF_1.085.ttf",
    "https://cdn.jsdelivr.net/gh/arrowtype/recursive@main/fonts/ArrowType-Recursive-1.085/Recursive_Desktop/Recursive_VF_1.085.ttf",
]

# 한글 후보 URL(순서대로 시도). jsDelivr는 차단되는 환경이 있어 github raw 우선.
# Pretendard Variable(OFL) → 실패 시 Noto Sans KR Variable(OFL) 폴백.
HANGUL_FONT_URLS = [
    "https://raw.githubusercontent.com/orioncactus/pretendard/main/packages/pretendard/dist/public/variable/PretendardVariable.ttf",
    "https://raw.githubusercontent.com/notofonts/noto-cjk/main/Sans/Variable/TTF/Subset/NotoSansKR-VF.ttf",
]

# 다운로드 안전 상한/제약
MAX_DOWNLOAD_BYTES = 10 * 1024 * 1024  # 10MB (Recursive ~2.4MB)
# 한글 폰트는 글리프가 많아 더 크다(Pretendard ~6.7MB, Noto KR VF ~10.4MB).
MAX_HANGUL_DOWNLOAD_BYTES = 16 * 1024 * 1024  # 16MB
MAX_REDIRECTS = 3
DOWNLOAD_TIMEOUT = 60  # 초 (한글 폰트가 커서 여유)

# TTF 매직넘버 후보 (sfnt: 0x00010000, 'true', 'ttcf', 'OTTO')
_TTF_MAGICS = (b"\x00\x01\x00\x00", b"true", b"ttcf", b"OTTO")

# 알려진 정상 폰트의 SHA-256 핀(공급망 무결성). None이면 매직+크기 검증만.
EXPECTED_SHA256: str | None = None
EXPECTED_HANGUL_SHA256: str | None = None

# 모듈 로드 시 캐시되는 가용 상태(앱 startup에서 갱신).
_FONT_AVAILABLE: bool = False
_HANGUL_FONT_AVAILABLE: bool = False


def _looks_like_font_bytes(head: bytes, size: int) -> bool:
    return size > 1024 and head[:4] in _TTF_MAGICS


def _is_https(url: str) -> bool:
    return urlparse(url).scheme == "https"


def _download_one(url: str, max_bytes: int) -> bytes | None:
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

            clen = resp.headers.get("content-length")
            if clen is not None:
                try:
                    if int(clen) > max_bytes:
                        return None
                except ValueError:
                    pass

            chunks: list[bytes] = []
            total = 0
            for chunk in resp.iter_content(chunk_size=64 * 1024):
                if not chunk:
                    continue
                total += len(chunk)
                if total > max_bytes:
                    return None  # 상한 초과: 중단·폐기
                chunks.append(chunk)

            return b"".join(chunks)
    except requests.TooManyRedirects:
        return None
    except Exception:
        return None
    finally:
        session.close()


def _verify_integrity(data: bytes, expected_sha: str | None) -> bool:
    """무결성 검증: SHA-256 핀(있으면) + sfnt 매직 + 최소 크기."""
    if not _looks_like_font_bytes(data[:4], len(data)):
        return False
    if expected_sha:
        import hashlib

        digest = hashlib.sha256(data).hexdigest()
        if digest.lower() != expected_sha.lower():
            return False
    return True


def _ensure(path: Path, urls: list[str], max_bytes: int, expected_sha: str | None):
    """공통 확보 로직: 캐시 검증 → 후보 URL 순차 다운로드 → 저장. (성공여부, 경로)."""
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)

    # 기존 캐시 검증.
    if path.exists():
        if expected_sha:
            try:
                if _verify_integrity(path.read_bytes(), expected_sha):
                    return True, path
            except OSError:
                pass
        elif _header_looks_like_font(path):
            return True, path

    for url in urls:
        data = _download_one(url, max_bytes)
        if data is None:
            continue
        if not _verify_integrity(data, expected_sha):
            continue
        try:
            path.write_bytes(data)
        except OSError:
            continue
        return True, path

    return False, None


def ensure_font() -> Path | None:
    """
    라틴 기본 가변폰트를 확보한다(다운로드 시도 포함).
    앱 startup에서만 호출(요청 경로에서 호출 금지). 실패해도 예외 없이 None.
    """
    global _FONT_AVAILABLE
    ok, path = _ensure(FONT_PATH, FONT_URLS, MAX_DOWNLOAD_BYTES, EXPECTED_SHA256)
    _FONT_AVAILABLE = ok
    return path if ok else None


def ensure_hangul_font() -> Path | None:
    """
    한글 기본 가변폰트(Pretendard VF, OFL)를 확보한다.
    앱 startup에서만 호출. 실패해도 예외 없이 None(한글 요청은 503으로 빠르게 실패).
    """
    global _HANGUL_FONT_AVAILABLE
    ok, path = _ensure(
        HANGUL_FONT_PATH, HANGUL_FONT_URLS, MAX_HANGUL_DOWNLOAD_BYTES, EXPECTED_HANGUL_SHA256
    )
    _HANGUL_FONT_AVAILABLE = ok
    return path if ok else None


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
    """/health 용: 라틴 폰트 캐시 상태(startup이 채운 boolean)."""
    return _FONT_AVAILABLE


def hangul_font_is_available() -> bool:
    """/health 용: 한글 폰트 캐시 상태(startup이 채운 boolean)."""
    return _HANGUL_FONT_AVAILABLE
