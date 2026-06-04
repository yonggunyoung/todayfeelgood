import type { ReactNode } from "react";
import { Mascot, ExitToHub } from "@webapp/ui";
import styles from "./SiteChrome.module.css";

const KO_SUB = "폰트공방";
const KO_HOME_LABEL = "획 — 도구공방으로";

/** 워드마크 "획" + 공방 부제. 사이트 상단 공통 헤더(블러 머티리얼). */
export function SiteHeader({
  right,
  // 도메인 루트의 홈 허브(home/)로 이동. 영어 랜딩은 홈 EN(/en)으로.
  // 폰트앱은 basePath=/font라 next/Link는 /font를 붙이므로, basePath가 붙지 않는
  // 일반 <a href>로 도메인 루트(홈 허브)를 가리킨다.
  homeHref = "/neogul",
  subtitle = KO_SUB,
  homeLabel = KO_HOME_LABEL,
}: {
  right?: ReactNode;
  homeHref?: string;
  subtitle?: string;
  homeLabel?: string;
}) {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.bar}`}>
        <a href={homeHref} className={styles.brand} aria-label={homeLabel}>
          <Mascot mood="happy" size={36} still label="" />
          <span className={`display ${styles.wordmark}`}>
            <span className={styles.name}>획</span>
            <span className={styles.sub}>{subtitle}</span>
          </span>
        </a>
        {right ? (
          <div className={styles.right}>
            {right}
            <ExitToHub />
          </div>
        ) : (
          <div className={styles.right}>
            <ExitToHub />
          </div>
        )}
      </div>
    </header>
  );
}

const KO_FOOTER = {
  colophon:
    "획 폰트공방 — 글씨에 표정을 입히는 작은 도구. 만든 글자는 모두 당신의 것이에요.",
  fineprint: "폰트는 이 자리에서 바로 받아요. 어디로도 보내지 않습니다.",
};

export function SiteFooter({
  colophon = KO_FOOTER.colophon,
  fineprint = KO_FOOTER.fineprint,
}: {
  colophon?: string;
  fineprint?: string;
} = {}) {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.footerInner}`}>
        <p className={styles.colophon}>{colophon}</p>
        <p className={styles.fineprint}>{fineprint}</p>
      </div>
    </footer>
  );
}
