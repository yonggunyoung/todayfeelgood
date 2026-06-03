/**
 * 폰트 앱 다국어 사전 로더.
 * basePath=/font. 앱 내부 라우트로 KO=`/`(=/font), EN=`/en`(=/font/en).
 * SEO 절대경로(canonical/sitemap)는 basePath 포함 경로(/font, /font/en)를 쓴다.
 */
import { ko } from "./dictionaries/ko";
import { en } from "./dictionaries/en";
import type { Locale } from "@webapp/seo";

export type { Locale };
export const SUPPORTED: Locale[] = ["ko", "en"];
export const DEFAULT_LOCALE: Locale = "ko";

export type Dictionary = typeof ko;

const DICTS: Record<Locale, Dictionary> = { ko, en };

export function getDictionary(locale: Locale): Dictionary {
  return DICTS[locale] ?? DICTS[DEFAULT_LOCALE];
}

/** 앱 내부 라우트(basePath 제외). next/Link에 전달. ko=`/`, en=`/en`. */
export function landingRoute(locale: Locale): string {
  return locale === "ko" ? "/" : `/${locale}`;
}

/** 스튜디오 내부 라우트(basePath 제외). 랜딩 CTA 연결용. ko=`/studio`, en=`/en/studio`. */
export function studioRoute(locale: Locale = "ko"): string {
  return locale === "ko" ? "/studio" : `/${locale}/studio`;
}

/** 스튜디오 SEO 절대경로(basePath /font 포함). canonical/alternates용. */
export function studioPath(locale: Locale): string {
  return locale === "ko" ? "/font/studio" : `/font/${locale}/studio`;
}

/** 스튜디오 hreflang alternates 맵(ko↔en, basePath 포함). */
export function studioAlternates(): Record<Locale, string> {
  return { ko: studioPath("ko"), en: studioPath("en") };
}

/** SEO 절대경로(basePath /font 포함). canonical/sitemap/hreflang에 사용. */
export function landingPath(locale: Locale): string {
  return locale === "ko" ? "/font" : `/font/${locale}`;
}

/** hreflang alternates 맵(ko↔en, basePath 포함). buildMeta에 전달. */
export function landingAlternates(): Record<Locale, string> {
  return { ko: landingPath("ko"), en: landingPath("en") };
}
