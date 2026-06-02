import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Noto_Sans_KR, Quicksand } from "next/font/google";
import { siteUrl } from "@webapp/seo";
import "./globals.css";

// 폰트앱과 동일한 타이포(self-host): 본문/UI=Noto Sans KR, 디스플레이=Quicksand(둥근 산세리프).
const sansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-sans",
});
const display = Quicksand({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  variable: "--font-display",
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
    <html lang="ko" className={`${sansKr.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
