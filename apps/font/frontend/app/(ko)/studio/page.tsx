import type { Metadata } from "next";
import { buildMeta } from "@webapp/seo";
import { SiteHeader, SiteFooter } from "../../../components/SiteChrome";
import HandwritingStudio from "./HandwritingStudio";

export const metadata: Metadata = buildMeta({
  title: "공방 — 내 손글씨로 폰트 만들기",
  description:
    "칸마다 직접 글자를 그리면 진짜 내가 그린 획으로 폰트를 만들어 드려요. 다듬기로 손맛은 살리고 단정하게. WOFF·TTF로 내려받으세요.",
  keywords: ["내 손글씨 폰트", "손글씨 폰트 만들기", "직접 그리는 폰트", "폰트 만들기", "자동 폰트 생성"],
  path: "/font/studio",
});

export default function StudioPage() {
  return (
    <>
      <SiteHeader />
      <HandwritingStudio />
      <SiteFooter />
    </>
  );
}
