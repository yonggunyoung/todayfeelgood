import type { Metadata } from "next";
import Link from "next/link";
import { buildMeta, webApplicationJsonLd } from "@webapp/seo";
import { SiteHeader, SiteFooter } from "../components/SiteChrome";
import InteractiveSpecimen from "../components/InteractiveSpecimen";
import styles from "./landing.module.css";

export const metadata: Metadata = buildMeta({
  title: "획 — 손글씨 폰트 공방 · 글씨체 만들기",
  description:
    "굵기·기울기·곡률을 손끝으로 조율해 나만의 라틴 글자체를 빚습니다. 실시간 미리보기와 WOFF·TTF 내려받기까지, 모든 과정이 한자리에서.",
  keywords: ["손글씨 폰트", "글씨체 만들기", "폰트 만들기", "자동 폰트 생성"],
  path: "/font",
});

const jsonLd = webApplicationJsonLd({
  name: "획 폰트공방",
  description:
    "굵기·기울기·곡률 파라미터로 라틴 글자체를 만들고 WOFF·TTF로 내려받는 웹 폰트 공방.",
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
        {/* 히어로 — 살아있는 스페시먼이 주인공 */}
        <section className={`container ${styles.hero}`}>
          <div className={styles.heroText}>
            <p className={`sans ${styles.kicker}`}>劃 · 손끝의 글자체 공방</p>
            <h1 className={styles.headline}>
              한 획에서
              <br />
              한 벌의 글자가
              <br />
              태어납니다
            </h1>
            <p className={styles.lede}>
              굵기를 누르고, 기울기를 밀고, 곡률을 굴려 보세요. 슬라이더를
              움직이는 그 자리에서 라틴 알파벳 한 벌이 새 표정을 갖습니다.
              마음에 들면 그대로 내려받으면 됩니다.
            </p>
            <div className={`sans ${styles.heroActions}`}>
              <Link href="/studio" className={styles.primary}>
                글자체 빚으러 가기
              </Link>
              <a href="#how" className={styles.secondary}>
                어떻게 만드나요
              </a>
            </div>
          </div>

          <div className={styles.heroStage}>
            <InteractiveSpecimen />
          </div>
        </section>

        {/* 스페시먼 띠 — 클리셰 팬그램 대신 다양한 의도된 조합 */}
        <section className={styles.band} aria-label="글자 견본">
          <div className="container">
            <div className={styles.bandRow}>
              <span className={styles.bandHeavy}>Aa Bb Cc</span>
              <span className={`sans ${styles.bandLabel}`}>Regular → Black</span>
            </div>
            <div className={styles.bandRule} />
            <div className={styles.bandRow}>
              <span className={styles.bandSerif}>
                새벽 다섯 시, 인쇄기가 깨어난다 — 1985
              </span>
            </div>
            <div className={styles.bandRule} />
            <div className={styles.bandRow}>
              <span className={styles.bandWide}>0 1 2 3 4 5 6 7 8 9</span>
              <span className={`sans ${styles.bandLabel}`}>Tabular</span>
            </div>
          </div>
        </section>

        {/* 작업 순서 — 사람이 쓴 듯한 카피, 비대칭 3단 */}
        <section id="how" className={`container ${styles.how}`}>
          <h2 className={styles.howTitle}>공방의 작업 순서</h2>
          <ol className={`sans ${styles.steps}`}>
            <li className={styles.step}>
              <span className={styles.stepNo}>01</span>
              <h3 className={styles.stepHead}>세 축을 정합니다</h3>
              <p className={styles.stepBody}>
                만들고 싶은 표정을 떠올려 보세요. 굵게, 기울게, 둥글게 —
                세 가지 축으로 글자의 인상을 정합니다. (손글씨 그림 반영은
                다음 단계로 준비 중입니다.)
              </p>
            </li>
            <li className={styles.step}>
              <span className={styles.stepNo}>02</span>
              <h3 className={styles.stepHead}>세 개의 축을 조율합니다</h3>
              <p className={styles.stepBody}>
                굵기·기울기·곡률. 세 슬라이더가 가변폰트를 실시간으로 변형합니다.
                인공지능 없이, 오롯이 기하의 힘으로.
              </p>
            </li>
            <li className={styles.step}>
              <span className={styles.stepNo}>03</span>
              <h3 className={styles.stepHead}>한 벌을 받아 갑니다</h3>
              <p className={styles.stepBody}>
                마음에 든 순간의 글자체를 WOFF 또는 TTF로 바로 내려받습니다.
                이 자리에서 끝, 어디로도 보내지 않습니다.
              </p>
            </li>
          </ol>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
