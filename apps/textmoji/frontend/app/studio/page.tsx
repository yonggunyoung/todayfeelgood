import type { Metadata } from "next";
import { headers } from "next/headers";
import { buildMeta } from "@webapp/seo";
import { localeFromHeaders } from "@webapp/i18n";
import { SiteHeader } from "../../components/SiteChrome";
import { getDict } from "../../lib/i18n";
import TextmojiStudio from "./TextmojiStudio";

export async function generateMetadata(): Promise<Metadata> {
  const locale = localeFromHeaders(headers());
  const t = getDict(locale).meta;
  return buildMeta({
    title: t.studioTitle,
    description: t.studioDescription,
    path: "/textmoji/studio",
    locale,
    alternates: { ko: "/textmoji/studio", en: "/textmoji/studio" },
  });
}

export default function StudioPage() {
  const locale = localeFromHeaders(headers());
  const dict = getDict(locale);
  return (
    <>
      <SiteHeader dict={dict} />
      <main>
        <TextmojiStudio locale={locale} dict={dict} />
      </main>
    </>
  );
}
