/**
 * 공용 SEO 유틸 — 메타태그/OG/JSON-LD/robots/sitemap 생성 헬퍼.
 * 검색 노출이 핵심 목표이므로 모든 앱(폰트앱·홈)이 동일한 SEO 규칙을 재사용한다.
 *
 * 절대 URL(OG·canonical·sitemap)을 만들려면 사이트 베이스 URL이 필요하다.
 * 운영/개발에서 환경변수로 주입하고, 없으면 안전한 기본값을 쓴다.
 */

import type { Metadata } from "next";

/** 사이트 루트 절대 URL. (예: https://example.com) — 끝 슬래시 없이 정규화 */
export function siteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

/** 지원 로케일. 한국어가 기본, 영어로 해외 유입을 노린다. */
export type Locale = "ko" | "en";

/** OG/`og:locale`용 BCP-47 변형 매핑. */
const OG_LOCALE: Record<Locale, string> = {
  ko: "ko_KR",
  en: "en_US",
};

/** hreflang/JSON-LD inLanguage용 표준 언어 태그. */
const LANG_TAG: Record<Locale, string> = {
  ko: "ko-KR",
  en: "en-US",
};

export interface PageMeta {
  title: string;
  description: string;
  keywords?: readonly string[];
  /** 사이트 베이스 기준 경로 또는 절대 URL. canonical/OG 절대화에 사용. */
  path?: string;
  ogImage?: string;
  /** 이 페이지의 로케일. 기본값 "ko"(하위호환). og:locale·언어태그 결정. */
  locale?: Locale;
  /**
   * hreflang 대체 링크. 각 로케일의 경로(또는 절대 URL)를 준다.
   * 예: { ko: "/", en: "/en" }. x-default는 ko 경로를 사용.
   * 생략하면 alternates.languages를 만들지 않는다(하위호환).
   */
  alternates?: Partial<Record<Locale, string>>;
}

function absolute(pathOrUrl: string | undefined): string | undefined {
  if (!pathOrUrl) return undefined;
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  const base = siteUrl();
  return `${base}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

/** hreflang용 languages 맵을 절대 URL로 만든다. x-default = ko(없으면 en). */
function buildLanguageAlternates(
  alternates: Partial<Record<Locale, string>> | undefined
): Record<string, string> | undefined {
  if (!alternates) return undefined;
  const out: Record<string, string> = {};
  for (const loc of Object.keys(alternates) as Locale[]) {
    const abs = absolute(alternates[loc]);
    if (abs) out[LANG_TAG[loc]] = abs;
  }
  const xDefault = absolute(alternates.ko ?? alternates.en);
  if (xDefault) out["x-default"] = xDefault;
  return Object.keys(out).length ? out : undefined;
}

/**
 * Next.js App Router용 Metadata 객체를 만든다.
 * title/description/keywords/OG/Twitter/canonical을 일관되게 채운다.
 * locale·alternates를 주면 다국어 SEO(og:locale·hreflang)를 채운다.
 */
export function buildMeta(meta: PageMeta): Metadata {
  const url = absolute(meta.path);
  const ogImage = absolute(meta.ogImage);
  const locale = meta.locale ?? "ko";
  const languages = buildLanguageAlternates(meta.alternates);

  return {
    metadataBase: new URL(siteUrl()),
    title: meta.title,
    description: meta.description,
    keywords: meta.keywords ? [...meta.keywords] : undefined,
    alternates:
      url || languages
        ? { canonical: url, languages }
        : undefined,
    openGraph: {
      type: "website",
      locale: OG_LOCALE[locale],
      title: meta.title,
      description: meta.description,
      url,
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title: meta.title,
      description: meta.description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

/** `<html lang>`에 쓸 BCP-47 태그. layout에서 사용. */
export function htmlLang(locale: Locale): string {
  return LANG_TAG[locale];
}

/**
 * 검색엔진 사이트 소유확인 메타. 환경변수로 토큰을 주입(없으면 미출력 → 기본 OFF).
 * Metadata.verification 에 그대로 넣으면 `<meta name="...">`가 렌더된다.
 *   - Google Search Console: NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
 *   - 네이버 서치어드바이저: NEXT_PUBLIC_NAVER_SITE_VERIFICATION (naver-site-verification)
 *   - Bing Webmaster:        NEXT_PUBLIC_BING_SITE_VERIFICATION (msvalidate.01)
 * 참고: Google은 Cloudflare DNS TXT(도메인 속성)로도 확인 가능 — 그 경우 토큰 불필요.
 * NEXT_PUBLIC_* 는 빌드 시점에 구워지므로 도커 배포 시 빌드 인자로 넘겨야 한다(Dockerfile.next 참고).
 */
export function siteVerification(): Metadata["verification"] {
  const google = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined;
  const naver = process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION || undefined;
  const bing = process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION || undefined;

  const other: Record<string, string> = {};
  if (naver) other["naver-site-verification"] = naver;
  if (bing) other["msvalidate.01"] = bing;

  const verification: NonNullable<Metadata["verification"]> = {};
  if (google) verification.google = google;
  if (Object.keys(other).length) verification.other = other;

  return Object.keys(verification).length ? verification : undefined;
}

export interface WebAppJsonLdInput {
  name: string;
  description: string;
  /** 앱이 사는 경로(예: "/font") 또는 절대 URL */
  path?: string;
  /** 분류 (예: "DesignApplication") */
  category?: string;
  /** 가격(무료면 "0") */
  price?: string;
  inLanguage?: string;
}

/**
 * WebApplication/SoftwareApplication JSON-LD를 생성한다.
 * <script type="application/ld+json">에 JSON.stringify해서 주입할 것.
 */
export function webApplicationJsonLd(input: WebAppJsonLdInput) {
  const url = absolute(input.path) ?? siteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: input.name,
    description: input.description,
    url,
    applicationCategory: input.category ?? "DesignApplication",
    operatingSystem: "Web",
    inLanguage: input.inLanguage ?? LANG_TAG.ko,
    offers: {
      "@type": "Offer",
      price: input.price ?? "0",
      priceCurrency: "KRW",
    },
  };
}
