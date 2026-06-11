/**
 * 로케일 감지 미들웨어 — 공용 @webapp/i18n 규칙을 그대로 사용.
 * 해외 IP(CF-IPCountry≠KR) 또는 스레드 유입이면 영어, 봇은 한국어 고정(SEO 보호),
 * 사용자가 토글로 고른 쿠키가 있으면 그 값을 우선한다.
 */
export { middleware } from "@webapp/i18n/middleware";

export const config = {
  // 정적 파일·내부 경로 제외, 실제 페이지 요청에만 적용.
  matcher: ["/((?!_next/|favicon|robots.txt|sitemap.xml|.*\\.[\\w]+$).*)"],
};
