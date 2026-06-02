import type { CSSProperties } from "react";
import styles from "./BrushStroke.module.css";

/**
 * 손그림 붓획 SVG 모티프 — "획"이라는 이름값을 UI 어휘로 끌어온다.
 * 직선 1px 괘선 대신 살짝 불규칙하고 끝이 가늘어지는 한 획.
 * 색/여백은 토큰(--accent 등)에 의존하며 에셋 0(인라인 SVG).
 */

interface DividerProps {
  /** 획 색. 기본 악센트(테라코타). */
  color?: string;
  /** 두께 비율(viewBox 기준). 기본 6 */
  weight?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * 섹션 구분용 가로 붓획. 가운데가 살짝 두껍고 양끝이 가늘어지는 한 획.
 * 장식이므로 aria-hidden.
 */
export function BrushDivider({
  color = "var(--accent)",
  weight = 6,
  className,
  style,
}: DividerProps) {
  return (
    <svg
      className={[styles.divider, className].filter(Boolean).join(" ")}
      viewBox="0 0 600 24"
      preserveAspectRatio="none"
      aria-hidden
      focusable="false"
      style={style}
    >
      {/* 끝이 가늘어지는 한 획: 양끝 round cap + 살짝 물결치는 baseline */}
      <path
        d="M8 13 C 90 7, 150 17, 230 11 S 400 6, 470 14 S 560 9, 592 12"
        fill="none"
        stroke={color}
        strokeWidth={weight}
        strokeLinecap="round"
      />
      {/* 끝부분이 가늘어지도록 덧그린 옅은 잔획(붓 갈라짐) */}
      <path
        d="M40 15 C 160 12, 300 16, 470 13"
        fill="none"
        stroke={color}
        strokeWidth={weight * 0.4}
        strokeLinecap="round"
        opacity="0.45"
      />
    </svg>
  );
}

interface UnderlineProps {
  color?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * 제목 강조용 붓 밑줄. 짧고 끝이 살짝 튀어 오르는 한 획.
 * 보통 제목 아래에 절대배치하거나 인라인으로 둔다.
 */
export function BrushUnderline({
  color = "var(--accent)",
  className,
  style,
}: UnderlineProps) {
  return (
    <svg
      className={[styles.underline, className].filter(Boolean).join(" ")}
      viewBox="0 0 220 18"
      preserveAspectRatio="none"
      aria-hidden
      focusable="false"
      style={style}
    >
      <path
        d="M6 12 C 50 6, 120 16, 178 8 C 196 5, 206 8, 214 11"
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default BrushDivider;
