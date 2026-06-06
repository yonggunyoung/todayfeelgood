import type { Metadata } from "next";
import { buildMeta } from "@webapp/seo";
import { HubView } from "../../components/HubView";
import { getDictionary, homeAlternates, homePath } from "../../lib/i18n";

// 루트 `/` = 중립 허브 홈(웹앱 모음). 폰트 등 개별 도구는 각자 앱(/font…),
// 도구 공방 묶음은 /neogul. 허브는 일반 허브 키워드로 노출.
const t = getDictionary("ko");
export const metadata: Metadata = {
  ...buildMeta({
    ...t.hub.seo,
    path: homePath("ko"),
    locale: "ko",
    ogImage: "/og",
    alternates: homeAlternates(),
  }),
  // 허브 제목은 제품 브랜드 접미사(템플릿) 없이 단독 노출.
  title: { absolute: t.hub.seo.title },
};

export default function HomePage() {
  return <HubView locale="ko" />;
}
