"use client";

import {
  LATIN_ONLY_PARAMS,
  PARAM_RANGES,
  type FontParams,
  type FontScript,
} from "@webapp/core";
import { Slider } from "@webapp/ui";
import styles from "./ParameterPanel.module.css";

interface Props {
  value: FontParams;
  onChange: (next: FontParams) => void;
  /** 현재 문자체계. hangul이면 라틴 전용 축(곡률/모노/커서브)을 숨긴다. */
  script: FontScript;
  /** weirdness 시드를 무작위로 바꾼다(주사위) */
  onRandomizeSeed: () => void;
  disabled?: boolean;
}

// 슬라이더로 노출할 축들의 라벨/표시 포맷 (범위·기본값은 PARAM_RANGES에서)
const FIELDS: {
  key: keyof FontParams;
  label: string;
  format: (v: number) => string;
}[] = [
  { key: "weight", label: "굵기", format: (v) => String(v) },
  { key: "slant", label: "기울기", format: (v) => `${v}°` },
  { key: "curvature", label: "곡률", format: (v) => v.toFixed(2) },
  { key: "mono", label: "모노스페이스", format: (v) => v.toFixed(2) },
  { key: "cursive", label: "필기체", format: (v) => v.toFixed(2) },
  { key: "letterSpacing", label: "자간", format: (v) => `${v.toFixed(2)}em` },
];

/**
 * 계약 v3 슬라이더 패널 + 괴상함(주사위) 컨트롤.
 * 한글 script일 때 LATIN_ONLY_PARAMS(곡률/모노/필기체)는 렌더하지 않는다.
 */
export default function ParameterPanel({
  value,
  onChange,
  script,
  onRandomizeSeed,
  disabled,
}: Props) {
  const latinOnly = new Set<keyof FontParams>(LATIN_ONLY_PARAMS);
  const weirdRange = PARAM_RANGES.weirdness;

  return (
    <div className={styles.panel}>
      {FIELDS.map(({ key, label, format }) => {
        // 한글에서 의미 없는 라틴 전용 축은 숨김
        if (script === "hangul" && latinOnly.has(key)) return null;
        const range = PARAM_RANGES[key];
        return (
          <Slider
            key={key}
            label={label}
            display={format(value[key])}
            value={value[key]}
            min={range.min}
            max={range.max}
            step={range.step}
            disabled={disabled}
            onValueChange={(v) => onChange({ ...value, [key]: v })}
          />
        );
      })}

      {/* 괴상함 — 슬라이더 + 시드(주사위) */}
      <div className={styles.weird}>
        <Slider
          label="괴상함"
          display={value.weirdness === 0 ? "단정" : String(value.weirdness)}
          value={value.weirdness}
          min={weirdRange.min}
          max={weirdRange.max}
          step={weirdRange.step}
          disabled={disabled}
          onValueChange={(v) => onChange({ ...value, weirdness: v })}
        />
        <div className={styles.seedRow}>
          <span className={styles.seedLabel}>시드 {value.seed}</span>
          <button
            type="button"
            className={styles.seedBtn}
            onClick={onRandomizeSeed}
            disabled={disabled}
            title="같은 괴상함 강도의 다른 변형을 뽑아요"
          >
            {/* 이모지 금지 — 점 6개 주사위 아이콘 */}
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              aria-hidden
              className={styles.dice}
            >
              <rect x="1.5" y="1.5" width="13" height="13" rx="3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="5" cy="5" r="1.3" fill="currentColor" />
              <circle cx="11" cy="5" r="1.3" fill="currentColor" />
              <circle cx="5" cy="11" r="1.3" fill="currentColor" />
              <circle cx="11" cy="11" r="1.3" fill="currentColor" />
            </svg>
            시드 바꾸기
          </button>
        </div>
      </div>
    </div>
  );
}
