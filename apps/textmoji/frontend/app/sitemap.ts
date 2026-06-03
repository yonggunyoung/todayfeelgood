import type { MetadataRoute } from "next";
import { siteUrl } from "@webapp/seo";

/** sitemap.xml — 텍스트 이모티콘 앱의 주요 페이지(랜딩·작업대). */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const now = new Date();
  return [
    {
      url: `${base}/textmoji`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${base}/textmoji/studio`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];
}
