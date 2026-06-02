import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./SiteChrome.module.css";

/** 워드마크 "획" + 공방 부제. 사이트 상단 공통 헤더. */
export function SiteHeader({ right }: { right?: ReactNode }) {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.bar}`}>
        <Link href="/" className={styles.brand} aria-label="획 폰트공방 홈">
          <span className={styles.mark}>획</span>
          <span className={styles.wordmark}>
            <span className={styles.name}>획</span>
            <span className={`sans ${styles.sub}`}>폰트공방</span>
          </span>
        </Link>
        {right && <div className={`sans ${styles.right}`}>{right}</div>}
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className={`sans ${styles.footer}`}>
      <div className={`container ${styles.footerInner}`}>
        <p className={styles.colophon}>
          획 폰트공방 — 손끝으로 빚는 글자체. 모든 글자는 당신의 것입니다.
        </p>
        <p className={styles.fineprint}>
          만든 폰트는 이 자리에서 바로 내려받습니다. 외부로 보내지 않습니다.
        </p>
      </div>
    </footer>
  );
}
