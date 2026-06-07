import type { MetadataRoute } from "next";
import { siteUrl } from "@webapp/seo";

/**
 * sitemap.xml — 폰트 앱의 주요 페이지(랜딩 ko/en·공방).
 * 운영에선 메인도메인/font/sitemap.xml 로 노출된다(basePath /font).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const now = new Date();
  const landingAlternates = {
    ko: `${base}/font`,
    en: `${base}/font/en`,
    "x-default": `${base}/font`,
  };
  const studioAlternates = {
    ko: `${base}/font/studio`,
    en: `${base}/font/en/studio`,
    "x-default": `${base}/font/studio`,
  };
  const guideAlternates = {
    ko: `${base}/font/guide`,
    en: `${base}/font/en/guide`,
    "x-default": `${base}/font/guide`,
  };
  return [
    {
      url: `${base}/font`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
      alternates: { languages: landingAlternates },
    },
    {
      url: `${base}/font/en`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
      alternates: { languages: landingAlternates },
    },
    {
      url: `${base}/font/studio`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
      alternates: { languages: studioAlternates },
    },
    {
      url: `${base}/font/en/studio`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
      alternates: { languages: studioAlternates },
    },
    {
      url: `${base}/font/guide`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
      alternates: { languages: guideAlternates },
    },
    {
      url: `${base}/font/en/guide`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
      alternates: { languages: guideAlternates },
    },
  ];
}
