import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Noto_Sans_KR, Quicksand } from "next/font/google";
import { siteUrl } from "@webapp/seo";
import { SiteScripts } from "@webapp/ui";
import "./globals.css";

// 폰트·스티커앱과 동일한 "소프트 iOS 문방구" 타이포: 본문/UI = Noto Sans KR, 디스플레이 = Quicksand.
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
    default: "키트공방 — 글씨체·색·로고를 한 벌로",
    template: "%s · 키트공방",
  },
  description:
    "브랜드명을 적으면 글씨체·조화 팔레트·미리보기 시트를 한 벌 키트로 묶어 ZIP으로 받는 공방. 공개 폰트 변형 기반(비AI), 브라우저에서 바로.",
  applicationName: "키트공방",
  authors: [{ name: "획 공방" }],
  icons: {
    icon: [
      {
        url:
          "data:image/svg+xml," +
          encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="%23c0492b"/><rect x="8" y="9" width="16" height="4" rx="2" fill="%23ffffff"/><rect x="8" y="16" width="11" height="3" rx="1.5" fill="%23f5c451"/><rect x="8" y="22" width="14" height="3" rx="1.5" fill="%2346b39a"/></svg>`
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
