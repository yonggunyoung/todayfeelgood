# -*- coding: utf-8 -*-
"""
한글 서브셋 문자 집합 (KS X 1001 상용 2,350자).

[무료티어 메모리 가드] 한글 가변폰트는 11,172 음절 전체를 서브셋하면 글리프 수가
많아 인스턴싱/펜 변형/저장 시 메모리 피크가 커진다. 그래서 **KS X 1001 완성형
상용 2,350자 + ASCII**로 제한한다(전체 11,172자 서브셋 금지).

2,350자 목록은 외부 데이터 파일 없이 **EUC-KR(완성형) 인코딩 영역에서 직접 디코딩**해
재현 가능하게 생성한다. EUC-KR 한글 영역:
  - 첫 바이트 0xB0~0xC8, 둘째 바이트 0xA1~0xFE 중 유효 디코딩되는 한글 음절.
이 방식은 표준 라이브러리(codecs)만 쓰며, 결과는 정확히 KS X 1001 2,350자다.
"""
from __future__ import annotations

# ASCII (라틴/숫자/구두점) — 한/영 통합 폰트에서 영문도 같이 쓰게 포함.
ASCII_CHARS = (
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    "abcdefghijklmnopqrstuvwxyz"
    "0123456789"
    " .,;:!?'\"-()"
)


def _build_ksx1001_syllables() -> str:
    """EUC-KR 완성형 영역을 순회해 KS X 1001 상용 2,350 음절을 생성한다."""
    out: list[str] = []
    for hi in range(0xB0, 0xC9):  # 0xB0 ~ 0xC8
        for lo in range(0xA1, 0xFF):  # 0xA1 ~ 0xFE
            try:
                ch = bytes([hi, lo]).decode("euc-kr")
            except UnicodeDecodeError:
                continue
            if 0xAC00 <= ord(ch) <= 0xD7A3:  # 현대 한글 음절만
                out.append(ch)
    return "".join(out)


# 모듈 로드 시 1회 생성(2,350자). 이후 서브셋 텍스트로 재사용.
KSX1001_SYLLABLES: str = _build_ksx1001_syllables()

# 실제 서브셋에 넣을 한글 텍스트(ASCII + 상용 2,350자).
HANGUL_SUBSET_TEXT: str = ASCII_CHARS + KSX1001_SYLLABLES
