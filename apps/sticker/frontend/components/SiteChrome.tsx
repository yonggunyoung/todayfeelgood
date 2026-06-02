import type { ReactNode } from "react";
import { Mascot } from "@webapp/ui";
import styles from "./SiteChrome.module.css";

/** 워드마크 "획 — 스티커공방" + 블러 머티리얼 헤더(폰트앱과 동일 패턴). */
export function SiteHeader({ right }: { right?: ReactNode }) {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.bar}`}>
        {/* 도메인 루트의 홈 허브(home/)로 이동. basePath(/sticker)가 붙지 않게 일반 <a href="/">. */}
        <a href="/" className={styles.brand} aria-label="획 — 홈으로">
          <Mascot mood="happy" size={36} still label="" />
          <span className={`display ${styles.wordmark}`}>
            <span className={styles.name}>획</span>
            <span className={styles.sub}>스티커공방</span>
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
          획 스티커공방 — 한 번 그리면 표정 한 세트. 만든 스티커는 모두 당신의 것이에요.
        </p>
        <p className={styles.fineprint}>
          AI 없이 브라우저에서 자동 합성합니다. 그림은 어디로도 보내지 않아요.
        </p>
      </div>
    </footer>
  );
}
