"use client";

import { useState } from "react";

/**
 * 가벼운 피드백 위젯(백엔드 0). 👍/👎 + 의견(메일).
 *  - 반응은 GA 이벤트(window.gtag)가 있으면 보냄(SiteScripts로 GA 켜져 있을 때 집계됨).
 *  - 한 번 누르면 localStorage에 기록해 다시 묻지 않음.
 *  - beta=true면 "베타 — 평가해주세요" 프레이밍.
 * 토큰(--surface/--ink/--accent 등)에 의존해 모든 앱에서 동일하게 보인다.
 */
export function FeedbackWidget({
  appKey,
  beta = false,
  labels,
}: {
  appKey: string;
  beta?: boolean;
  labels?: Partial<{
    betaTitle: string;
    q: string;
    up: string;
    down: string;
    thanks: string;
    comment: string;
    email: string;
  }>;
}) {
  const L = {
    betaTitle: "🧪 베타 — 아직 다듬는 중이에요",
    q: "이거 써먹을 만한가요?",
    up: "👍 쓸만해요",
    down: "👎 별로예요",
    thanks: "평가 고마워요!",
    comment: "의견 보내기",
    email: "contact@ddukkit.com",
    ...labels,
  };
  const [done, setDone] = useState<"up" | "down" | null>(null);

  function react(v: "up" | "down") {
    try {
      localStorage.setItem(`fb-${appKey}`, v);
    } catch {
      /* storage 막힘 무시 */
    }
    try {
      (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag?.("event", "app_feedback", {
        app: appKey,
        value: v,
      });
    } catch {
      /* gtag 없음 무시 */
    }
    setDone(v);
  }

  const mailto = `mailto:${L.email}?subject=${encodeURIComponent(`[피드백] ${appKey}`)}&body=${encodeURIComponent(
    `${appKey}에 대한 의견:\n\n(좋았던 점 / 아쉬운 점 / 이런 게 있으면 쓰겠다 등 자유롭게)`
  )}`;

  const wrap: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px",
    textAlign: "center",
    background: "var(--surface-2)",
    border: "1px solid var(--hairline)",
    borderRadius: "var(--r-lg, 18px)",
    padding: "16px",
    margin: "8px 0",
  };
  const btn: React.CSSProperties = {
    fontFamily: "inherit",
    fontSize: "0.9rem",
    fontWeight: 600,
    padding: "9px 16px",
    borderRadius: "999px",
    border: "1px solid var(--hairline)",
    background: "var(--surface)",
    color: "var(--ink)",
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  return (
    <div style={wrap}>
      {beta && <strong style={{ fontSize: "0.92rem", color: "var(--ink)" }}>{L.betaTitle}</strong>}
      {done ? (
        <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--ink-soft)" }}>
          {L.thanks}{" "}
          <a href={mailto} style={{ fontWeight: 600 }}>
            {L.comment} →
          </a>
        </p>
      ) : (
        <>
          <span style={{ fontSize: "0.95rem", color: "var(--ink-soft)" }}>{L.q}</span>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
            <button type="button" style={btn} onClick={() => react("up")}>
              {L.up}
            </button>
            <button type="button" style={btn} onClick={() => react("down")}>
              {L.down}
            </button>
            <a href={mailto} style={{ ...btn, textDecoration: "none" }}>
              💬 {L.comment}
            </a>
          </div>
        </>
      )}
    </div>
  );
}

export default FeedbackWidget;
