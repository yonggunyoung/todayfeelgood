/**
 * basePath 안전한 경로 헬퍼. (폰트앱 lib/paths.ts와 동일 패턴)
 * Next의 <Link>/정적 자산은 basePath를 자동 prefix하지만,
 * 브라우저 `fetch`는 Next를 모르므로 직접 prefix해야 한다.
 */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** API/리소스 fetch용 절대 경로(basePath 포함). 예: apiPath("/api/generate") */
export function apiPath(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${BASE}${p}`;
}
