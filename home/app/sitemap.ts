import type { MetadataRoute } from "next";
import { siteUrl } from "@webapp/seo";

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
