import type { Metadata } from "next";
import { buildMeta } from "@webapp/seo";
import { GuideView } from "../../../components/GuideView";
import { getDictionary, guideAlternates, guidePath } from "../../../lib/i18n";

const t = getDictionary("ko");
export const metadata: Metadata = buildMeta({
  ...t.guide.meta,
  path: guidePath("ko"),
  locale: "ko",
  alternates: guideAlternates(),
});

export default function FontGuidePage() {
  return <GuideView locale="ko" />;
}
