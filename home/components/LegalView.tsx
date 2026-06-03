import { htmlLang } from "@webapp/seo";
import type { Locale, LegalDoc } from "../lib/i18n";
import { getDictionary, homePath, legalPath } from "../lib/i18n";
import { LanguageToggle } from "./LanguageToggle";
import styles from "./legal.module.css";

/**
 * 법적 문서(개인정보처리방침·이용약관) 공용 뷰 — 로케일+문서종류를 받아 사전으로 렌더.
 * ko/en 라우트가 공유한다. 애드센스 승인용 정적 페이지(서버 컴포넌트).
 */
export function LegalView({ locale, doc }: { locale: Locale; doc: LegalDoc }) {
  const t = getDictionary(locale);
  const d = t.legal[doc];

  return (
    <main className={styles.page} lang={htmlLang(locale)}>
      <div className={`container ${styles.bar}`}>
        <a className={styles.back} href={homePath(locale)}>
          {t.legal.backToHome}
        </a>
        <LanguageToggle
          current={locale}
          hrefKo={legalPath("ko", doc)}
          hrefEn={legalPath("en", doc)}
          label={t.langToggle.label}
          koLabel={t.langToggle.ko}
          enLabel={t.langToggle.en}
        />
      </div>

      <article className={`container ${styles.doc}`}>
        <h1 className={`display ${styles.title}`}>{d.title}</h1>
        <p className={styles.updated}>
          {t.legal.updatedLabel}: {d.updated}
        </p>
        <p className={styles.intro}>{d.intro}</p>

        {d.sections.map((s) => (
          <section key={s.heading} className={styles.section}>
            <h2 className={styles.heading}>{s.heading}</h2>
            {s.body.map((p, i) => (
              <p key={i} className={styles.body}>
                {p}
              </p>
            ))}
          </section>
        ))}
      </article>
    </main>
  );
}
