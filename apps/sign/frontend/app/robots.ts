import type { MetadataRoute } from "next";
import { siteUrl } from "@webapp/seo";

/**
 * robots.txt — 싸인 앱 영역.
 * basePath(/sign)에서 서빙되므로, 운영에선 메인도메인/sign/robots.txt 로 노출된다.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${siteUrl()}/sign/sitemap.xml`,
  };
}
