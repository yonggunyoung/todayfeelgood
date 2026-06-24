import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { ARTICLES, getArticle } from "../articles";
import { Cover } from "../cover";

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const a = getArticle(params.slug);
  if (!a) return { title: "읽을거리 — 뚝킷" };
  return {
    title: `${a.title} — 읽을거리`,
    description: a.desc,
    keywords: a.kw,           // 검색 키워드(있을 때만)
    alternates: { canonical: `/stories/${a.slug}` },
  };
}

const wrap: CSSProperties = { maxWidth: 720, margin: "0 auto", padding: "36px 20px 72px", lineHeight: 1.9 };
const nav: CSSProperties = { display: "flex", gap: 14, flexWrap: "wrap", margin: "8px 0 24px", fontSize: ".95rem" };
const h2style: CSSProperties = { fontSize: "1.25rem", marginTop: 34, lineHeight: 1.4 };

export default function ArticlePage({ params }: { params: { slug: string } }) {
  const a = getArticle(params.slug);
  if (!a) notFound();
  const others = ARTICLES.filter((x) => x.slug !== a.slug).slice(0, 4);

  // 구조화 데이터: 검색엔진이 글/ FAQ를 풍부하게 인식하도록(가산적, 비용 0).
  const jsonLd: Record<string, unknown>[] = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: a.title,
      description: a.desc,
      inLanguage: "ko-KR",
      ...(a.updated ? { dateModified: a.updated, datePublished: a.updated } : {}),
      ...(a.kw && a.kw.length ? { keywords: a.kw.join(", ") } : {}),
      mainEntityOfPage: { "@type": "WebPage", "@id": `/stories/${a.slug}` },
    },
  ];
  if (a.faq && a.faq.length) {
    jsonLd.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: a.faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    });
  }

  return (
    <main style={wrap}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <p style={nav}>
        <a href="/">← 홈</a><a href="/stories">읽을거리 목록</a><a href="/faq">FAQ</a>
      </p>
      <article>
        <Cover emoji={a.emoji} color={a.color} id={a.slug} height={180} />
        <h1 className="display" style={{ fontSize: "1.9rem", lineHeight: 1.3, marginTop: 18 }}>{a.title}</h1>
        <p style={{ opacity: 0.55, fontSize: ".85rem", marginTop: 6 }}>
          {a.tag ?? "떡밥 문화"} · 읽는 데 {a.read}
          {a.updated ? ` · ${a.updated} 업데이트` : ""}
        </p>
        {a.body.map((p, i) => (
          <p key={i} style={{ marginTop: 16 }}>{p}</p>
        ))}

        {a.sections?.map((s, i) => (
          <section key={i}>
            <h2 style={h2style}>{s.h}</h2>
            {s.p?.map((p, j) => (
              <p key={j} style={{ marginTop: 14 }}>{p}</p>
            ))}
            {s.list && (
              <ul style={{ marginTop: 12, paddingLeft: 22 }}>
                {s.list.map((li, j) => (
                  <li key={j} style={{ margin: "6px 0" }}>{li}</li>
                ))}
              </ul>
            )}
          </section>
        ))}

        {a.faq && a.faq.length > 0 && (
          <section>
            <h2 style={h2style}>자주 묻는 질문</h2>
            {a.faq.map((f, i) => (
              <div key={i} style={{ marginTop: 16 }}>
                <p style={{ fontWeight: 700 }}>Q. {f.q}</p>
                <p style={{ marginTop: 4 }}>A. {f.a}</p>
              </div>
            ))}
          </section>
        )}

        <p style={{ marginTop: 30 }}><a href="/gwangclick/">⚡ 오늘의 떡밥, 지금 플레이하기 →</a></p>
      </article>
      <hr style={{ margin: "36px 0 18px", border: 0, borderTop: "1px solid rgba(128,128,128,.2)" }} />
      <h2 style={{ fontSize: "1.1rem" }}>다른 이야기</h2>
      <ul>
        {others.map((o) => (
          <li key={o.slug} style={{ margin: "8px 0" }}><a href={`/stories/${o.slug}`}>{o.title}</a></li>
        ))}
      </ul>
    </main>
  );
}
