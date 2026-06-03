import type { Metadata } from "next";
import { buildMeta } from "@webapp/seo";
import { LandingView } from "../../../components/LandingView";
import { getDictionary, landingAlternates, landingPath } from "../../../lib/i18n";

// 폰트 앱 영어 랜딩(/font/en) — 해외 유입. 한국어 /font와 hreflang으로 상호 연결.
const t = getDictionary("en");
export const metadata: Metadata = buildMeta({
  ...t.seo,
  path: landingPath("en"),
  locale: "en",
  alternates: landingAlternates(),
});

export default function FontLandingPageEn() {
  return <LandingView locale="en" />;
}
