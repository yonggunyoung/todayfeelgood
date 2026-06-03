"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import styles from "./HelpTip.module.css";

interface Props {
  /** 무엇에 대한 도움말인지(접근성 라벨). 예: "자동 정리" */
  label: string;
  /** 팝오버 본문(짧고 친절하게). */
  children: ReactNode;
  /** 정렬 방향 — 화면 끝에서 잘리지 않게 호출부가 고른다. */
  align?: "start" | "center" | "end";
  className?: string;
}

/**
 * "?" 도우미 버튼 → 클릭하면 짧은 설명 팝오버.
 * - 접근성: aria-expanded/aria-controls, 팝오버 role="dialog", ESC 닫기, 바깥 클릭 닫기, 포커스 이동.
 * - 무거운 의존성 없이 순수 CSS/React. 모션은 reduced-motion에서 자동 약화(CSS).
 * - 너굴이 톤은 호출부가 children으로 넣는다(컴포넌트는 톤 중립).
 */
export function HelpTip({ label, children, align = "center", className }: Props) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const wrapRef = useRef<HTMLSpanElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    if (refocus) btnRef.current?.focus();
  }, []);

  // 바깥 클릭 / ESC 로 닫기 (열렸을 때만 바인딩)
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close(true);
      }
    };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open, close]);

  // 열리면 팝오버로 포커스 이동(키보드 사용자)
  useEffect(() => {
    if (open) popRef.current?.focus();
  }, [open]);

  const cls = [styles.wrap, className].filter(Boolean).join(" ");

  return (
    <span className={cls} ref={wrapRef}>
      <button
        ref={btnRef}
        type="button"
        className={styles.trigger}
        aria-label={`${label} 도움말`}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        ?
      </button>
      {open && (
        <div
          ref={popRef}
          id={id}
          role="dialog"
          aria-label={`${label} 설명`}
          tabIndex={-1}
          className={`${styles.pop} ${styles[`align-${align}`]}`}
        >
          {children}
        </div>
      )}
    </span>
  );
}

export default HelpTip;
