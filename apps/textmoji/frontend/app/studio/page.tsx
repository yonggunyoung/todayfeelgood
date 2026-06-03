import type { Metadata } from "next";
import { buildMeta } from "@webapp/seo";
import { SiteHeader } from "../../components/SiteChrome";
import TextmojiStudio from "./TextmojiStudio";

export const metadata: Metadata = buildMeta({
  title: "텍스트 이모티콘 만들기 — 감정·스타일로 조합 생성",
  description:
    "감정과 스타일을 고르면 절차적으로 텍스트 이모티콘을 무한 생성해요. 호환성 안전등급으로 깨짐을 걸러 원탭 복사. 즐겨찾기·검색·🎲 더 만들기.",
  path: "/textmoji/studio",
});

export default function StudioPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <TextmojiStudio />
      </main>
    </>
  );
}
