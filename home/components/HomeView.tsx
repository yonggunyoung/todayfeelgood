import { BrushDivider, Card, Mascot, Sticker, ExitToHub } from "@webapp/ui";
import { webApplicationJsonLd, htmlLang } from "@webapp/seo";
import type { Locale } from "../lib/i18n";
import { getDictionary, neogulPath, legalPath, guidePath } from "../lib/i18n";
import { LanguageToggle } from "./LanguageToggle";
import styles from "../app/home.module.css";

// 폰트앱은 basePath=/font라 일반 <a href="/font...">로 가리켜야 한다(Link는 못 씀).
// 영어 진입점은 폰트 앱의 영어 랜딩(/font/en)으로 보낸다.
function fontHref(locale: Locale): string {
  return locale === "ko" ? "/font" : "/font/en";
}

// 히어로 미리보기 — "내가 그린 글씨가 글씨체가 된다"를 한눈에.
const SAMPLES = [
  { t: "Aa", paper: "var(--candy-coral)" },
  { t: "가나", paper: "var(--candy-plum)" },
  { t: "Bb", paper: "var(--candy-butter)" },
  { t: "안녕", paper: "var(--candy-mint)" },
];

/**
 * 도구 카드 상단 결과 썸네일 — "이런 게 나와요"를 글보다 먼저 보여준다.
 * 단색 그라데이션을 버리고 "진짜 결과물 목업"처럼: 손글씨 폰트·실제 마스코트 얼굴·
 * 브랜드 보드 등 여러 요소를 겹쳐 호기심을 끌도록 구성.
 */
function ToolThumb({ kind }: { kind: "font" | "textmoji" | "sticker" | "kit" | "sign" }) {
  // ① 폰트공방 — 줄 친 종이 위에 손으로 쓴 한글(나눔손글씨). "내 글씨가 폰트로".
  if (kind === "font")
    return (
      <div className={`${styles.toolThumb} ${styles.thumbFont}`} aria-hidden>
        <div className={styles.thumbPaper}>
          <span className={styles.thumbHand}>오늘도 좋은 하루,</span>
          <span className={styles.thumbHand2}>내 손글씨로 ✍︎</span>
        </div>
      </div>
    );
  // ② 이모티콘공방 — 여러 카오모지를 칩으로 흩뿌린 팔레트. 다양함을 보여줌.
  if (kind === "textmoji")
    return (
      <div className={`${styles.toolThumb} ${styles.thumbMoji}`} aria-hidden>
        {["(๑•̀ᴗ•́)૭", "( ๑꒪⌓꒪)", "ヽ(•ω•)ノ", "(づ｡◕‿◕｡)づ"].map((m, i) => (
          <span key={i} className={styles.thumbKao} data-i={i}>
            {m}
          </span>
        ))}
      </div>
    );
  // ③ 스티커공방 — 진짜 마스코트 얼굴 3종을 스티커 시트처럼. 카오모지보다 캐릭터.
  if (kind === "sticker")
    return (
      <div className={`${styles.toolThumb} ${styles.thumbSticker}`} aria-hidden>
        <span className={styles.thumbChip} data-r="-8">
          <Mascot mood="happy" size={46} still label="" />
        </span>
        <span className={styles.thumbChip} data-r="4">
          <Mascot mood="love" size={52} still label="" />
        </span>
        <span className={styles.thumbChip} data-r="-3">
          <Mascot mood="surprised" size={46} still label="" />
        </span>
      </div>
    );
  // ④ 키트공방 — 브랜드 보드 목업: 팔레트 + 로고 워드마크 + 태그.
  if (kind === "kit")
    return (
      <div className={`${styles.toolThumb} ${styles.thumbKit}`} aria-hidden>
        <div className={styles.thumbBoard}>
          <span className={styles.thumbBrand}>m o n g l</span>
          <span className={styles.thumbPalette}>
            {["#ef7a52", "#46b39a", "#f5c451", "#2b2a33"].map((c) => (
              <span key={c} className={styles.thumbSwatch} style={{ background: c }} />
            ))}
          </span>
        </div>
        <span className={styles.thumbTag}>logo · 명함 · 배너</span>
      </div>
    );
  // ⑤ 싸인공방 — 종이 위에 흐르는 필기체 사인 + 밑줄 획.
  return (
    <div className={`${styles.toolThumb} ${styles.thumbSign}`} aria-hidden>
      <span className={styles.thumbSig}>Jiwoo</span>
      <svg className={styles.thumbSigLine} viewBox="0 0 120 16" preserveAspectRatio="none">
        <path d="M3 11 q30 -9 58 -2 q24 6 56 -5" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity="0.85" />
      </svg>
    </div>
  );
}

