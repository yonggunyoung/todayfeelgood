import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Noto_Sans_KR, Quicksand } from "next/font/google";
import { siteUrl } from "@webapp/seo";
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
    default: "텍스트 이모티콘공방 — 방금 만든 나만의 조합",
    template: "%s · 텍스트 이모티콘공방",
  },
  description:
    "검색해도 안 나오는, 방금 만든 나만의 텍스트 이모티콘. 감정·스타일을 고르면 절차적으로 무한 조합하고 호환성 안전등급으로 걸러 원탭 복사. 서버 없이 브라우저에서 바로.",
  applicationName: "텍스트 이모티콘공방",
  authors: [{ name: "획 공방" }],
  icons: {
    icon: [
      {
        url:
          "data:image/svg+xml," +
          encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="%23c0492b"/><text x="16" y="21" font-size="14" text-anchor="middle" fill="%23ffffff" font-family="monospace">^‿^</text></svg>`
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
