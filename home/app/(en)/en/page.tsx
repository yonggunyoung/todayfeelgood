import type { Metadata } from "next";
import { buildMeta } from "@webapp/seo";
import { HomeView } from "../../../components/HomeView";
import { getDictionary, homeAlternates, homePath } from "../../../lib/i18n";

// 영어 진입점(/en) — 해외 유입. 한국어 `/`와 hreflang으로 상호 연결.
const t = getDictionary("en");
export const metadata: Metadata = buildMeta({
  ...t.seo,
  path: homePath("en"),
  locale: "en",
  alternates: homeAlternates(),
});

export default function HomePageEn() {
  return <HomeView locale="en" />;
}
