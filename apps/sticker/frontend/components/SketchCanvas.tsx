"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import styles from "./SketchCanvas.module.css";

export interface SketchCanvasHandle {
  /** 현재 캔버스 엘리먼트(흰 배경 포함). 변주 엔진이 cropToContent로 처리. */
  getCanvas: () => HTMLCanvasElement | null;
  /** 무언가 그렸는지 */
  isDirty: () => boolean;
  clear: () => void;
}

interface Props {
  size?: number;
}

const PEN_COLORS = ["#2b2a33", "#c0492b", "#46b39a", "#5b9bd5", "#f5c451", "#b65a6e"];

/**
 * 스티커용 드로잉 캔버스(자체 구현 — packages/ui와 충돌 회피).
 * 마우스/터치, 펜 색·굵기, 지우개, 전체 지우기. 흰 배경에 그리며 변주 시 흰색은 투명 처리된다.
 * 접근성: 키보드 드로잉은 미지원(주석 고지) — 비드로잉 경로는 템플릿/프리셋 선택으로 대체 가능.
 */
const SketchCanvas = forwardRef<SketchCanvasHandle, Props>(function SketchCanvas(
  { size = 360 },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [color, setColor] = useState(PEN_COLORS[0]!);
  const [width, setWidth] = useState(8);
  const [eraser, setEraser] = useState(false);

  const getCtx = useCallback(() => canvasRef.current?.getContext("2d") ?? null, []);

  const paintBackground = useCallback(() => {
    const cv = canvasRef.current;
    const ctx = getCtx();
    if (!cv || !ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
  }, [getCtx]);

  useEffect(() => {
    paintBackground();
  }, [paintBackground]);

  const pos = (e: React.PointerEvent) => {
    const cv = canvasRef.current!;
    const rect = cv.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (cv.width / rect.width),
      y: (e.clientY - rect.top) * (cv.height / rect.height),
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drawing.current = true;
    last.current = pos(e);
    // 점 찍기(탭)
    const ctx = getCtx();
    if (ctx && last.current) {
      applyStroke(ctx);
      ctx.beginPath();
      ctx.arc(last.current.x, last.current.y, width / 2, 0, Math.PI * 2);
      ctx.fillStyle = eraser ? "#ffffff" : color;
      ctx.fill();
      dirty.current = true;
    }
  };

  const applyStroke = (ctx: CanvasRenderingContext2D) => {
    ctx.lineWidth = eraser ? width * 2 : width;
    ctx.strokeStyle = eraser ? "#ffffff" : color;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = getCtx();
    if (!ctx || !last.current) return;
    const p = pos(e);
    applyStroke(ctx);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
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
      getCanvas: () => canvasRef.current,
      isDirty: () => dirty.current,
      clear,
    }),
    [clear]
  );

  return (
    <div className={styles.wrap}>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className={styles.canvas}
        role="img"
        aria-label="캐릭터 그리기 영역(마우스·터치 전용, 키보드 미지원). 그린 그림에서 표정·색 변주를 자동 생성합니다."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endStroke}
        onPointerLeave={endStroke}
        onPointerCancel={endStroke}
      />

      <div className={styles.tools}>
        <div className={styles.colors} role="group" aria-label="펜 색">
          {PEN_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`${styles.swatch} ${color === c && !eraser ? styles.swatchOn : ""}`}
              style={{ background: c }}
              aria-label={`펜 색 ${c}`}
              aria-pressed={color === c && !eraser}
              onClick={() => {
                setColor(c);
                setEraser(false);
              }}
            />
          ))}
        </div>

        <div className={styles.sizeRow}>
          <label className={styles.sizeLabel} htmlFor="pen-size">
            굵기
          </label>
          <input
            id="pen-size"
            type="range"
            min={2}
            max={28}
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
            className={styles.range}
          />
          <button
            type="button"
            className={`${styles.toolBtn} ${eraser ? styles.toolBtnOn : ""}`}
            aria-pressed={eraser}
            onClick={() => setEraser((v) => !v)}
          >
            지우개
          </button>
          <button type="button" className={styles.toolBtn} onClick={clear}>
            전체 지우기
          </button>
        </div>
      </div>
    </div>
  );
});

export default SketchCanvas;
