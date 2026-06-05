"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  forwardRef,
} from "react";
import type { Dictionary } from "../lib/i18n";
import styles from "./DrawingCanvas.module.css";

export interface DrawingCanvasHandle {
  /** 현재 캔버스를 PNG dataURL로 내보낸다. 빈 캔버스면 null. */
  toPng: () => string | null;
  clear: () => void;
}

interface Props {
  width?: number;
  height?: number;
  t: Dictionary["studio"]["sketch"];
}

/**
 * 마우스/터치로 글씨를 그리는 캔버스.
 * Phase 1에서는 시각적 입력 경험 제공이 주목적이며,
 * PNG는 상위에서 요청에 선택적으로 실어 보낸다.
 */
const DrawingCanvas = forwardRef<DrawingCanvasHandle, Props>(function DrawingCanvas(
  { width = 600, height = 240, t },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const lastMid = useRef<{ x: number; y: number } | null>(null);

  const getCtx = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return null;
    return cv.getContext("2d");
  }, []);

  // 캔버스 초기화(흰 배경 + 펜 스타일)
  const paintBackground = useCallback(() => {
    const cv = canvasRef.current;
    const ctx = getCtx();
    if (!cv || !ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#111111";
  }, [getCtx]);

  useEffect(() => {
    paintBackground();
  }, [paintBackground]);

  const pos = (e: PointerEvent | React.PointerEvent) => {
    const cv = canvasRef.current!;
    const rect = cv.getBoundingClientRect();
    // 캔버스 내부 픽셀 좌표로 환산 (CSS 크기와 픽셀 크기가 다를 수 있음)
    const scaleX = cv.width / rect.width;
    const scaleY = cv.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drawing.current = true;
    last.current = pos(e);
    lastMid.current = last.current;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = getCtx();
    if (!ctx || !last.current || !lastMid.current) return;
    const p = pos(e);
    // 곡선 보간(quadratic)으로 획을 매끄럽게.
    const mid = { x: (last.current.x + p.x) / 2, y: (last.current.y + p.y) / 2 };
    ctx.beginPath();
    ctx.moveTo(lastMid.current.x, lastMid.current.y);
    ctx.quadraticCurveTo(last.current.x, last.current.y, mid.x, mid.y);
    ctx.stroke();
    last.current = p;
    lastMid.current = mid;
    dirty.current = true;
  };

  const endStroke = (e: React.PointerEvent) => {
    drawing.current = false;
    last.current = null;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  };

  const clear = useCallback(() => {
    paintBackground();
    dirty.current = false;
  }, [paintBackground]);

  useImperativeHandle(
    ref,
    () => ({
      toPng: () => {
        const cv = canvasRef.current;
        if (!cv || !dirty.current) return null;
        return cv.toDataURL("image/png");
      },
      clear,
    }),
    [clear]
  );

  return (
    <div className={styles.wrap}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className={styles.canvas}
        role="img"
        aria-label={t.canvasAria}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endStroke}
        onPointerLeave={endStroke}
        onPointerCancel={endStroke}
      />
      <div className={styles.toolbar}>
        <span className={styles.hint}>{t.hint}</span>
        <button type="button" onClick={clear} className={styles.clearBtn}>
          {t.clear}
        </button>
      </div>
    </div>
  );
});

export default DrawingCanvas;
