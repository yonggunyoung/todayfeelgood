import type { Metadata } from "next";
import { buildMeta, webApplicationJsonLd } from "@webapp/seo";
import { Card } from "@webapp/ui";
import styles from "./home.module.css";

// 홈은 "도구 허브" 포지셔닝으로 키워드를 일반화한다.
// "폰트 만들기/글씨체" 등 핵심 폰트 키워드는 /font 랜딩에만 집중시켜 자기잠식을 피한다.
export const metadata: Metadata = buildMeta({
  title: "획 — 손으로 빚는 웹 도구 공방",
  description:
    "쓸모 있는 웹 도구를 하나씩 제대로 만들어 두는 작은 공방. 첫 작업대는 글자체 도구입니다.",
  keywords: ["웹 도구", "온라인 도구", "도구 모음", "획 공방"],
  path: "/",
});

const jsonLd = webApplicationJsonLd({
  name: "획",
  description: "글자체부터 시작하는 웹 도구 공방.",
  path: "/",
  category: "DesignApplication",
});

// 앱 카드 목록 — 앱이 늘면 여기에 추가
const APPS = [
  {
    tag: "01 · 폰트",
    name: "폰트공방",
    desc: "굵기·기울기·곡률을 손끝으로 조율해 라틴 글자체를 빚고 WOFF·TTF로 내려받습니다.",
    href: "/font",
    cta: "공방 들어가기",
    ready: true,
  },
  {
    tag: "02 · 다음",
    name: "준비 중인 작업대",
    desc: "다음 도구를 벼리고 있습니다. 글자에서 시작해 차근차근 손을 넓혀 갑니다.",
    href: undefined,
    cta: "곧 공개",
    ready: false,
  },
];

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main>
        <section className={`container ${styles.hero}`}>
          <span className={styles.mark}>획</span>
          <h1 className={styles.title}>손으로 빚는 작은 도구 공방</h1>
          <p className={styles.lede}>
            거창한 플랫폼은 아닙니다. 쓸모 있는 도구를 하나씩, 제대로 만들어
            둡니다. 첫 작업대는 글자체입니다.
          </p>
        </section>

        <section className={`container ${styles.grid}`} aria-label="도구 목록">
          {APPS.map((app) => (
            <Card key={app.name} tag={app.tag} className={styles.appCard}>
              <h2 className={styles.appName}>{app.name}</h2>
              <p className={`sans ${styles.appDesc}`}>{app.desc}</p>
              {app.ready && app.href ? (
                <a className={`sans ${styles.appCta}`} href={app.href}>
                  {app.cta} →
                </a>
              ) : (
                <span className={`sans ${styles.appSoon}`}>{app.cta}</span>
              )}
            </Card>
          ))}
        </section>

        <footer className={`sans ${styles.footer}`}>
          <div className="container">
            <p>획 — 손끝으로 빚는 글자체. 만든 결과물은 모두 당신의 것입니다.</p>
          </div>
        </footer>
      </main>
    </>
  );
}
