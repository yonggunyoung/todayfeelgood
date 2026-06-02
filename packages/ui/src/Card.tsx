import type { HTMLAttributes, ReactNode } from "react";
import styles from "./Card.module.css";

interface Props extends HTMLAttributes<HTMLDivElement> {
  /** 우상단 작은 알약 칩 라벨(예: "폰트") */
  tag?: ReactNode;
  /** 클릭형 카드면 hover 시 살짝 떠오른다 */
  interactive?: boolean;
  children: ReactNode;
}

/**
 * 공용 카드 — 떠 있는 표면(부드러운 단일 그림자 + 큰 라운드).
 * 1px 보더 구획은 폐기. tag는 올캡스 대신 연한 악센트 알약 칩.
 */
export function Card({ tag, interactive, className, children, ...rest }: Props) {
  const cls = [styles.card, interactive ? styles.interactive : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cls} {...rest}>
      {tag != null && <span className={styles.tag}>{tag}</span>}
      {children}
    </div>
  );
}

export default Card;
