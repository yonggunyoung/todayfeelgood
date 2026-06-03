import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Noto_Sans_KR, Quicksand } from "next/font/google";
import { siteUrl } from "@webapp/seo";
import { SiteScripts } from "@webapp/ui";
import "./globals.css";

// 폰트앱·스티커앱과 동일한 "소프트 iOS 문방구" 타이포: 본문/UI = Noto Sans KR, 디스플레이 = Quicksand.
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
    default: "싸인공방 — 이름으로 만드는 나만의 서명",
    template: "%s · 싸인공방",
  },
  description:
    "이름을 입력하면 흘림체 변형 + 절차적 장식으로 서명 스타일을 만들어 투명 PNG·SVG로 받는 공방. AI 없이 브라우저에서 바로.",
  applicationName: "싸인공방",
  authors: [{ name: "획 공방" }],
  icons: {
    icon: [
      {
        url:
          "data:image/svg+xml," +
          encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="%23c0492b"/><path d="M6 21 Q12 9 16 18 Q19 24 26 11" stroke="%23ffffff" stroke-width="2.6" stroke-linecap="round" fill="none"/></svg>`
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
