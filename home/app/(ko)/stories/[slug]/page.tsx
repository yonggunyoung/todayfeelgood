import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { ARTICLES, getArticle } from "../articles";

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const a = getArticle(params.slug);
  if (!a) return { title: "읽을거리 — 뚝킷" };
  return { title: `${a.title} — 읽을거리`, description: a.desc, alternates: { canonical: `/stories/${a.slug}` } };
}

const wrap: CSSProperties = { maxWidth: 720, margin: "0 auto", padding: "36px 20px 72px", lineHeight: 1.9 };
const nav: CSSProperties = { display: "flex", gap: 14, flexWrap: "wrap", margin: "8px 0 24px", fontSize: ".95rem" };

export default function ArticlePage({ params }: { params: { slug: string } }) {
  const a = getArticle(params.slug);
  if (!a) notFound();
  const others = ARTICLES.filter((x) => x.slug !== a.slug).slice(0, 3);
  return (
    <main style={wrap}>
      <p style={nav}>
        <a href="/">← 홈</a><a href="/stories">읽을거리 목록</a><a href="/faq">FAQ</a>
      </p>
      <article>
        <h1 className="display" style={{ fontSize: "1.9rem", lineHeight: 1.3 }}>{a.title}</h1>
        <p style={{ opacity: 0.55, fontSize: ".85rem", marginTop: 6 }}>떡밥 문화 · 읽는 데 {a.read}</p>
        {a.body.map((p, i) => (
          <p key={i} style={{ marginTop: 16 }}>{p}</p>
        ))}
        <p style={{ marginTop: 26 }}><a href="/gwangclick/">⚡ 오늘의 떡밥, 지금 플레이하기 →</a></p>
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
