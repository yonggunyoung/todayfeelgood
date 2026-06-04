import type { Metadata } from "next";
import { buildMeta } from "@webapp/seo";
import { HomeView } from "../../../../components/HomeView";
import { getDictionary, neogulAlternates, neogulPath } from "../../../../lib/i18n";

// Neoguri's Tool Workshop (web app) landing in English. hreflang-linked with ko /neogul.
const t = getDictionary("en");
export const metadata: Metadata = buildMeta({
  ...t.seo,
  path: neogulPath("en"),
  locale: "en",
  alternates: neogulAlternates(),
});

export default function NeogulPageEn() {
  return <HomeView locale="en" />;
}
