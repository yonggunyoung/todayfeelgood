#!/usr/bin/env python3
"""
성장형 기사 개선 및 제목 생성기
Google Discover 노출 최적화 AI 도구

사용법:
    pip install anthropic
    export ANTHROPIC_API_KEY="your-api-key"
    python article_optimizer.py
"""

import anthropic
import json
import sys
from pathlib import Path
from datetime import datetime

# ── 상수 ───────────────────────────────────────────────────────────────────
KB_FILE = "knowledge_base.json"
MODEL = "claude-opus-4-6"

SYSTEM_PROMPT = """당신은 한국 온라인 미디어 전문가이자 Google Discover 최적화 전문가입니다.

핵심 역할:
- Google Discover 노출을 극대화하는 기사 제목 최적화
- 구글 코어 정책(E-E-A-T)에 맞는 본문 개선 방향 제시
- 학습된 Discover 성공 패턴을 반영한 맞춤형 추천
- 기존 기사의 문체와 형식을 존중하는 자연스러운 개선

Google Discover 최적화 핵심 원칙:
1. 제목: 호기심 자극과 명확한 정보 전달의 균형 (클릭베이트 절대 지양)
2. 모바일 최적화: 제목 30~50자 권장
3. E-E-A-T: 경험(Experience)·전문성(Expertise)·권위성(Authoritativeness)·신뢰성(Trustworthiness)
4. 시의성·트렌드 반영
5. 독자 검색 의도 충족
6. 사이트 브랜드 신뢰도 강화
7. 이미지/멀티미디어 활용 고려

본문 개선 시 반드시 준수사항:
- 원본 기사의 사실관계·핵심 내용 100% 유지
- 기존 필자의 문체와 서술 방식 존중
- 형식(단락 수, 소제목 유무 등)에서 크게 벗어나지 않기"""

# ── 지식 베이스 ────────────────────────────────────────────────────────────

