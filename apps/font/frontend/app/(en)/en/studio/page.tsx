import type { Metadata } from "next";
import { buildMeta } from "@webapp/seo";
import { SiteHeader, SiteFooter } from "../../../../components/SiteChrome";
import HandwritingStudio from "../../../(ko)/studio/HandwritingStudio";
import { getDictionary, studioAlternates, studioPath } from "../../../../lib/i18n";

// 폰트 앱 영어 스튜디오(/font/en/studio) — 해외 유입. 한국어 /font/studio와 hreflang 상호 연결.
const t = getDictionary("en").studio;
export const metadata: Metadata = buildMeta({
  ...t.meta,
  path: studioPath("en"),
  locale: "en",
  alternates: studioAlternates(),
});

export default function StudioPageEn() {
  const c = t.chrome;
  return (
    <>
      {/* 홈 허브로의 링크는 basePath가 붙지 않는 <a>라 EN 홈(/en)을 직접 가리킨다. */}
      <SiteHeader homeHref="/en/neogul" subtitle={c.subtitle} homeLabel={c.homeLabel} />
      <HandwritingStudio locale="en" />
      <SiteFooter colophon={c.colophon} fineprint={c.fineprint} />
    </>
  );
}
