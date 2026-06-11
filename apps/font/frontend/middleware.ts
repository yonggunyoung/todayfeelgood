/**
 * 폰트 앱 로케일 자동 라우팅 — 해외 IP/스레드 유입은 영어판(/font/en)으로 보낸다.
 *
 * 폰트 앱은 이미 URL 기반 i18n(ko=/font, en=/font/en)과 수동 토글을 갖췄으므로,
 * 여기선 "자동 감지 → 영어 경로로 리다이렉트"만 더한다.
 *  - 대상: 한국어 전용 경로(/, /studio, /guide). 공유(/s)·API·정적은 건드리지 않음.
 *  - 로케일은 tf_lang 쿠키(토글로 저장) 우선, 없으면 @webapp/i18n 자동 감지.
 *  - 봇은 감지 단계에서 한국어로 떨어져 리다이렉트되지 않음(한국어 색인 보호).
 *  - 쿠키를 항상 심어, 한 번 정해진 뒤엔 사용자의 수동 선택이 그대로 유지된다(루프 없음).
 */
import { NextResponse, type NextRequest } from "next/server";
import { chooseLocale, asLocale, LOCALE_COOKIE, type Locale } from "@webapp/i18n";

/** 한국어 전용 경로 → 영어 경로 매핑(basePath 제외 기준). */
const KO_TO_EN: Record<string, string> = {
  "/": "/en",
  "/studio": "/en/studio",
  "/guide": "/en/guide",
};

const COOKIE_MAX_AGE = 60 * 60 * 24 * 180; // 180일

export function middleware(req: NextRequest): NextResponse {
  const target = KO_TO_EN[req.nextUrl.pathname];
  if (!target) return NextResponse.next();

  const cookie = asLocale(req.cookies.get(LOCALE_COOKIE)?.value ?? null);
  const locale: Locale =
    cookie ??
    chooseLocale({
      userAgent: req.headers.get("user-agent"),
      country: req.headers.get("cf-ipcountry"),
      referer: req.headers.get("referer"),
      acceptLanguage: req.headers.get("accept-language"),
    });

  if (locale === "en") {
    const url = req.nextUrl.clone();
    url.pathname = target; // NextURL이 basePath(/font)를 자동으로 붙인다.
    const res = NextResponse.redirect(url, 307);
    if (!cookie) {
      res.cookies.set(LOCALE_COOKIE, "en", {
        path: "/",
        maxAge: COOKIE_MAX_AGE,
        sameSite: "lax",
      });
    }
    return res;
  }

  // 한국어 유지. 자동 감지로 정해졌으면 쿠키로 보존(다음부턴 재평가 안 함).
  const res = NextResponse.next();
  if (!cookie) {
    res.cookies.set(LOCALE_COOKIE, "ko", {
      path: "/",
      maxAge: COOKIE_MAX_AGE,
      sameSite: "lax",
    });
  }
  res.headers.set("Vary", "Cookie, CF-IPCountry, Referer");
  return res;
}

export const config = {
  matcher: ["/", "/studio", "/guide"],
};
