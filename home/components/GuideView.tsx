import { htmlLang } from "@webapp/seo";
import type { Locale } from "../lib/i18n";
import { getDictionary, homePath, guidePath, neogulPath } from "../lib/i18n";
import { LanguageToggle } from "./LanguageToggle";
import styles from "./legal.module.css";

/**
 * 소개·사용법·FAQ 공용 뷰 — 로케일을 받아 사전으로 렌더(서버 컴포넌트).
 * 본문 콘텐츠는 SEO(검색 노출)와 애드센스 승인(콘텐츠 빈약 거절 방지)에 함께 쓰인다.
 * 법적 페이지와 동일한 legal.module.css 레이아웃을 재사용한다.
 */
export function GuideView({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const g = t.guide;

  // FAQ 리치결과(구조화 데이터) — 검색결과에 질문/답이 펼쳐질 수 있게.
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: g.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <main className={styles.page} lang={htmlLang(locale)}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <div className={`container ${styles.bar}`}>
        <a className={styles.back} href={homePath(locale)}>
          {t.legal.backToHome}
        </a>
        <LanguageToggle
          current={locale}
          hrefKo={guidePath("ko")}
          hrefEn={guidePath("en")}
          label={t.langToggle.label}
          koLabel={t.langToggle.ko}
          enLabel={t.langToggle.en}
        />
      </div>

      <article className={`container ${styles.doc}`}>
        <h1 className={`display ${styles.title}`}>{g.title}</h1>
        <p className={styles.intro}>{g.intro}</p>

        {g.sections.map((s) => (
          <section key={s.heading} className={styles.section}>
            <h2 className={styles.heading}>{s.heading}</h2>
            {s.body.map((p, i) => (
              <p key={i} className={styles.body}>
                {p}
              </p>
            ))}
          </section>
        ))}

        <section className={styles.section}>
          <h2 className={styles.heading}>{g.faqTitle}</h2>
          {g.faqs.map((f) => (
            <div key={f.q} className={styles.faqItem}>
              <h3 className={styles.faqQ}>{f.q}</h3>
              <p className={styles.body}>{f.a}</p>
            </div>
          ))}
        </section>

        <p className={styles.section}>
          <a className={styles.back} href={neogulPath(locale)}>
            {t.hero.cta}
          </a>
        </p>
      </article>
    </main>
  );
}
