import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { ARTICLES } from "./articles";

export const metadata: Metadata = {
  title: "읽을거리 — 떡밥 문화 이야기 & 광클 꿀팁",
  description:
    "클릭 속도 테스트(CPS), 광클 잘하는 법, 밸런스 게임 질문 모음부터 민초·부먹찍먹 같은 떡밥 문화 이야기까지. 실용 가이드와 읽을거리를 한곳에 모았습니다.",
  keywords: [
    "클릭속도테스트", "광클 잘하는법", "밸런스게임 질문", "단톡방 게임",
    "민초 호불호", "손가락 스트레칭", "떡밥", "CPS 테스트",
  ],
  alternates: { canonical: "/stories" },
};

const wrap: CSSProperties = { maxWidth: 760, margin: "0 auto", padding: "36px 20px 72px", lineHeight: 1.8 };
const nav: CSSProperties = { display: "flex", gap: 14, flexWrap: "wrap", margin: "8px 0 28px", fontSize: ".95rem" };
const card: CSSProperties = {
  display: "block", border: "1px solid rgba(128,128,128,.2)", borderRadius: 14,
  padding: "16px 18px", margin: "12px 0", textDecoration: "none", color: "inherit",
};
const badge: CSSProperties = {
  display: "inline-block", fontSize: ".72rem", fontWeight: 700, padding: "2px 8px",
  borderRadius: 999, background: "rgba(128,128,128,.14)", marginBottom: 8,
};
const h2: CSSProperties = { fontSize: "1.2rem", marginTop: 34 };

// 실용 가이드(검색 유입용)와 떡밥 문화 에세이를 분리해 보여 준다.
function Card({ a }: { a: (typeof ARTICLES)[number] }) {
  return (
    <a href={`/stories/${a.slug}`} style={card}>
      <span style={badge}>{a.tag ?? "떡밥 문화"}</span>
      <div style={{ fontSize: "1.12rem", fontWeight: 700 }}>{a.title}</div>
      <div style={{ opacity: 0.8, marginTop: 6 }}>{a.desc}</div>
      <div style={{ opacity: 0.55, fontSize: ".82rem", marginTop: 6 }}>읽는 데 {a.read}</div>
    </a>
  );
}

export default function StoriesIndex() {
  const guides = ARTICLES.filter((a) => a.tag === "실용 가이드");
  const culture = ARTICLES.filter((a) => a.tag !== "실용 가이드");
  return (
    <main style={wrap}>
      <p style={nav}>
        <a href="/">← 홈</a><a href="/about">소개</a><a href="/guide">사용 가이드</a><a href="/faq">FAQ</a>
      </p>
      <h1 className="display" style={{ fontSize: "2rem" }}>읽을거리</h1>
      <p>클릭 속도 올리는 법부터 모임에서 쓰는 떡밥까지, 바로 써먹는 실용 가이드와 떡밥 문화 이야기를 모았습니다.</p>

      {guides.length > 0 && (
        <>
          <h2 style={h2}>실용 가이드</h2>
          {guides.map((a) => <Card key={a.slug} a={a} />)}
        </>
      )}

      <h2 style={h2}>떡밥 문화 이야기</h2>
      {culture.map((a) => <Card key={a.slug} a={a} />)}

      <p style={{ marginTop: 28 }}><a href="/gwangclick/">⚡ 오늘의 떡밥, 지금 플레이하기 →</a></p>
    </main>
  );
}
