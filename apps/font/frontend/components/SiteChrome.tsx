import type { ReactNode } from "react";
import { Mascot } from "@webapp/ui";
import styles from "./SiteChrome.module.css";

/** 워드마크 "획" + 공방 부제. 사이트 상단 공통 헤더(블러 머티리얼). */
export function SiteHeader({ right }: { right?: ReactNode }) {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.bar}`}>
        {/* 도메인 루트의 홈 허브(home/)로 이동.
            폰트앱은 basePath=/font라 next/Link는 자동으로 /font를 붙여 홈 허브로 못 간다.
            따라서 basePath가 붙지 않는 일반 <a href="/">로 도메인 루트(홈 허브)를 가리킨다. */}
        <a href="/" className={styles.brand} aria-label="획 — 홈으로">
          <Mascot mood="happy" size={36} still label="" />
          <span className={`display ${styles.wordmark}`}>
            <span className={styles.name}>획</span>
            <span className={styles.sub}>폰트공방</span>
          </span>
        </a>
        {right && <div className={styles.right}>{right}</div>}
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.footerInner}`}>
        <p className={styles.colophon}>
          획 폰트공방 — 글씨에 표정을 입히는 작은 도구. 만든 글자는 모두 당신의 것이에요.
        </p>
        <p className={styles.fineprint}>
          폰트는 이 자리에서 바로 받아요. 어디로도 보내지 않습니다.
        </p>
      </div>
    </footer>
  );
}
