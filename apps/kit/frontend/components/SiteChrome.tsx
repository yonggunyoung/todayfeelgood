import type { ReactNode } from "react";
import { Mascot, ExitToHub } from "@webapp/ui";
import styles from "./SiteChrome.module.css";

/** "획 — 키트공방" 헤더. 획 로고→도구공방(/neogul), 나가기→뚝딱 홈(/). */
export function SiteHeader({ right }: { right?: ReactNode }) {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.bar}`}>
        {/* 획 로고 → 도구공방 상위로. basePath(/kit) 안 붙게 일반 <a>. */}
        <a href="/neogul" className={styles.brand} aria-label="획 — 도구공방으로">
          <Mascot mood="happy" size={36} still label="" />
          <span className={`display ${styles.wordmark}`}>
            <span className={styles.name}>획</span>
            <span className={styles.sub}>키트공방</span>
            <span style={{ marginLeft: 6, fontSize: "0.58rem", fontWeight: 800, letterSpacing: "0.06em", color: "var(--bg)", background: "var(--ink)", borderRadius: 999, padding: "2px 7px" }}>BETA</span>
          </span>
        </a>
        <div className={styles.right}>
          {right}
          <ExitToHub />
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.footerInner}`}>
        <p className={styles.colophon}>
          획 키트공방 — 글씨체·색·로고를 한 벌로. 만든 키트는 모두 당신의 것이에요.
        </p>
        <p className={styles.fineprint}>
          공개 가변폰트 변형 기반 키트예요. 폰트 라이선스 고지를 함께 담아 드려요.
        </p>
      </div>
    </footer>
  );
}
