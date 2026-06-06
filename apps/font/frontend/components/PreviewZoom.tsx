"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import styles from "./PreviewZoom.module.css";

interface Props {
  /** 확대해서 보여줄 캔버스. 열 때 PNG로 떠서 모달에 표시한다. */
  canvasRef: RefObject<HTMLCanvasElement | null>;
  disabled?: boolean;
  /** 버튼/모달 라벨(사전에서 주입). */
  label: string;
  closeLabel: string;
  dialogLabel: string;
  zoomInLabel: string;
  zoomOutLabel: string;
  resetLabel: string;
  className?: string;
}

// 줌 단계(컨테이너 폭 대비 %). 1.0 = 폭 맞춤. 작게(0.4)~크게(4.0).
const LEVELS = [0.4, 0.55, 0.7, 0.85, 1, 1.25, 1.5, 2, 2.5, 3, 4];
const DEFAULT_IDX = LEVELS.indexOf(1);

/**
 * 미리보기 확대 모달 — 캔버스를 PNG로 떠서 +/- 단계 줌으로 본다.
 * 결과물을 그대로 캡처하므로 폰트/색/편지지가 100% 일치한다. 줌 인하면 스크롤로 이동.
 * ESC·배경클릭·뒤로가기 닫기 + 스크롤 잠금(GlyphZoomModal과 동일).
 */
export default function PreviewZoom({
  canvasRef,
  disabled,
  label,
  closeLabel,
  dialogLabel,
  zoomInLabel,
  zoomOutLabel,
  resetLabel,
  className,
}: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [idx, setIdx] = useState(DEFAULT_IDX);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const open = src !== null;
  const zoom = LEVELS[idx]!;

  const handleOpen = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      setSrc(canvas.toDataURL("image/png"));
      setIdx(DEFAULT_IDX);
    } catch {
      /* canvas 비었거나 보안 제약 — 무시 */
    }
  };
  const close = () => setSrc(null);
  const zoomIn = () => setIdx((i) => Math.min(LEVELS.length - 1, i + 1));
  const zoomOut = () => setIdx((i) => Math.max(0, i - 1));

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
      } else if (e.key === "+" || e.key === "=") {
        setIdx((i) => Math.min(LEVELS.length - 1, i + 1));
      } else if (e.key === "-" || e.key === "_") {
        setIdx((i) => Math.max(0, i - 1));
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

      {open &&
        createPortal(
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
              <div className={styles.zoomCtl}>
                <button
                  type="button"
                  className={styles.stepBtn}
                  onClick={zoomOut}
                  disabled={idx === 0}
                  aria-label={zoomOutLabel}
                >
                  −
                </button>
                <button
                  type="button"
                  className={styles.pct}
                  onClick={() => setIdx(DEFAULT_IDX)}
                  aria-label={resetLabel}
                  title={resetLabel}
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  type="button"
                  className={styles.stepBtn}
                  onClick={zoomIn}
                  disabled={idx === LEVELS.length - 1}
                  aria-label={zoomInLabel}
                >
                  +
                </button>
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={close}
                aria-label={closeLabel}
              >
                ✕
              </button>
            </header>
            <div className={styles.body}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={dialogLabel}
                className={styles.img}
                style={{ width: `${zoom * 100}%` }}
              />
            </div>
          </div>
          </div>,
          document.body,
        )}
    </>
  );
}
