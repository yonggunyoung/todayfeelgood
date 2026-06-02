import type { CSSProperties } from "react";
import styles from "./Mascot.module.css";

/**
 * 표정 변주. 같은 몸체에 눈/입 SVG만 교체하는 구조라 경량(이미지 에셋 0).
 * 이후 "캐릭터화/이모지" 기능과 SVG path 재사용 가능.
 */
export type MascotMood =
  | "happy" // 기본(웃음)
  | "surprised" // 견본 갱신
  | "focused" // 그리는 중(혀 빼꼼)
  | "sleepy" // 빈 상태
  | "love" // 완성 축하(하트눈)
  | "worried"; // 에러

interface Props {
  mood?: MascotMood;
  /** 픽셀 크기(정사각). 기본 64 */
  size?: number;
  /** idle 둥실 모션 끄기 */
  still?: boolean;
  /** 접근성: 장식이면 빈 문자열로 두면 aria-hidden 처리 */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

/** 표정별 눈/입/볼 그룹 (몸체는 공통) */
function Face({ mood }: { mood: MascotMood }) {
  // 볼터치(공통, sleepy/worried는 옅게)
  const cheeks = (
    <>
      <circle cx="20" cy="46" r="3.4" fill="var(--candy-coral)" opacity="0.55" />
      <circle cx="44" cy="46" r="3.4" fill="var(--candy-coral)" opacity="0.55" />
    </>
  );
  switch (mood) {
    case "surprised":
      return (
        <g>
          {cheeks}
          <circle cx="25" cy="40" r="3.4" fill="#fff" />
          <circle cx="39" cy="40" r="3.4" fill="#fff" />
          <circle cx="25" cy="40" r="1.8" fill="var(--ink)" />
          <circle cx="39" cy="40" r="1.8" fill="var(--ink)" />
          <ellipse cx="32" cy="49" rx="3" ry="3.6" fill="var(--ink)" />
        </g>
      );
    case "focused":
      return (
        <g>
          {cheeks}
          {/* 집중한 가는 눈 */}
          <path d="M22 40 q3 -2.6 6 0" stroke="var(--ink)" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          <path d="M36 40 q3 -2.6 6 0" stroke="var(--ink)" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          {/* 혀 빼꼼 */}
          <path d="M29 47 q3 4 6 0 z" fill="var(--candy-coral)" />
        </g>
      );
    case "sleepy":
      return (
        <g>
          <path d="M22 41 q3 2.4 6 0" stroke="var(--ink)" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          <path d="M36 41 q3 2.4 6 0" stroke="var(--ink)" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          <circle cx="32" cy="48" r="1.8" fill="var(--ink)" />
        </g>
      );
    case "love":
      return (
        <g>
          {cheeks}
          {/* 하트눈 */}
          <path d="M25 38 a2 2 0 0 1 3 0 a2 2 0 0 1 3 0 q0 2.4 -3 4.4 q-3 -2 -3 -4.4z" fill="var(--candy-coral)" />
          <path d="M33 38 a2 2 0 0 1 3 0 a2 2 0 0 1 3 0 q0 2.4 -3 4.4 q-3 -2 -3 -4.4z" fill="var(--candy-coral)" />
          <path d="M28 48 q4 4 8 0" stroke="var(--ink)" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        </g>
      );
    case "worried":
      return (
        <g>
          <circle cx="25" cy="41" r="2.2" fill="var(--ink)" />
          <circle cx="39" cy="41" r="2.2" fill="var(--ink)" />
          <path d="M28 50 q4 -3 8 0" stroke="var(--ink)" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          {/* 졸졸 땀 */}
          <path d="M46 36 q2 4 0 5.6 q-2 -1.6 0 -5.6z" fill="var(--candy-mint)" opacity="0.8" />
        </g>
      );
    case "happy":
    default:
      return (
        <g>
          {cheeks}
          <circle cx="25" cy="40" r="2.6" fill="var(--ink)" />
          <circle cx="39" cy="40" r="2.6" fill="var(--ink)" />
          <path d="M27 47 q5 4 10 0" stroke="var(--ink)" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        </g>
      );
  }
}

/**
 * 마스코트 "획이(Hoek-i)" — 한 번의 붓획에서 태어난 잉크방울 생물.
 * 몸체 1 path + 머리 위 "획" 한 가닥 + 표정 path. fill은 --accent라 다크 자동 대응.
 * SSR 안전(정적 SVG), 번들/메모리 부담 없음(비용 0).
 */
export function Mascot({
  mood = "happy",
  size = 64,
  still = false,
  label,
  className,
  style,
}: Props) {
  const decorative = !label;
  const cls = [styles.mascot, still ? "" : styles.float, className]
    .filter(Boolean)
    .join(" ");
  return (
    <svg
      className={cls}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      style={style}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : label}
    >
      {/* 머리 위 "획" 한 가닥(펜촉처럼) */}
      <path
        d="M32 9 q-4 -5 1 -8 q2 4 -1 8z"
        fill="var(--accent)"
      />
      {/* 몸체 — 아래 둥글고 위가 살짝 뾰족한 잉크방울 */}
      <path
        d="M32 11 C20 24 14 36 14 45 a18 18 0 0 0 36 0 C50 36 44 24 32 11z"
        fill="var(--accent)"
      />
      {/* 흰 하이라이트 점 */}
      <circle cx="22" cy="32" r="3.4" fill="#fff" opacity="0.55" />
      <Face mood={mood} />
    </svg>
  );
}

export default Mascot;
