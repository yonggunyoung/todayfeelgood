import type { Metadata } from "next";
import { buildMeta } from "@webapp/seo";
import { GuideView } from "../../../components/GuideView";
import { getDictionary, guideAlternates, guidePath } from "../../../lib/i18n";

const t = getDictionary("ko");
export const metadata: Metadata = buildMeta({
  title: t.guide.seoTitle,
  description: t.guide.seoDescription,
  path: guidePath("ko"),
  locale: "ko",
  alternates: guideAlternates(),
});

export default function GuidePage() {
  return <GuideView locale="ko" />;
}
