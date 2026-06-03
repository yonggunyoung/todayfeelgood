"use client";

import { useCallback, useEffect, useRef } from "react";
import { MAX_STROKE_POINTS_PER_GLYPH, type GlyphStroke } from "@webapp/core";
import styles from "./GlyphCell.module.css";

interface Props {
  /** 이 셀이 담당하는 문자 (예: "a", "ㄱ") */
  char: string;
  /** 셀 정규화 좌표(0..1) 폴리라인 획들 */
  strokes: GlyphStroke[];
  /** 그리기/지우기 후 새 획 배열을 위로 올린다 */
  onChange: (char: string, strokes: GlyphStroke[]) => void;
  disabled?: boolean;
  /** reduced-motion 등 외부 환경에서 모션 끄기용(현재 미사용 자리표) */
  size?: number;
  /**
   * 가이드라인 프리셋. latin=어센더/x높이/베이스라인(소문자 기준),
   * hangul=정사각 칸 중앙 십자선(자모는 위/아래·좌/우 균형이 중요).
   */
  script?: "latin" | "hangul";
  /** 라벨 접근성 표현(예: "기역", "아"). 없으면 char 그대로. */
  labelName?: string;
}

// 같은 점 사이 최소 거리(정규화). 과샘플 솎기로 MAX_STROKE_POINTS_PER_GLYPH 보호.
const MIN_DIST = 0.012;

/**
 * 한 글자(셀)의 그리기 표면.
 * - 가이드라인: 어센더 / 캡 / x-height / 베이스라인 / 디센더
 * - 포인터(마우스·터치) 경로를 셀 정규화 좌표(0..1) 폴리라인으로 캡처(여러 획)
 * - 캡처 중 과샘플 솎기로 점 수 상한을 의식, 셀별 되돌리기/지우기는 상위에서.
 *
 * 좌표계: (0,0)=좌상단, (1,1)=우하단. 엔진 계약(GlyphStroke)과 동일.
 */
export default function GlyphCell({
  char,
  strokes,
  onChange,
  disabled,
  script = "latin",
  labelName,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  // 진행 중인 획(아직 commit 전). 정규화 좌표.
  const current = useRef<Array<[number, number]>>([]);
  // 이 셀에 누적된 총 점 수(상한 가드)
  const totalPoints = useRef(0);

  // 가이드라인 위치(정규화 y). 디센더 영역까지 포함한 메트릭(라틴 전용).
  const GUIDES = {
    ascender: 0.12,
    cap: 0.2,
    xHeight: 0.42,
    baseline: 0.78,
    descender: 0.92,
  };

  const draw = useCallback(
    (live?: Array<[number, number]>) => {
      const cv = canvasRef.current;
      if (!cv) return;
      const ctx = cv.getContext("2d");
      if (!ctx) return;
      const W = cv.width;
      const H = cv.height;
      ctx.clearRect(0, 0, W, H);

      // 가이드라인
      ctx.lineWidth = 1;
      const hLine = (y: number, dashed: boolean, strong: boolean) => {
        ctx.beginPath();
        ctx.setLineDash(dashed ? [4, 5] : []);
        ctx.strokeStyle = strong
          ? "rgba(110,104,150,0.5)"
          : "rgba(150,144,180,0.32)";
        ctx.moveTo(0, y * H);
        ctx.lineTo(W, y * H);
        ctx.stroke();
      };
      const vLine = (x: number) => {
        ctx.beginPath();
        ctx.setLineDash([4, 5]);
        ctx.strokeStyle = "rgba(150,144,180,0.32)";
        ctx.moveTo(x * W, 0);
        ctx.lineTo(x * W, H);
        ctx.stroke();
      };
      if (script === "hangul") {
        // 한글 자모: 정사각 칸 안 중앙 십자선(상하·좌우 균형 잡기용)
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

      // 잉크 획
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.lineWidth = Math.max(3, W * 0.045);
      ctx.strokeStyle = "#2b2a33";
      const paintStroke = (pts: Array<[number, number]>) => {
        if (pts.length === 0) return;
        ctx.beginPath();
        ctx.moveTo(pts[0]![0] * W, pts[0]![1] * H);
        if (pts.length === 1) {
          // 점 하나 = 작은 원
          ctx.arc(pts[0]![0] * W, pts[0]![1] * H, ctx.lineWidth / 2, 0, Math.PI * 2);
          ctx.fillStyle = "#2b2a33";
          ctx.fill();
          return;
        }
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]![0] * W, pts[i]![1] * H);
        ctx.stroke();
      };
      for (const s of strokes) paintStroke(s.points);
      if (live && live.length > 0) paintStroke(live);
    },
    [strokes, script, GUIDES.ascender, GUIDES.cap, GUIDES.xHeight, GUIDES.baseline, GUIDES.descender]
  );

  // strokes 변경/리사이즈 시 다시 그림. 총 점 수 재계산.
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
    // 과샘플 솎기: 직전 점과 충분히 떨어졌을 때만 추가
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
    onChange(char, [...strokes, { points: pts }]);
  };

  const filled = strokes.length > 0;
  const name = labelName || char;

  return (
    <div
      className={`${styles.cell} ${filled ? styles.filled : ""}`}
      data-script={script}
    >
      <span className={styles.glyphLabel} aria-hidden>
        {char}
      </span>
      <canvas
        ref={canvasRef}
        width={script === "hangul" ? 165 : 150}
        height={script === "hangul" ? 165 : 180}
        className={styles.canvas}
        role="img"
        aria-label={`'${name}' 글자 그리기 칸${filled ? " (그려짐)" : " (비어 있음)"}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endStroke}
        onPointerLeave={endStroke}
        onPointerCancel={endStroke}
      />
      <div className={styles.cellActions}>
        <button
          type="button"
          className={styles.cellBtn}
          disabled={disabled || strokes.length === 0}
          onClick={() => onChange(char, strokes.slice(0, -1))}
          aria-label={`'${name}' 마지막 획 되돌리기`}
        >
          되돌리기
        </button>
        <button
          type="button"
          className={styles.cellBtn}
          disabled={disabled || strokes.length === 0}
          onClick={() => onChange(char, [])}
          aria-label={`'${name}' 칸 지우기`}
        >
          지우기
        </button>
      </div>
    </div>
  );
}
