import { webApplicationJsonLd, htmlLang } from "@webapp/seo";
import type { Locale } from "../lib/i18n";
import { getDictionary, homePath, neogulPath, legalPath } from "../lib/i18n";
import { LanguageToggle } from "./LanguageToggle";
import { ThemeToggle } from "./ThemeToggle";
import { HubCarousel } from "./HubCarousel";
import { HubSearch } from "./HubSearch";
import styles from "../app/hub.module.css";

/** 도구공방(너굴이) 대표 캐릭터 아이콘 — 코랄 타일 안 흰 라쿤. 각 웹앱 고유 아이콘 자리. */
function NeogulMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden width="30" height="30">
      <circle cx="13" cy="13" r="6" fill="#fff" />
      <circle cx="35" cy="13" r="6" fill="#fff" />
      <circle cx="13" cy="13" r="2.6" fill="#c2410c" />
      <circle cx="35" cy="13" r="2.6" fill="#c2410c" />
      <circle cx="24" cy="26" r="15" fill="#fff" />
      <path d="M9 22c9-6 21-6 30 0-2.5 8-8 11.5-15 11.5S11.5 30 9 22z" fill="#2b2b33" />
      <circle cx="17.5" cy="24.5" r="2.6" fill="#fff" />
      <circle cx="30.5" cy="24.5" r="2.6" fill="#fff" />
      <circle cx="24" cy="33" r="2.8" fill="#2b2b33" />
    </svg>
  );
}

/** 중립 허브 홈 — 웹앱들을 모아 보여주는 최상단 랜딩. ko/en 라우트가 공유. */
export function HubView({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const h = t.hub;
  const neogul = neogulPath(locale);
  const jsonLd = webApplicationJsonLd({
    name: h.jsonLd.name,
    description: h.jsonLd.description,
    path: homePath(locale),
    category: "WebApplication",
    inLanguage: htmlLang(locale),
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className={styles.hub}>
        <div className="container">
          {/* ── 상단 바 ── */}
          <nav className={styles.nav} aria-label={h.nav.apps}>
            <a className={styles.brand} href={homePath(locale)}>
              <span className={styles.brandMark} aria-hidden />
              {h.brand}
            </a>
            <div className={styles.navright}>
              <LanguageToggle
                current={locale}
                hrefKo={homePath("ko")}
                hrefEn={homePath("en")}
                label={t.langToggle.label}
                koLabel={t.langToggle.ko}
                enLabel={t.langToggle.en}
              />
              <ThemeToggle labels={{ toLight: h.theme.toLight, toDark: h.theme.toDark }} />
              <a className={styles.navCta} href="#partner">
                {h.nav.partnerCta}
              </a>
            </div>
          </nav>

          {/* ── 히어로(중앙) ── */}
          <header className={styles.hero}>
            <span className={styles.kick}>{h.hero.kick}</span>
            <h1 className={`display ${styles.title}`}>
              {h.hero.titleA}
              <br />
              <span className={styles.grad}>{h.hero.titleB}</span>
            </h1>
            <p className={styles.lede}>{h.hero.lede}</p>
            <HubSearch
              placeholder={h.hero.searchPlaceholder}
              tools={h.search.tools}
              labels={{ feature: h.search.feature, web: h.search.web, webGo: h.search.webGo }}
            />

            {/* 인기 순위 미니카드 */}
            <div className={styles.ranks}>
              <span className={styles.rankHead}>🔥 {h.rank.head}</span>
              <a className={styles.rcard} href={neogul}>
                <span className={styles.rn}>1</span>
                <span className={`${styles.rt} ${styles.rtCraft}`}>
                  <NeogulMark />
                </span>
                <b>{h.apps.neogul.name}</b>
              </a>
              <span className={`${styles.rcard} ${styles.rcardOff}`}>
                <span className={styles.rn}>2</span>
                <span className={`${styles.rt} ${styles.rtSoon}`} />
                <b>{h.rank.comingSoon}</b>
              </span>
              <span className={`${styles.rcard} ${styles.rcardOff}`}>
                <span className={styles.rn}>3</span>
                <span className={`${styles.rt} ${styles.rtSoon}`} />
                <b>{h.rank.comingSoon}</b>
              </span>
            </div>
          </header>

          {/* ── 웹앱 캐러셀 ── */}
          <section id="apps" aria-label={h.apps.sectionTitle}>
            <HubCarousel
              title={h.apps.sectionTitle}
              sub={h.apps.sectionSub}
              prevLabel={h.apps.prev}
              nextLabel={h.apps.next}
            >
              {/* 서비스 중 — 너굴이의 작은 도구 공방 */}
              <a className={`${styles.card} ${styles.cardLive}`} href={neogul} data-card>
                <div className={`${styles.thumb} ${styles.thumbCraft}`}>
                  <span className={styles.eyebrow}>{h.apps.neogul.eyebrow}</span>
                  <span className={styles.badge}>{h.apps.live}</span>
                  <div className={styles.specimen}>
                    <div className={styles.specimenWord}>{h.apps.neogul.sampleWord}</div>
                    <div className={styles.chips}>
                      {h.apps.neogul.chips.map((c) => (
                        <span key={c} className={styles.chip}>
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className={styles.foot}>
                  <span className={styles.appicon}>
                    <NeogulMark />
                  </span>
                  <span className={styles.meta}>
                    <b>{h.apps.neogul.name}</b>
                    <span>{h.apps.neogul.desc}</span>
                  </span>
                </div>
              </a>

              {/* 준비중 카드들 */}
              {h.apps.soon.map((s, i) => (
                <div className={`${styles.card} ${styles.cardSoon}`} key={i} data-card>
                  <div className={`${styles.thumb} ${styles.thumbSoon}`}>
                    <span className={styles.badge}>{h.apps.soonBadge}</span>
                    <div className={styles.soonHook}>{s.hook}</div>
                  </div>
                  <div className={styles.foot}>
                    <span className={`${styles.appicon} ${styles.appiconSoon}`} aria-hidden />
                    <span className={styles.meta}>
                      <b>{s.name}</b>
                      <span>{s.note}</span>
                    </span>
                  </div>
                </div>
              ))}
            </HubCarousel>
          </section>

          {/* ── 제휴/입점 ── */}
          <section id="partner" className={styles.partner}>
            <div className={styles.partnerText}>
              <h2 className={`display ${styles.partnerTitle}`}>{h.partner.title}</h2>
              <p className={styles.partnerBody}>{h.partner.body}</p>
            </div>
            <a className={styles.pbtn} href={`mailto:${h.partner.email}?subject=${encodeURIComponent(h.partner.cta)}`}>
              {h.partner.cta} →
            </a>
          </section>

          {/* ── 푸터 ── */}
          <footer className={styles.footer}>
            <p>{h.footer.copyright}</p>
            <nav className={styles.footerNav} aria-label={t.legal.navAria}>
              <a href={legalPath(locale, "privacy")}>{h.footer.privacy}</a>
              <span aria-hidden>·</span>
              <a href={legalPath(locale, "terms")}>{h.footer.terms}</a>
              <span aria-hidden>·</span>
              <a href="#partner">{h.footer.partner}</a>
            </nav>
          </footer>
        </div>
      </div>
    </>
  );
}
