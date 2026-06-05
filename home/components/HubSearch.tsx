"use client";

import { useState } from "react";
import styles from "../app/hub.module.css";

type Tool = { name: string; href: string; keywords: string[] };

/**
 * 허브 검색 — 두 모드 전환.
 *  - 기능 검색: 입력하면 해당 공방(도구)으로 바로 점프(추천 목록도 표시). 앱 적어도 쓸모 있게.
 *  - 웹 검색: 엔터/버튼으로 구글 검색을 새 탭에서 연다.
 */
export function HubSearch({
  placeholder,
  tools,
  labels,
}: {
  placeholder: string;
  tools: Tool[];
  labels: { feature: string; web: string; webGo: string };
}) {
  const [mode, setMode] = useState<"feature" | "web">("feature");
  const [q, setQ] = useState("");

  const ql = q.trim().toLowerCase();
  const matches =
    mode === "feature" && ql
      ? tools.filter(
          (t) => t.name.toLowerCase().includes(ql) || t.keywords.some((k) => k.toLowerCase().includes(ql))
        )
      : [];

  function google() {
    if (typeof window !== "undefined") {
      window.open("https://www.google.com/search?q=" + encodeURIComponent(q.trim()), "_blank", "noopener");
    }
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    if (mode === "web") {
      google();
      return;
    }
    if (matches[0]) window.location.href = matches[0].href;
    else google();
  }

  return (
    <div className={styles.searchWrap}>
      <div className={styles.searchModes} role="tablist" aria-label="검색 모드">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "feature"}
          className={mode === "feature" ? styles.modeOn : styles.mode}
          onClick={() => setMode("feature")}
        >
          {labels.feature}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "web"}
          className={mode === "web" ? styles.modeOn : styles.mode}
          onClick={() => setMode("web")}
        >
          {labels.web}
        </button>
      </div>

      <form className={styles.search} role="search" onSubmit={submit}>
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          className={styles.searchInput}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={mode === "web" ? labels.webGo : placeholder}
          aria-label={placeholder}
        />
      </form>

      {matches.length > 0 && (
        <div className={styles.suggest} role="listbox">
          {matches.map((m) => (
            <a key={m.href} className={styles.suggestItem} href={m.href} role="option">
              {m.name}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
