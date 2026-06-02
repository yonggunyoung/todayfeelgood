"use client";

import { PARAM_RANGES, type FontParams } from "@webapp/core";
import styles from "./ParameterPanel.module.css";

interface Props {
  value: FontParams;
  onChange: (next: FontParams) => void;
  disabled?: boolean;
}

// 슬라이더로 노출할 축들의 라벨/단위 (범위·기본값은 PARAM_RANGES에서 가져옴)
const FIELDS: { key: keyof FontParams; label: string; unit?: string }[] = [
  { key: "weight", label: "굵기 (Weight)" },
  { key: "slant", label: "기울기 (Slant)", unit: "°" },
  { key: "curvature", label: "곡률 (Curvature)" },
];

/** weight/slant/curvature 슬라이더 패널. 값 변경 시 onChange로 상위에 전달. */
export default function ParameterPanel({ value, onChange, disabled }: Props) {
  const handle = (key: keyof FontParams, raw: string) => {
    onChange({ ...value, [key]: Number(raw) });
  };

  return (
    <div className={styles.panel}>
      <h2 className={styles.heading}>스타일 슬라이더</h2>
      {FIELDS.map(({ key, label, unit }) => {
        const range = PARAM_RANGES[key];
        return (
          <div key={key} className={styles.row}>
            <div className={styles.labelRow}>
              <label htmlFor={`param-${key}`}>{label}</label>
              <span className={styles.value}>
                {value[key]}
                {unit ?? ""}
              </span>
            </div>
            <input
              id={`param-${key}`}
              type="range"
              min={range.min}
              max={range.max}
              step={range.step}
              value={value[key]}
              disabled={disabled}
              onChange={(e) => handle(key, e.target.value)}
              className={styles.slider}
            />
          </div>
        );
      })}
    </div>
  );
}
