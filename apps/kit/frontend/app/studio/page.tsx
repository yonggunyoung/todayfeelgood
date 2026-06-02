import type { Metadata } from "next";
import { buildMeta } from "@webapp/seo";
import { SiteHeader, SiteFooter } from "../../components/SiteChrome";
import KitStudio from "./KitStudio";

export const metadata: Metadata = buildMeta({
  title: "키트 작업대 — 브랜드 한 벌 묶기",
  description:
    "브랜드명·무드·색을 고르고 미리보기 시트를 확인한 뒤, 폰트+팔레트+시트+라이선스를 한 벌 ZIP으로 받아요. 공개 폰트 변형 기반(비AI).",
  keywords: ["브랜드 키트 만들기", "팔레트 생성", "폰트 키트", "font-face 스니펫"],
  path: "/kit/studio",
});

export default function StudioPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <KitStudio />
      </main>
      <SiteFooter />
    </>
  );
}
