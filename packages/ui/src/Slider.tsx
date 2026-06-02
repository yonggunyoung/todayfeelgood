import type { InputHTMLAttributes } from "react";
import styles from "./Slider.module.css";

interface Props
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  /** 라벨 텍스트 */
  label: string;
  /** 현재 값(표시용, 단위 포함 가능) */
  display: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onValueChange: (value: number) => void;
}

/**
 * 공용 라벨드 슬라이더. 키보드 접근성(네이티브 range) + 포커스 링 기본.
 * 폰트앱의 파라미터 패널과 홈 데모가 함께 쓴다.
 */
export function Slider({
  label,
  display,
  value,
  min,
  max,
  step,
  onValueChange,
  id,
  disabled,
  ...rest
}: Props) {
  const inputId = id ?? `slider-${label.replace(/\s+/g, "-")}`;
  return (
    <div className={styles.row}>
      <div className={styles.head}>
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
        <span className={styles.value}>{display}</span>
      </div>
      <input
        id={inputId}
        className={styles.input}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onValueChange(Number(e.target.value))}
        {...rest}
      />
    </div>
  );
}

export default Slider;
