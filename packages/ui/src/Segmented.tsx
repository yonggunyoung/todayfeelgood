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
          이동 거리는 "트랙 폭" 기준 절대값(idx/n)으로 계산해야 옵션 3개 이상에서도
          누적 오차가 없다. (thumb 자기 폭 100%씩 옮기면 left:4px 시작점 때문에 어긋남.) */}
      <span
        className={styles.thumb}
        aria-hidden
        style={{
          width: `calc((100% - 8px) / ${n})`,
          transform: `translateX(calc((100% - 8px) / ${n} * ${idx}))`,
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
