"use client";

import { useEffect, useState } from "react";
import styles from "../app/hub.module.css";

type Mode = "light" | "dark";
const KEY = "ddukkit-theme";

/**
 * 다크/라이트 수동 토글. OS 선호를 기본으로 하되, 사용자가 누르면 [data-theme]로 강제하고 저장한다.
 * 깜빡임 방지는 RootShell의 인라인 부트 스크립트가 hydration 전에 data-theme를 선반영한다.
 */
export function ThemeToggle({ labels }: { labels: { toLight: string; toDark: string } }) {
  const [mode, setMode] = useState<Mode | null>(null);

  useEffect(() => {
    const el = document.documentElement;
    const stored = el.getAttribute("data-theme") as Mode | null;
    // 허브는 다크가 기본 — 저장값이 없으면 dark로 간주(토글 아이콘 정합).
    const resolved: Mode = stored === "light" || stored === "dark" ? stored : "dark";
    setMode(resolved);
  }, []);

  function toggle() {
    const next: Mode = mode === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* storage 막힌 환경 무시 */
    }
    setMode(next);
  }

  const isDark = mode === "dark";
  const label = isDark ? labels.toLight : labels.toDark;

  return (
    <button type="button" className={styles.iconBtn} onClick={toggle} aria-label={label} title={label}>
      {isDark ? (
        // 해 — 누르면 라이트로
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
        </svg>
      ) : (
        // 달 — 누르면 다크로
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  );
}
