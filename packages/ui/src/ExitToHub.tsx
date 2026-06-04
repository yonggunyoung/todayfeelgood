"use client";

/**
 * 도구공방 영역(하위앱 포함) → 뚝딱 홈(/)으로 "나가기".
 * 확인창으로 "완전히 나가 홈으로 간다"고 안내한다(실수 이탈 방지).
 * 토큰(--ink-soft/--hairline)에 의존해 모든 앱에서 동일하게 보인다.
 */
export function ExitToHub({
  label = "나가기",
  message = "뚝딱 홈으로 나갑니다. 도구공방에서 완전히 나가요. 계속할까요?",
  href = "/",
}: {
  label?: string;
  message?: string;
  href?: string;
}) {
  function go() {
    if (typeof window !== "undefined" && window.confirm(message)) {
      window.location.href = href;
    }
  }
  return (
    <button
      type="button"
      onClick={go}
      aria-label={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        fontFamily: "inherit",
        fontSize: "0.85rem",
        fontWeight: 600,
        color: "var(--ink-soft)",
        background: "transparent",
        border: "1px solid var(--hairline)",
        borderRadius: "999px",
        padding: "7px 14px",
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {label} ↗
    </button>
  );
}

export default ExitToHub;
