import type { ReactNode } from "react";
import { Mascot, ExitToHub } from "@webapp/ui";
import styles from "./SiteChrome.module.css";

/** "획 — 스티커공방" 헤더. 획 로고→도구공방(/neogul), 나가기→뚝딱 홈(/). */
export function SiteHeader({ right }: { right?: ReactNode }) {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.bar}`}>
        {/* 획 로고 → 도구공방 상위로. basePath(/sticker) 안 붙게 일반 <a>. */}
        <a href="/neogul" className={styles.brand} aria-label="획 — 도구공방으로">
          <Mascot mood="happy" size={36} still label="" />
          <span className={`display ${styles.wordmark}`}>
            <span className={styles.name}>획</span>
            <span className={styles.sub}>스티커공방</span>
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
          획 스티커공방 — 한 번 그리면 표정 한 세트. 만든 스티커는 모두 당신의 것이에요.
        </p>
        <p className={styles.fineprint}>
          그림은 이 브라우저 안에서만 처리돼요. 어디로도 보내지 않아요.
        </p>
      </div>
    </footer>
  );
}
