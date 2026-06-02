import type { Metadata } from "next";
import Link from "next/link";
import { buildMeta, webApplicationJsonLd } from "@webapp/seo";
import { BrushDivider, BrushUnderline, Mascot, Sticker } from "@webapp/ui";
import { SiteHeader, SiteFooter } from "../components/SiteChrome";
import styles from "./landing.module.css";

export const metadata: Metadata = buildMeta({
  title: "싸인공방 — 내 서명 만들기 · 사인 이미지 생성",
  description:
    "이름을 입력하면 흘림체 변형과 절차적 장식으로 나만의 서명 스타일을 만들어요. 투명 PNG·SVG로 받아 문서·이메일 서명에 바로. AI 없이 한자리에서.",
  keywords: ["내 서명 만들기", "사인 만들기", "전자서명 이미지", "서명 생성기"],
  path: "/sign",
});

const jsonLd = webApplicationJsonLd({
  name: "획 싸인공방",
  description:
    "이름을 흘림체로 변형하고 절차적 장식을 더해 서명 이미지를 만들어 PNG·SVG로 받는 웹 도구.",
  path: "/sign",
  category: "DesignApplication",
});

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SiteHeader
        right={
          <Link href="/studio" className={styles.headerCta}>
            서명 만들러 가기
          </Link>
        }
      />

      <main>
        <section className={`container ${styles.hero}`}>
          <div className={styles.heroText}>
            <p className={styles.eyebrow}>
              <Mascot mood="happy" size={28} still label="" />
              <span>이름 한 줄이면 서명 한 벌</span>
            </p>
            <h1 className={`display ${styles.headline}`}>
              이름으로 빚는{" "}
              <span className={styles.brushWord}>
                나만의 서명
                <BrushUnderline className={styles.brushUnderline} />
              </span>
            </h1>
            <p className={styles.lede}>
              이름을 적고 무드를 고르면 흘림체로 휘갈긴 서명이 떠요. 마음에 드는
              변주를 골라 투명 PNG·SVG로 바로 받아 가세요.
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

          <div className={styles.heroStage} aria-label="서명 미리보기 예시">
            <Sticker variant="tape" rotate={-4} color="var(--candy-butter)" className={styles.stageTape}>
              서명 견본
            </Sticker>
            <span className={styles.sampleSign} aria-hidden>
              Yong Gun
            </span>
            <span className={styles.sampleStroke} aria-hidden />
            <p className={styles.stageNote}>같은 이름, 무드마다 다른 서명</p>
          </div>
        </section>

        <div className={`container ${styles.dividerWrap}`} aria-hidden>
          <BrushDivider />
        </div>

        <section id="how" className={`container ${styles.how}`}>
          <div className={styles.howCard}>
            <Mascot mood="focused" size={96} className={styles.howMascot} label="" />
            <div>
              <h2 className={`display ${styles.howTitle}`}>만드는 법은 간단해요</h2>
              <p className={styles.howBody}>
                이름을 적고 무드를 고른 뒤, 변주 갤러리에서 마음에 드는 한 종을
                골라 PNG·SVG로 받으면 끝. 글자는 공개 가변폰트를 변형한 것이고,
                밑줄·플러리시 같은 장식은 절차적으로 합성한 근사예요 —{" "}
                <strong>실제로 손으로 쓴 서명은 아닙니다.</strong> AI 미사용.
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
