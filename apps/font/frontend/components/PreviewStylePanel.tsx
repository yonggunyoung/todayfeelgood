"use client";

import {
  PREVIEW_PATTERNS,
  PREVIEW_TEXTURES,
  type PreviewStyle,
} from "@webapp/core";
import type { Dictionary } from "../lib/i18n";
import styles from "./PreviewStylePanel.module.css";

interface Props {
  value: PreviewStyle;
  onChange: (next: PreviewStyle) => void;
  disabled?: boolean;
  t: Dictionary["studio"]["previewStyle"];
}

// 글자색/배경색 빠른 선택 팔레트(새 악센트 가족 + 중성).
const INK_SWATCHES = ["#2b2a33", "#c0492b", "#46b39a", "#b65a6e", "#f5c451", "#ffffff"];
const BG_SWATCHES = ["transparent", "#ffffff", "#f6f4f0", "#2b2a33", "#c0492b", "#fbeae3"];

/**
 * [PREVIEW] 이미지 전용 효과 패널 — 질감/무늬/글자색/배경색.
 * 이 값들은 엔진(/generate)에 보내지 않으며, 프리뷰와 PNG 내보내기에만 적용된다.
 * 상단에 "이미지 전용 · 폰트 파일 미포함" 배지를 명시한다(정직성).
 */
export default function PreviewStylePanel({ value, onChange, disabled, t }: Props) {
  return (
    <div className={styles.panel}>
      <p className={styles.badge}>
        <span className={styles.badgeDot} aria-hidden />
        {t.badge}
      </p>

      {/* 질감 */}
      <div className={styles.field}>
        <span className={styles.label}>{t.texture}</span>
        <div className={styles.chips} role="group" aria-label={t.textureAria}>
          {PREVIEW_TEXTURES.map((tex) => (
            <button
              key={tex}
              type="button"
              disabled={disabled}
              aria-pressed={value.texture === tex}
              className={`${styles.chip} ${value.texture === tex ? styles.on : ""}`}
              onClick={() => onChange({ ...value, texture: tex })}
            >
              {t.textures[tex]}
            </button>
          ))}
        </div>
      </div>

      {/* 무늬 */}
      <div className={styles.field}>
        <span className={styles.label}>{t.pattern}</span>
        <div className={styles.chips} role="group" aria-label={t.patternAria}>
          {PREVIEW_PATTERNS.map((p) => (
            <button
              key={p}
              type="button"
              disabled={disabled}
              aria-pressed={value.pattern === p}
              className={`${styles.chip} ${value.pattern === p ? styles.on : ""}`}
              onClick={() => onChange({ ...value, pattern: p })}
            >
              {t.patterns[p]}
            </button>
          ))}
        </div>
      </div>

      {/* 글자색 */}
      <div className={styles.field}>
        <span className={styles.label}>{t.ink}</span>
        <div className={styles.swatches} role="group" aria-label={t.inkAria}>
          {INK_SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              disabled={disabled}
              aria-pressed={value.inkColor === c}
              aria-label={t.inkSwatchLabel.replace("{c}", c)}
              className={`${styles.swatch} ${value.inkColor === c ? styles.swOn : ""}`}
              style={{ background: c }}
              onClick={() => onChange({ ...value, inkColor: c })}
            />
          ))}
        </div>
      </div>

      {/* 배경색 */}
      <div className={styles.field}>
        <span className={styles.label}>{t.bg}</span>
        <div className={styles.swatches} role="group" aria-label={t.bgAria}>
          {BG_SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              disabled={disabled}
              aria-pressed={value.bgColor === c}
              aria-label={t.bgSwatchLabel.replace("{c}", c === "transparent" ? t.transparent : c)}
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
