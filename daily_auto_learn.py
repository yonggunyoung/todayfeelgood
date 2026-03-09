#!/usr/bin/env python3
"""
일일 자동 학습 스크립트
- 구글 코어업데이트 뉴스 수집 · 분석
- 구글 디스커버 자동차 트렌딩 제목 수집 · 분석
- knowledge_base.json 자동 업데이트

실행: python3 daily_auto_learn.py
크론: 0 9 * * * cd /home/user && python3 daily_auto_learn.py >> daily_learn.log 2>&1
"""

import json
import os
import re
import sys
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import quote

import anthropic
import requests
from bs4 import BeautifulSoup

# ── 상수 ────────────────────────────────────────────────────────────────────
BASE_DIR   = Path(__file__).parent
KB_FILE    = BASE_DIR / "knowledge_base.json"
LOG_FILE   = BASE_DIR / "daily_learn.log"
MODEL      = "claude-opus-4-6"
KST        = timezone(timedelta(hours=9))

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    )
}

# 구글 뉴스 RSS — 자동차 키워드 쿼리 목록
AUTO_QUERIES = [
    "팰리세이드 시승 후기",
    "카니발 구매 후기",
    "GV80 GV70 시승",
    "아이오닉 중고 실연비",
    "자동차 하이브리드 전기차 비교",
    "기아 현대 신차 출시",
    "자동차 연비 장거리",
]

# 구글 코어업데이트 RSS 소스
CORE_UPDATE_FEEDS = [
    # Search Engine Roundtable — 가장 빠른 코어업데이트 보고
    "https://www.seroundtable.com/feed",
    # Search Engine Land
    "https://searchengineland.com/feed",
]

CORE_KEYWORDS = [
    "core update", "algorithm update", "google update",
    "search ranking", "google algorithm",
]


# ── 로깅 ────────────────────────────────────────────────────────────────────

def log(msg: str):
    ts = datetime.now(KST).strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line, flush=True)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(line + "\n")


# ── 지식 베이스 ──────────────────────────────────────────────────────────────

