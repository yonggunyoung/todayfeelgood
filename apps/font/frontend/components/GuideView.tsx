import Link from "next/link";
import { htmlLang } from "@webapp/seo";
import { SiteHeader, SiteFooter } from "./SiteChrome";
import { LanguageToggle } from "./LanguageToggle";
import type { Locale } from "../lib/i18n";
import { getDictionary, guidePath, studioRoute } from "../lib/i18n";
import styles from "../app/landing.module.css";

// 홈 허브 링크는 basePath(/font)가 붙으면 안 되므로 일반 <a> 절대경로.
function homeHref(locale: Locale): string {
  return locale === "ko" ? "/neogul" : "/en/neogul";
}

/** 가이드 페이지 — "손글씨 폰트 만드는 법" 롱테일 SEO용. 기존 헤더·푸터·스타일 재사용. */
export function GuideView({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const g = t.guide;

  // HowTo 구조화데이터 — 단계가 검색결과에 펼쳐질 수 있게.
  const howToLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: g.h1,
    description: g.lead,
    inLanguage: htmlLang(locale),
    step: g.steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.title,
      text: s.body,
    })),
  };
  // FAQ 구조화데이터 — 랜딩과 같은 문답 단일 출처 재사용.
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToLd) }}
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
          <LanguageToggle
            current={locale}
            hrefKo={guidePath("ko")}
            hrefEn={guidePath("en")}
            label={t.langToggle.label}
            koLabel={t.langToggle.ko}
            enLabel={t.langToggle.en}
          />
        }
      />

      <main className={`container ${styles.guide}`}>
        <header className={styles.guideHead}>
          <h1 className={`display ${styles.guideTitle}`}>{g.h1}</h1>
          <p className={styles.guideLead}>{g.lead}</p>
          <Link href={studioRoute(locale)} className={styles.primary}>
            {g.ctaLabel}
          </Link>
        </header>

        <ol className={styles.steps}>
          {g.steps.map((s) => (
            <li key={s.title} className={styles.step}>
              <h2 className={styles.stepTitle}>{s.title}</h2>
              <p className={styles.stepBody}>{s.body}</p>
            </li>
          ))}
        </ol>

        <section className={styles.guideFaq} aria-label={t.seoSection.faqTitle}>
          <h2 className={styles.faqTitle}>{t.seoSection.faqTitle}</h2>
          <div className={styles.faq}>
            {t.seoSection.faq.map((f) => (
              <details key={f.q} className={styles.faqItem}>
                <summary className={styles.faqQ}>{f.q}</summary>
                <p className={styles.faqA}>{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter colophon={t.footer.colophon} fineprint={t.footer.fineprint} />
    </>
  );
}
