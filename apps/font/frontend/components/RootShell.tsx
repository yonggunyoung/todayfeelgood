import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Noto_Sans_KR, Quicksand } from "next/font/google";
import { siteUrl, htmlLang } from "@webapp/seo";
import type { Locale } from "../lib/i18n";
import { getDictionary } from "../lib/i18n";
import "../app/globals.css";

// 웹폰트 self-host(빌드시 자동 다운로드). 본문/UI(한글+라틴)=Noto Sans KR,
// 디스플레이=Quicksand(둥근 산세리프).
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

const ICON_SVG =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="%23c0492b"/><text x="16" y="23" font-family="sans-serif" font-size="20" font-weight="700" text-anchor="middle" fill="%23ffffff">획</text></svg>`
  );

/** 로케일별 루트 레이아웃 메타데이터(title 템플릿·description). */
export function rootMetadata(locale: Locale): Metadata {
  const t = getDictionary(locale);
  const template = locale === "ko" ? "%s · 획 폰트공방" : "%s · Hoek Font Workshop";
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: t.seo.title, template },
    description: t.seo.description,
    applicationName: t.jsonLd.name,
    authors: [{ name: t.jsonLd.name }],
    icons: { icon: [{ url: ICON_SVG }] },
  };
}

/** `<html lang>`를 로케일에 맞춰 렌더하는 공용 루트 셸. ko/en 그룹이 공유. */
export function RootShell({ locale, children }: { locale: Locale; children: ReactNode }) {
  return (
    <html lang={htmlLang(locale)} className={`${sansKr.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
