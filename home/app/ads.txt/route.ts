/**
 * ads.txt — AdSense 승인용. `/ads.txt` 로 서빙(루트 도메인·웹 전용).
 * pub id 우선순위: NEXT_PUBLIC_ADSENSE_CLIENT(ca-pub-XXXX) > DEFAULT_PUB(아래 상수).
 * D(결정): 배포 환경변수 누락으로 ads.txt 가 비는 사고를 막기 위해 owner 의 공개 pub 을 기본값으로 박는다.
 *   - 이유: ca-pub 은 ads.txt·페이지 스크립트에 어차피 공개되는 식별자(비밀 아님) → 커밋 안전.
 *   - 비용: 0(정적). 탈출구: env 를 넣으면 그대로 override, 다른 pub 으로도 교체 가능.
 *   - 경계: 이건 '게시자 선언'일 뿐 실제 광고 삽입 아님. 광고 스크립트(SiteScripts)는 토스 정책상 env 게이트 유지(기본 OFF).
 * f08c47fec0942fa0 은 Google 의 고정 인증기관 ID(모든 ads.txt 공통).
 */
export const dynamic = "force-static";

const DEFAULT_PUB = "ca-pub-9828999554814217"; // owner AdSense(공개 식별자)

export function GET() {
  const env = (process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "").trim();
  const client = /^ca-pub-\d+$/.test(env) ? env : DEFAULT_PUB;
  const valid = /^ca-pub-\d+$/.test(client);
  const pub = client.replace(/^ca-/, ""); // ca-pub-XXXX → pub-XXXX

  const body = valid
    ? `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`
    : "# ads.txt 미설정 — NEXT_PUBLIC_ADSENSE_CLIENT(ca-pub-XXXX)를 .env 에 넣고 재빌드하세요.\n";

  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
