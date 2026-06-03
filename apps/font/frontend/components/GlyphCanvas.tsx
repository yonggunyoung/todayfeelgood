"use client";

import { useCallback, useEffect, useRef } from "react";
import { MAX_STROKE_POINTS_PER_GLYPH, type GlyphStroke } from "@webapp/core";

export type GlyphScript = "latin" | "hangul";

interface Props {
  /** 이 캔버스가 담당하는 문자 (가이드라인/aria용) */
  char: string;
  strokes: GlyphStroke[];
  onChange: (strokes: GlyphStroke[]) => void;
  disabled?: boolean;
  script?: GlyphScript;
  /** 라벨 접근성 표현(예: "기역"). 없으면 char. */
  labelName?: string;
  /** 내부 캔버스 해상도(px). 큰 모달은 큰 값을 준다. */
  resolution?: number;
  className?: string;
  /** 접근성 라벨 사전(셀 그리기 칸). {name} 치환. */
  ariaFilled?: string;
  ariaEmpty?: string;
}

// 같은 점 사이 최소 거리(정규화). 과샘플 솎기로 MAX_STROKE_POINTS_PER_GLYPH 보호.
const MIN_DIST = 0.012;

// 가이드라인 위치(정규화 y). 디센더 영역까지 포함한 메트릭(라틴 전용).
const GUIDES = {
  ascender: 0.12,
  cap: 0.2,
  xHeight: 0.42,
  baseline: 0.78,
  descender: 0.92,
};

/**
 * 글자 그리기 표면(셀/확대 모달 공용).
 * 포인터(마우스·터치) 경로를 셀 정규화 좌표(0..1) 폴리라인으로 캡처(여러 획).
 * 좌표계: (0,0)=좌상단, (1,1)=우하단. 엔진 계약(GlyphStroke)과 동일.
 * 캔버스 자체는 CSS로 크기를 받고, 내부 해상도(width/height)는 resolution으로 정한다.
 */
export default function GlyphCanvas({
  char,
  strokes,
  onChange,
  disabled,
  script = "latin",
  labelName,
  resolution,
  className,
  ariaFilled,
  ariaEmpty,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const current = useRef<Array<[number, number]>>([]);
  const totalPoints = useRef(0);

  const aspect = script === "hangul" ? 1 : 180 / 150;
  const baseW = resolution ?? (script === "hangul" ? 165 : 150);
  const W = baseW;
  const H = Math.round(baseW * aspect);

  const draw = useCallback(
    (live?: Array<[number, number]>) => {
      const cv = canvasRef.current;
      if (!cv) return;
      const ctx = cv.getContext("2d");
      if (!ctx) return;
      const w = cv.width;
      const h = cv.height;
      ctx.clearRect(0, 0, w, h);

      ctx.lineWidth = 1;
      const hLine = (y: number, dashed: boolean, strong: boolean) => {
        ctx.beginPath();
        ctx.setLineDash(dashed ? [4, 5] : []);
        ctx.strokeStyle = strong
          ? "rgba(110,104,150,0.5)"
          : "rgba(150,144,180,0.32)";
        ctx.moveTo(0, y * h);
        ctx.lineTo(w, y * h);
        ctx.stroke();
      };
      const vLine = (x: number) => {
        ctx.beginPath();
        ctx.setLineDash([4, 5]);
        ctx.strokeStyle = "rgba(150,144,180,0.32)";
        ctx.moveTo(x * w, 0);
        ctx.lineTo(x * w, h);
        ctx.stroke();
      };
      if (script === "hangul") {
        const pad = 0.12;
        hLine(pad, true, false);
        hLine(0.5, true, true);
        hLine(1 - pad, true, false);
        vLine(pad);
        vLine(0.5);
        vLine(1 - pad);
      } else {
        hLine(GUIDES.ascender, true, false);
        hLine(GUIDES.cap, true, false);
        hLine(GUIDES.xHeight, true, true);
        hLine(GUIDES.baseline, false, true);
        hLine(GUIDES.descender, true, false);
      }
      ctx.setLineDash([]);

      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.lineWidth = Math.max(3, w * 0.045);
      ctx.strokeStyle = "#2b2a33";
      const paintStroke = (pts: Array<[number, number]>) => {
        if (pts.length === 0) return;
        ctx.beginPath();
        ctx.moveTo(pts[0]![0] * w, pts[0]![1] * h);
        if (pts.length === 1) {
          ctx.arc(pts[0]![0] * w, pts[0]![1] * h, ctx.lineWidth / 2, 0, Math.PI * 2);
          ctx.fillStyle = "#2b2a33";
          ctx.fill();
          return;
        }
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]![0] * w, pts[i]![1] * h);
        ctx.stroke();
      };
      for (const s of strokes) paintStroke(s.points);
      if (live && live.length > 0) paintStroke(live);
    },
    [strokes, script]
  );

  useEffect(() => {
    totalPoints.current = strokes.reduce((n, s) => n + s.points.length, 0);
    draw();
  }, [strokes, draw]);

  const norm = (e: React.PointerEvent): [number, number] => {
    const cv = canvasRef.current!;
    const rect = cv.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    return [Math.min(1, Math.max(0, x)), Math.min(1, Math.max(0, y))];
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    e.preventDefault();
    if (totalPoints.current >= MAX_STROKE_POINTS_PER_GLYPH) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drawing.current = true;
    current.current = [norm(e)];
    draw(current.current);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    if (totalPoints.current + current.current.length >= MAX_STROKE_POINTS_PER_GLYPH) return;
    const p = norm(e);
    const prev = current.current[current.current.length - 1];
    if (prev) {
      const dx = p[0] - prev[0];
      const dy = p[1] - prev[1];
      if (dx * dx + dy * dy < MIN_DIST * MIN_DIST) return;
    }
    current.current.push(p);
    draw(current.current);
  };

  const endStroke = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    drawing.current = false;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    const pts = current.current;
    current.current = [];
    if (pts.length === 0) return;
    onChange([...strokes, { points: pts }]);
  };

  const filled = strokes.length > 0;
  const name = labelName || char;
  const ariaLabel = (filled
    ? ariaFilled ?? "'{name}' 글자 그리기 칸 (그려짐)"
    : ariaEmpty ?? "'{name}' 글자 그리기 칸 (비어 있음)"
  ).replace("{name}", name);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      className={className}
      role="img"
      aria-label={ariaLabel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endStroke}
      onPointerLeave={endStroke}
      onPointerCancel={endStroke}
    />
  );
}
