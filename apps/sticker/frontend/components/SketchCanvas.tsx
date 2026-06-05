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
  /** 현재 캔버스(투명 배경 + 그린 획만). 부위 레이어 캡처/변주에 사용. */
  getCanvas: () => HTMLCanvasElement | null;
  /** 무언가 그렸는지 */
  isDirty: () => boolean;
  clear: () => void;
}

interface Props {
  size?: number;
  /** 이전 단계 그림(흐리게 깔아 참조용으로 보여줌, 캡처엔 포함 안 됨). dataURL. */
  background?: string | null;
}

const PEN_COLORS = ["#2b2a33", "#c0492b", "#46b39a", "#5b9bd5", "#f5c451", "#b65a6e"];

/**
 * 스티커용 드로잉 캔버스. ★투명 배경★에 그려서(흰색 채우지 않음) 그린 획만 레이어로 캡처된다.
 * background(이전 단계 합성 이미지)는 흐리게 깔아 "어디에 그릴지" 참조만 제공(캡처 제외).
 */
const SketchCanvas = forwardRef<SketchCanvasHandle, Props>(function SketchCanvas(
  { size = 360, background = null },
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

  useEffect(() => {
    const ctx = getCtx();
    if (ctx) {
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
    }
  }, [getCtx]);

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
    const ctx = getCtx();
    if (ctx && last.current) {
      applyStroke(ctx);
      ctx.beginPath();
      ctx.arc(last.current.x, last.current.y, width / 2, 0, Math.PI * 2);
      if (eraser) {
        ctx.save();
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillStyle = "#000";
        ctx.fill();
        ctx.restore();
      } else {
        ctx.fillStyle = color;
        ctx.fill();
      }
      dirty.current = true;
    }
  };

  const applyStroke = (ctx: CanvasRenderingContext2D) => {
    ctx.lineWidth = eraser ? width * 2 : width;
    ctx.strokeStyle = color;
    // 지우개는 투명으로 지운다(흰색 칠이 아니라 알파 제거).
    ctx.globalCompositeOperation = eraser ? "destination-out" : "source-over";
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
    ctx.globalCompositeOperation = "source-over";
    last.current = p;
    dirty.current = true;
  };

  const endStroke = (e: React.PointerEvent) => {
    drawing.current = false;
    last.current = null;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  };

  const clear = useCallback(() => {
    const cv = canvasRef.current;
    const ctx = getCtx();
    if (cv && ctx) ctx.clearRect(0, 0, cv.width, cv.height);
    dirty.current = false;
  }, [getCtx]);

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
      <div className={styles.stage} style={{ position: "relative", width: "100%", aspectRatio: "1 / 1", maxWidth: size, margin: "0 auto", background: "#ffffff", borderRadius: 16, overflow: "hidden", boxShadow: "var(--inset)" }}>
        {background && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={background}
            alt=""
            aria-hidden
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.16, pointerEvents: "none" }}
          />
        )}
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          className={styles.canvas}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", background: "transparent", touchAction: "none" }}
          role="img"
          aria-label="부위 그리기 영역(마우스·터치). 단계별로 윤곽·눈·입을 그려요."
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endStroke}
          onPointerLeave={endStroke}
          onPointerCancel={endStroke}
        />
      </div>

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
            이 단계 지우기
          </button>
        </div>
      </div>
    </div>
  );
});

export default SketchCanvas;
