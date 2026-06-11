"use client";

import { LOCALE_COOKIE } from "@webapp/i18n";
import type { Locale } from "../lib/i18n";
import styles from "./LanguageToggle.module.css";

/**
 * KO/EN 언어 토글(폰트 앱). 현재 페이지의 ko/en 라우트를 받아 로케일만 전환.
 * basePath(/font)는 절대경로(hrefKo/hrefEn)로 직접 받아 그대로 이동한다.
 * 클릭 시 tf_lang 쿠키를 저장해, 자동 감지 미들웨어가 사용자의 명시적 선택을 존중하게 한다.
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
  // 자동 감지보다 사용자의 명시적 선택을 우선시키도록 쿠키를 저장한 뒤 이동.
  function remember(loc: Locale) {
    document.cookie = `${LOCALE_COOKIE}=${loc}; path=/; max-age=${60 * 60 * 24 * 180}; samesite=lax`;
  }
  return (
    <nav className={styles.toggle} aria-label={label}>
      <a
        href={hrefKo}
        className={styles.item}
        lang="ko"
        hrefLang="ko"
        aria-current={current === "ko" ? "true" : undefined}
        onClick={() => remember("ko")}
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
        onClick={() => remember("en")}
      >
        {enLabel}
      </a>
    </nav>
  );
}
