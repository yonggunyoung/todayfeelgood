"use client";

import { PARAM_RANGES, type FontParams } from "@webapp/core";
import { Slider } from "@webapp/ui";
import styles from "./ParameterPanel.module.css";

interface Props {
  value: FontParams;
  onChange: (next: FontParams) => void;
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
];

/** weight/slant/curvature 슬라이더 패널. 공용 Slider(키보드 접근성) 재사용. */
export default function ParameterPanel({ value, onChange, disabled }: Props) {
  return (
    <div className={styles.panel}>
      {FIELDS.map(({ key, label, format }) => {
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
    </div>
  );
}
