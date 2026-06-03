import type { Metadata } from "next";
import { buildMeta } from "@webapp/seo";
import { SiteHeader, SiteFooter } from "../../../components/SiteChrome";
import HandwritingStudio from "./HandwritingStudio";
import { getDictionary, studioAlternates, studioPath } from "../../../lib/i18n";

const t = getDictionary("ko").studio;
export const metadata: Metadata = buildMeta({
  ...t.meta,
  path: studioPath("ko"),
  locale: "ko",
  alternates: studioAlternates(),
});

export default function StudioPage() {
  const c = t.chrome;
  return (
    <>
      <SiteHeader subtitle={c.subtitle} homeLabel={c.homeLabel} />
      <HandwritingStudio locale="ko" />
      <SiteFooter colophon={c.colophon} fineprint={c.fineprint} />
    </>
  );
}
