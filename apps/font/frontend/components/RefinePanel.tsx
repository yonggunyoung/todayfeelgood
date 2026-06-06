"use client";

import { HelpTip, Slider } from "@webapp/ui";
import { DEFAULT_REFINE, REFINE_RANGES, type RefineParams } from "@webapp/core";
import type { Dictionary } from "../lib/i18n";
import styles from "./RefinePanel.module.css";

interface Props {
  value: RefineParams;
  onChange: (next: RefineParams) => void;
  disabled?: boolean;
  t: Dictionary["studio"]["refine"];
}

// "✨ 자동 정리" 쉬운 프리셋 — smoothing/straighten을 한 번에 묶어 노출.
// (슬라이더 세부 조정은 아래 "고급"에서.)
type TidyLevel = "raw" | "light" | "tidy";
// 3단계 차이가 또렷하게 느껴지도록 간격을 넓힘(날것=원형 그대로 ↔ 자동=확실히 정돈).
const TIDY_VALUES: { id: TidyLevel; smoothing: number; straighten: number }[] = [
  { id: "raw", smoothing: 0, straighten: 0 },
  { id: "light", smoothing: 0.45, straighten: 0.35 },
  { id: "tidy", smoothing: 0.9, straighten: 0.75 },
];

// 현재 값이 어느 프리셋에 해당하는지(가까운 것). 사용자가 슬라이더를 만지면 매칭 해제될 수 있음.
function matchTidy(v: RefineParams): TidyLevel | null {
  const hit = TIDY_VALUES.find(
    (p) => Math.abs(p.smoothing - v.smoothing) < 0.03 && Math.abs(p.straighten - v.straighten) < 0.03
  );
  return hit?.id ?? null;
}

// 표시값 포맷(자간만 em, 나머지는 0~100% 느낌의 소수).
function display(key: keyof RefineParams, v: number): string {
  if (key === "spacing") return `${v.toFixed(2)}em`;
  return v.toFixed(2);
}

/**
 * 다듬기 패널 — 핵심은 "✨ 자동 정리" 쉬운 프리셋(구불구불 정리)으로 직관화.
 * 세부 슬라이더(nib/taper/자간 등)는 "고급"으로 접어 조잡함 제거.
 * 범위/기본값은 REFINE_RANGES 단일 출처.
 */
export default function RefinePanel({ value, onChange, disabled, t }: Props) {
  const set = (key: keyof RefineParams, v: number) => onChange({ ...value, [key]: v });

  const activeTidy = matchTidy(value);
  const applyTidy = (p: (typeof TIDY_VALUES)[number]) =>
    onChange({ ...value, smoothing: p.smoothing, straighten: p.straighten });

  const tidyLabel: Record<TidyLevel, string> = {
    raw: t.presetRaw,
    light: t.presetLight,
    tidy: t.presetTidy,
  };

  const advancedOrder: Array<keyof RefineParams> = ["nib", "taper", "spacing", "smoothing", "straighten"];

  return (
    <div className={styles.panel}>
      {/* ── 쉬운 자동 정리 프리셋 ── */}
      <div className={styles.tidyHead}>
        <span className={styles.tidyLabel}>{t.tidyLabel}</span>
        <HelpTip label={t.tidyHelpLabel} align="end">
          {t.tidyHelp}
        </HelpTip>
      </div>
      <div className={styles.tidyRow} role="group" aria-label={t.tidyAria}>
        {TIDY_VALUES.map((p) => (
          <button
            key={p.id}
            type="button"
            className={styles.tidyChip}
            data-on={activeTidy === p.id}
            aria-pressed={activeTidy === p.id}
            disabled={disabled}
            onClick={() => applyTidy(p)}
          >
            {tidyLabel[p.id]}
          </button>
        ))}
      </div>
      <p className={styles.tidyNote}>
        {activeTidy === "raw"
          ? t.noteRaw
          : activeTidy === "tidy"
            ? t.noteTidy
            : activeTidy === "light"
              ? t.noteLight
              : t.noteCustom}
      </p>

      {/* ── 세부 조정(고급) ── */}
      <details className={styles.advanced}>
        <summary className={styles.advSummary}>
          <span className={styles.advTitle}>{t.advSummary}</span>
          <span className={styles.advSub}>{t.advSub}</span>
        </summary>
        <div className={styles.sliders}>
          {advancedOrder.map((key) => {
            const r = REFINE_RANGES[key];
            return (
              <div key={key} className={styles.item}>
                <Slider
                  label={t.labels[key]}
                  display={display(key, value[key])}
                  value={value[key]}
                  min={r.min}
                  max={r.max}
                  step={r.step}
                  disabled={disabled}
                  onValueChange={(v) => set(key, v)}
                />
                <p className={styles.hint}>{t.hints[key]}</p>
              </div>
            );
          })}
          <button
            type="button"
            className={styles.resetBtn}
            disabled={disabled}
            onClick={() => onChange({ ...DEFAULT_REFINE })}
          >
            {t.reset}
          </button>
        </div>
      </details>
    </div>
  );
}
