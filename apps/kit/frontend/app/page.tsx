import type { Metadata } from "next";
import Link from "next/link";
import { buildMeta, webApplicationJsonLd } from "@webapp/seo";
import { BrushDivider, Mascot, Sticker } from "@webapp/ui";
import { SiteHeader, SiteFooter } from "../components/SiteChrome";
import styles from "./landing.module.css";

export const metadata: Metadata = buildMeta({
  title: "키트공방 — 글씨체·색·로고를 한 벌 브랜드 키트로",
  description:
    "브랜드명을 적으면 어울리는 글씨체와 조화 팔레트, 미리보기 시트를 한 벌 키트로 묶어 ZIP으로 받아요. 폰트(woff/ttf)+palette.css+font-face.css+preview.png+라이선스까지. 공개 폰트 변형 기반(비AI).",
  keywords: ["브랜드 키트", "브랜드 팔레트", "폰트 키트", "로고 키트", "컬러 팔레트 생성"],
  path: "/kit",
});

const jsonLd = webApplicationJsonLd({
  name: "키트공방",
  description:
    "글씨체·조화 팔레트·미리보기 시트를 한 벌 브랜드 키트 ZIP으로 묶어 내려받는 웹 도구(공개 폰트 변형 기반, 비AI, 브라우저 합성).",
  path: "/kit",
  category: "DesignApplication",
});

// 정적 팔레트 미리보기(시스템 글꼴 흉내) — "한 벌 키트"를 한눈에.
const SWATCHES = ["#8e3320", "#c0492b", "#ef7a52", "#46b39a", "#f6efe6"];

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
            키트 만들기
          </Link>
        }
      />

      <main>
        <section className={`container ${styles.hero}`}>
          <div>
            <p className={styles.eyebrow}>
              <Mascot mood="happy" size={28} still label="" />
              <span>글씨체·색·로고를 한 벌로</span>
            </p>
            <h1 className={`display ${styles.headline}`}>내 브랜드 한 벌 키트</h1>
            <p className={styles.lede}>
              브랜드명을 적고 무드를 고르면 어울리는 글씨체와 조화 팔레트, 미리보기 시트를
              한 벌로 묶어요. 폰트 파일 + palette.css + font-face.css + 라이선스까지 ZIP 한 방에.
            </p>
            <div className={styles.heroActions}>
              <Link href="/studio" className={styles.primary}>
                키트 만들러 가기
              </Link>
              <a href="#how" className={styles.secondary}>
                어떻게 묶이나요?
              </a>
            </div>
          </div>

          <div className={styles.previewCard} aria-label="브랜드 키트 미리보기">
            <Sticker variant="tape" rotate={-4} color="var(--candy-butter)" className={styles.previewTape}>
              키트 봉투
            </Sticker>
            <div style={{ marginBottom: "var(--sp-4)" }}>
              <span className="display" style={{ fontSize: "2.2rem", fontWeight: 700 }}>
                Mybrand
              </span>
            </div>
            <div className={styles.previewGrid} style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
              {SWATCHES.map((c, i) => (
                <span
                  key={i}
                  className={styles.face}
                  style={{ background: c, ["--paper" as string]: c }}
                  aria-hidden
                />
              ))}
            </div>
            <p className={styles.previewNote}>폰트 + 팔레트 + 시트가 한 벌로</p>
          </div>
        </section>

        <section className={styles.band} aria-label="키트로 묶는 흐름">
          <div className={`container ${styles.bandInner}`}>
            <Sticker variant="sticker" rotate={-3} color="var(--candy-coral)" className={styles.bandSticker}>
              비AI · 무료부터
            </Sticker>
            <div className={styles.steps}>
              <div className={styles.step}>
                <span className={styles.stepNum}>고르기</span>
                <h3 className={`display ${styles.stepTitle}`}>① 이름·무드·색</h3>
                <p className={styles.stepBody}>
                  브랜드명을 적고 무드 프리셋과 악센트 색을 고르면 조화 팔레트가 자동으로.
                </p>
              </div>
              <div className={styles.step}>
                <span className={styles.stepNum}>미리보기</span>
                <h3 className={`display ${styles.stepTitle}`}>② 시트로 확인</h3>
                <p className={styles.stepBody}>
                  로고(브랜드명)·팔레트 칩·글자 견본을 한 장 시트로 즉시 미리봐요.
                </p>
              </div>
              <div className={styles.step}>
                <span className={styles.stepNum}>받기</span>
                <h3 className={`display ${styles.stepTitle}`}>③ 키트 ZIP</h3>
                <p className={styles.stepBody}>
                  폰트 + palette.css + font-face.css + preview.png + 라이선스를 한 ZIP으로.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className={`container ${styles.dividerWrap}`} aria-hidden>
          <BrushDivider />
        </div>

        <section id="how" className={`container ${styles.how}`}>
          <div className={styles.howCard}>
            <Mascot mood="love" size={96} className={styles.howMascot} label="" />
            <div>
              <h2 className={`display ${styles.howTitle}`}>정직하게, 공개 폰트 변형 기반이에요</h2>
              <p className={styles.howBody}>
                키트의 글씨체는 공개 가변폰트(OFL)를 변형해 만든 결과예요. 실제 자필 캡처나
                AI 생성이 아닙니다. 폰트 파일·시트·CSS·라이선스 고지까지 한 봉투에 담아 드려요.
                합성과 ZIP 묶기는 전부 이 브라우저에서 일어나요(서버 0).
              </p>
              <Link href="/studio" className={styles.howCta}>
                키트 만들기 →
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
