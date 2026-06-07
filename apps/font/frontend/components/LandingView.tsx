import Link from "next/link";
import { webApplicationJsonLd, htmlLang } from "@webapp/seo";
import { AdSlot, BrushDivider, BrushUnderline, Mascot, Sticker } from "@webapp/ui";
import { SiteHeader, SiteFooter } from "./SiteChrome";
import InteractiveSpecimen from "./InteractiveSpecimen";
import { LanguageToggle } from "./LanguageToggle";
import type { Locale } from "../lib/i18n";
import {
  getDictionary,
  guideRoute,
  landingPath,
  landingRoute,
  studioRoute,
} from "../lib/i18n";
import styles from "../app/landing.module.css";

// 홈 허브로의 링크는 basePath(/font)가 붙으면 안 되므로 일반 <a>의 절대경로.
// ko 홈=`/`, en 홈=`/en`.
function homeHref(locale: Locale): string {
  return locale === "ko" ? "/neogul" : "/en/neogul";
}

/** 폰트 앱 랜딩 — 로케일을 받아 사전으로 렌더. ko(/font)·en(/font/en) 공유. */
export function LandingView({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const jsonLd = webApplicationJsonLd({
    name: t.jsonLd.name,
    description: t.jsonLd.description,
    path: landingPath(locale),
    category: "DesignApplication",
    inLanguage: htmlLang(locale),
  });
  // FAQ 리치결과(구조화 데이터) — 검색결과에 질문/답이 펼쳐질 수 있게.
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: t.seoSection.faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <SiteHeader
        homeHref={homeHref(locale)}
        subtitle={t.header.subtitle}
        homeLabel={t.header.homeLabel}
        right={
          <>
            <LanguageToggle
              current={locale}
              hrefKo={landingPath("ko")}
              hrefEn={landingPath("en")}
              label={t.langToggle.label}
              koLabel={t.langToggle.ko}
              enLabel={t.langToggle.en}
            />
            <Link href={studioRoute(locale)} className={styles.headerCta}>
              {t.header.cta}
            </Link>
          </>
        }
      />

      <main>
        {/* 히어로 — 살아있는 스페시먼이 주인공, 마스코트가 곁들임 */}
        <section className={`container ${styles.hero}`}>
          <div className={styles.heroText}>
            <p className={styles.eyebrow}>
              <Mascot mood="happy" size={28} still label="" />
              <span>{t.hero.eyebrow}</span>
            </p>
            <h1 className={`display ${styles.headline}`}>
              {t.hero.headlinePre}
              <span className={styles.brushWord}>
                {t.hero.headlineBrush}
                <BrushUnderline className={styles.brushUnderline} />
              </span>
            </h1>
            <p className={styles.lede}>{t.hero.lede}</p>
            <div className={styles.heroActions}>
              <Link href={studioRoute(locale)} className={styles.primary}>
                {t.hero.primary}
              </Link>
              <a href={`#${t.how.id}`} className={styles.secondary}>
                {t.hero.secondary}
              </a>
            </div>
          </div>

          <div className={styles.heroStage}>
            <InteractiveSpecimen labels={t.specimen} />
          </div>
        </section>

        {/* 견본 — 색지 배경 섹션으로 면 분리(선 구획 아님) */}
        <section className={styles.band} aria-label={t.band.aria}>
          <div className={`container ${styles.bandInner}`}>
            <Sticker variant="sticker" rotate={-3} color="var(--candy-coral)" className={styles.bandSticker}>
              {t.band.sticker}
            </Sticker>
            <div className={styles.bandRow}>
              <span className={styles.bandHeavy}>Aa Bb Cc</span>
              <span className={styles.bandLabel}>{t.band.weightLabel}</span>
            </div>
            <div className={styles.bandRow}>
              <span className={styles.bandWide}>0 1 2 3 4 5 6 7 8 9</span>
              <span className={styles.bandLabel}>{t.band.numberLabel}</span>
            </div>
          </div>
        </section>

        {/* 왜 우리 — 제네릭 AI 폰트 생성기와 정직하게 구분 */}
        <section className={`container ${styles.why}`} aria-label={t.why.aria}>
          <h2 className={`display ${styles.whyTitle}`}>{t.why.title}</h2>
          <div className={styles.whyGrid}>
            {t.why.items.map((item) => (
              <div key={item.name} className={styles.whyItem}>
                <h3 className={styles.whyName}>{item.name}</h3>
                <p className={styles.whyBody}>{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 붓획 디바이더 */}
        <div className={`container ${styles.dividerWrap}`} aria-hidden>
          <BrushDivider />
        </div>

        {/* 만드는 법 — 하나의 다정한 설명 카드 */}
        <section id={t.how.id} className={`container ${styles.how}`}>
          <div className={styles.howCard}>
            <Mascot mood="focused" size={96} className={styles.howMascot} label="" />
            <div>
              <h2 className={`display ${styles.howTitle}`}>{t.how.title}</h2>
              <p className={styles.howBody}>{t.how.body}</p>
              <Link href={studioRoute(locale)} className={styles.howCta}>
                {t.how.cta}
              </Link>
            </div>
          </div>
        </section>
        {/* SEO 본문 — 검색 키워드용. 최하단에 분리 배치(도구 UX·직관성 우선). */}
        <section className={`container ${styles.seo}`} aria-label={t.seoSection.title}>
          <h2 className={styles.seoTitle}>{t.seoSection.title}</h2>
          {t.seoSection.paras.map((p, i) => (
            <p key={i} className={styles.seoText}>
              {p}
            </p>
          ))}
          <h3 className={styles.faqTitle}>{t.seoSection.faqTitle}</h3>
          <div className={styles.faq}>
            {t.seoSection.faq.map((f) => (
              <details key={f.q} className={styles.faqItem}>
                <summary className={styles.faqQ}>{f.q}</summary>
                <p className={styles.faqA}>{f.a}</p>
              </details>
            ))}
          </div>
          <Link href={guideRoute(locale)} className={styles.guideLink}>
            {t.seoSection.guideLink} →
          </Link>
        </section>

        {/* 광고(웹 전용) — env 설정 시에만. 콘텐츠 하단, 그리기 화면(스튜디오)엔 두지 않음. */}
        <div className="container">
          <AdSlot />
        </div>
      </main>

      <SiteFooter colophon={t.footer.colophon} fineprint={t.footer.fineprint} />
    </>
  );
}
