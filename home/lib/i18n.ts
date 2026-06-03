/**
 * 홈(허브) 다국어 사전 로더.
 * 기본=한국어(`/`), 영어=`/en` 하위. 문자열은 dictionaries/{ko,en}.ts로 분리.
 * 새 언어는 SUPPORTED에 추가 + dictionaries에 같은 키 채우면 확장된다.
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

/** 로케일별 홈 경로(루트 기준). ko=`/`, en=`/en`. */
export function homePath(locale: Locale): string {
  return locale === "ko" ? "/" : `/${locale}`;
}

/** hreflang alternates 맵(ko↔en). buildMeta에 그대로 전달. */
export function homeAlternates(): Record<Locale, string> {
  return { ko: homePath("ko"), en: homePath("en") };
}
