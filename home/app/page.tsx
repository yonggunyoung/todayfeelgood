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

// 스타일 샘플 — 같은 글자가 분위기마다 다른 표정을 짓는다는 걸 보여 준다(시스템 글꼴 흉내).
const SAMPLES = [
  { word: "차분", weight: 420, slant: 0, label: "차분 단정" },
  { word: "발랄", weight: 700, slant: -8, label: "발랄 장난기" },
  { word: "우아", weight: 350, slant: -12, label: "우아한 필기" },
  { word: "거침", weight: 760, slant: -3, label: "거친 손글씨" },
];

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main>
        {/* 히어로 — 비대칭 2열(좌: 소개, 우: 스타일 샘플 카드). 가운데 단일컬럼 탈피. */}
        <section className={`container ${styles.hero}`}>
          <div className={styles.heroText}>
            <p className={styles.eyebrow}>
              <Mascot mood="happy" size={26} still label="" />
              <span>너굴이의 작은 도구 공방</span>
            </p>
            <h1 className={`display ${styles.title}`}>손으로 빚는 작은 도구 공방</h1>
            <p className={styles.lede}>
              거창한 플랫폼은 아니에요. 쓸모 있는 도구를 하나씩, 제대로 만들어
              둡니다. 첫 작업대는 글자체예요.
            </p>
            <a className={styles.heroCta} href="/font">
              폰트공방 들어가기 →
            </a>
          </div>

          {/* 스타일 샘플 카드 — 같은 도구로 다양한 표정을 낼 수 있음을 미리 보여 줌 */}
          <div className={styles.sampleCard} aria-label="글자체 스타일 미리보기 (시스템 글꼴 흉내)">
            <div className={styles.sampleGrid}>
              {SAMPLES.map((s) => (
                <div key={s.label} className={styles.sample}>
                  <span
                    className={styles.sampleWord}
                    style={{ fontWeight: s.weight, transform: `skewX(${s.slant}deg)` }}
                    aria-hidden
                  >
                    {s.word}
                  </span>
                  <span className={styles.sampleLabel}>{s.label}</span>
                </div>
              ))}
            </div>
            <p className={styles.sampleNote}>같은 글자, 슬라이더로 바뀌는 표정</p>
          </div>
        </section>

        {/* 너굴이 소개 — 색지 배경 면 분리(보더 없음) */}
        <section className={styles.meet} aria-label="마스코트 소개">
          <div className={`container ${styles.meetInner}`}>
            <Mascot mood="happy" size={104} className={styles.meetMascot} label="너굴이 마스코트" />
            <div>
              <h2 className={`display ${styles.meetTitle}`}>안녕, 너굴이예요</h2>
              <p className={styles.meetBody}>
                붓을 등에 멘 너구리, 너굴이가 작업대 곳곳에서 거들어요. 글자가
                비어 있을 땐 꾸벅꾸벅 졸고, 새 글씨가 나오면 깜짝 놀라죠. 만드는
                내내 옆에서 응원할게요.
              </p>
            </div>
          </div>
        </section>

        {/* 도구 목록 — 더미 "준비 중" 카드 정리. 실 도구 1개 + 짧은 안내. */}
        <section className={`container ${styles.tools}`} aria-label="도구 목록">
          <h2 className={`display ${styles.toolsTitle}`}>지금 쓸 수 있는 도구</h2>
          <div className={styles.grid}>
            <Card tag="폰트" interactive className={styles.appCard}>
              <h3 className={`display ${styles.appName}`}>폰트공방</h3>
              <p className={styles.appDesc}>
                슬라이더로 굵기·기울기·구불구불·괴상함을 다듬어 글자체를 만들고
                WOFF·TTF로 받아요. 변주 갤러리로 9가지 변형을 한눈에 골라요.
              </p>
              <a className={styles.appCta} href="/font">
                공방 들어가기 →
              </a>
            </Card>
            <div className={styles.next}>
              <p className={styles.nextLabel}>다음 작업대</p>
              <p className={styles.nextBody}>
                글자에서 시작해 차근차근 손을 넓혀 갑니다. 다음 도구를 다듬는
                중이에요.
              </p>
            </div>
          </div>
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
