import type { ReactNode } from "react";
import { Mascot, ExitToHub } from "@webapp/ui";
import styles from "./SiteChrome.module.css";

/** "획 — 텍스트 이모티콘공방" 헤더. 획 로고→도구공방(/neogul), 나가기→뚝딱 홈(/). */
export function SiteHeader({ right }: { right?: ReactNode }) {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.bar}`}>
        {/* 획 로고 → 도구공방 상위로. basePath(/textmoji) 안 붙게 일반 <a>. */}
        <a href="/neogul" className={styles.brand} aria-label="획 — 도구공방으로">
          <Mascot mood="happy" size={36} still label="" />
          <span className={`display ${styles.wordmark}`}>
            <span className={styles.name}>획</span>
            <span className={styles.sub}>텍스트 이모티콘공방</span>
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
          획 텍스트 이모티콘공방 — 검색해도 안 나오는, 방금 만든 나만의 조합.
        </p>
        <p className={styles.fineprint}>
          안전등급은 추정치예요. 상대 기기·앱에선 □로 깨질 수 있어요. 만든 조합은
          이 브라우저 밖으로 안 나가요.
        </p>
      </div>
    </footer>
  );
}
