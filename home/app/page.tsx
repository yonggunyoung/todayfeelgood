import type { Metadata } from "next";
import { buildMeta, webApplicationJsonLd } from "@webapp/seo";
import { BrushDivider, Card, Mascot, Sticker } from "@webapp/ui";
import styles from "./home.module.css";

// 홈은 "도구 허브" 포지셔닝이되, 주력(플래그십)은 폰트생성이다.
// 폰트 핵심 키워드("손글씨 폰트"·"글씨체 만들기")는 /font 랜딩에 집중시켜 자기잠식을 피하고,
// home은 허브 일반어 + 플래그십(손글씨)을 히어로로 둔다.
export const metadata: Metadata = buildMeta({
  title: "획 — 내 손글씨로 만드는 폰트 공방",
  description:
    "내가 직접 그린 글씨로 진짜 내 글씨체를 만들고, 이미지로 어디에나 써요. 손글씨 폰트가 무대 중앙, 텍스트 이모티콘도 함께.",
  keywords: ["손글씨 폰트", "글씨체 만들기", "폰트 만들기", "웹 도구 공방"],
  path: "/",
});

const jsonLd = webApplicationJsonLd({
  name: "획",
  description: "내 손글씨로 만드는 폰트 공방부터 텍스트 이모티콘·스티커까지, 웹 도구 공방.",
  path: "/",
  category: "DesignApplication",
});

