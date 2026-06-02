import type { Metadata } from "next";
import Link from "next/link";
import { buildMeta, webApplicationJsonLd } from "@webapp/seo";
import { BrushDivider, BrushUnderline, Mascot, Sticker } from "@webapp/ui";
import { SiteHeader, SiteFooter } from "../components/SiteChrome";
import InteractiveSpecimen from "../components/InteractiveSpecimen";
import styles from "./landing.module.css";

export const metadata: Metadata = buildMeta({
  title: "획 — 손글씨 폰트 공방 · 글씨체 만들기",
  description:
    "슬라이더로 굵기·기울기·곡률을 다듬어 나만의 글자체를 만들어요. 실시간 미리보기와 WOFF·TTF 내려받기까지 한자리에서.",
  keywords: ["손글씨 폰트", "글씨체 만들기", "폰트 만들기", "자동 폰트 생성"],
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
              <span>슬라이더로 노는 글자체</span>
            </p>
            <h1 className={`display ${styles.headline}`}>
              내 손으로 만드는 <span className={styles.brushWord}>글씨체
                <BrushUnderline className={styles.brushUnderline} />
              </span>
            </h1>
            <p className={styles.lede}>
              굵기를 누르고, 기울기를 밀고, 괴상함도 한 스푼. 슬라이더를 움직이면
              그 자리에서 글자가 새 표정을 지어요. 마음에 들면 바로 받아 가세요.
            </p>
            <div className={styles.heroActions}>
              <Link href="/studio" className={styles.primary}>
                만들러 가기
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
                슬라이더로 굵기·기울기·곡률·괴상함을 다듬고, 무드 프리셋을 톡
                눌러 분위기를 골라요. 마음에 든 순간을 WOFF나 TTF로 바로 받으면
                끝. 인공지능 없이, 공개 가변폰트를 슬라이더로 변형하는
                방식이에요(내가 그린 글씨가 아니라 정직하게 안내해요).
              </p>
              <Link href="/studio" className={styles.howCta}>
                작업대 열기 →
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