/** 홈(허브) 랜딩 — 로케일을 받아 사전으로 렌더. ko/en 라우트가 공유. */
export function HomeView({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const jsonLd = webApplicationJsonLd({
    name: t.jsonLd.name,
    description: t.jsonLd.description,
    path: neogulPath(locale),
    category: "DesignApplication",
    inLanguage: htmlLang(locale),
  });
  const fHref = fontHref(locale);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main>
        {/* 상단 언어 토글 바 */}
        <div className={`container ${styles.topbar}`}>
          <LanguageToggle
            current={locale}
            hrefKo={neogulPath("ko")}
            hrefEn={neogulPath("en")}
            label={t.langToggle.label}
            koLabel={t.langToggle.ko}
            enLabel={t.langToggle.en}
          />
          <ExitToHub />
        </div>

        {/* 히어로 — 플래그십: 내 손글씨로 만드는 폰트를 무대 중앙으로. */}
        <section className={`container ${styles.hero}`}>
          <div className={styles.heroText}>
            <p className={styles.eyebrow}>
              <Mascot mood="happy" size={26} still label="" />
              <span>{t.hero.eyebrow}</span>
            </p>
            <h1 className={`display ${styles.title}`}>{t.hero.title}</h1>
            <p className={styles.lede}>{t.hero.lede}</p>
            <a className={styles.heroCta} href={fHref}>
              {t.hero.cta}
            </a>
          </div>

          {/* 히어로 우측 — 내 글씨 견본 카드 */}
          <div className={styles.sampleCard} aria-label={t.hero.sampleAria}>
            <Sticker variant="tape" rotate={-4} color="var(--candy-butter)" className={styles.sampleTape}>
              {t.hero.sampleTape}
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
            <p className={styles.sampleNote}>{t.hero.sampleNote}</p>
          </div>
        </section>

        {/* 붓획 디바이더 */}
        <div className={`container ${styles.dividerWrap}`} aria-hidden>
          <BrushDivider />
        </div>

        {/* 너굴이 소개 */}
        <section className={styles.meet} aria-label={t.meet.aria}>
          <div className={`container ${styles.meetInner}`}>
            <Mascot mood="love" size={132} className={styles.meetMascot} label={t.meet.mascotLabel} />
            <div>
              <h2 className={`display ${styles.meetTitle}`}>{t.meet.title}</h2>
              <p className={styles.meetBody}>{t.meet.body}</p>
            </div>
          </div>
        </section>

        {/* 도구 목록 — 폰트 플래그십 전면, 이모티콘 강한 보조, 나머지 하위. */}
        <section className={`container ${styles.tools}`} aria-label={t.tools.aria}>
          <h2 className={`display ${styles.toolsTitle}`}>{t.tools.title}</h2>

          {/* 대표 — 폰트공방 전면 카드(플래그십) */}
          <Card tag={t.tools.font.tag} interactive className={styles.featureCard}>
            <ToolThumb kind="font" />
            <h3 className={`display ${styles.appName}`}>{t.tools.font.name}</h3>
            <p className={styles.appDesc}>{t.tools.font.desc}</p>
            <a className={styles.appCta} href={fHref}>
              {t.tools.font.cta}
            </a>
          </Card>

          {/* 강한 보조 — 텍스트 이모티콘공방 */}
          <Card tag={t.tools.textmoji.tag} interactive className={styles.secondaryCard}>
            <ToolThumb kind="textmoji" />
            <h3 className={`display ${styles.appName}`}>{t.tools.textmoji.name}</h3>
            <p className={styles.appDesc}>{t.tools.textmoji.desc}</p>
            <a className={styles.appCta} href="/textmoji">
              {t.tools.textmoji.cta}
            </a>
          </Card>

          {/* 스티커·키트·싸인 공방은 보류 — 폰트·이모티콘에 집중하기 위해 화면에서 감춤.
             (코드/라우트/사전은 보존: 직접 URL로는 여전히 접근 가능, 추후 복귀 쉬움) */}
        </section>

        <footer className={styles.footer}>
          <div className="container">
            <p>{t.footer}</p>
            <nav className={styles.footerNav} aria-label={t.legal.navAria}>
              <a href={guidePath(locale)}>{t.guide.linkLabel}</a>
              <span aria-hidden>·</span>
              <a href={legalPath(locale, "privacy")}>{t.legal.privacy.linkLabel}</a>
              <span aria-hidden>·</span>
              <a href={legalPath(locale, "terms")}>{t.legal.terms.linkLabel}</a>
            </nav>
          </div>
        </footer>
      </main>
    </>
  );
}
