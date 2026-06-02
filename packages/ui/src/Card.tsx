import type { HTMLAttributes, ReactNode } from "react";
import styles from "./Card.module.css";

interface Props extends HTMLAttributes<HTMLDivElement> {
  /** 우상단 작은 인덱스/라벨(예: "01", "폰트") */
  tag?: ReactNode;
  children: ReactNode;
}

/**
 * 공용 카드. 드롭섀도 대신 얇은 괘선(rule)으로 구획하는 에디토리얼 스타일.
 * 모서리는 거의 직각(2px)으로 두어 "둥근 카드 반복" 클리셰를 피한다.
 */
export function Card({ tag, className, children, ...rest }: Props) {
  const cls = [styles.card, className].filter(Boolean).join(" ");
  return (
    <div className={cls} {...rest}>
      {tag != null && <span className={styles.tag}>{tag}</span>}
      {children}
    </div>
  );
}

export default Card;
