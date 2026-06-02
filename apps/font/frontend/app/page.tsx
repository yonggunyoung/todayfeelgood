import type { Metadata } from "next";
import Link from "next/link";
import { buildMeta } from "@webapp/seo";
import styles from "./landing.module.css";

export const metadata: Metadata = buildMeta({
  title: "손글씨 폰트 자동 생성 — 글씨체 만들기",
  description:
    "그린 글씨에서 스타일을 변형해 나만의 손글씨 폰트를 만드세요. 굵기·기울기·곡률 슬라이더로 자동 폰트 생성.",
  keywords: ["글씨체 만들기", "손글씨 폰트", "자동 폰트 생성"],
});

export default function HomePage() {
  return (
    <main className="container">
      <section className={styles.hero}>
        <h1 className={styles.title}>나만의 손글씨 폰트, 직접 만들기</h1>
        <p className={styles.subtitle}>
          글씨를 그리고 굵기·기울기·곡률 슬라이더를 움직이면, 그 스타일로
          라틴 알파벳 폰트가 자동으로 만들어집니다.
        </p>
        <Link href="/font" className={styles.cta}>
          폰트 만들러 가기 →
        </Link>
      </section>
    </main>
  );
}
