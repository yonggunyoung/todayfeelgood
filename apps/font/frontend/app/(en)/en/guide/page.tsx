import type { Metadata } from "next";
import { buildMeta } from "@webapp/seo";
import { GuideView } from "../../../../components/GuideView";
import { getDictionary, guideAlternates, guidePath } from "../../../../lib/i18n";

const t = getDictionary("en");
export const metadata: Metadata = buildMeta({
  ...t.guide.meta,
  path: guidePath("en"),
  locale: "en",
  alternates: guideAlternates(),
});

export default function FontGuidePageEn() {
  return <GuideView locale="en" />;
}
