import type { ReactNode } from "react";
import { Mascot } from "@webapp/ui";
import styles from "./SiteChrome.module.css";

/** 워드마크 "획 — 키트공방" + 블러 머티리얼 헤더(폰트·스티커앱과 동일 패턴). */
export function SiteHeader({ right }: { right?: ReactNode }) {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.bar}`}>
        {/* 도메인 루트의 홈 허브(home/)로 이동. basePath(/kit)가 붙지 않게 일반 <a href="/">. */}
        <a href="/" className={styles.brand} aria-label="획 — 홈으로">
          <Mascot mood="happy" size={36} still label="" />
          <span className={`display ${styles.wordmark}`}>
            <span className={styles.name}>획</span>
            <span className={styles.sub}>키트공방</span>
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
          획 키트공방 — 글씨체·색·로고를 한 벌로. 만든 키트는 모두 당신의 것이에요.
        </p>
        <p className={styles.fineprint}>
          공개 가변폰트 변형 기반 키트예요(비AI·실제 자필 아님). 폰트 라이선스 고지를 함께 담아 드려요.
        </p>
      </div>
    </footer>
  );
}
