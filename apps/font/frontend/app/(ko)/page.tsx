import type { Metadata } from "next";
import { buildMeta } from "@webapp/seo";
import { LandingView } from "../../components/LandingView";
import { getDictionary, landingAlternates, landingPath } from "../../lib/i18n";

const t = getDictionary("ko");
export const metadata: Metadata = buildMeta({
  ...t.seo,
  path: landingPath("ko"),
  locale: "ko",
  alternates: landingAlternates(),
});

export default function FontLandingPage() {
  return <LandingView locale="ko" />;
}
