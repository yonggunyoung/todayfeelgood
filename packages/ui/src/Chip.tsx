import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./Chip.module.css";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** 선택(눌림) 상태 — 악센트로 채워진다 */
  selected?: boolean;
  children: ReactNode;
}

/**
 * 알약 칩 — 무드 프리셋 등 토글/선택형 작은 버튼.
 * 기본은 연한 면, selected면 악센트 채움. 누름 시 스프링.
 */
export function Chip({ selected, className, type, children, ...rest }: Props) {
  const cls = [styles.chip, selected ? styles.selected : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <button type={type ?? "button"} className={cls} aria-pressed={selected} {...rest}>
      {children}
    </button>
  );
}

export default Chip;
