import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./Button.module.css";

type Variant = "solid" | "outline" | "ghost";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children?: ReactNode;
}

/**
 * 공용 버튼. 절제된 단색 악센트 기반(그라데이션 없음).
 * - solid: 먹(잉크) 채움
 * - outline: 테두리만
 * - ghost: 배경 없음(보조 동작)
 */
export function Button({
  variant = "solid",
  className,
  type,
  ...rest
}: Props) {
  const cls = [styles.btn, styles[variant], className]
    .filter(Boolean)
    .join(" ");
  return <button type={type ?? "button"} className={cls} {...rest} />;
}

export default Button;
