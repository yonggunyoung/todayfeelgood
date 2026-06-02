import type { MetadataRoute } from "next";
import { siteUrl } from "@webapp/seo";

/** sitemap.xml — 스티커 앱의 주요 페이지(랜딩·공방). */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const now = new Date();
  return [
    {
      url: `${base}/sticker`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${base}/sticker/studio`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];
}
