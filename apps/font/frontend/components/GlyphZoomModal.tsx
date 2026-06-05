"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@webapp/ui";
import { type GlyphStroke } from "@webapp/core";
import GlyphCanvas from "./GlyphCanvas";
import type { Dictionary } from "../lib/i18n";
import styles from "./GlyphZoomModal.module.css";

interface Props {
  char: string;
  labelName?: string;
  script?: "latin" | "hangul";
  /** 진입 시점의 획(셀과 동일). 내부에서 편집 후 닫으면 셀로 반영. */
  strokes: GlyphStroke[];
  onChange: (strokes: GlyphStroke[]) => void;
  onClose: () => void;
  /** 확대 모달 사전 + 셀 그리기 칸 aria 사전. */
  t: Dictionary["studio"]["zoom"];
  cellT: Dictionary["studio"]["cell"];
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
  t,
  cellT,
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

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const closedByBack = useRef(false);

  useEffect(() => {
    const close = () => onCloseRef.current();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
      }
    };
    document.addEventListener("keydown", onKey, true);
    // 뒤로가기로 "모달만" 닫기: 히스토리 항목을 하나 쌓고, 뒤로가기(popstate) 시 닫는다.
    window.history.pushState({ glyphModal: true }, "");
    const onPop = () => {
      closedByBack.current = true;
      close();
    };
    window.addEventListener("popstate", onPop);
    // 스크롤 완전 잠금 — 모바일에서 그리다 손가락이 위아래로 움직여도 페이지가 안 흔들리고
    // 주소창이 토글되지 않게 body를 fixed로 고정(스크롤 위치 보존).
    const scrollY = window.scrollY;
    const body = document.body;
    const prevStyle = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
    };
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("popstate", onPop);
      body.style.position = prevStyle.position;
      body.style.top = prevStyle.top;
      body.style.width = prevStyle.width;
      body.style.overflow = prevStyle.overflow;
      window.scrollTo(0, scrollY);
      // 버튼·ESC·배경클릭으로 닫혔으면 우리가 쌓은 히스토리 항목을 제거(뒤로가기로 닫힌 경우는 이미 빠짐).
      if (!closedByBack.current) window.history.back();
    };
    // 의도적으로 1회만 실행(onClose는 ref로 최신값 사용).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        aria-label={t.dialogLabel.replace("{name}", name)}
        tabIndex={-1}
      >
        <header className={styles.head}>
          <h2 className={styles.title}>
            <span className={styles.bigChar} aria-hidden>
              {char}
            </span>
            <span className={styles.titleText}>{t.title}</span>
          </h2>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label={t.close}
          >
            ✕
          </button>
        </header>

        <p className={styles.hint}>
          {script === "hangul" ? t.hintHangul : t.hintLatin}
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
            ariaFilled={cellT.drawAriaFilled}
            ariaEmpty={cellT.drawAriaEmpty}
          />
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.toolBtn}
            disabled={local.length === 0}
            onClick={() => apply(local.slice(0, -1))}
          >
            {t.undo}
          </button>
          <button
            type="button"
            className={styles.toolBtn}
            disabled={local.length === 0}
            onClick={() => apply([])}
          >
            {t.clear}
          </button>
          <Button variant="clay" className={styles.doneBtn} onClick={onClose}>
            {t.done}
          </Button>
        </div>
      </div>
    </div>
  );
}
