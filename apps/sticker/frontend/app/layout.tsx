import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Noto_Sans_KR, Quicksand } from "next/font/google";
import { siteUrl } from "@webapp/seo";
import { SiteScripts } from "@webapp/ui";
import "./globals.css";

// 폰트앱과 동일한 "소프트 iOS 문방구" 타이포: 본문/UI = Noto Sans KR, 디스플레이 = Quicksand.
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
    default: "스티커공방 — 한 번 그리면 표정 한 세트",
    template: "%s · 스티커공방",
  },
  description:
    "캐릭터 하나만 그리면 표정·색·테두리 변주를 자동으로 만들어 투명 PNG 스티커 팩으로 받는 공방. AI 없이 브라우저에서 바로.",
  applicationName: "스티커공방",
  authors: [{ name: "획 공방" }],
  icons: {
    icon: [
      {
        url:
          "data:image/svg+xml," +
          encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="%23c0492b"/><circle cx="13" cy="14" r="2" fill="%23ffffff"/><circle cx="20" cy="14" r="2" fill="%23ffffff"/><path d="M11 20 q5 5 10 0" stroke="%23ffffff" stroke-width="2.4" stroke-linecap="round" fill="none"/></svg>`
          ),
      },
    ],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className={`${sansKr.variable} ${display.variable}`}>
      <body>
        <SiteScripts />
        {children}
      </body>
    </html>
  );
}
