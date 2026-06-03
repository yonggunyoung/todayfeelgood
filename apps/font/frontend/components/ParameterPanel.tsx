"use client";

import {
  LATIN_ONLY_PARAMS,
  PARAM_RANGES,
  type FontParams,
  type FontScript,
} from "@webapp/core";
import { Slider } from "@webapp/ui";
import type { Dictionary } from "../lib/i18n";
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
  t: Dictionary["studio"]["params"];
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

// 세부(detail) 단계에 묶어 보여줄 의미 그룹(그룹 제목은 사전 키로).
const DETAIL_GROUPS: { titleKey: "groupSkeleton" | "groupCurve" | "groupHand"; keys: (keyof FontParams)[] }[] = [
  { titleKey: "groupSkeleton", keys: ["letterSpacing"] },
  { titleKey: "groupCurve", keys: ["curvature"] },
  { titleKey: "groupHand", keys: ["waviness"] },
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
  t,
}: Props) {
  const latinOnly = new Set<keyof FontParams>(LATIN_ONLY_PARAMS);

  // 표시값 포맷(라벨은 사전에서, 일부 0값 특수 표현도 사전).
  const format = (key: keyof FontParams, v: number): string => {
    switch (key) {
      case "slant":
        return `${v}°`;
      case "weirdness":
        return v === 0 ? t.weirdnessTidy : String(v);
      case "letterSpacing":
        return `${v.toFixed(2)}em`;
      case "waviness":
        return v === 0 ? t.wavinessStraight : v.toFixed(2);
      case "waveFreq":
        return `${v.toFixed(1)}×`;
      case "curvature":
      case "roundness":
      case "contrast":
      case "mono":
      case "cursive":
        return v.toFixed(2);
      default:
        return String(v);
    }
  };

  const renderField = (key: keyof FontParams) => {
    // 한글에서 의미 없는 라틴 전용 축은 숨김
    if (script === "hangul" && latinOnly.has(key)) return null;
    const range = PARAM_RANGES[key];
    // 물결 주기는 구불구불이 켜져 있을 때만 의미 → 0이면 비활성
    const fieldDisabled = disabled || (key === "waveFreq" && value.waviness === 0);
    return (
      <Slider
        key={key}
        label={t.labels[key]}
        display={format(key, value[key])}
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
      <div className={styles.panel} role="group" aria-label={t.quickAria}>
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
          const title = t[group.titleKey];
          return (
            <div key={group.titleKey} className={styles.subgroup} role="group" aria-label={title}>
              <p className={styles.subhead}>{title}</p>
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
        <div className={styles.subgroup} role="group" aria-label={t.advAria}>
          {advRendered}
        </div>
        <div className={styles.seedRow}>
          <span className={styles.seedLabel}>{t.seedLabel.replace("{seed}", String(value.seed))}</span>
          <button
            type="button"
            className={styles.seedBtn}
            onClick={onRandomizeSeed}
            disabled={disabled}
            title={t.seedTitle}
          >
            {/* 이모지 금지 — 점 4개 주사위 아이콘 */}
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden className={styles.dice}>
              <rect x="1.5" y="1.5" width="13" height="13" rx="3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="5" cy="5" r="1.3" fill="currentColor" />
              <circle cx="11" cy="5" r="1.3" fill="currentColor" />
              <circle cx="5" cy="11" r="1.3" fill="currentColor" />
              <circle cx="11" cy="11" r="1.3" fill="currentColor" />
            </svg>
            {t.seedBtn}
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
        const title = t[group.titleKey];
        return (
          <div key={group.titleKey} className={styles.subgroup} role="group" aria-label={title}>
            <p className={styles.subhead}>{title}</p>
            {rendered}
          </div>
        );
      })}
      <div className={styles.subgroup} role="group" aria-label={t.advAria}>
        {ADVANCED_KEYS.map(renderField)}
      </div>
    </div>
  );
}
