"use client";

import { HelpTip, Slider } from "@webapp/ui";
import { DEFAULT_REFINE, REFINE_RANGES, type RefineParams } from "@webapp/core";
import styles from "./RefinePanel.module.css";

interface Props {
  value: RefineParams;
  onChange: (next: RefineParams) => void;
  disabled?: boolean;
}

// 각 다듬기 축의 사람말 라벨/설명 — "디자이너 고찰을 간편하게".
const META: Record<keyof RefineParams, { label: string; hint: string; unit?: string }> = {
  smoothing: { label: "다듬기", hint: "손떨림 정리(베지어). 형태는 살리고 떨림만." },
  nib: { label: "획 두께", hint: "펜촉 굵기. 가늘게↔두껍게." },
  taper: { label: "끝 가늘기", hint: "획 끝이 가늘어짐(필압 흉내)." },
  straighten: { label: "기울기 보정", hint: "베이스라인·기울기 바로잡기." },
  spacing: { label: "자간", hint: "글자 사이 간격(em).", unit: "em" },
};

// "✨ 자동 정리" 쉬운 프리셋 — smoothing/straighten을 한 번에 묶어 노출.
// (슬라이더 세부 조정은 아래 "고급"에서.)
type TidyLevel = "raw" | "light" | "tidy";
const TIDY_PRESETS: { id: TidyLevel; label: string; smoothing: number; straighten: number }[] = [
  { id: "raw", label: "날것 그대로", smoothing: 0, straighten: 0 },
  { id: "light", label: "살짝 정리", smoothing: 0.35, straighten: 0.2 },
  { id: "tidy", label: "✨ 자동 정리", smoothing: 0.7, straighten: 0.5 },
];

// 현재 값이 어느 프리셋에 해당하는지(가까운 것). 사용자가 슬라이더를 만지면 매칭 해제될 수 있음.
function matchTidy(v: RefineParams): TidyLevel | null {
  const hit = TIDY_PRESETS.find(
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
export default function RefinePanel({ value, onChange, disabled }: Props) {
  const set = (key: keyof RefineParams, v: number) => onChange({ ...value, [key]: v });

  const activeTidy = matchTidy(value);
  const applyTidy = (p: (typeof TIDY_PRESETS)[number]) =>
    onChange({ ...value, smoothing: p.smoothing, straighten: p.straighten });

  const advancedOrder: Array<keyof RefineParams> = ["nib", "taper", "spacing", "smoothing", "straighten"];

  return (
    <div className={styles.panel}>
      {/* ── 쉬운 자동 정리 프리셋 ── */}
      <div className={styles.tidyHead}>
        <span className={styles.tidyLabel}>구불구불 정리</span>
        <HelpTip label="자동 정리" align="end">
          손으로 그리면 떨림이 생겨요. <strong>자동 정리</strong>를 올리면 떨림·삐뚤
          기울기를 부드럽게 펴 줘요. 단, 너무 올리면 내 손맛이 줄 수 있어요 너굴.
          날것 그대로가 좋으면 맨 왼쪽으로!
        </HelpTip>
      </div>
      <div className={styles.tidyRow} role="group" aria-label="자동 정리 정도">
        {TIDY_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={styles.tidyChip}
            data-on={activeTidy === p.id}
            aria-pressed={activeTidy === p.id}
            disabled={disabled}
            onClick={() => applyTidy(p)}
          >
            {p.label}
          </button>
        ))}
      </div>
      <p className={styles.tidyNote}>
        {activeTidy === "raw"
          ? "내 손맛 100% — 떨림까지 그대로 살려요."
          : activeTidy === "tidy"
            ? "구불구불·삐뚤을 단정하게 펴 줘요(개성은 최대한 보존)."
            : activeTidy === "light"
              ? "떨림만 살짝 다듬고 손맛은 남겨요."
              : "세부 조정 중 — 고급에서 값을 직접 맞췄어요."}
      </p>

      {/* ── 세부 조정(고급) ── */}
      <details className={styles.advanced}>
        <summary className={styles.advSummary}>
          <span className={styles.advTitle}>고급: 세부 조정</span>
          <span className={styles.advSub}>두께·끝맺음·자간까지 직접</span>
        </summary>
        <div className={styles.sliders}>
          {advancedOrder.map((key) => {
            const r = REFINE_RANGES[key];
            return (
              <div key={key} className={styles.item}>
                <Slider
                  label={META[key].label}
                  display={display(key, value[key])}
                  value={value[key]}
                  min={r.min}
                  max={r.max}
                  step={r.step}
                  disabled={disabled}
                  onValueChange={(v) => set(key, v)}
                />
                <p className={styles.hint}>{META[key].hint}</p>
              </div>
            );
          })}
          <button
            type="button"
            className={styles.resetBtn}
            disabled={disabled}
            onClick={() => onChange({ ...DEFAULT_REFINE })}
          >
            기본값으로 되돌리기
          </button>
        </div>
      </details>
    </div>
  );
}
