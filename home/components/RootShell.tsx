import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Noto_Sans_KR, Quicksand } from "next/font/google";
import { siteUrl, htmlLang, siteVerification } from "@webapp/seo";
import { SiteScripts } from "@webapp/ui";
import type { Locale } from "../lib/i18n";
import { getDictionary } from "../lib/i18n";
import "../app/globals.css";

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

/** 로케일별 루트 레이아웃 메타데이터(title 템플릿·description). */
export function rootMetadata(locale: Locale): Metadata {
  const t = getDictionary(locale);
  const template = locale === "ko" ? "%s · 획" : "%s · Hoek";
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: t.seo.title, template },
    description: t.seo.description,
    // 검색엔진 소유확인 메타(환경변수 있을 때만 출력). 메인 도메인=홈이 대표로 싣는다.
    verification: siteVerification(),
  };
}

/** `<html lang>`를 로케일에 맞춰 렌더하는 공용 루트 셸. ko/en 그룹이 공유. */
export function RootShell({ locale, children }: { locale: Locale; children: ReactNode }) {
  return (
    <html lang={htmlLang(locale)} className={`${sansKr.variable} ${display.variable}`}>
      <body>
        {/* 광고·분석 스크립트(env on/off, 기본 OFF). 토스 미니앱 빌드에선 env 비워 자동 비활성. */}
        <SiteScripts />
        {children}
      </body>
    </html>
  );
}
