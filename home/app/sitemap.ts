import type { MetadataRoute } from "next";
import { siteUrl } from "@webapp/seo";
import { ARTICLES } from "./(ko)/stories/articles";

/**
 * 홈(루트) sitemap — 한국어(`/`)·영어(`/en`) 양쪽을 언어 대체(alternates)와 함께 노출.
 * 폰트 앱은 자체 sitemap(/font/sitemap.xml)을 가진다.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const now = new Date();
  const languages = {
    ko: base,
    en: `${base}/en`,
    "x-default": base,
  };
  // 법적 페이지(개인정보처리방침·이용약관)도 ko/en 양쪽을 alternates와 함께 노출.
  const legalLangs = (doc: string) => ({
    ko: `${base}/${doc}`,
    en: `${base}/en/${doc}`,
    "x-default": `${base}/${doc}`,
  });
  return [
    {
      url: base,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
      alternates: { languages },
    },
    {
      url: `${base}/en`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
      alternates: { languages },
    },
    // 너굴이의 작은 도구 공방(웹앱) 랜딩 — ko/en. 폰트앱 등 개별 도구는 각자 sitemap.
    {
      url: `${base}/neogul`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.9,
      alternates: {
        languages: {
          ko: `${base}/neogul`,
          en: `${base}/en/neogul`,
          "x-default": `${base}/neogul`,
        },
      },
    },
    {
      url: `${base}/en/neogul`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
      alternates: {
        languages: {
          ko: `${base}/neogul`,
          en: `${base}/en/neogul`,
          "x-default": `${base}/neogul`,
        },
      },
    },
    // 사용법·소개·FAQ(가이드) — 검색 노출·애드센스 승인용 본문 콘텐츠. ko/en.
    {
      url: `${base}/guide`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
      alternates: {
        languages: {
          ko: `${base}/guide`,
          en: `${base}/en/guide`,
          "x-default": `${base}/guide`,
        },
      },
    },
    {
      url: `${base}/en/guide`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
      alternates: {
        languages: {
          ko: `${base}/guide`,
          en: `${base}/en/guide`,
          "x-default": `${base}/guide`,
        },
      },
    },
    // 소개·FAQ·읽을거리(목록) — 본문 콘텐츠(애드센스/검색). 현재 ko.
    ...["about", "faq", "stories"].map((doc) => ({
      url: `${base}/${doc}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    // 개별 아티클(읽을거리 글) — 각각 고유 URL. 실용 가이드는 검색 유입 우선이라 priority↑.
    ...ARTICLES.map((a) => ({
      url: `${base}/stories/${a.slug}`,
      lastModified: a.updated ? new Date(a.updated) : now,
      changeFrequency: "monthly" as const,
      priority: a.tag === "실용 가이드" ? 0.6 : 0.5,
    })),
    ...["privacy", "terms"].flatMap((doc) => [
      {
        url: `${base}/${doc}`,
        lastModified: now,
        changeFrequency: "yearly" as const,
        priority: 0.3,
        alternates: { languages: legalLangs(doc) },
      },
      {
        url: `${base}/en/${doc}`,
        lastModified: now,
        changeFrequency: "yearly" as const,
        priority: 0.3,
        alternates: { languages: legalLangs(doc) },
      },
    ]),
  ];
}
