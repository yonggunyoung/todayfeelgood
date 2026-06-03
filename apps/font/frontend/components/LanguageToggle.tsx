import type { Locale } from "../lib/i18n";
import styles from "./LanguageToggle.module.css";

/**
 * KO/EN 언어 토글(폰트 앱). 현재 페이지의 ko/en 라우트를 받아 로케일만 전환.
 * basePath(/font)는 next/Link가 자동으로 붙이므로 내부 라우트를 그대로 받는다.
 * 단, 토글은 <a>로 두어 전체 페이지 전환(언어 전환은 잦지 않음 + SSR 메타 갱신).
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
  /** basePath 포함 절대 경로(예: /font, /font/en) */
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