def load_kb() -> dict:
    if KB_FILE.exists():
        with open(KB_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {
        "discover_titles": [],
        "discover_articles": [],
        "title_patterns": [],
        "article_style_patterns": [],
        "core_update_logs": [],
        "auto_trending_log": [],
        "last_updated": None,
    }


def save_kb(kb: dict):
    # 신규 필드가 없으면 추가
    kb.setdefault("core_update_logs", [])
    kb.setdefault("auto_trending_log", [])
    kb["last_updated"] = datetime.now(KST).isoformat()
    with open(KB_FILE, "w", encoding="utf-8") as f:
        json.dump(kb, f, ensure_ascii=False, indent=2)


# ── 구글 뉴스 RSS 파싱 ────────────────────────────────────────────────────────

def fetch_gnews_rss(query: str, max_items: int = 5) -> list[dict]:
    """구글 뉴스 RSS에서 최신 기사 목록 반환"""
    url = (
        f"https://news.google.com/rss/search"
        f"?q={quote(query)}&hl=ko&gl=KR&ceid=KR:ko"
    )
    try:
        resp = requests.get(url, headers=HEADERS, timeout=10)
        resp.raise_for_status()
        root = ET.fromstring(resp.content)
        items = []
        for item in root.findall(".//item")[:max_items]:
            title = item.findtext("title", "").strip()
            pub   = item.findtext("pubDate", "").strip()
            link  = item.findtext("link", "").strip()
            # <source> 태그 안의 언론사명
            source_el = item.find("source")
            source = source_el.text.strip() if source_el is not None else ""
            # 제목에서 " - 언론사" 접미사 제거
            clean_title = re.sub(r"\s*-\s*[^-]+$", "", title).strip()
            if clean_title:
                items.append({
                    "title": clean_title,
                    "source": source,
                    "pub": pub,
                    "link": link,
                    "query": query,
                })
        return items
    except Exception as e:
        log(f"  RSS 오류 ({query[:20]}...): {e}")
        return []


# ── 코어업데이트 RSS 파싱 ─────────────────────────────────────────────────────

def fetch_core_update_news(since_days: int = 1) -> list[dict]:
    """SEO 뉴스 RSS에서 코어업데이트 관련 기사 수집"""
    cutoff = datetime.now(timezone.utc) - timedelta(days=since_days)
    results = []

    for feed_url in CORE_UPDATE_FEEDS:
        try:
            resp = requests.get(feed_url, headers=HEADERS, timeout=10)
            resp.raise_for_status()
            root = ET.fromstring(resp.content)

            for item in root.findall(".//item"):
                title = item.findtext("title", "").strip().lower()
                desc  = item.findtext("description", "").strip().lower()
                text  = title + " " + desc

                if not any(kw in text for kw in CORE_KEYWORDS):
                    continue

                # 날짜 파싱
                pub_str = item.findtext("pubDate", "")
                try:
                    from email.utils import parsedate_to_datetime
                    pub_dt = parsedate_to_datetime(pub_str)
                    if pub_dt < cutoff:
                        continue
                except Exception:
                    pass

                orig_title = item.findtext("title", "").strip()
                link       = item.findtext("link", "").strip()
                results.append({"title": orig_title, "link": link, "source": feed_url})

        except Exception as e:
            log(f"  코어업데이트 RSS 오류 ({feed_url}): {e}")

    return results


# ── Claude API ──────────────────────────────────────────────────────────────

def call_claude(prompt: str, max_tokens: int = 2000) -> str:
    client = anthropic.Anthropic()
    resp = client.messages.create(
        model=MODEL,
        max_tokens=max_tokens,
        messages=[{"role": "user", "content": prompt}],
    )
    return resp.content[0].text


# ── 자동차 트렌딩 학습 ────────────────────────────────────────────────────────

def learn_auto_trending(kb: dict) -> int:
    """구글 뉴스 RSS로 자동차 트렌딩 제목 수집 → 패턴 추출 → KB 저장"""
    log("▶ 자동차 트렌딩 수집 시작")

    all_items: list[dict] = []
    for query in AUTO_QUERIES:
        items = fetch_gnews_rss(query, max_items=5)
        all_items.extend(items)
        time.sleep(0.5)  # 과도한 요청 방지

    if not all_items:
        log("  수집된 기사 없음")
        return 0

    # 중복 제목 제거
    seen: set[str] = set()
    unique: list[dict] = []
    for item in all_items:
        t = item["title"]
        if t not in seen:
            seen.add(t)
            unique.append(item)

    log(f"  수집 완료: {len(unique)}개 (중복 제거 후)")

    # 기존 학습 제목 목록
    existing = {i["title"] for i in kb.get("discover_titles", [])}
    new_items = [i for i in unique if i["title"] not in existing]

    if not new_items:
        log("  신규 제목 없음 — 학습 건너뜀")
        return 0

    # Claude로 Discover 적합도 평가 및 패턴 추출
    titles_text = "\n".join(f"- {i['title']}" for i in new_items)
    prompt = f"""다음은 오늘 구글 뉴스에서 수집한 한국 자동차 관련 기사 제목입니다.

【수집 제목 목록】
{titles_text}

아래 두 가지를 JSON으로만 응답하세요 (다른 설명 없이):

{{
  "discover_worthy": ["Discover 노출 가능성 높은 제목만 선별 — 감정 훅, 직접 경험, 비교 결정, 시의성 중 하나 이상 충족"],
  "patterns": ["이 제목들에서 추출한 Google Discover 최적 제목 패턴 5~8개 (각각 한 줄, 구체적으로)"]
}}

선별 기준:
- 감정 훅 (후기, 후회, 놀람, 공감)
- 숫자 + 직접 경험 (6개월, 1만km, 3년차)
- 비교·결정 의도 (vs, 이냐 저냐, 계산)
- 시의성 (2026, 출시 전, 요즘)
- 전문가 진단 (기자, 딜러, 시승)
클릭베이트성 단순 정보 나열형은 제외.
"""

    try:
        raw = call_claude(prompt, max_tokens=1500)
        # JSON 블록 추출
        match = re.search(r"\{[\s\S]+\}", raw)
        if not match:
            raise ValueError("JSON 파싱 실패")
        data = json.loads(match.group())
        worthy   = data.get("discover_worthy", [])
        patterns = data.get("patterns", [])
    except Exception as e:
        log(f"  Claude 분석 오류: {e} — 전체 제목을 그대로 저장")
        worthy   = [i["title"] for i in new_items]
        patterns = []

    # KB에 저장
    today = datetime.now(KST).strftime("%Y-%m-%d")
    added = 0
    for title in worthy:
        kb["discover_titles"].append({
            "title": title,
            "added_at": datetime.now(KST).isoformat(),
            "source": "auto_gnews",
        })
        added += 1

    # 패턴 누적 (최대 50개, 중복 제거)
    kb["title_patterns"].extend(patterns)
    kb["title_patterns"] = list(dict.fromkeys(kb["title_patterns"]))[-50:]

    # 트렌딩 로그 기록
    kb["auto_trending_log"].append({
        "date": today,
        "collected": len(new_items),
        "discover_worthy": len(worthy),
        "sample_titles": worthy[:5],
    })
    # 최근 90일치만 유지
    kb["auto_trending_log"] = kb["auto_trending_log"][-90:]

    log(f"  저장 완료: Discover 적합 {added}개, 신규 패턴 {len(patterns)}개")
    return added


# ── 코어업데이트 학습 ──────────────────────────────────────────────────────────

def learn_core_updates(kb: dict) -> bool:
    """SEO 뉴스 RSS에서 코어업데이트 수집 → 래디언스리포트 적용 방향 분석 → KB 저장"""
    log("▶ 구글 코어업데이트 확인 시작")

    news = fetch_core_update_news(since_days=1)

    if not news:
        log("  오늘 코어업데이트 뉴스 없음")
        return False

    log(f"  코어업데이트 관련 기사 {len(news)}건 발견")

    # 기사 목록 정리
    news_text = "\n".join(
        f"- [{i+1}] {item['title']} ({item['source']})"
        for i, item in enumerate(news)
    )

    prompt = f"""다음은 오늘 해외 SEO 미디어에서 수집한 구글 코어업데이트 관련 기사 목록입니다.

【기사 목록】
{news_text}

아래 두 가지를 JSON으로만 응답하세요 (다른 설명 없이):

{{
  "summary": "한국 자동차 미디어(래디언스리포트) 관점에서 오늘 코어업데이트의 핵심을 3~4문장으로 요약",
  "impact": "래디언스리포트가 즉시 적용해야 할 조치 사항 3가지 (구체적, 한 줄씩)",
  "discover_effect": "Google Discover 노출에 미치는 영향 — 긍정/중립/부정 중 하나와 이유"
}}
"""

    try:
        raw = call_claude(prompt, max_tokens=800)
        match = re.search(r"\{[\s\S]+\}", raw)
        if not match:
            raise ValueError("JSON 파싱 실패")
        analysis = json.loads(match.group())
    except Exception as e:
        log(f"  Claude 분석 오류: {e}")
        analysis = {
            "summary": f"코어업데이트 관련 기사 {len(news)}건 발견 (자동 분석 실패)",
            "impact": "수동 확인 필요",
            "discover_effect": "미확인",
        }

    today = datetime.now(KST).strftime("%Y-%m-%d")
    kb["core_update_logs"].append({
        "date": today,
        "articles_found": len(news),
        "article_titles": [i["title"] for i in news],
        "summary": analysis.get("summary", ""),
        "impact": analysis.get("impact", ""),
        "discover_effect": analysis.get("discover_effect", ""),
    })
    # 최근 365일치만 유지
    kb["core_update_logs"] = kb["core_update_logs"][-365:]

    log("  코어업데이트 분석 완료:")
    log(f"    요약: {analysis.get('summary', '')[:80]}...")
    log(f"    Discover 영향: {analysis.get('discover_effect', '')}")
    return True


# ── 오늘 이미 실행했는지 확인 ────────────────────────────────────────────────

def already_ran_today(kb: dict) -> bool:
    """오늘 이미 자동 학습이 실행된 경우 True"""
    today = datetime.now(KST).strftime("%Y-%m-%d")
    logs = kb.get("auto_trending_log", [])
    if logs and logs[-1].get("date") == today:
        return True
    return False


# ── 오늘 학습 결과 요약 출력 ─────────────────────────────────────────────────

def print_summary(kb: dict):
    today = datetime.now(KST).strftime("%Y-%m-%d")
    print("\n" + "━" * 60)
    print("  📊 오늘의 자동 학습 결과")
    print("━" * 60)

    # 트렌딩 로그
    t_logs = kb.get("auto_trending_log", [])
    if t_logs and t_logs[-1].get("date") == today:
        t = t_logs[-1]
        print(f"\n[자동차 트렌딩]")
        print(f"  수집: {t['collected']}개  →  Discover 적합: {t['discover_worthy']}개")
        if t.get("sample_titles"):
            print("  샘플 제목:")
            for s in t["sample_titles"][:3]:
                print(f"    · {s}")

    # 코어업데이트 로그
    c_logs = kb.get("core_update_logs", [])
    if c_logs and c_logs[-1].get("date") == today:
        c = c_logs[-1]
        print(f"\n[코어업데이트]")
        print(f"  관련 기사: {c['articles_found']}건")
        if c.get("summary"):
            print(f"  요약: {c['summary'][:120]}...")
        if c.get("discover_effect"):
            print(f"  Discover 영향: {c['discover_effect']}")
        if c.get("impact"):
            print(f"  적용 조치: {c['impact'][:100]}...")

    print(f"\n  누적 학습 제목: {len(kb.get('discover_titles', []))}개")
    print(f"  누적 패턴: {len(kb.get('title_patterns', []))}개")
    print("━" * 60 + "\n")


# ── 메인 ────────────────────────────────────────────────────────────────────

def main():
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("❌ ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.")
        print("   export ANTHROPIC_API_KEY='your-api-key'")
        sys.exit(1)

    log("═" * 50)
    log("일일 자동 학습 시작")

    kb = load_kb()

    # 강제 재실행 옵션 (--force)
    force = "--force" in sys.argv
    if not force and already_ran_today(kb):
        log("오늘 이미 실행됨 (강제 재실행: --force)")
        print_summary(kb)
        return

    # 1. 구글 코어업데이트 확인
    learn_core_updates(kb)
    time.sleep(1)

    # 2. 자동차 트렌딩 제목 수집
    added = learn_auto_trending(kb)

    # 저장
    save_kb(kb)

    log(f"일일 자동 학습 완료 — 신규 제목 {added}개 추가")
    print_summary(kb)


if __name__ == "__main__":
    main()
