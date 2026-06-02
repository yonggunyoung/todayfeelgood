import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Noto_Sans_KR, Quicksand } from "next/font/google";
import { siteUrl } from "@webapp/seo";
import "./globals.css";

// 웹폰트 self-host(빌드시 자동 다운로드, 커밋 바이너리 불필요).
// 본문/UI(한글+라틴) = Noto Sans KR, 디스플레이(로고·라지타이틀·마스코트) = Quicksand(둥근 산세리프).
// 세리프 본문은 "AI 에디토리얼 냄새"로 폐기.
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
    default: "획 — 손글씨 폰트 공방",
    template: "%s · 획 폰트공방",
  },
  description:
    "굵기·기울기·곡률을 손끝으로 조율해 나만의 라틴 글자체를 빚는 폰트 공방. 그리고, 다듬고, 내려받으세요.",
  applicationName: "획 폰트공방",
  authors: [{ name: "획 폰트공방" }],
  icons: {
    icon: [
      {
        url:
          "data:image/svg+xml," +
          encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="%235b6cf0"/><text x="16" y="23" font-family="sans-serif" font-size="20" font-weight="700" text-anchor="middle" fill="%23ffffff">획</text></svg>`
          ),
      },
    ],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className={`${sansKr.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
