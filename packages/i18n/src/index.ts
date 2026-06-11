/**
 * 공용 로케일 골격 — 감지 규칙 + 상수 + 타입(런타임 의존성 0).
 *
 * 목표: "해외 IP 또는 스레드 유입이면 자동 영어, 그 외엔 한국어"를
 *       모든 앱이 동일하게 쓰도록 한 곳에 모은다(CLAUDE.md §1: 공통 로직은 packages).
 *
 * 어디서 쓰나
 *  - 미들웨어(`./middleware`): 요청 헤더로 로케일을 정해 응답에 심는다.
 *  - 서버 레이아웃: `localeFromHeaders(headers())`로 읽어 <html lang>·사전 선택.
 *  - 클라이언트(`./client`): Provider/useLocale/LangToggle.
 *
 * 이 파일은 react/next 를 import 하지 않는다(미들웨어·서버·클라 어디서나 안전).
 */

/** 지원 로케일. 한국어가 기본, 영어로 해외 유입을 받는다. (@webapp/seo 와 동일 정의) */
export type Locale = "ko" | "en";

export const LOCALES: readonly Locale[] = ["ko", "en"] as const;
export const DEFAULT_LOCALE: Locale = "ko";

/** 사용자가 토글로 고른 로케일을 저장하는 쿠키 이름(자동 감지보다 우선). */
export const LOCALE_COOKIE = "tf_lang";

/** 미들웨어가 정한 로케일을 서버 컴포넌트로 넘기는 요청 헤더 이름. */
export const LOCALE_HEADER = "x-tf-locale";

/** <html lang> / BCP-47 표준 언어 태그. */
export const LANG_TAG: Record<Locale, string> = {
  ko: "ko-KR",
  en: "en-US",
};

/** 임의 문자열을 안전하게 로케일로 정규화(아니면 기본값). */
export function asLocale(v: string | null | undefined): Locale | null {
  return v === "ko" || v === "en" ? v : null;
}

/**
 * 검색엔진/봇 User-Agent. 봇에는 한국어(기본)를 고정해 한국어 색인이 흔들리지 않게 한다.
 * (IP로 영어를 주면 미국에서 크롤하는 Googlebot이 영어를 받아 한국어 노출이 깨질 수 있음.)
 */
const BOT_RE =
  /bot|crawler|spider|crawling|slurp|bingpreview|facebookexternalhit|embedly|quora link preview|pinterest|developers\.google|google-inspectiontool|naver|yeti|daum|whatsapp|telegrambot|kakaotalk|line-poker/i;

/** referer 문자열에서 호스트만 안전하게 뽑는다(파싱 실패 시 빈 문자열). */
function hostOf(referer: string): string {
  try {
    return new URL(referer).hostname.toLowerCase();
  } catch {
    return "";
  }
}

/** 스레드(메타) 유입인지 — referer 호스트가 threads.net / threads.com 계열. */
export function isThreadsReferrer(referer: string | null | undefined): boolean {
  const h = hostOf(referer || "");
  return /(^|\.)threads\.(net|com)$/.test(h);
}

export interface LocaleSignals {
  /** 토글 쿠키 값(있으면 무조건 우선). */
  cookie?: string | null;
  /** User-Agent (봇 판별용). */
  userAgent?: string | null;
  /** Cloudflare 가 붙이는 ISO 국가코드(CF-IPCountry). 운영에선 항상 존재. */
  country?: string | null;
  /** 요청 referer (스레드 유입 판별용). */
  referer?: string | null;
  /** Accept-Language (CF 국가코드가 없는 로컬/비CF 환경의 보조 신호). */
  acceptLanguage?: string | null;
}

/**
 * 신호로부터 로케일을 결정한다. 우선순위:
 *  1) 토글 쿠키(사용자 명시 선택) → 그대로.
 *  2) 봇 → 한국어 고정(SEO 보호).
 *  3) 스레드 유입 → 영어.
 *  4) 국가코드 있음(운영) → KR 이면 한국어, 그 외 해외면 영어.
 *  5) 국가코드 없음(로컬/비CF) → Accept-Language 가 한국어가 아니면 영어.
 *  6) 그 외 → 한국어(기본).
 */
export function chooseLocale(s: LocaleSignals): Locale {
  const picked = asLocale(s.cookie);
  if (picked) return picked;

  if (s.userAgent && BOT_RE.test(s.userAgent)) return DEFAULT_LOCALE;

  if (isThreadsReferrer(s.referer)) return "en";

  const country = (s.country || "").trim().toUpperCase();
  if (country) {
    // T1/XX = Tor·미상. 한국이 아니면 해외로 보고 영어.
    return country === "KR" ? "ko" : "en";
  }

  const al = (s.acceptLanguage || "").trim().toLowerCase();
  if (al) return /(^|[,;\s])ko\b/.test(al) ? "ko" : "en";

  return DEFAULT_LOCALE;
}

/**
 * 표준 Headers(+선택 쿠키 값)에서 로케일을 읽는다.
 * 서버 컴포넌트: `localeFromHeaders(headers())` — 미들웨어가 심은 LOCALE_HEADER 를 우선 사용.
 */
export function localeFromHeaders(
  headers: { get(name: string): string | null },
  cookieValue?: string | null
): Locale {
  const resolved = asLocale(headers.get(LOCALE_HEADER));
  if (resolved) return resolved;
  return chooseLocale({
    cookie: cookieValue,
    userAgent: headers.get("user-agent"),
    country: headers.get("cf-ipcountry"),
    referer: headers.get("referer"),
    acceptLanguage: headers.get("accept-language"),
  });
}
