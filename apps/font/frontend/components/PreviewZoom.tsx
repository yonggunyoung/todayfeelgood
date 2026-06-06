"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import styles from "./PreviewZoom.module.css";

interface Props {
  /** 확대해서 보여줄 캔버스. 열 때 PNG로 떠서 모달에 표시한다. */
  canvasRef: RefObject<HTMLCanvasElement | null>;
  disabled?: boolean;
  /** 버튼/모달 라벨(사전에서 주입). */
  label: string;
  closeLabel: string;
  dialogLabel: string;
  fitLabel: string;
  actualLabel: string;
  className?: string;
}

/**
 * 미리보기 확대 모달 — 캔버스를 PNG로 떠서 크게 보여준다(맞춤 ↔ 실제 크기 스크롤).
 * 결과물을 그대로 캡처하므로 폰트/색/편지지가 100% 일치한다. GlyphZoomModal과 동일하게
 * ESC·배경클릭·뒤로가기 닫기 + 스크롤 잠금.
 */
export default function PreviewZoom({
  canvasRef,
  disabled,
  label,
  closeLabel,
  dialogLabel,
  fitLabel,
  actualLabel,
  className,
}: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [actual, setActual] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const open = src !== null;

  const handleOpen = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      setSrc(canvas.toDataURL("image/png"));
      setActual(false);
    } catch {
      /* canvas 비었거나 보안 제약 — 무시 */
    }
  };
  const close = () => setSrc(null);

  const closeRef = useRef(close);
  closeRef.current = close;
  const closedByBack = useRef(false);

  useEffect(() => {
    if (!open) return;
    closedByBack.current = false;
    const doClose = () => closeRef.current();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        doClose();
      }
    };
    document.addEventListener("keydown", onKey, true);
    window.history.pushState({ previewZoom: true }, "");
    const onPop = () => {
      closedByBack.current = true;
      doClose();
    };
    window.addEventListener("popstate", onPop);
    const scrollY = window.scrollY;
    const body = document.body;
    const prev = {
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
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      body.style.overflow = prev.overflow;
      window.scrollTo(0, scrollY);
      if (!closedByBack.current) window.history.back();
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={`${styles.openBtn} ${className ?? ""}`}
        onClick={handleOpen}
        disabled={disabled}
      >
        <span aria-hidden>🔍</span> {label}
      </button>

      {open && (
        <div
          className={styles.overlay}
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            ref={dialogRef}
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-label={dialogLabel}
            tabIndex={-1}
          >
            <header className={styles.head}>
              <button
                type="button"
                className={styles.toggle}
                onClick={() => setActual((v) => !v)}
                aria-pressed={actual}
              >
                {actual ? fitLabel : actualLabel}
              </button>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={close}
                aria-label={closeLabel}
              >
                ✕
              </button>
            </header>
            <div className={`${styles.body} ${actual ? styles.bodyScroll : ""}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={dialogLabel}
                className={actual ? styles.imgActual : styles.imgFit}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
