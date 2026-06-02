"use client";

import { Slider } from "@webapp/ui";
import { REFINE_RANGES, type RefineParams } from "@webapp/core";
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

// 표시값 포맷(자간만 em, 나머지는 0~100% 느낌의 소수).
function display(key: keyof RefineParams, v: number): string {
  if (key === "spacing") return `${v.toFixed(2)}em`;
  return v.toFixed(2);
}

/**
 * 다듬기 패널 — RefineParams 슬라이더(smoothing/nib/taper/straighten/spacing).
 * "전부 0이면 날것(개성 100%), 올릴수록 정제." 범위는 REFINE_RANGES 단일 출처.
 */
export default function RefinePanel({ value, onChange, disabled }: Props) {
  const set = (key: keyof RefineParams, v: number) =>
    onChange({ ...value, [key]: v });

  const order: Array<keyof RefineParams> = [
    "smoothing",
    "nib",
    "taper",
    "straighten",
    "spacing",
  ];

  return (
    <div className={styles.panel}>
      <p className={styles.intro}>
        전부 0에 가까우면 <strong>날것 그대로</strong>(내 손맛 100%), 올릴수록
        단정한 글씨체로 정제돼요.
      </p>
      <div className={styles.sliders}>
        {order.map((key) => {
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
      </div>
    </div>
  );
}
