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
    },
  ];
}
