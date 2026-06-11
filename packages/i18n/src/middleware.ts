/**
 * 로케일 감지 미들웨어 팩토리 — 모든 Next 앱이 동일하게 쓴다.
 *
 * 하는 일: 요청 헤더(쿠키/UA/CF-IPCountry/referer)로 로케일을 정하고,
 *  - 요청 헤더 LOCALE_HEADER 에 심어 서버 컴포넌트가 읽게 하고,
 *  - 자동 감지로 정해진 경우 동일 값을 쿠키로 내려(다음 요청 빠르게, 클라가 현재값 인지).
 *    단, 사용자가 토글로 고른 쿠키가 이미 있으면 건드리지 않는다.
 *
 * 사용(앱의 middleware.ts):
 *   export { middleware } from "@webapp/i18n/middleware";
 *   export const config = { matcher: ["/((?!_next|favicon|.*\\.).*)"] };
 */
import { NextResponse, type NextRequest } from "next/server";
import {
  LOCALE_COOKIE,
  LOCALE_HEADER,
  asLocale,
  chooseLocale,
} from "./index";

export function middleware(req: NextRequest): NextResponse {
  const cookie = req.cookies.get(LOCALE_COOKIE)?.value ?? null;

  const locale = chooseLocale({
    cookie,
    userAgent: req.headers.get("user-agent"),
    country: req.headers.get("cf-ipcountry"),
    referer: req.headers.get("referer"),
    acceptLanguage: req.headers.get("accept-language"),
  });

  // 서버 컴포넌트가 headers()로 읽도록 요청 헤더에 심는다.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set(LOCALE_HEADER, locale);

  const res = NextResponse.next({ request: { headers: requestHeaders } });

  // 사용자가 명시적으로 고른 쿠키가 없을 때만, 감지 결과를 쿠키로 보존.
  if (!asLocale(cookie)) {
    res.cookies.set(LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 180, // 180일
      sameSite: "lax",
    });
  }

  // CDN/프록시 캐시가 언어별로 분리되도록(같은 URL, 다른 언어).
  res.headers.set("Vary", "Cookie, CF-IPCountry, Referer");

  return res;
}

export default middleware;
