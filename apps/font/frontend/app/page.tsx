import type { Metadata } from "next";
import Link from "next/link";
import { buildMeta, webApplicationJsonLd } from "@webapp/seo";
import { BrushDivider, BrushUnderline, Mascot, Sticker } from "@webapp/ui";
import { SiteHeader, SiteFooter } from "../components/SiteChrome";
import InteractiveSpecimen from "../components/InteractiveSpecimen";
import styles from "./landing.module.css";

export const metadata: Metadata = buildMeta({
  title: "획 — 내 손글씨로 만드는 폰트 공방",
  description:
    "AI가 흉내낸 남의 글씨가 아니라, 내가 직접 그린 진짜 내 글씨체. 한글도 자모를 그려 그대로. 이미지로 어디에나, WOFF·TTF 폰트파일로도 받아요(무료·비AI).",
  keywords: ["손글씨 폰트", "글씨체 만들기", "내 손글씨 폰트", "한글 손글씨 폰트", "폰트 만들기"],
  path: "/font",
});

const jsonLd = webApplicationJsonLd({
  name: "획 폰트공방",
  description:
    "굵기·기울기·곡률 등 슬라이더로 글자체를 만들고 WOFF·TTF로 내려받는 웹 폰트 공방.",
  path: "/font",
  category: "DesignApplication",
});

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SiteHeader
        right={
          <Link href="/studio" className={styles.headerCta}>
            공방 들어가기
          </Link>
        }
      />

      <main>
        {/* 히어로 — 살아있는 스페시먼이 주인공, 마스코트가 곁들임 */}
        <section className={`container ${styles.hero}`}>
          <div className={styles.heroText}>
            <p className={styles.eyebrow}>
              <Mascot mood="happy" size={28} still label="" />
              <span>직접 그리는 손글씨 폰트</span>
            </p>
            <h1 className={`display ${styles.headline}`}>
              AI가 흉내낸 게 아니라 진짜 <span className={styles.brushWord}>내 글씨
                <BrushUnderline className={styles.brushUnderline} />
              </span>
            </h1>
            <p className={styles.lede}>
              칸마다 직접 그리면, 진짜 내가 그린 획으로 폰트를 구워 드려요. 한글도
              자모를 그려 그대로. 원하는 글자만 그려도 OK다 너굴.
            </p>
            <div className={styles.heroActions}>
              <Link href="/studio" className={styles.primary}>
                그리러 가기
              </Link>
              <a href="#how" className={styles.secondary}>
                어떻게 만드나요?
              </a>
            </div>
          </div>

          <div className={styles.heroStage}>
            <InteractiveSpecimen />
          </div>
        </section>

        {/* 견본 — 색지 배경 섹션으로 면 분리(선 구획 아님) */}
        <section className={styles.band} aria-label="글자 견본">
          <div className={`container ${styles.bandInner}`}>
            <Sticker variant="sticker" rotate={-3} color="var(--candy-coral)" className={styles.bandSticker}>
              한 벌 견본
            </Sticker>
            <div className={styles.bandRow}>
              <span className={styles.bandHeavy}>Aa Bb Cc</span>
              <span className={styles.bandLabel}>가늘게부터 두껍게까지</span>
            </div>
            <div className={styles.bandRow}>
              <span className={styles.bandWide}>0 1 2 3 4 5 6 7 8 9</span>
              <span className={styles.bandLabel}>숫자도 한 벌로</span>
            </div>
          </div>
        </section>

        {/* 왜 우리 — 제네릭 AI 폰트 생성기(프롬프트→가짜 글씨 이미지)와 정직하게 구분 */}
        <section className={`container ${styles.why}`} aria-label="이 공방이 다른 점">
          <h2 className={`display ${styles.whyTitle}`}>왜 여기서 만들까요</h2>
          <div className={styles.whyGrid}>
            <div className={styles.whyItem}>
              <h3 className={styles.whyName}>진짜 내 손글씨</h3>
              <p className={styles.whyBody}>
                AI가 만든 남의 글씨가 아니라, 내가 직접 그린 내 획. 개성 그대로
                폰트가 돼요. 흉내가 아니라 진짜 너.
              </p>
            </div>
            <div className={styles.whyItem}>
              <h3 className={styles.whyName}>한글도 된다</h3>
              <p className={styles.whyBody}>
                자모를 그려 내 손글씨 한글을 만들어요. 영어만 되는 다른 생성기와
                달리, 한글이 약하지 않아요.
              </p>
            </div>
            <div className={styles.whyItem}>
              <h3 className={styles.whyName}>결과물을 진짜로 써요</h3>
              <p className={styles.whyBody}>
                이미지로 어디에나(설치 0) + WOFF·TTF 폰트파일로 다시 쓰고 +
                공유링크로 리믹스. 이미지 한 장만 주는 곳과 달라요.
              </p>
            </div>
            <div className={styles.whyItem}>
              <h3 className={styles.whyName}>무료·비AI·정직</h3>
              <p className={styles.whyBody}>
                비용 없이 만들어요. ‘진짜 내 글씨’와 공개폰트 변형 ‘빠른 시작
                샘플’은 또렷이 구분해 알려 드려요(거짓 없음).
              </p>
            </div>
          </div>
        </section>

        {/* 붓획 디바이더 */}
        <div className={`container ${styles.dividerWrap}`} aria-hidden>
          <BrushDivider />
        </div>

        {/* 만드는 법 — 01/02/03 균등 스텝 폐기, 하나의 다정한 설명 카드 */}
        <section id="how" className={`container ${styles.how}`}>
          <div className={styles.howCard}>
            <Mascot mood="focused" size={96} className={styles.howMascot} label="" />
            <div>
              <h2 className={`display ${styles.howTitle}`}>만드는 법은 간단해요</h2>
              <p className={styles.howBody}>
                a–z 칸에 글자를 그리고, 다듬기로 손떨림만 살짝 정리한 뒤
                WOFF·TTF로 받으면 끝. AI 아님 — 진짜 내가 그린 획으로 만든
                폰트예요. 빠르게 둘러보고 싶다면 “빠른 시작 샘플”(기성 폰트
                슬라이더 변형)도 있어요.
              </p>
              <Link href="/studio" className={styles.howCta}>
                그리기 작업대 열기 →
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
