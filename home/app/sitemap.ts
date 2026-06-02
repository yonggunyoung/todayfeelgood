import type { MetadataRoute } from "next";
import { siteUrl } from "@webapp/seo";

/** 홈(루트) sitemap. 폰트 앱은 자체 sitemap(/font/sitemap.xml)을 가진다. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
  ];
}
