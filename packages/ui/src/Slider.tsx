import type { CSSProperties, InputHTMLAttributes } from "react";
import styles from "./Slider.module.css";

interface Props
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  /** 라벨 텍스트 */
  label: string;
  /** 현재 값(표시용, 단위 포함 가능) — 값 칩에 들어간다 */
  display: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onValueChange: (value: number) => void;
}

/**
 * 공용 라벨드 슬라이더 — 소프트 iOS 톤.
 * 인셋 트랙 + 악센트로 채워지는 진행 구간 + 통통한 클레이 thumb.
 * 네이티브 range라 키보드 접근성 유지, 값은 알약 칩으로 표시.
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
  // 좌측 채움 비율(0~100). 트랙 배경 그라데이션 분기점으로 사용.
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  const fillStyle = {
    "--fill": `${Math.max(0, Math.min(100, pct))}%`,
  } as CSSProperties;

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
        style={fillStyle}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-valuetext={`${label} ${display}`}
        onChange={(e) => onValueChange(Number(e.target.value))}
        {...rest}
      />
    </div>
  );
}

export default Slider;
