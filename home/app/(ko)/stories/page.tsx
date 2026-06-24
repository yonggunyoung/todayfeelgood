import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { ARTICLES } from "./articles";

export const metadata: Metadata = {
  title: "읽을거리 — 떡밥 문화 이야기",
  description:
    "민초 vs 반민초, 부먹 vs 찍먹, 아샷추, 파인애플 피자까지. 우리는 왜 사소한 취향으로 편을 가르며 즐거워할까요? 인터넷 ‘떡밥’ 문화를 가볍게 읽어 봅니다.",
  alternates: { canonical: "/stories" },
};

const wrap: CSSProperties = { maxWidth: 760, margin: "0 auto", padding: "36px 20px 72px", lineHeight: 1.8 };
const nav: CSSProperties = { display: "flex", gap: 14, flexWrap: "wrap", margin: "8px 0 28px", fontSize: ".95rem" };
const card: CSSProperties = {
  display: "block", border: "1px solid rgba(128,128,128,.2)", borderRadius: 14,
  padding: "16px 18px", margin: "12px 0", textDecoration: "none", color: "inherit",
};

export default function StoriesIndex() {
  return (
    <main style={wrap}>
      <p style={nav}>
        <a href="/">← 홈</a><a href="/about">소개</a><a href="/guide">사용 가이드</a><a href="/faq">FAQ</a>
      </p>
      <h1 className="display" style={{ fontSize: "2rem" }}>떡밥 문화 이야기</h1>
      <p>사소한 취향으로 편을 가르며 웃는 문화, 어디서 왔고 왜 재미있을까요. 가볍게 읽어 보세요.</p>
      {ARTICLES.map((a) => (
        <a key={a.slug} href={`/stories/${a.slug}`} style={card}>
          <div style={{ fontSize: "1.12rem", fontWeight: 700 }}>{a.title}</div>
          <div style={{ opacity: 0.8, marginTop: 6 }}>{a.desc}</div>
          <div style={{ opacity: 0.55, fontSize: ".82rem", marginTop: 6 }}>읽는 데 {a.read}</div>
        </a>
      ))}
      <p style={{ marginTop: 28 }}><a href="/gwangclick/">⚡ 오늘의 떡밥, 지금 플레이하기 →</a></p>
    </main>
  );
}
