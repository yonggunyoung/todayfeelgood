/**
 * 공용 SEO 유틸 — 메타태그/OG/JSON-LD/sitemap 생성 헬퍼.
 * 검색 노출이 핵심 목표이므로 모든 앱이 동일한 SEO 규칙을 재사용한다. (지금은 자리만 마련)
 */

export interface PageMeta {
  title: string;
  description: string;
  keywords?: string[];
  ogImage?: string;
  canonical?: string;
}

/** Next.js Metadata로 변환하기 쉬운 평면 객체를 만든다. */
export function buildMeta(meta: PageMeta) {
  return {
    title: meta.title,
    description: meta.description,
    keywords: meta.keywords?.join(", "),
    openGraph: {
      title: meta.title,
      description: meta.description,
      images: meta.ogImage ? [meta.ogImage] : undefined,
    },
    alternates: meta.canonical ? { canonical: meta.canonical } : undefined,
  };
}
