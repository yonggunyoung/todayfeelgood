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

export interface PageMeta {
  title: string;
  description: string;
  keywords?: string[];
  /** 사이트 베이스 기준 경로 또는 절대 URL. canonical/OG 절대화에 사용. */
  path?: string;
  ogImage?: string;
}

function absolute(pathOrUrl: string | undefined): string | undefined {
  if (!pathOrUrl) return undefined;
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  const base = siteUrl();
  return `${base}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

/**
 * Next.js App Router용 Metadata 객체를 만든다.
 * title/description/keywords/OG/Twitter/canonical을 일관되게 채운다.
 */
export function buildMeta(meta: PageMeta): Metadata {
  const url = absolute(meta.path);
  const ogImage = absolute(meta.ogImage);

  return {
    metadataBase: new URL(siteUrl()),
    title: meta.title,
    description: meta.description,
    keywords: meta.keywords,
    alternates: url ? { canonical: url } : undefined,
    openGraph: {
      type: "website",
      locale: "ko_KR",
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
    inLanguage: input.inLanguage ?? "ko-KR",
    offers: {
      "@type": "Offer",
      price: input.price ?? "0",
      priceCurrency: "KRW",
    },
  };
}
