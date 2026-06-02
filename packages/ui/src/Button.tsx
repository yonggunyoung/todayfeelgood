import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./Button.module.css";

type Variant = "solid" | "soft" | "clay" | "ghost";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children?: ReactNode;
}

/**
 * 공용 버튼 — 소프트 iOS 문방구 톤. 큰 라운드 + 스프링 누름.
 * - solid: 악센트 채움(메인 인터랙티브)
 * - soft:  연한 악센트 배경(귀여움 기본, 보조 동작)
 * - clay:  통통한 클레이 입체(강조 CTA)
 * - ghost: 투명(저강도 동작)
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
