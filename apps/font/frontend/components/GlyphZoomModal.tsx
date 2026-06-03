"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@webapp/ui";
import { type GlyphStroke } from "@webapp/core";
import GlyphCanvas from "./GlyphCanvas";
import styles from "./GlyphZoomModal.module.css";

interface Props {
  char: string;
  labelName?: string;
  script?: "latin" | "hangul";
  /** 진입 시점의 획(셀과 동일). 내부에서 편집 후 닫으면 셀로 반영. */
  strokes: GlyphStroke[];
  onChange: (strokes: GlyphStroke[]) => void;
  onClose: () => void;
}

/**
 * 한 글자 확대 그리기 모달.
 * - 같은 가이드선 + 되돌리기/지우기. 큰 캔버스(고해상도)로 손가락으로도 정밀하게.
 * - 닫으면 셀에 반영(편집 중에도 onChange로 실시간 반영 — 셀 미리보기 동기).
 * - 접근성: role="dialog" aria-modal, ESC 닫기, 배경 클릭 닫기, 포커스 진입.
 */
export default function GlyphZoomModal({
  char,
  labelName,
  script = "latin",
  strokes,
  onChange,
  onClose,
}: Props) {
  // 모달은 자체 로컬 상태로 편집하고, 변경 시마다 부모로 올린다(셀과 동기).
  const [local, setLocal] = useState<GlyphStroke[]>(strokes);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const name = labelName || char;

  const apply = useCallback(
    (next: GlyphStroke[]) => {
      setLocal(next);
      onChange(next);
    },
    [onChange]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey, true);
    // 스크롤 잠금
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className={styles.overlay}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={`'${name}' 크게 그리기`}
        tabIndex={-1}
      >
        <header className={styles.head}>
          <h2 className={styles.title}>
            <span className={styles.bigChar} aria-hidden>
              {char}
            </span>
            <span className={styles.titleText}>크게 그리기</span>
          </h2>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="닫기"
          >
            ✕
          </button>
        </header>

        <p className={styles.hint}>
          {script === "hangul"
            ? "중앙 십자선에 맞춰 균형 있게. 손가락으로도 천천히 정밀하게 그려요."
            : "가이드선(어센더·x높이·베이스라인)에 맞춰 천천히. 손가락으로도 정밀하게 그려요."}
        </p>

        <div className={styles.stage} data-script={script}>
          <GlyphCanvas
            char={char}
            strokes={local}
            onChange={apply}
            script={script}
            labelName={labelName}
            resolution={script === "hangul" ? 560 : 520}
            className={styles.canvas}
          />
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.toolBtn}
            disabled={local.length === 0}
            onClick={() => apply(local.slice(0, -1))}
          >
            되돌리기
          </button>
          <button
            type="button"
            className={styles.toolBtn}
            disabled={local.length === 0}
            onClick={() => apply([])}
          >
            지우기
          </button>
          <Button variant="clay" className={styles.doneBtn} onClick={onClose}>
            완료
          </Button>
        </div>
      </div>
    </div>
  );
}
