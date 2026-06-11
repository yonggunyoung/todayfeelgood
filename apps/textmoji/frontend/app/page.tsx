import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { buildMeta, webApplicationJsonLd } from "@webapp/seo";
import { localeFromHeaders } from "@webapp/i18n";
import { BrushDivider, Mascot, Sticker } from "@webapp/ui";
import { SiteHeader, SiteFooter } from "../components/SiteChrome";
import { getDict } from "../lib/i18n";
import styles from "./landing.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const locale = localeFromHeaders(headers());
  const t = getDict(locale).meta;
  return buildMeta({
    title: t.landingTitle,
    description: t.landingDescription,
    keywords: t.landingKeywords,
    path: "/textmoji",
    locale,
    alternates: { ko: "/textmoji", en: "/textmoji" },
  });
}

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
  const locale = localeFromHeaders(headers());
  const dict = getDict(locale);
  const t = dict.landing;
  const jsonLd = webApplicationJsonLd({
    name: dict.meta.appName,
    description: dict.meta.jsonLdDescription,
    path: "/textmoji",
    category: "DesignApplication",
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SiteHeader
        dict={dict}
        right={
          <Link href="/studio" className={styles.headerCta}>
            {t.headerCta}
          </Link>
        }
      />

      <main>
        <section className={`container ${styles.hero}`}>
          <div>
            <p className={styles.eyebrow}>
              <Mascot mood="happy" size={28} still label="" />
              <span>{t.eyebrow}</span>
            </p>
            <h1 className={`display ${styles.headline}`}>{t.headline}</h1>
            <p className={styles.lede}>{t.lede}</p>
            <div className={styles.heroActions}>
              <Link href="/studio" className={styles.primary}>
                {t.primaryCta}
              </Link>
              <a href="#how" className={styles.secondary}>
                {t.secondaryCta}
              </a>
            </div>
          </div>

          <div className={styles.previewCard} aria-label={t.previewAria}>
            <Sticker variant="tape" rotate={-4} color="var(--candy-butter)" className={styles.previewTape}>
              {t.previewTape}
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
            <p className={styles.previewNote}>{t.previewNote}</p>
          </div>
        </section>

        <section className={styles.band} aria-label={t.bandAria}>
          <div className={`container ${styles.bandInner}`}>
            <Sticker variant="sticker" rotate={-3} color="var(--candy-coral)" className={styles.bandSticker}>
              {t.bandSticker}
            </Sticker>
            <div className={styles.steps}>
              <div>
                <span className={styles.stepNum}>{t.step1Num}</span>
                <h3 className={`display ${styles.stepTitle}`}>{t.step1Title}</h3>
                <p className={styles.stepBody}>{t.step1Body}</p>
              </div>
              <div>
                <span className={styles.stepNum}>{t.step2Num}</span>
                <h3 className={`display ${styles.stepTitle}`}>{t.step2Title}</h3>
                <p className={styles.stepBody}>{t.step2Body}</p>
              </div>
              <div>
                <span className={styles.stepNum}>{t.step3Num}</span>
                <h3 className={`display ${styles.stepTitle}`}>{t.step3Title}</h3>
                <p className={styles.stepBody}>{t.step3Body}</p>
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
              <h2 className={`display ${styles.howTitle}`}>{t.howTitle}</h2>
              <p className={styles.howBody}>{t.howBody}</p>
              <Link href="/studio" className={styles.howCta}>
                {t.howCta}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter dict={dict} />
    </>
  );
}
