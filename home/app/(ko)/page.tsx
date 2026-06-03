import type { Metadata } from "next";
import { buildMeta } from "@webapp/seo";
import { HomeView } from "../../components/HomeView";
import { getDictionary, homeAlternates, homePath } from "../../lib/i18n";

// 홈은 "도구 허브" 포지셔닝이되, 주력(플래그십)은 폰트생성이다.
// 폰트 핵심 키워드("손글씨 폰트"·"글씨체 만들기")는 /font 랜딩에 집중시켜 자기잠식을 피하고,
// home은 허브 일반어 + 플래그십(손글씨)을 히어로로 둔다.
const t = getDictionary("ko");
export const metadata: Metadata = buildMeta({
  ...t.seo,
  path: homePath("ko"),
  locale: "ko",
  alternates: homeAlternates(),
});

export default function HomePage() {
  return <HomeView locale="ko" />;
}
