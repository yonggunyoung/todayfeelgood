import type { Metadata } from "next";
import { buildMeta } from "@webapp/seo";
import { SiteHeader, SiteFooter } from "../../components/SiteChrome";
import { decodeShare } from "../../lib/shareCodec";
import ShareView from "./ShareView";

// 공유 코드(?d=)는 매 요청마다 다르므로 동적 렌더.
export const dynamic = "force-dynamic";

type SearchParams = { searchParams: { d?: string | string[] } };

function readCode(sp: SearchParams["searchParams"]): string {
  const d = sp?.d;
  return Array.isArray(d) ? (d[0] ?? "") : (d ?? "");
}

/**
 * generateMetadata — 카톡/트위터 미리보기.
 * ?d= 디코드로 문구를 뽑아 title/description을 세팅하고,
 * og:image는 같은 ?d=를 받는 동적 OG 라우트(opengraph-image)를 가리킨다.
 * 디코드 실패 시 기본 메타로 폴백.
 */
export async function generateMetadata({ searchParams }: SearchParams): Promise<Metadata> {
  const code = readCode(searchParams);
  let phrase = "";
  try {
    if (code) {
      const decoded = await decodeShare(code);
      phrase = decoded.text.trim();
    }
  } catch {
    phrase = "";
  }

  const title = phrase ? `“${phrase.slice(0, 40)}” — 손글씨로` : "받은 손글씨";
  const description = phrase
    ? `누군가 자기 손글씨로 만든 “${phrase.slice(0, 60)}”. 설치 없이 바로 보고, 나도 내 글씨로 만들어 보세요.`
    : "누군가 자기 손글씨로 만든 문구예요. 설치 없이 바로 보고, 나도 내 글씨로 만들어 보세요.";

  // OG 이미지: 같은 코드로 동적 생성하는 라우트(/font/s/og?d=…)를 가리킨다.
  // (파일 컨벤션 opengraph-image는 ?d= 쿼리를 못 받으므로 명시적 라우트 사용.)
  // buildMeta가 ogImage 경로를 절대 URL로 만들고, twitter summary_large_image까지 채운다.
  return buildMeta({
    title,
    description,
    path: code ? `/font/s?d=${code}` : "/font/s",
    ogImage: code ? `/font/s/og?d=${code}` : undefined,
    keywords: ["손글씨 공유", "손글씨 이미지", "내 글씨로 만들기"],
  });
}

export default function SharePage({ searchParams }: SearchParams) {
  const code = readCode(searchParams);
  return (
    <>
      <SiteHeader />
      {code ? (
        <ShareView code={code} />
      ) : (
        <main className="container" style={{ padding: "var(--sp-8) 0", textAlign: "center" }}>
          <p>공유 코드가 없어요. 링크가 올바른지 확인해 주세요.</p>
        </main>
      )}
      <SiteFooter />
    </>
  );
}
