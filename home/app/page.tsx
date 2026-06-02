import type { Metadata } from "next";
import { buildMeta, webApplicationJsonLd } from "@webapp/seo";
import { Card, Mascot } from "@webapp/ui";
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
    tag: "폰트",
    name: "폰트공방",
    desc: "슬라이더로 굵기·기울기·괴상함을 다듬어 글자체를 만들고 WOFF·TTF로 받아요.",
    href: "/font",
    cta: "공방 들어가기",
    ready: true,
  },
  {
    tag: "다음",
    name: "준비 중인 작업대",
    desc: "다음 도구를 다듬고 있어요. 글자에서 시작해 차근차근 손을 넓혀 갑니다.",
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
          <Mascot mood="happy" size={96} className={styles.mascot} label="" />
          <h1 className={`display ${styles.title}`}>손으로 빚는 작은 도구 공방</h1>
          <p className={styles.lede}>
            거창한 플랫폼은 아니에요. 쓸모 있는 도구를 하나씩, 제대로 만들어
            둡니다. 첫 작업대는 글자체예요.
          </p>
        </section>

        <section className={`container ${styles.grid}`} aria-label="도구 목록">
          {APPS.map((app) => (
            <Card
              key={app.name}
              tag={app.tag}
              interactive={app.ready}
              className={styles.appCard}
            >
              <h2 className={`display ${styles.appName}`}>{app.name}</h2>
              <p className={styles.appDesc}>{app.desc}</p>
              {app.ready && app.href ? (
                <a className={styles.appCta} href={app.href}>
                  {app.cta} →
                </a>
              ) : (
                <span className={styles.appSoon}>{app.cta}</span>
              )}
            </Card>
          ))}
        </section>

        <footer className={styles.footer}>
          <div className="container">
            <p>획 — 손끝으로 빚는 글자체. 만든 결과물은 모두 당신의 것이에요.</p>
          </div>
        </footer>
      </main>
    </>
  );
}