def load_kb() -> dict:
    """지식 베이스 로드"""
    if Path(KB_FILE).exists():
        with open(KB_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {
        "discover_titles": [],        # 학습된 Discover 노출 제목 목록
        "discover_articles": [],      # 학습된 Discover 노출 기사 (미리보기)
        "title_patterns": [],         # 추출된 제목 패턴
        "article_style_patterns": [], # 추출된 기사 스타일 패턴
        "last_updated": None,
    }


def save_kb(kb: dict):
    """지식 베이스 저장"""
    kb["last_updated"] = datetime.now().isoformat()
    with open(KB_FILE, "w", encoding="utf-8") as f:
        json.dump(kb, f, ensure_ascii=False, indent=2)


def build_context(kb: dict) -> str:
    """학습 데이터를 프롬프트 컨텍스트로 변환"""
    parts = []

    if kb["discover_titles"]:
        recent = kb["discover_titles"][-20:]  # 최근 20개
        parts.append(f"### Discover 노출 제목 예시 ({len(kb['discover_titles'])}개 학습됨, 최근 {len(recent)}개 표시)")
        for item in recent:
            parts.append(f"  - {item['title']}")

    if kb["title_patterns"]:
        parts.append("\n### 학습된 제목 성공 패턴")
        for p in kb["title_patterns"]:
            parts.append(f"  - {p}")

    if kb["article_style_patterns"]:
        parts.append("\n### 학습된 기사 스타일 패턴")
        for p in kb["article_style_patterns"]:
            parts.append(f"  - {p}")

    if not parts:
        return "※ 아직 학습된 데이터가 없습니다. 메뉴 3·4번으로 Discover 노출 사례를 학습하면 더 정확한 추천이 가능합니다."

    return "\n".join(parts)


# ── Claude API 호출 ────────────────────────────────────────────────────────

client = anthropic.Anthropic()


def stream_call(messages: list, system: str = SYSTEM_PROMPT, max_tokens: int = 6000) -> str:
    """스트리밍 API 호출 — 텍스트만 출력 (thinking 블록 숨김)"""
    full_text = ""
    with client.messages.stream(
        model=MODEL,
        max_tokens=max_tokens,
        thinking={"type": "adaptive"},
        system=system,
        messages=messages,
    ) as stream:
        for event in stream:
            if event.type == "content_block_delta" and hasattr(event.delta, "text"):
                print(event.delta.text, end="", flush=True)
                full_text += event.delta.text
    print()
    return full_text


def simple_call(messages: list, max_tokens: int = 1500) -> str:
    """단순 API 호출 (패턴 추출 등 내부 작업용)"""
    resp = client.messages.create(
        model=MODEL,
        max_tokens=max_tokens,
        system=SYSTEM_PROMPT,
        messages=messages,
    )
    return resp.content[0].text


# ── 멀티라인 입력 ──────────────────────────────────────────────────────────

def read_multiline(prompt_text: str = "") -> str:
    """빈 줄 2회 연속 입력 시 종료되는 멀티라인 입력"""
    if prompt_text:
        print(prompt_text)
    print("(입력 완료 시 빈 줄을 두 번 입력하세요)\n")

    lines = []
    empty_count = 0
    while True:
        try:
            line = input()
        except EOFError:
            break
        if not line:
            empty_count += 1
            if empty_count >= 2:
                break
            lines.append("")
        else:
            empty_count = 0
            lines.append(line)

    return "\n".join(lines).strip()


# ── 기능 1: 기사 분석 및 개선 제안 ────────────────────────────────────────

def analyze_article() -> tuple[str, str] | None:
    """기사 분석 → 제목 10개 추천(TOP 3 선정) + 본문 개선 방향"""
    print("\n" + "━" * 60)
    print("  📰 기사 분석 및 개선 제안")
    print("━" * 60)

    article = read_multiline("분석할 기사를 입력해주세요. (제목 포함)")
    if not article:
        print("⚠  입력된 기사가 없습니다.")
        return None

    kb = load_kb()
    context = build_context(kb)

    messages = [
        {
            "role": "user",
            "content": f"""## 학습된 Google Discover 성공 패턴
{context}

---

## 분석 대상 기사
{article}

---

위 기사를 분석하고 아래 형식으로 결과를 제공해주세요.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【제목 추천 10개】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. [제목] — [Discover 노출 포인트]
2. [제목] — [포인트]
3. [제목] — [포인트]
4. [제목] — [포인트]
5. [제목] — [포인트]
6. [제목] — [포인트]
7. [제목] — [포인트]
8. [제목] — [포인트]
9. [제목] — [포인트]
10. [제목] — [포인트]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【TOP 3 추천 (선정 이유 상세)】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🥇 1위: [제목]
→ 선정 이유: [Google Discover 노출 가능성, E-E-A-T 충족도, 클릭 심리 분석 등 상세 설명]

🥈 2위: [제목]
→ 선정 이유: [상세 설명]

🥉 3위: [제목]
→ 선정 이유: [상세 설명]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【현재 기사 진단】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 강점:
- [항목]

⚠ 개선 필요:
- [항목]

📊 Google Discover 최적화 점수: [0-100점] / 100점
(구글 코어 정책·E-E-A-T 기준)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【본문 개선 방향 (5~7가지)】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
기존 기사의 문체와 형식을 최대한 유지하면서 개선할 수 있는 방향을 구체적으로 제시해주세요.

1. [개선 방향] — [적용 방법 구체 설명]
2. ...
""",
        }
    ]

    print("\n" + "═" * 60)
    result = stream_call(messages)
    print("═" * 60)
    return article, result


# ── 기능 2: 기사 재작성 ────────────────────────────────────────────────────

def rewrite_article(original: str, analysis: str):
    """분석 결과를 바탕으로 기사 재작성"""
    print("\n" + "━" * 60)
    print("  ✏️  기사 재작성")
    print("━" * 60)
    print("사용할 제목을 입력하세요.")
    print("(위 TOP 3 중 선택하거나 직접 입력, 없으면 Enter → TOP 1 자동 선택)")
    desired_title = input("원하는 제목: ").strip()

    kb = load_kb()
    context = build_context(kb)

    title_instruction = (
        f'제목: "{desired_title}"' if desired_title else "위 분석의 🥇 1위 추천 제목 사용"
    )

    messages = [
        {
            "role": "user",
            "content": f"""## 학습된 Google Discover 성공 패턴
{context}

---

## 원본 기사
{original}

---

## 분석 및 개선 방향
{analysis}

---

위 원본 기사를 개선 방향에 따라 재작성해주세요.

【재작성 준수 사항】
1. {title_instruction}
2. 원본 기사의 모든 사실관계·핵심 내용 100% 유지
3. 기존 문체·어조·서술 방식을 존중하되 가독성 개선
4. 단락 구성과 분량을 원본과 유사하게 유지
5. Google Discover 노출 최적화 자연스럽게 적용
6. E-E-A-T 기준 자연스럽게 강화

완성된 재작성 기사 전문을 제공해주세요.
""",
        }
    ]

    print("\n" + "═" * 60)
    print("【재작성된 기사】")
    print("═" * 60)
    stream_call(messages, max_tokens=8000)
    print("═" * 60)


# ── 기능 3: Discover 노출 제목 학습 ───────────────────────────────────────

def learn_titles():
    """Google Discover에 노출된 제목들을 학습"""
    print("\n" + "━" * 60)
    print("  📚 Google Discover 노출 제목 학습")
    print("━" * 60)
    print("Discover에 노출됐던 제목들을 입력하세요. (한 줄에 하나씩)")
    print("(완료 시 빈 줄 두 번 입력)\n")

    titles = []
    empty_count = 0
    while True:
        try:
            line = input("제목: ").strip()
        except EOFError:
            break
        if not line:
            empty_count += 1
            if empty_count >= 2:
                break
        else:
            empty_count = 0
            titles.append(line)

    if not titles:
        print("⚠  입력된 제목이 없습니다.")
        return

    print(f"\n🔍 {len(titles)}개 제목 패턴 분석 중...\n")

    titles_text = "\n".join(f"- {t}" for t in titles)

    # 패턴 분석 (스트리밍으로 사용자에게 보여줌)
    analysis_messages = [
        {
            "role": "user",
            "content": f"""다음은 Google Discover에 실제로 노출된 기사 제목들입니다.
이 제목들의 공통 패턴, 특징, 구조를 상세히 분석해주세요.

【노출 제목 목록】
{titles_text}

분석 항목:
1. 제목 구조 패턴 (숫자 활용, 의문형, 감탄형, 정보형, 대결형 등)
2. 키워드 배치 전략 (앞·중간·끝 배치 효과)
3. 심리적 트리거 요소 (호기심, 긴박감, 유익성, 공감 등)
4. 길이 및 형식 특징 (평균 자수, 부호 활용 등)
5. Google Discover 노출에 유리한 공통 요소
6. 피해야 할 패턴 (있을 경우)
""",
        }
    ]

    print("【패턴 분석 결과】")
    print("─" * 40)
    analysis = stream_call(analysis_messages)

    # 핵심 패턴 추출 (내부 처리, 짧게)
    extract_messages = [
        {
            "role": "user",
            "content": f"""위 분석을 바탕으로 핵심 패턴을 5~8개의 간결한 문장으로 추출해주세요.
각 패턴은 반드시 "- "로 시작하는 한 줄 문장이어야 합니다.
예: "- 숫자(Top N)를 제목 앞에 배치해 구체성과 신뢰감 부여"

분석 내용:
{analysis}""",
        }
    ]

    pattern_text = simple_call(extract_messages)
    new_patterns = [
        line.strip()[2:]
        for line in pattern_text.splitlines()
        if line.strip().startswith("- ")
    ]

    # 저장
    kb = load_kb()
    for title in titles:
        kb["discover_titles"].append(
            {"title": title, "added_at": datetime.now().isoformat()}
        )
    kb["title_patterns"].extend(new_patterns)
    # 중복 제거, 최근 50개 유지
    kb["title_patterns"] = list(dict.fromkeys(kb["title_patterns"]))[-50:]
    save_kb(kb)

    print(f"\n✅ {len(titles)}개 제목 학습 완료!")
    print(f"   누적 제목: {len(kb['discover_titles'])}개 | 추출된 패턴: {len(kb['title_patterns'])}개")


# ── 기능 4: Discover 노출 기사 학습 ───────────────────────────────────────

def learn_article():
    """Google Discover에 노출된 기사를 학습"""
    print("\n" + "━" * 60)
    print("  📚 Google Discover 노출 기사 학습")
    print("━" * 60)

    article = read_multiline("Discover에 노출됐던 기사를 입력해주세요. (제목 포함)")
    if not article:
        print("⚠  입력된 기사가 없습니다.")
        return

    print("\n🔍 기사 스타일 분석 중...\n")

    analysis_messages = [
        {
            "role": "user",
            "content": f"""다음은 Google Discover에 실제로 노출된 기사입니다.
이 기사의 스타일, 구조, 문체를 상세히 분석해주세요.

【기사 전문】
{article}

분석 항목:
1. 기사 구조 (단락 구성, 정보 배치 순서, 소제목 활용)
2. 리드(도입부) 작성 방식 (독자 흡인 전략)
3. 문체 특징 (문장 길이, 어조, 표현 방식, 능동/수동 활용)
4. 독자 참여 유도 요소 (질문, 감정 자극, 공감대 형성)
5. 정보 전달 방식 (사실, 인용, 통계, 사례 활용)
6. Google Discover 노출에 유리한 콘텐츠 특징
7. E-E-A-T 요소 충족 방식
8. 마무리 방식 (CTA, 정리, 여운 등)
""",
        }
    ]

    print("【기사 스타일 분석 결과】")
    print("─" * 40)
    analysis = stream_call(analysis_messages)

    # 핵심 패턴 추출
    extract_messages = [
        {
            "role": "user",
            "content": f"""위 분석에서 기사 작성에 재현 가능한 핵심 스타일 패턴을 5~8개 추출해주세요.
각 패턴은 반드시 "- "로 시작하는 한 줄 문장이어야 합니다.
예: "- 리드에서 숫자+구체적 상황 제시로 즉각적 관심 유도"

분석 내용:
{analysis}""",
        }
    ]

    pattern_text = simple_call(extract_messages)
    new_patterns = [
        line.strip()[2:]
        for line in pattern_text.splitlines()
        if line.strip().startswith("- ")
    ]

    # 저장
    kb = load_kb()
    preview = article[:200] + ("…" if len(article) > 200 else "")
    kb["discover_articles"].append(
        {"preview": preview, "added_at": datetime.now().isoformat()}
    )
    kb["article_style_patterns"].extend(new_patterns)
    kb["article_style_patterns"] = list(dict.fromkeys(kb["article_style_patterns"]))[-50:]
    save_kb(kb)

    print(f"\n✅ 기사 학습 완료!")
    print(f"   누적 기사: {len(kb['discover_articles'])}개 | 추출된 스타일 패턴: {len(kb['article_style_patterns'])}개")


# ── 기능 5: 학습 현황 확인 ────────────────────────────────────────────────

def show_status():
    """학습 현황 및 저장된 패턴 출력"""
    kb = load_kb()

    print("\n" + "━" * 60)
    print("  📊 학습 현황")
    print("━" * 60)
    print(f"  📰 학습된 Discover 노출 제목 : {len(kb['discover_titles'])}개")
    print(f"  📄 학습된 Discover 노출 기사 : {len(kb['discover_articles'])}개")
    print(f"  💡 추출된 제목 패턴          : {len(kb['title_patterns'])}개")
    print(f"  💡 추출된 기사 스타일 패턴   : {len(kb['article_style_patterns'])}개")
    if kb.get("last_updated"):
        print(f"  🕒 마지막 업데이트           : {kb['last_updated'][:19]}")

    if kb["discover_titles"]:
        print("\n【최근 학습된 제목 (최대 5개)】")
        for item in kb["discover_titles"][-5:]:
            print(f"  · {item['title']}")

    if kb["title_patterns"]:
        print("\n【학습된 제목 패턴 (최대 5개)】")
        for p in kb["title_patterns"][-5:]:
            print(f"  · {p}")

    if kb["article_style_patterns"]:
        print("\n【학습된 기사 스타일 패턴 (최대 5개)】")
        for p in kb["article_style_patterns"][-5:]:
            print(f"  · {p}")

    if not any([kb["discover_titles"], kb["title_patterns"], kb["article_style_patterns"]]):
        print("\n  아직 학습된 데이터가 없습니다.")
        print("  메뉴 3·4번으로 Discover 노출 사례를 학습하면")
        print("  더 정확하고 맞춤화된 추천이 가능합니다.")


# ── 메인 ──────────────────────────────────────────────────────────────────

BANNER = """
╔══════════════════════════════════════════════════════════╗
║       성장형 기사 개선 및 제목 생성기                    ║
║       Google Discover 최적화 AI 도구                     ║
╚══════════════════════════════════════════════════════════╝
"""

MENU = """
┌─────────────────────────────────────────────────────┐
│  1.  기사 분석 및 제목·본문 개선 제안               │
│  2.  기사 재작성 (직전 분석 기사 또는 새 입력)      │
│  ─────────────────────────────────────────────────  │
│  3.  [학습] Google Discover 노출 제목 입력          │
│  4.  [학습] Google Discover 노출 기사 입력          │
│  ─────────────────────────────────────────────────  │
│  5.  학습 현황 확인                                 │
│  0.  종료                                           │
└─────────────────────────────────────────────────────┘"""


def main():
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("❌ ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.")
        print("   export ANTHROPIC_API_KEY='your-api-key'")
        sys.exit(1)

    print(BANNER)

    last_article: str | None = None
    last_analysis: str | None = None

    while True:
        print(MENU)
        choice = input("선택 (0~5): ").strip()

        if choice == "1":
            result = analyze_article()
            if result:
                last_article, last_analysis = result
                ans = input("\n\n지금 바로 재작성하시겠습니까? (y/n): ").strip().lower()
                if ans == "y":
                    rewrite_article(last_article, last_analysis)

        elif choice == "2":
            if last_article:
                ans = input("직전 분석 기사를 재작성합니까? (y=직전 기사 / n=새 기사 입력): ").strip().lower()
                if ans == "y":
                    rewrite_article(last_article, last_analysis or "")
                else:
                    result = analyze_article()
                    if result:
                        last_article, last_analysis = result
                        rewrite_article(last_article, last_analysis)
            else:
                print("\n💡 먼저 기사를 분석합니다.")
                result = analyze_article()
                if result:
                    last_article, last_analysis = result
                    rewrite_article(last_article, last_analysis)

        elif choice == "3":
            learn_titles()

        elif choice == "4":
            learn_article()

        elif choice == "5":
            show_status()

        elif choice == "0":
            print("\n프로그램을 종료합니다. 수고하셨습니다!\n")
            break

        else:
            print("⚠  0~5 사이의 숫자를 입력해주세요.")


if __name__ == "__main__":
    main()
