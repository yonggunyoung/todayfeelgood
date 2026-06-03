import type { Metadata } from "next";
import Link from "next/link";
import { buildMeta, webApplicationJsonLd } from "@webapp/seo";
import { BrushDivider, Mascot, Sticker } from "@webapp/ui";
import { SiteHeader, SiteFooter } from "../components/SiteChrome";
import styles from "./landing.module.css";

export const metadata: Metadata = buildMeta({
  title: "텍스트 이모티콘공방 — 방금 만든 나만의 조합 · 카오모지 만들기",
  description:
    "검색해도 안 나오는, 방금 만든 나만의 텍스트 이모티콘. 감정·스타일을 고르면 절차적으로 무한 조합하고 호환성 안전등급(🟢🟡🔴)으로 걸러 원탭 복사. 카톡·인스타·디스코드에 바로(비AI, 서버 없음).",
  keywords: [
    "텍스트 이모티콘",
    "감정 이모티콘",
    "카오모지 만들기",
    "이모티콘 조합",
    "특수문자 이모티콘",
  ],
  path: "/textmoji",
});

const jsonLd = webApplicationJsonLd({
  name: "텍스트 이모티콘공방",
  description:
    "감정·스타일을 시드로 절차 생성하고 호환성 안전등급으로 걸러 원탭 복사하는 텍스트 이모티콘 생성기(비AI, 브라우저 완결).",
  path: "/textmoji",
  category: "DesignApplication",
});

// 정적 미리보기 — "검색엔 없는, 조합으로 만드는 것"을 한눈에.
const SAMPLES = [
  { t: "ʕ•ᴥ•ʔ", p: "var(--candy-coral)" },
  { t: "(◕‿◕✿)", p: "var(--candy-plum)" },
  { t: "(╯°□°)╯", p: "var(--candy-butter)" },
  { t: "( •̀ω•́ )", p: "var(--candy-mint)" },
  { t: "\\(^▽^)/", p: "var(--candy-coral)" },
  { t: "(づ｡◕‿◕｡)づ", p: "var(--candy-mint)" },
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
              <span>검색으로 못 찾는, 방금 만든 나만의 조합</span>
            </p>
            <h1 className={`display ${styles.headline}`}>
              나만의 텍스트 이모티콘, 조합으로 만들어
            </h1>
            <p className={styles.lede}>
              복붙 리스트엔 없는 걸 만들어. 감정·스타일을 고르면 눈·입·팔·괄호를
              절차적으로 조합해 무한히 뽑고, 깨질 확률은 안전등급(🟢🟡🔴)으로
              미리 알려줘. 탭 한 번에 복사해 카톡에 써 너굴.
            </p>
            <div className={styles.heroActions}>
              <Link href="/studio" className={styles.primary}>
                조합 만들러 가기
              </Link>
              <a href="#how" className={styles.secondary}>
                어떻게 만드나요?
              </a>
            </div>
          </div>

          <div className={styles.previewCard} aria-label="텍스트 이모티콘 조합 미리보기">
            <Sticker variant="tape" rotate={-4} color="var(--candy-butter)" className={styles.previewTape}>
              조합 미리보기
            </Sticker>
            <div className={styles.previewGrid}>
              {SAMPLES.map((s, i) => (
                <span
                  key={i}
                  className={styles.face}
                  style={{ ["--paper" as string]: s.p }}
                  aria-hidden
                >
                  {s.t}
                </span>
              ))}
            </div>
            <p className={styles.previewNote}>부품을 조합해 매번 새로운 표정</p>
          </div>
        </section>

        <section className={styles.band} aria-label="만드는 흐름">
          <div className={`container ${styles.bandInner}`}>
            <Sticker variant="sticker" rotate={-3} color="var(--candy-coral)" className={styles.bandSticker}>
              비AI · 무료
            </Sticker>
            <div className={styles.steps}>
              <div>
                <span className={styles.stepNum}>고르기</span>
                <h3 className={`display ${styles.stepTitle}`}>① 감정·스타일</h3>
                <p className={styles.stepBody}>
                  기쁨·화남·곰·시크… 감정 칩과 동물상·액션형·대칭 스타일을 톡톡.
                </p>
              </div>
              <div>
                <span className={styles.stepNum}>조합</span>
                <h3 className={`display ${styles.stepTitle}`}>② 절차 생성</h3>
                <p className={styles.stepBody}>
                  부품을 시드로 조합해 그리드 한가득. 🎲 더 만들기로 매번 새 조합.
                </p>
              </div>
              <div>
                <span className={styles.stepNum}>복사</span>
                <h3 className={`display ${styles.stepTitle}`}>③ 안전등급 + 원탭</h3>
                <p className={styles.stepBody}>
                  🟢🟡🔴로 깨짐을 미리 알려주고, 탭 한 번에 복사. 즐겨찾기는 ★.
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
              <h2 className={`display ${styles.howTitle}`}>정직하게, 안전등급은 추정치예요</h2>
              <p className={styles.howBody}>
                AI 아님 · 부품을 규칙으로 조합하는 절차 생성이에요. 안전등급은
                유니코드 휴리스틱으로 추정한 값이라, 같은 글자도 상대 기기·앱·폰트에
                따라 □로 깨질 수 있어요. 그래서 🟢 안전부터 권하고, 만든 조합은 이
                브라우저 밖으로 안 나가요. 같은 시드면 같은 조합이 다시 나와요.
              </p>
              <Link href="/studio" className={styles.howCta}>
                만들러 가기 →
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
