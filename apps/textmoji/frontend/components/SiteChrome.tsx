import type { ReactNode } from "react";
import { Mascot, ExitToHub } from "@webapp/ui";
import { LangToggle } from "@webapp/i18n/client";
import type { TextmojiDict } from "../lib/i18n";
import styles from "./SiteChrome.module.css";

/** "획 — 텍스트 이모티콘공방" 헤더. 획 로고→도구공방(/neogul), 나가기→뚝딱 홈(/). */
export function SiteHeader({
  dict,
  right,
}: {
  dict: TextmojiDict;
  right?: ReactNode;
}) {
  const t = dict.chrome;
  return (
    <header className={styles.header}>
      <div className={`container ${styles.bar}`}>
        {/* 획 로고 → 도구공방 상위로. basePath(/textmoji) 안 붙게 일반 <a>. */}
        <a href="/neogul" className={styles.brand} aria-label={t.brandAria}>
          <Mascot mood="happy" size={36} still label="" />
          <span className={`display ${styles.wordmark}`}>
            <span className={styles.name}>획</span>
            <span className={styles.sub}>{t.brandSub}</span>
          </span>
        </a>
        <div className={styles.right}>
          {right}
          <LangToggle />
          <ExitToHub label={t.exitLabel} message={t.exitMessage} />
        </div>
      </div>
    </header>
  );
}

export function SiteFooter({ dict }: { dict: TextmojiDict }) {
  const t = dict.chrome;
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.footerInner}`}>
        <p className={styles.colophon}>{t.footerColophon}</p>
        <p className={styles.fineprint}>{t.footerFineprint}</p>
      </div>
    </footer>
  );
}
