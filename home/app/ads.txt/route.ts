/**
 * ads.txt — AdSense 승인 후 게시. `/ads.txt` 로 서빙(루트 도메인).
 * pub id 는 NEXT_PUBLIC_ADSENSE_CLIENT(ca-pub-XXXX) 로 주입하면 자동 생성된다.
 * 값이 없으면(기본) 안내 주석만 반환 — 빈 ads.txt 로 인한 오해를 막는다.
 * f08c47fec0942fa0 은 Google 의 고정 인증기관 ID(모든 ads.txt 공통).
 */
export const dynamic = "force-static";

export function GET() {
  const client = (process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "").trim();
  const valid = /^ca-pub-\d+$/.test(client);
  const pub = client.replace(/^ca-/, ""); // ca-pub-XXXX → pub-XXXX

  const body = valid
    ? `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`
    : "# ads.txt 미설정 — NEXT_PUBLIC_ADSENSE_CLIENT(ca-pub-XXXX)를 .env 에 넣고 재빌드하세요.\n";

  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
