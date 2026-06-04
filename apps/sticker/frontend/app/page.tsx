import type { Metadata } from "next";
import Link from "next/link";
import { buildMeta, webApplicationJsonLd } from "@webapp/seo";
import { BrushDivider, Mascot, Sticker } from "@webapp/ui";
import { SiteHeader, SiteFooter } from "../components/SiteChrome";
import { MAX_STICKER_SET_SIZE } from "../lib/presets";
import styles from "./landing.module.css";

export const metadata: Metadata = buildMeta({
  title: "스티커공방 — 한 번 그리면 표정 한 세트 · 이모티콘 만들기",
  description:
    "캐릭터 하나만 그리면 표정·색·테두리 변주를 자동으로 만들어 투명 PNG 스티커 팩으로. AI 없이 브라우저에서 바로 만들고, 카톡·인스타·디스코드에 그대로 써요.",
  keywords: ["스티커 만들기", "이모티콘 만들기", "투명 PNG", "캐릭터 스티커", "짤 만들기"],
  path: "/sticker",
});

const jsonLd = webApplicationJsonLd({
  name: "스티커공방",
  description:
    "한 번 그리면 표정·색 변주를 자동 생성해 투명 PNG 스티커 팩으로 내려받는 웹 도구(비AI, 브라우저 합성).",
  path: "/sticker",
  category: "DesignApplication",
});

// 정적 표정 미리보기(이모지로 흉내) — "한 캐릭터, 여러 표정"을 한눈에.
const FACES = [
  { e: "😄", p: "var(--candy-coral)" },
  { e: "😍", p: "var(--candy-plum)" },
  { e: "😉", p: "var(--candy-butter)" },
  { e: "😢", p: "var(--candy-mint)" },
  { e: "😠", p: "var(--candy-coral)" },
  { e: "🤩", p: "var(--candy-butter)" },
  { e: "😴", p: "var(--candy-mint)" },
  { e: "👌", p: "var(--candy-plum)" },
  { e: "💪", p: "var(--candy-coral)" },
];

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
            만들러 가기
          </Link>
        }
      />

      <main>
        <section className={`container ${styles.hero}`}>
          <div>
            <p className={styles.eyebrow}>
              <Mascot mood="happy" size={28} still label="" />
              <span>한 번 그리면 표정 한 세트</span>
            </p>
            <h1 className={`display ${styles.headline}`}>내 캐릭터로 만드는 스티커 팩</h1>
            <p className={styles.lede}>
              동그라미 하나만 그려도 좋아요. 기쁨·슬픔·윙크·하트… 표정과 색을 자동으로
              변주해 투명 PNG {MAX_STICKER_SET_SIZE}종 세트로 만들어 드려요. 카톡·인스타·디스코드에 바로.
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

          <div className={styles.previewCard} aria-label="표정 변주 미리보기">
            <Sticker variant="tape" rotate={-4} color="var(--candy-butter)" className={styles.previewTape}>
              표정 한 세트
            </Sticker>
            <div className={styles.previewGrid}>
              {FACES.map((f, i) => (
                <span
                  key={i}
                  className={styles.face}
                  style={{ ["--paper" as string]: f.p }}
                  aria-hidden
                >
                  {f.e}
                </span>
              ))}
            </div>
            <p className={styles.previewNote}>같은 캐릭터, 자동으로 바뀌는 표정</p>
          </div>
        </section>

        <section className={styles.band} aria-label="만드는 흐름">
          <div className={`container ${styles.bandInner}`}>
            <Sticker variant="sticker" rotate={-3} color="var(--candy-coral)" className={styles.bandSticker}>
              비AI · 무료
            </Sticker>
            <div className={styles.steps}>
              <div className={styles.step}>
                <span className={styles.stepNum}>그리기</span>
                <h3 className={`display ${styles.stepTitle}`}>① 캐릭터를 그려요</h3>
                <p className={styles.stepBody}>
                  마우스·터치로 슥슥. 펜 색과 굵기, 지우개까지. 못 그려도 괜찮아요.
                </p>
              </div>
              <div className={styles.step}>
                <span className={styles.stepNum}>변주</span>
                <h3 className={`display ${styles.stepTitle}`}>② 표정 {MAX_STICKER_SET_SIZE}종 자동</h3>
                <p className={styles.stepBody}>
                  표정·색·테두리·짤 캡션을 절차적으로 변주. 주사위로 다른 조합도 즉시.
                </p>
              </div>
              <div className={styles.step}>
                <span className={styles.stepNum}>받기</span>
                <h3 className={`display ${styles.stepTitle}`}>③ 투명 PNG로</h3>
                <p className={styles.stepBody}>
                  개별 PNG 또는 전체 ZIP. 카톡·인스타·디스코드에 그대로 올려요.
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
              <h2 className={`display ${styles.howTitle}`}>그린 그림으로, 바로 자동 생성</h2>
              <p className={styles.howBody}>
                그린 그림에 표정을 얹고 색·테두리를 규칙으로 변주해요. 그림은 이 브라우저
                안에서만 처리되고 서버로 안 보내요. 같은 시드면 같은 세트가 다시 나와요.
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
