import type { ReactNode } from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { Noto_Sans_KR, Quicksand } from "next/font/google";
import { siteUrl } from "@webapp/seo";
import { SiteScripts } from "@webapp/ui";
import { localeFromHeaders, LANG_TAG } from "@webapp/i18n";
import { LocaleProvider } from "@webapp/i18n/client";
import { getDict } from "../lib/i18n";
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

export async function generateMetadata(): Promise<Metadata> {
  const locale = localeFromHeaders(headers());
  const t = getDict(locale).meta;
  return {
    metadataBase: new URL(siteUrl()),
    title: {
      default: t.rootTitle,
      template: t.rootTemplate,
    },
    description: t.rootDescription,
    applicationName: t.appName,
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
}

export default function RootLayout({ children }: { children: ReactNode }) {
  const locale = localeFromHeaders(headers());
  return (
    <html lang={LANG_TAG[locale]} className={`${sansKr.variable} ${display.variable}`}>
      <body>
        <SiteScripts />
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
