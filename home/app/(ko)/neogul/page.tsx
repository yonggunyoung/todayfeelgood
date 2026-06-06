import type { Metadata } from "next";
import { buildMeta } from "@webapp/seo";
import { HomeView } from "../../../components/HomeView";
import { getDictionary, neogulAlternates, neogulPath } from "../../../lib/i18n";

// 너굴이의 작은 도구 공방(웹앱) 랜딩 — 폰트·이모티콘·스티커 등을 안내. 허브가 `/`로 옮겨가며 여기로 이동.
const t = getDictionary("ko");
export const metadata: Metadata = buildMeta({
  ...t.seo,
  path: neogulPath("ko"),
  locale: "ko",
  ogImage: "/og",
  alternates: neogulAlternates(),
});

export default function NeogulPage() {
  return <HomeView locale="ko" />;
}
