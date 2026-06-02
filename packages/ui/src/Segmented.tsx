import type { ReactNode } from "react";
import styles from "./Segmented.module.css";

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
}

interface Props<T extends string> {
  /** 접근성 라벨(그룹 설명) */
  ariaLabel: string;
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * iOS 세그먼티드 컨트롤.
 * 가라앉은 트랙 위로 선택된 항목이 흰 알약으로 슬라이드 이동한다.
 * (선택 인디케이터는 transform으로 부드럽게 이동 — radiogroup 키보드 지원.)
 */
export function Segmented<T extends string>({
  ariaLabel,
  options,
  value,
  onChange,
  disabled,
  className,
}: Props<T>) {
  const idx = Math.max(
    0,
    options.findIndex((o) => o.value === value)
  );
  const n = options.length;
  const cls = [styles.track, className].filter(Boolean).join(" ");
  return (
    <div className={cls} role="radiogroup" aria-label={ariaLabel}>
      {/* 슬라이드하는 흰 알약 인디케이터.
          thumb 폭 = (트랙폭 - 좌우 4px) / n = 각 세그먼트 폭과 동일.
          이동 거리는 "thumb 자기 폭"의 idx배(translateX 100% = thumb 폭)로 계산.
          thumb 폭이 곧 한 칸 폭이므로 idx칸만큼 옮기면 정확히 맞는다 →
          옵션 2/3/4+ 어디서도 누적 오차 없음. (예전 calc((100%-8px)/n*idx)는
          translateX의 100%가 트랙이 아닌 thumb 자기 폭이라 3옵션부터 어긋났다.) */}
      <span
        className={styles.thumb}
        aria-hidden
        style={{
          width: `calc((100% - 8px) / ${n})`,
          transform: `translateX(${idx * 100}%)`,
        }}
      />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          disabled={disabled}
          className={`${styles.seg} ${value === o.value ? styles.active : ""}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default Segmented;
