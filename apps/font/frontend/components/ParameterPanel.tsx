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

type Field = {
  key: keyof FontParams;
  label: string;
  format: (v: number) => string;
};

// 슬라이더를 의미 그룹으로 묶는다(계약 v4 신규 축 포함).
// 범위·기본값·step은 PARAM_RANGES 단일 출처에서 가져온다.
const GROUPS: { title: string; fields: Field[] }[] = [
  {
    title: "기본 골격",
    fields: [
      { key: "weight", label: "굵기", format: (v) => String(v) },
      { key: "slant", label: "기울기", format: (v) => `${v}°` },
      { key: "letterSpacing", label: "자간", format: (v) => `${v.toFixed(2)}em` },
    ],
  },
  {
    title: "곡선 · 형태",
    fields: [
      { key: "curvature", label: "곡률", format: (v) => v.toFixed(2) },
      { key: "mono", label: "모노스페이스", format: (v) => v.toFixed(2) },
      { key: "cursive", label: "필기체", format: (v) => v.toFixed(2) },
      { key: "roundness", label: "둥근 끝", format: (v) => v.toFixed(2) },
      { key: "contrast", label: "획 대비", format: (v) => v.toFixed(2) },
    ],
  },
];

/**
 * 계약 v4 슬라이더 패널 — 기본 골격 / 곡선·형태 / 손맛(구불구불·괴상함) 그룹.
 * 한글 script일 때 LATIN_ONLY_PARAMS(곡률/모노/필기체)는 렌더하지 않는다.
 * waviness/contrast/roundness는 [REAL] — 실제 폰트 파일에 반영된다.
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
  const waveRange = PARAM_RANGES.waviness;
  const waveFreqRange = PARAM_RANGES.waveFreq;

  const renderField = ({ key, label, format }: Field) => {
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
  };

  return (
    <div className={styles.panel}>
      {GROUPS.map((group) => {
        const rendered = group.fields.map(renderField).filter(Boolean);
        if (rendered.length === 0) return null;
        return (
          <div key={group.title} className={styles.subgroup}>
            <p className={styles.subhead}>{group.title}</p>
            {rendered}
          </div>
        );
      })}

      {/* 손맛 — 구불구불(규칙적 물결) + 괴상함(불규칙 손떨림). 직교 개념 */}
      <div className={styles.subgroup}>
        <p className={styles.subhead}>손맛</p>

        {/* 구불구불 — 0이면 곧게(정형 유지) */}
        <Slider
          label="구불구불"
          display={value.waviness === 0 ? "곧게" : value.waviness.toFixed(2)}
          value={value.waviness}
          min={waveRange.min}
          max={waveRange.max}
          step={waveRange.step}
          disabled={disabled}
          onValueChange={(v) => onChange({ ...value, waviness: v })}
        />
        {/* 물결 주파수는 구불구불이 켜져 있을 때만 의미 → 0이면 비활성 */}
        <Slider
          label="물결 주기"
          display={`${value.waveFreq.toFixed(1)}회`}
          value={value.waveFreq}
          min={waveFreqRange.min}
          max={waveFreqRange.max}
          step={waveFreqRange.step}
          disabled={disabled || value.waviness === 0}
          onValueChange={(v) => onChange({ ...value, waveFreq: v })}
        />

        {/* 괴상함 — 슬라이더 + 시드(주사위) */}
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
            {/* 이모지 금지 — 점 4개 주사위 아이콘 */}
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
