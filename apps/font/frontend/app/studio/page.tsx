import type { Metadata } from "next";
import { buildMeta } from "@webapp/seo";
import { SiteHeader, SiteFooter } from "../../components/SiteChrome";
import FontStudio from "./FontStudio";

export const metadata: Metadata = buildMeta({
  title: "공방 — 글씨체 빚기",
  description:
    "굵기·기울기·곡률 슬라이더로 라틴 글자체를 실시간으로 변형하고, 마음에 든 한 벌을 WOFF·TTF로 내려받으세요.",
  keywords: ["글씨체 만들기", "손글씨 폰트", "폰트 만들기", "자동 폰트 생성"],
  path: "/font/studio",
});

export default function StudioPage() {
  return (
    <>
      <SiteHeader />
      <FontStudio />
      <SiteFooter />
    </>
  );
}
