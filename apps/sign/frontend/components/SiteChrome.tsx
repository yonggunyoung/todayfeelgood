import type { ReactNode } from "react";
import { Mascot } from "@webapp/ui";
import styles from "./SiteChrome.module.css";

/** 워드마크 "획 싸인공방" + 공통 헤더(블러 머티리얼). 폰트앱 SiteChrome 패턴 동일. */
export function SiteHeader({ right }: { right?: ReactNode }) {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.bar}`}>
        {/* basePath(/sign)가 붙지 않는 일반 <a href="/">로 도메인 루트(홈 허브)로 간다. */}
        <a href="/" className={styles.brand} aria-label="획 — 홈으로">
          <Mascot mood="happy" size={36} still label="" />
          <span className={`display ${styles.wordmark}`}>
            <span className={styles.name}>획</span>
            <span className={styles.sub}>싸인공방</span>
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
          획 싸인공방 — 이름을 서명 스타일로. 공개 가변폰트 변형 + 절차적 장식이며
          실제 자필이 아닙니다.
        </p>
        <p className={styles.fineprint}>
          만든 서명은 이 자리에서 바로 PNG·SVG로 받아요. 어디로도 보내지 않습니다.
        </p>
      </div>
    </footer>
  );
}
