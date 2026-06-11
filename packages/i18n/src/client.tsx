"use client";

/**
 * 클라이언트 로케일 도구 — Provider / useLocale / LangToggle.
 *
 * 서버에서 정한 로케일을 Provider 로 내려주고, 토글은 쿠키를 바꾸고 새로고침한다.
 * (사전은 서버에서 골라 prop 으로 내려주므로 여기엔 번역 텍스트가 없다.)
 */
import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from "./index";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return (
    <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
  );
}

/** 현재 로케일. */
export function useLocale(): Locale {
  return useContext(LocaleContext);
}

/** 로케일을 바꾸고(쿠키 저장) 새로고침한다. */
export function setLocale(next: Locale): void {
  if (typeof document === "undefined") return;
  const age = 60 * 60 * 24 * 180; // 180일
  document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${age}; samesite=lax`;
  window.location.reload();
}

const LABELS: Record<Locale, { short: string; aria: string }> = {
  ko: { short: "KR", aria: "한국어" },
  en: { short: "EN", aria: "English" },
};

/**
 * KR / EN 토글 버튼. 자동 감지를 사용자가 직접 덮어쓸 수 있게 한다.
 * 토큰(--ink-soft/--hairline)에 의존해 모든 앱에서 동일하게 보인다(ExitToHub 와 동일 톤).
 */
export function LangToggle({ className }: { className?: string }) {
  const locale = useLocale();
  const next: Locale = locale === "ko" ? "en" : "ko";
  return (
    <button
      type="button"
      onClick={() => setLocale(next)}
      className={className}
      aria-label={`${LABELS[next].aria}(으)로 보기`}
      title={`${LABELS[next].aria}`}
      style={
        className
          ? undefined
          : {
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontFamily: "inherit",
              fontSize: "0.8rem",
              fontWeight: 700,
              letterSpacing: "0.02em",
              color: "var(--ink-soft)",
              background: "transparent",
              border: "1px solid var(--hairline)",
              borderRadius: "999px",
              padding: "7px 12px",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }
      }
    >
      <span aria-hidden>🌐</span>
      <span>
        <strong>{LABELS[locale].short}</strong>
        <span style={{ opacity: 0.4 }}> / {LABELS[next].short}</span>
      </span>
    </button>
  );
}
