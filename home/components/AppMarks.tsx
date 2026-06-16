import type { ReactNode } from "react";
import type { Locale } from "../lib/i18n";
import type { AppEntry } from "../lib/appsRegistry";
import styles from "../app/hub.module.css";

/**
 * 레지스트리 미니앱(apps.json)의 카드 비주얼.
 * 기존 너굴 카드 공식(그라데이션 썸네일 + 흰 견본 + chips + 아이콘 타일)을 그대로 따른다.
 * 새 앱은 아래 THUMBS / AppMark 두 곳에 항목만 추가하면 카드가 그럴싸해진다.
 * (설정이 없는 앱은 이모지 폴백 — 깨지지 않음.)
 */

/** 전용 SVG 심볼이 있는 앱인지 — 타일 스타일 분기에 사용(이모지 폴백 구분). */
export function hasAppMark(id: string): boolean {
  return id === "naengbiseo" || id === "gwangclick";
}

/** 앱별 고유 SVG 심볼(흰 면 + 본체색 악센트). 하단 타일·작은 썸네일에 공용. */
export function AppMark({ id, size = 30 }: { id: string; size?: number }): ReactNode {
  switch (id) {
    case "naengbiseo":
      // 양문형 냉장고 — 흰 본체에 본체색(currentColor) 분할선·손잡이.
      return (
        <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
          <rect x="15" y="5" width="18" height="38" rx="4.5" fill="#fff" />
          <line x1="15" y1="19" x2="33" y2="19" stroke="currentColor" strokeWidth="2.2" />
          <rect x="18.4" y="9" width="2.6" height="6.5" rx="1.3" fill="currentColor" />
          <rect x="18.4" y="23" width="2.6" height="9" rx="1.3" fill="currentColor" />
        </svg>
      );
    case "gwangclick":
      // 번개 — 속도·광클의 상징.
      return (
        <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
          <path d="M27 4 L12 27 h9 l-3 17 18-25 h-10 z" fill="#fff" />
        </svg>
      );
    default:
      return null;
  }
}

/** 카드 썸네일(견본) 설정 — 너굴 카드와 동일 구조. locale별 문구. */
const THUMBS: Record<
  string,
  {
    gradient: string;
    ko: { eyebrow: string; word: string; chips: string[] };
    en: { eyebrow: string; word: string; chips: string[] };
  }
> = {
  naengbiseo: {
    gradient: "linear-gradient(155deg, #34c08a, #2f9e6e 70%, #1c7a57)",
    ko: { eyebrow: "🧊 냉장고 비서", word: "오늘의 레시피", chips: ["토마토", "계란", "대파"] },
    en: { eyebrow: "🧊 Fridge Butler", word: "Today's recipe", chips: ["Tomato", "Egg", "Onion"] },
  },
  gwangclick: {
    gradient: "linear-gradient(155deg, #2a2b33, #0a0b0d 66%, #3a2740)",
    ko: { eyebrow: "⚡ 60초 광클", word: "민초 vs 반민초", chips: ["민초파", "반민초파", "60s"] },
    en: { eyebrow: "⚡ 60-sec battle", word: "Mint vs Anti", chips: ["Team Mint", "Team Anti", "60s"] },
  },
};

/** 허브 캐러셀 카드의 썸네일. 전용 설정이 있으면 견본 카드, 없으면 이모지 폴백. */
export function AppThumb({
  app,
  locale,
  liveLabel,
}: {
  app: AppEntry;
  locale: Locale;
  liveLabel: string;
}): ReactNode {
  const cfg = THUMBS[app.id];
  if (cfg) {
    const c = locale === "ko" ? cfg.ko : cfg.en;
    return (
      <div className={styles.thumb} style={{ background: cfg.gradient }}>
        <span className={styles.eyebrow}>{c.eyebrow}</span>
        <span className={styles.badge}>{liveLabel}</span>
        <div className={styles.specimen}>
          <div className={styles.specimenWord}>{c.word}</div>
          <div className={styles.chips}>
            {c.chips.map((x) => (
              <span key={x} className={styles.chip}>
                {x}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }
  // 폴백: 색 배경 + 이모지(기존 동작 유지).
  return (
    <div
      className={styles.thumb}
      style={{
        background: app.color ?? "var(--candy-mint)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span className={styles.badge}>{liveLabel}</span>
      <span style={{ fontSize: "3.4rem" }} aria-hidden>
        {app.emoji ?? "🧩"}
      </span>
    </div>
  );
}
