import type { Metadata } from "next";
import { buildMeta } from "@webapp/seo";
import { GuideView } from "../../../../components/GuideView";
import { getDictionary, guideAlternates, guidePath } from "../../../../lib/i18n";

const t = getDictionary("en");
export const metadata: Metadata = buildMeta({
  title: t.guide.seoTitle,
  description: t.guide.seoDescription,
  path: guidePath("en"),
  locale: "en",
  ogImage: "/og",
  alternates: guideAlternates(),
});

export default function GuidePageEn() {
  return <GuideView locale="en" />;
}
