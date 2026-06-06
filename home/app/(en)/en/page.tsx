import type { Metadata } from "next";
import { buildMeta } from "@webapp/seo";
import { HubView } from "../../../components/HubView";
import { getDictionary, homeAlternates, homePath } from "../../../lib/i18n";

// English root (/en) — neutral hub. hreflang-linked with ko `/`.
const t = getDictionary("en");
export const metadata: Metadata = {
  ...buildMeta({
    ...t.hub.seo,
    path: homePath("en"),
    locale: "en",
    ogImage: "/og",
    alternates: homeAlternates(),
  }),
  title: { absolute: t.hub.seo.title },
};

export default function HomePageEn() {
  return <HubView locale="en" />;
}
