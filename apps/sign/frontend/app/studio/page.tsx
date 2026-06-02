import type { Metadata } from "next";
import { buildMeta } from "@webapp/seo";
import { SiteHeader, SiteFooter } from "../../components/SiteChrome";
import SignStudio from "./SignStudio";

export const metadata: Metadata = buildMeta({
  title: "서명 작업대 — 이름으로 서명 만들기",
  description:
    "이름을 입력하고 무드를 골라 흘림체 서명 변주를 만들어요. 투명 PNG·SVG로 받아 문서·이메일 서명에 바로. 공개 폰트 변형 + 절차적 장식(실제 자필 아님).",
  keywords: ["서명 만들기", "사인 만들기", "전자서명 이미지", "투명 PNG 서명"],
  path: "/sign/studio",
});

export default function StudioPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <SignStudio />
      </main>
      <SiteFooter />
    </>
  );
}
