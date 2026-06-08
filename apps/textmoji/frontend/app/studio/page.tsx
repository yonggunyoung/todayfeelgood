import type { Metadata } from "next";
import { buildMeta } from "@webapp/seo";
import { SiteHeader } from "../../components/SiteChrome";
import TextmojiStudio from "./TextmojiStudio";

export const metadata: Metadata = buildMeta({
  title: "텍스트 이모티콘·특수문자·인싸폰트 — 원탭 복사",
  description:
    "카오모지(감정별)·특수문자/꾸밈 기호·인싸폰트 변환을 한 곳에서. 입력한 글자를 𝓯𝓪𝓷𝓬𝔂·Ⓒⓘⓡⓒⓛⓔ로 즉시 변환하고, 별·하트·화살표·구분선까지 탭 한 번에 복사. 즐겨찾기·검색 지원.",
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
