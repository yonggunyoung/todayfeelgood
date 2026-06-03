import type { Locale } from "../lib/i18n";
import styles from "./LanguageToggle.module.css";

/**
 * KO/EN 언어 토글. 현재 페이지의 ko/en 경로를 받아 로케일만 전환한다.
 * 서버 컴포넌트(링크만). 접근성: nav + aria-current.
 */
export function LanguageToggle({
  current,
  hrefKo,
  hrefEn,
  label,
  koLabel,
  enLabel,
}: {
  current: Locale;
  hrefKo: string;
  hrefEn: string;
  label: string;
  koLabel: string;
  enLabel: string;
}) {
  return (
    <nav className={styles.toggle} aria-label={label}>
      <a
        href={hrefKo}
        className={styles.item}
        lang="ko"
        hrefLang="ko"
        aria-current={current === "ko" ? "true" : undefined}
      >
        {koLabel}
      </a>
      <span className={styles.divider} aria-hidden>
        /
      </span>
      <a
        href={hrefEn}
        className={styles.item}
        lang="en"
        hrefLang="en"
        aria-current={current === "en" ? "true" : undefined}
      >
        {enLabel}
      </a>
    </nav>
  );
}
