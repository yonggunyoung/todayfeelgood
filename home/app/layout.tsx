import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";
import { siteUrl } from "@webapp/seo";
import "./globals.css";

// 폰트앱과 동일한 타이포(self-host): 산세리프=Noto Sans KR, 세리프=Noto Serif KR.
const sansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-sans",
});
const serifKr = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
  variable: "--font-serif",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "획 — 손으로 빚는 웹 도구 공방",
    template: "%s · 획",
  },
  description:
    "쓸모 있는 웹 도구를 하나씩 제대로 만들어 두는 작은 공방. 첫 작업대는 글자체 도구입니다.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className={`${sansKr.variable} ${serifKr.variable}`}>
      <body>{children}</body>
    </html>
  );
}
