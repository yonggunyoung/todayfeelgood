import type { CSSProperties, ReactNode } from "react";
import styles from "./Sticker.module.css";

/**
 * 문방구 스티커 / 마스킹테이프 악센트 — "여지껏 없던 조합"의 문방구 시그널.
 * 절제해서 1~2곳에만. 살짝 기울어진 라벨로 단번에 "문방구" 느낌을 준다.
 * 장식이므로 기본 aria-hidden(텍스트가 의미 있으면 label로 노출).
 */

type Variant = "tape" | "sticker";

interface Props {
  children: ReactNode;
  /** tape=마스킹테이프(반투명 띠), sticker=둥근 스티커(그림자). 기본 tape */
  variant?: Variant;
  /** 기울기(도). 기본 -3 */
  rotate?: number;
  /** 색 토큰. 기본 candy-butter */
  color?: string;
  className?: string;
  style?: CSSProperties;
}

export function Sticker({
  children,
  variant = "tape",
  rotate = -3,
  color = "var(--candy-butter)",
  className,
  style,
}: Props) {
  const cls = [styles.base, styles[variant], className].filter(Boolean).join(" ");
  return (
    <span
      className={cls}
      aria-hidden
      style={{
        // @ts-expect-error CSS 사용자 정의 속성
        "--tape-color": color,
        transform: `rotate(${rotate}deg)`,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export default Sticker;
