import type { MetadataRoute } from "next";
import { siteUrl } from "@webapp/seo";

/**
 * robots.txt — 텍스트 이모티콘 앱 영역.
 * basePath(/textmoji)에서 서빙되므로, 운영에선 메인도메인/textmoji/robots.txt 로 노출된다.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${siteUrl()}/textmoji/sitemap.xml`,
  };
}