// 히어로 미리보기 — "내가 그린 글씨가 글씨체가 된다"를 한눈에.
const SAMPLES = [
  { t: "Aa", paper: "var(--candy-coral)" },
  { t: "가나", paper: "var(--candy-plum)" },
  { t: "Bb", paper: "var(--candy-butter)" },
  { t: "안녕", paper: "var(--candy-mint)" },
];

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main>
        {/* 히어로 — 플래그십: 내 손글씨로 만드는 폰트를 무대 중앙으로. */}
        <section className={`container ${styles.hero}`}>
          <div className={styles.heroText}>
            <p className={styles.eyebrow}>
              <Mascot mood="happy" size={26} still label="" />
              <span>너굴이의 작은 도구 공방</span>
            </p>
            <h1 className={`display ${styles.title}`}>내가 직접 그린 글씨로, 진짜 내 글씨체</h1>
            <p className={styles.lede}>
              칸마다 직접 그리면 진짜 내가 그린 획으로 폰트를 구워 줘. 이미지로
              어디에나 쓰고, 진짜 폰트파일로도 받아. 한글도 된다 너굴.
            </p>
            <a className={styles.heroCta} href="/font">
              폰트공방에서 직접 그리기 →
            </a>
          </div>

          {/* 히어로 우측 — 내 글씨 견본 카드 */}
          <div className={styles.sampleCard} aria-label="내 손글씨 글씨체 미리보기">
            <Sticker variant="tape" rotate={-4} color="var(--candy-butter)" className={styles.sampleTape}>
              내 글씨 견본
            </Sticker>
            <div className={styles.sampleGrid}>
              {SAMPLES.map((s) => (
                <div
                  key={s.t}
                  className={styles.sample}
                  style={{ ["--paper" as string]: s.paper }}
                >
                  <span className={styles.sampleMoji} aria-hidden>
                    {s.t}
                  </span>
                </div>
              ))}
            </div>
            <p className={styles.sampleNote}>내가 그린 획이 그대로 글씨체로</p>
          </div>
        </section>

        {/* 붓획 디바이더 */}
        <div className={`container ${styles.dividerWrap}`} aria-hidden>
          <BrushDivider />
        </div>

        {/* 너굴이 소개 */}
        <section className={styles.meet} aria-label="마스코트 소개">
          <div className={`container ${styles.meetInner}`}>
            <Mascot mood="love" size={132} className={styles.meetMascot} label="너굴이 마스코트" />
            <div>
              <h2 className={`display ${styles.meetTitle}`}>너굴이다</h2>
              <p className={styles.meetBody}>
                붓 멘 너구리. 거드는 건 내 담당이다 너굴.
              </p>
            </div>
          </div>
        </section>

        {/* 도구 목록 — 폰트 플래그십 전면, 이모티콘 강한 보조, 나머지 하위. */}
        <section className={`container ${styles.tools}`} aria-label="도구 목록">
          <h2 className={`display ${styles.toolsTitle}`}>지금 쓸 수 있는 도구</h2>

          {/* 대표 — 폰트공방 전면 카드(플래그십) */}
          <Card tag="대표 · 손글씨 폰트" interactive className={styles.featureCard}>
            <h3 className={`display ${styles.appName}`}>폰트공방</h3>
            <p className={styles.appDesc}>
              칸마다 직접 글자를 그리면 진짜 내가 그린 획으로 폰트를 구워 줘요. AI가
              흉내낸 남의 글씨가 아니라 진짜 내 글씨, 한글도 자모를 그려 그대로.
              이미지로 어디에나 쓰고 WOFF·TTF 폰트파일로도 받아요(무료·비AI).
            </p>
            <a className={styles.appCta} href="/font">
              직접 그리러 가기 →
            </a>
          </Card>

          {/* 강한 보조 — 텍스트 이모티콘공방 */}
          <Card tag="텍스트 이모티콘" interactive className={styles.secondaryCard}>
            <h3 className={`display ${styles.appName}`}>이모티콘공방</h3>
            <p className={styles.appDesc}>
              눈·입·팔·괄호를 절차적으로 조합해 검색에도 없는 나만의 텍스트
              이모티콘을 무한히 만들어요. 호환성 안전등급(🟢🟡🔴)으로 깨짐을 미리
              걸러 원탭 복사. 카톡·인스타·디스코드에 바로(비AI, 서버 없음).
            </p>
            <a className={styles.appCta} href="/textmoji">
              공방 들어가기 →
            </a>
          </Card>

          {/* 하위 도구 */}
          <div className={styles.grid}>
            <Card tag="스티커" interactive className={styles.appCard}>
              <h3 className={`display ${styles.appName}`}>스티커공방</h3>
              <p className={styles.appDesc}>
                캐릭터 하나만 그리면 표정·색 변주 12종을 자동으로. 투명 PNG 팩으로
                받아 카톡·인스타·디스코드에 바로(비AI).
              </p>
              <a className={styles.appCta} href="/sticker">
                공방 들어가기 →
              </a>
            </Card>
            <Card tag="브랜드키트" interactive className={styles.appCard}>
              <h3 className={`display ${styles.appName}`}>키트공방</h3>
              <p className={styles.appDesc}>
                브랜드명·무드·색을 고르면 글씨체+조화 팔레트+미리보기 시트를 한 벌
                키트로 묶어요. 폰트·CSS·라이선스까지 ZIP 한 방에(비AI).
              </p>
              <a className={styles.appCta} href="/kit">
                공방 들어가기 →
              </a>
            </Card>
          </div>

          {/* 다른 공방 — 접힘 구석(싸인 등 문서·서명 타깃 도구) */}
          <details className={styles.otherTools}>
            <summary className={styles.otherSummary}>다른 공방 더 보기</summary>
            <div className={styles.otherInner}>
              <Card tag="서명" interactive className={styles.appCard}>
                <h3 className={`display ${styles.appName}`}>싸인공방</h3>
                <p className={styles.appDesc}>
                  이름을 적으면 흘림체 변형 + 절차적 장식으로 서명 스타일을 만들어요.
                  문서·이메일 서명용. 투명 PNG·SVG로 받아요(비AI).
                </p>
                <a className={styles.appCta} href="/sign">
                  공방 들어가기 →
                </a>
              </Card>
            </div>
          </details>
        </section>

        <footer className={styles.footer}>
          <div className="container">
            <p>획 — 손끝으로 빚는 작은 도구. 만든 결과물은 모두 당신의 것이에요.</p>
          </div>
        </footer>
      </main>
    </>
  );
}
