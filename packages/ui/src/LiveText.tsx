import type { CSSProperties } from "react";
import styles from "./LiveText.module.css";

/**
 * "살아있는 글자" — 글자마다 미세한 시차로 숨쉬듯 흔들리는(waviness) 모티프.
 * 폰트앱 본질(글씨에 표정)과 맞물린 마이크로 인터랙션.
 * prefers-reduced-motion 시 애니메이션 정지(CSS에서 처리).
 */

interface Props {
  text: string;
  className?: string;
  style?: CSSProperties;
  /** 흔들림 끄기(정적). */
  still?: boolean;
}

export function LiveText({ text, className, style, still = false }: Props) {
  const chars = Array.from(text);
  return (
    <span
      className={[styles.wrap, className].filter(Boolean).join(" ")}
      style={style}
      aria-label={text}
      role="img"
    >
      {chars.map((ch, i) => (
        <span
          key={`${ch}-${i}`}
          aria-hidden
          className={still ? undefined : styles.glyph}
          style={
            still
              ? undefined
              : ({ animationDelay: `${(i % 6) * 0.16}s` } as CSSProperties)
          }
        >
          {ch === " " ? " " : ch}
        </span>
      ))}
    </span>
  );
}

export default LiveText;
