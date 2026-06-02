import type { Metadata } from "next";
import { buildMeta } from "@webapp/seo";
import FontStudio from "./FontStudio";

export const metadata: Metadata = buildMeta({
  title: "폰트 만들기 스튜디오",
  description:
    "글씨를 그리고 굵기·기울기·곡률 슬라이더로 손글씨 폰트를 자동 생성하세요. 실시간 미리보기 제공.",
  keywords: ["글씨체 만들기", "손글씨 폰트", "자동 폰트 생성"],
});

export default function FontPage() {
  return <FontStudio />;
}
