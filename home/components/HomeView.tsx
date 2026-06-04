import { BrushDivider, Card, Mascot, Sticker, ExitToHub } from "@webapp/ui";
import { webApplicationJsonLd, htmlLang } from "@webapp/seo";
import type { Locale } from "../lib/i18n";
import { getDictionary, neogulPath, legalPath } from "../lib/i18n";
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
            <h3 className={`display ${styles.appName}`}>{t.tools.font.name}</h3>
            <p className={styles.appDesc}>{t.tools.font.desc}</p>
            <a className={styles.appCta} href={fHref}>
              {t.tools.font.cta}
            </a>
          </Card>

          {/* 강한 보조 — 텍스트 이모티콘공방 */}
          <Card tag={t.tools.textmoji.tag} interactive className={styles.secondaryCard}>
            <h3 className={`display ${styles.appName}`}>{t.tools.textmoji.name}</h3>
            <p className={styles.appDesc}>{t.tools.textmoji.desc}</p>
            <a className={styles.appCta} href="/textmoji">
              {t.tools.textmoji.cta}
            </a>
          </Card>

          {/* 하위 도구 */}
          <div className={styles.grid}>
            <Card tag={t.tools.sticker.tag} interactive className={styles.appCard}>
              <h3 className={`display ${styles.appName}`}>{t.tools.sticker.name}</h3>
              <p className={styles.appDesc}>{t.tools.sticker.desc}</p>
              <a className={styles.appCta} href="/sticker">
                {t.tools.sticker.cta}
              </a>
            </Card>
            <Card tag={t.tools.kit.tag} interactive className={styles.appCard}>
              <h3 className={`display ${styles.appName}`}>{t.tools.kit.name}</h3>
              <p className={styles.appDesc}>{t.tools.kit.desc}</p>
              <a className={styles.appCta} href="/kit">
                {t.tools.kit.cta}
              </a>
            </Card>
          </div>

          {/* 다른 공방 — 접힘 구석(싸인 등 문서·서명 타깃 도구) */}
          <details className={styles.otherTools}>
            <summary className={styles.otherSummary}>{t.tools.otherSummary}</summary>
            <div className={styles.otherInner}>
              <Card tag={t.tools.sign.tag} interactive className={styles.appCard}>
                <h3 className={`display ${styles.appName}`}>{t.tools.sign.name}</h3>
                <p className={styles.appDesc}>{t.tools.sign.desc}</p>
                <a className={styles.appCta} href="/sign">
                  {t.tools.sign.cta}
                </a>
              </Card>
            </div>
          </details>
        </section>

        <footer className={styles.footer}>
          <div className="container">
            <p>{t.footer}</p>
            <nav className={styles.footerNav} aria-label={t.legal.navAria}>
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
