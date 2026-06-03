import type { Metadata } from "next";
import { buildMeta } from "@webapp/seo";
import { LegalView } from "../../../../components/LegalView";
import { getDictionary, legalAlternates, legalPath } from "../../../../lib/i18n";

const t = getDictionary("en");
export const metadata: Metadata = buildMeta({
  title: t.legal.terms.seoTitle,
  description: t.legal.terms.seoDescription,
  path: legalPath("en", "terms"),
  locale: "en",
  alternates: legalAlternates("terms"),
});

export default function TermsPageEn() {
  return <LegalView locale="en" doc="terms" />;
}
