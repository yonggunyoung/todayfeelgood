import type { ReactNode } from "react";
import { Mascot, ExitToHub } from "@webapp/ui";
import styles from "./SiteChrome.module.css";

/** "획 싸인공방" 헤더. 획 로고→도구공방(/neogul), 나가기→뚝딱 홈(/). */
export function SiteHeader({ right }: { right?: ReactNode }) {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.bar}`}>
        {/* 획 로고 → 도구공방 상위로. basePath(/sign) 안 붙게 일반 <a>. */}
        <a href="/neogul" className={styles.brand} aria-label="획 — 도구공방으로">
          <Mascot mood="happy" size={36} still label="" />
          <span className={`display ${styles.wordmark}`}>
            <span className={styles.name}>획</span>
            <span className={styles.sub}>싸인공방</span>
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
