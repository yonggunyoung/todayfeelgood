import type { Metadata } from "next";
import { buildMeta } from "@webapp/seo";
import { LegalView } from "../../../components/LegalView";
import { getDictionary, legalAlternates, legalPath } from "../../../lib/i18n";

const t = getDictionary("ko");
export const metadata: Metadata = buildMeta({
  title: t.legal.terms.seoTitle,
  description: t.legal.terms.seoDescription,
  path: legalPath("ko", "terms"),
  locale: "ko",
  alternates: legalAlternates("terms"),
});

export default function TermsPage() {
  return <LegalView locale="ko" doc="terms" />;
}
