"use client";

import {
  LATIN_ONLY_PARAMS,
  PARAM_RANGES,
  type FontParams,
  type FontScript,
} from "@webapp/core";
import { Slider } from "@webapp/ui";
import styles from "./ParameterPanel.module.css";

/**
 * 위계 단계(3단 재편):
 * - "quick"   : 대표 슬라이더(굵기·기울기·괴상함)만 — 빠른 시작.
 * - "detail"  : 나머지 일상 슬라이더(자간·곡선/형태·구불구불).
 * - "advanced": 잘 안 쓰는 축(물결 주기·둥근 끝·획 대비·모노·필기체·시드).
 */
export type PanelTier = "quick" | "detail" | "advanced";

interface Props {
  value: FontParams;
  onChange: (next: FontParams) => void;
  /** 현재 문자체계. hangul이면 라틴 전용 축(곡률/모노/커서브)을 숨긴다. */
  script: FontScript;
  /** weirdness 시드를 무작위로 바꾼다(주사위) */
  onRandomizeSeed: () => void;
  disabled?: boolean;
  /** 렌더할 위계 단계(기본 전체). */
  tier?: PanelTier;
}

// 어떤 키가 어느 단계에 속하는지(단일 출처).
const QUICK_KEYS: ReadonlyArray<keyof FontParams> = ["weight", "slant", "weirdness"];
const ADVANCED_KEYS: ReadonlyArray<keyof FontParams> = [
  "waveFreq",
  "roundness",
  "contrast",
  "mono",
  "cursive",
];

type Field = {
  key: keyof FontParams;
  label: string;
  format: (v: number) => string;
};

// 모든 슬라이더 필드의 라벨/표시 포맷(단일 출처). 범위·step은 PARAM_RANGES에서.
const FIELDS: Record<keyof FontParams, Field> = {
  weight: { key: "weight", label: "굵기", format: (v) => String(v) },
  slant: { key: "slant", label: "기울기", format: (v) => `${v}°` },
  weirdness: { key: "weirdness", label: "괴상함", format: (v) => (v === 0 ? "단정" : String(v)) },
  letterSpacing: { key: "letterSpacing", label: "자간", format: (v) => `${v.toFixed(2)}em` },
  curvature: { key: "curvature", label: "곡률", format: (v) => v.toFixed(2) },
  waviness: { key: "waviness", label: "구불구불", format: (v) => (v === 0 ? "곧게" : v.toFixed(2)) },
  waveFreq: { key: "waveFreq", label: "물결 주기", format: (v) => `${v.toFixed(1)}회` },
  roundness: { key: "roundness", label: "둥근 끝", format: (v) => v.toFixed(2) },
  contrast: { key: "contrast", label: "획 대비", format: (v) => v.toFixed(2) },
  mono: { key: "mono", label: "모노스페이스", format: (v) => v.toFixed(2) },
  cursive: { key: "cursive", label: "필기체", format: (v) => v.toFixed(2) },
  seed: { key: "seed", label: "시드", format: (v) => String(v) },
};

// 세부(detail) 단계에 묶어 보여줄 의미 그룹.
const DETAIL_GROUPS: { title: string; keys: (keyof FontParams)[] }[] = [
  { title: "기본 골격", keys: ["letterSpacing"] },
  { title: "곡선 · 형태", keys: ["curvature"] },
  { title: "손맛", keys: ["waviness"] },
];

/**
 * 계약 v4 슬라이더 패널 — 3단 위계(quick/detail/advanced)로 렌더.
 * 한글 script일 때 LATIN_ONLY_PARAMS(곡률/모노/필기체)는 렌더하지 않는다.
 * waviness/contrast/roundness는 [REAL] — 실제 폰트 파일에 반영된다.
 */
export default function ParameterPanel({
  value,
  onChange,
  script,
  onRandomizeSeed,
  disabled,
  tier,
}: Props) {
  const latinOnly = new Set<keyof FontParams>(LATIN_ONLY_PARAMS);

  const renderField = (key: keyof FontParams) => {
    // 한글에서 의미 없는 라틴 전용 축은 숨김
    if (script === "hangul" && latinOnly.has(key)) return null;
    const f = FIELDS[key];
    const range = PARAM_RANGES[key];
    // 물결 주기는 구불구불이 켜져 있을 때만 의미 → 0이면 비활성
    const fieldDisabled = disabled || (key === "waveFreq" && value.waviness === 0);
    return (
      <Slider
        key={key}
        label={f.label}
        display={f.format(value[key])}
        value={value[key]}
        min={range.min}
        max={range.max}
        step={range.step}
        disabled={fieldDisabled}
        onValueChange={(v) => onChange({ ...value, [key]: v })}
      />
    );
  };

  // ── 빠른 시작: 대표 슬라이더 3개 ──
  if (tier === "quick") {
    return (
      <div className={styles.panel} role="group" aria-label="대표 조절">
        <div className={styles.subgroup}>{QUICK_KEYS.map(renderField)}</div>
      </div>
    );
  }

  // ── 세부 조절: 자간 · 곡률 · 구불구불 ──
  if (tier === "detail") {
    return (
      <div className={styles.panel}>
        {DETAIL_GROUPS.map((group) => {
          const rendered = group.keys.map(renderField).filter(Boolean);
          if (rendered.length === 0) return null;
          return (
            <div key={group.title} className={styles.subgroup} role="group" aria-label={group.title}>
              <p className={styles.subhead}>{group.title}</p>
              {rendered}
            </div>
          );
        })}
      </div>
    );
  }

  // ── 고급: 잘 안 쓰는 축 + 시드(주사위) ──
  if (tier === "advanced") {
    const advRendered = ADVANCED_KEYS.map(renderField).filter(Boolean);
    return (
      <div className={styles.panel}>
        <div className={styles.subgroup} role="group" aria-label="고급 형태">
          {advRendered}
        </div>
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
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden className={styles.dice}>
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
    );
  }

  // tier 미지정 → 전체(quick + detail + advanced)를 순서대로
  return (
    <div className={styles.panel}>
      <div className={styles.subgroup}>{QUICK_KEYS.map(renderField)}</div>
      {DETAIL_GROUPS.map((group) => {
        const rendered = group.keys.map(renderField).filter(Boolean);
        if (rendered.length === 0) return null;
        return (
          <div key={group.title} className={styles.subgroup} role="group" aria-label={group.title}>
            <p className={styles.subhead}>{group.title}</p>
            {rendered}
          </div>
        );
      })}
      <div className={styles.subgroup} role="group" aria-label="고급 형태">
        {ADVANCED_KEYS.map(renderField)}
      </div>
    </div>
  );
}
