import type { Metadata } from "next";
import { buildMeta } from "@webapp/seo";
import { LegalView } from "../../../components/LegalView";
import { getDictionary, legalAlternates, legalPath } from "../../../lib/i18n";

const t = getDictionary("ko");
export const metadata: Metadata = buildMeta({
  title: t.legal.privacy.seoTitle,
  description: t.legal.privacy.seoDescription,
  path: legalPath("ko", "privacy"),
  locale: "ko",
  alternates: legalAlternates("privacy"),
});

export default function PrivacyPage() {
  return <LegalView locale="ko" doc="privacy" />;
}
