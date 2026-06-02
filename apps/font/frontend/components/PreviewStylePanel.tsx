"use client";

import {
  PREVIEW_PATTERNS,
  PREVIEW_TEXTURES,
  type PreviewPattern,
  type PreviewStyle,
  type PreviewTexture,
} from "@webapp/core";
import styles from "./PreviewStylePanel.module.css";

interface Props {
  value: PreviewStyle;
  onChange: (next: PreviewStyle) => void;
  disabled?: boolean;
}

const TEXTURE_LABEL: Record<PreviewTexture, string> = {
  none: "없음",
  grain: "그레인",
  paper: "종이결",
  rough: "거친 잉크",
};
const PATTERN_LABEL: Record<PreviewPattern, string> = {
  none: "없음",
  stripe: "줄무늬",
  dots: "도트",
  grid: "격자",
};

// 글자색/배경색 빠른 선택 팔레트(새 악센트 가족 + 중성).
const INK_SWATCHES = ["#2b2a33", "#c0492b", "#46b39a", "#b65a6e", "#f5c451", "#ffffff"];
const BG_SWATCHES = ["transparent", "#ffffff", "#f6f4f0", "#2b2a33", "#c0492b", "#fbeae3"];

/**
 * [PREVIEW] 이미지 전용 효과 패널 — 질감/무늬/글자색/배경색.
 * 이 값들은 엔진(/generate)에 보내지 않으며, 프리뷰와 PNG 내보내기에만 적용된다.
 * 상단에 "이미지 전용 · 폰트 파일 미포함" 배지를 명시한다(정직성).
 */
export default function PreviewStylePanel({ value, onChange, disabled }: Props) {
  return (
    <div className={styles.panel}>
      <p className={styles.badge}>
        <span className={styles.badgeDot} aria-hidden />
        이미지 전용 효과 · 폰트 파일에는 포함되지 않아요
      </p>

      {/* 질감 */}
      <div className={styles.field}>
        <span className={styles.label}>질감</span>
        <div className={styles.chips} role="group" aria-label="질감 선택">
          {PREVIEW_TEXTURES.map((t) => (
            <button
              key={t}
              type="button"
              disabled={disabled}
              aria-pressed={value.texture === t}
              className={`${styles.chip} ${value.texture === t ? styles.on : ""}`}
              onClick={() => onChange({ ...value, texture: t })}
            >
              {TEXTURE_LABEL[t]}
            </button>
          ))}
        </div>
      </div>

      {/* 무늬 */}
      <div className={styles.field}>
        <span className={styles.label}>무늬</span>
        <div className={styles.chips} role="group" aria-label="무늬 선택">
          {PREVIEW_PATTERNS.map((p) => (
            <button
              key={p}
              type="button"
              disabled={disabled}
              aria-pressed={value.pattern === p}
              className={`${styles.chip} ${value.pattern === p ? styles.on : ""}`}
              onClick={() => onChange({ ...value, pattern: p })}
            >
              {PATTERN_LABEL[p]}
            </button>
          ))}
        </div>
      </div>

      {/* 글자색 */}
      <div className={styles.field}>
        <span className={styles.label}>글자색</span>
        <div className={styles.swatches} role="group" aria-label="글자색 선택">
          {INK_SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              disabled={disabled}
              aria-pressed={value.inkColor === c}
              aria-label={`글자색 ${c}`}
              className={`${styles.swatch} ${value.inkColor === c ? styles.swOn : ""}`}
              style={{ background: c }}
              onClick={() => onChange({ ...value, inkColor: c })}
            />
          ))}
        </div>
      </div>

      {/* 배경색 */}
      <div className={styles.field}>
        <span className={styles.label}>배경색</span>
        <div className={styles.swatches} role="group" aria-label="배경색 선택">
          {BG_SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              disabled={disabled}
              aria-pressed={value.bgColor === c}
              aria-label={`배경색 ${c === "transparent" ? "투명" : c}`}
              className={`${styles.swatch} ${value.bgColor === c ? styles.swOn : ""} ${
                c === "transparent" ? styles.transparent : ""
              }`}
              style={c === "transparent" ? undefined : { background: c }}
              onClick={() => onChange({ ...value, bgColor: c })}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
