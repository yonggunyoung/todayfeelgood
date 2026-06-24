import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Noto_Sans_KR, Quicksand, Nanum_Pen_Script, Caveat } from "next/font/google";
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
// 썸네일 전용 손글씨체 — "내 글씨가 이렇게 나와요"를 진짜처럼 보여주려고.
// 한글 손글씨(나눔손글씨 펜) + 라틴 필기체(Caveat). 본문엔 안 쓰고 썸네일에만.
const penKr = Nanum_Pen_Script({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  variable: "--font-hand-kr",
});
const scriptLatin = Caveat({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
  variable: "--font-hand-latin",
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
    <html
      lang={htmlLang(locale)}
      className={`${sansKr.variable} ${display.variable} ${penKr.variable} ${scriptLatin.variable}`}
    >
      <body>
        {/* 테마 부트 — hydration 전에 저장된 수동 테마(data-theme)를 선반영해 깜빡임 방지. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('ddukkit-theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();",
          }}
        />
        {/* 광고·분석 스크립트(env on/off, 기본 OFF). 토스 미니앱 빌드에선 env 비워 자동 비활성. */}
        <SiteScripts />
        {children}
        {/* 사이트 전역 푸터 — 읽을 수 있는 콘텐츠/정책 페이지로 내부 링크(발견성·SEO). */}
        <footer
          style={{
            borderTop: "1px solid rgba(128,128,128,.18)",
            marginTop: 56,
            padding: "26px 20px 40px",
            fontSize: ".9rem",
            textAlign: "center",
            opacity: 0.9,
          }}
        >
          <nav
            aria-label="footer"
            style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", marginBottom: 10 }}
          >
            <a href="/">홈</a>
            <a href="/about">소개</a>
            <a href="/guide">가이드</a>
            <a href="/faq">자주 묻는 질문</a>
            <a href="/stories">읽을거리</a>
            <a href="/privacy">개인정보처리방침</a>
            <a href="/terms">이용약관</a>
          </nav>
          <div style={{ opacity: 0.65 }}>© ddukkit · 문의 yonggunyoung@gmail.com</div>
        </footer>
      </body>
    </html>
  );
}
