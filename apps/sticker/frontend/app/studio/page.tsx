import type { Metadata } from "next";
import { buildMeta } from "@webapp/seo";
import { SiteHeader, SiteFooter } from "../../components/SiteChrome";
import StickerStudio from "./StickerStudio";

export const metadata: Metadata = buildMeta({
  title: "스티커 작업대 — 그리고 표정 변주 만들기",
  description:
    "캐릭터를 그리고 표정·색·테두리 변주 12종을 한 번에. 투명 PNG 개별·ZIP으로 받아 카톡·인스타·디스코드에 바로 써요.",
  keywords: ["스티커 만들기", "이모티콘 만들기", "투명 PNG", "캐릭터 스티커"],
  path: "/sticker/studio",
});

export default function StudioPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <StickerStudio />
      </main>
      <SiteFooter />
    </>
  );
}
