import type { CSSProperties } from "react";
import styles from "./Mascot.module.css";

/* 너구리 털 색(갈색) — 회색 대신 갈색+검정으로 통일.
 * 마스크/동공/줄무늬는 캐릭터 고유의 "검정"이라 테마와 무관하게 항상 진해야 한다.
 * (예전엔 var(--ink)을 썼는데 다크모드에선 --ink가 거의 흰색으로 뒤집혀
 *  흰 얼굴판/흰자 위에서 눈이 사라져 보였다 → 고정 다크색으로 못박는다.) */
const INK = "#2b2a33";

/**
 * 표정 변주. 같은 몸체(너구리)에 눈/입 SVG만 교체하는 구조라 경량(이미지 에셋 0).
 * 기존 키(happy/surprised/focused/sleepy/love/worried)를 그대로 유지한다.
 */
export type MascotMood =
  | "happy" // 기본(윙크 웃음)
  | "surprised" // 견본 갱신
  | "focused" // 그리는 중(혀 빼꼼)
  | "sleepy" // 빈 상태
  | "love" // 완성 축하(하트눈)
  | "worried"; // 에러

/** 선택적 포즈. 기본은 따봉 너구리. (기존 호출부 불변 — 안 넘기면 thumbsUp) */
export type MascotPose = "thumbsUp" | "calm";

interface Props {
  mood?: MascotMood;
  /** 픽셀 크기(정사각). 기본 64 */
  size?: number;
  /** idle 둥실 모션 끄기 */
  still?: boolean;
  /** 접근성: 장식이면 빈 문자열로 두면 aria-hidden 처리 */
  label?: string;
  /** 손동작 포즈(선택). 기본 thumbsUp(따봉) */
  pose?: MascotPose;
  className?: string;
  style?: CSSProperties;
}

/**
 * 표정별 눈/눈가/입 그룹 (얼굴 마스크/몸체는 공통).
 * 기본(happy)은 한쪽 눈을 감은 윙크. 너구리 눈가 검은 마스크 위에 흰 눈을 올린다.
 * 좌표계: 얼굴 중심 약 (32,38). 왼눈≈25, 오른눈≈39.
 */
function Face({ mood }: { mood: MascotMood }) {
  // 볼터치(공통, sleepy/worried는 생략)
  const cheeks = (
    <>
      <circle cx="19" cy="42" r="3" fill="var(--candy-coral)" opacity="0.5" />
      <circle cx="45" cy="42" r="3" fill="var(--candy-coral)" opacity="0.5" />
    </>
  );
  // 또렷한 눈(흰자+동공+하이라이트)
  const eyeOpen = (cx: number) => (
    <>
      <circle cx={cx} cy="36" r="3.6" fill="#fff" />
      <circle cx={cx} cy="36.4" r="2.1" fill={INK} />
      <circle cx={cx + 0.9} cy="35.4" r="0.8" fill="#fff" />
    </>
  );
  // 감은 눈(윙크) — 살짝 휜 호
  const eyeWink = (cx: number) => (
    <path
      d={`M${cx - 3.4} 36.6 q3.4 3 6.8 0`}
      stroke={INK}
      strokeWidth="2.2"
      strokeLinecap="round"
      fill="none"
    />
  );

  switch (mood) {
    case "surprised":
      return (
        <g>
          {cheeks}
          <circle cx="25" cy="36" r="4" fill="#fff" />
          <circle cx="39" cy="36" r="4" fill="#fff" />
          <circle cx="25" cy="36" r="2" fill={INK} />
          <circle cx="39" cy="36" r="2" fill={INK} />
          {/* 동그란 입 */}
          <ellipse cx="32" cy="46" rx="2.8" ry="3.3" fill={INK} />
        </g>
      );
    case "focused":
      return (
        <g>
          {cheeks}
          {/* 집중한 가는 눈 */}
          <path d="M22 36 q3 -2.4 6 0" stroke={INK} strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <path d="M36 36 q3 -2.4 6 0" stroke={INK} strokeWidth="2.2" strokeLinecap="round" fill="none" />
          {/* 혀 빼꼼 */}
          <path d="M29.5 44 q2.5 4 5 0 z" fill="var(--candy-coral)" />
        </g>
      );
    case "sleepy":
      return (
        <g>
          <path d="M22 37 q3 2.2 6 0" stroke={INK} strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <path d="M36 37 q3 2.2 6 0" stroke={INK} strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <circle cx="32" cy="45" r="1.6" fill={INK} />
        </g>
      );
    case "love":
      return (
        <g>
          {cheeks}
          {/* 하트눈 */}
          <path d="M22.4 34 a2 2 0 0 1 3 0 a2 2 0 0 1 3 0 q0 2.4 -3 4.4 q-3 -2 -3 -4.4z" fill="var(--candy-coral)" />
          <path d="M35.6 34 a2 2 0 0 1 3 0 a2 2 0 0 1 3 0 q0 2.4 -3 4.4 q-3 -2 -3 -4.4z" fill="var(--candy-coral)" />
          <path d="M28 45 q4 4 8 0" stroke={INK} strokeWidth="2.1" strokeLinecap="round" fill="none" />
        </g>
      );
    case "worried":
      return (
        <g>
          <circle cx="25" cy="37" r="2" fill={INK} />
          <circle cx="39" cy="37" r="2" fill={INK} />
          {/* 찡그린 눈썹 */}
          <path d="M21 33 q3 -1.6 6 0" stroke={INK} strokeWidth="1.6" strokeLinecap="round" fill="none" />
          <path d="M37 33 q3 -1.6 6 0" stroke={INK} strokeWidth="1.6" strokeLinecap="round" fill="none" />
          <path d="M28 47 q4 -3 8 0" stroke={INK} strokeWidth="2.1" strokeLinecap="round" fill="none" />
          {/* 졸졸 땀 */}
          <path d="M47 32 q2 4 0 5.6 q-2 -1.6 0 -5.6z" fill="var(--candy-mint)" opacity="0.85" />
        </g>
      );
    case "happy":
    default:
      // 기본 = 익살맞은 윙크(오른눈 감음) + 활짝 웃음
      return (
        <g>
          {cheeks}
          {eyeOpen(25)}
          {eyeWink(39)}
          <path d="M27 45 q5 4.5 10 0" stroke={INK} strokeWidth="2.2" strokeLinecap="round" fill="none" />
        </g>
      );
  }
}

/**
 * 마스코트 "너굴이(Nugul-i)" — 붓을 등에 멘 통통 너구리.
 * 기본 포즈: 윙크 + 따봉(thumbs-up) + 배 볼록 + 등에 붓.
 * 인라인 SVG(에셋 0) · SSR 안전 · 디자인 토큰 CSS 변수 참조(다크 자동 대응).
 */
export function Mascot({
  mood = "happy",
  size = 64,
  still = false,
  label,
  pose = "thumbsUp",
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
      {/* ===== 등에 멘 붓 (몸 뒤, 사선으로) ===== */}
      <g transform="rotate(-24 40 38)">
        {/* 붓대 */}
        <rect x="38.4" y="20" width="3.2" height="26" rx="1.6" fill="#b98a5e" />
        {/* 금속 페룰 */}
        <rect x="37.8" y="44" width="4.4" height="4" rx="1" fill="var(--candy-mint)" />
        {/* 붓털 */}
        <path d="M40 47.5 C36.6 51 37 56 40 59 C43 56 43.4 51 40 47.5z" fill="var(--accent)" />
        {/* 어깨끈 */}
        <path d="M40 26 q-9 6 -10 16" stroke="var(--candy-coral)" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.9" />
      </g>

      {/* ===== 줄무늬 꼬리 (몸 왼쪽 뒤) ===== */}
      <g>
        <path d="M15 46 C7 46 6 54 11 58 C15 61 21 58 21 52 C21 49 19 46 15 46z" fill="#946541" />
        <path d="M11.5 49 q4 -1 7 1" stroke={INK} strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.85" />
        <path d="M10 54 q5 -1 9 1" stroke={INK} strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.85" />
      </g>

      {/* ===== 통통한 몸(배 볼록) ===== */}
      <path
        d="M22 40 C16 42 13 49 15 55 C17 60 24 61 32 61 C40 61 47 60 49 55 C51 49 48 42 42 40z"
        fill="#a07350"
      />
      {/* 밝은 배 */}
      <path
        d="M24 45 C20 47 19 53 22 57 C25 60 39 60 42 57 C45 53 44 47 40 45 C36 43 28 43 24 45z"
        fill="#f3ede2"
      />

      {/* ===== 팔 + 따봉 손동작 ===== */}
      {pose === "thumbsUp" ? (
        <g>
          {/* 왼팔(편안히) */}
          <path d="M22 44 q-4 3 -3 8" stroke="#a07350" strokeWidth="5" strokeLinecap="round" fill="none" />
          {/* 오른팔 들어올림 */}
          <path d="M42 44 q6 -2 7 -9" stroke="#a07350" strokeWidth="5" strokeLinecap="round" fill="none" />
          {/* 따봉 주먹 */}
          <circle cx="50" cy="33" r="4.4" fill="#f3ede2" stroke="#a07350" strokeWidth="1.2" />
          {/* 엄지 */}
          <rect x="48.6" y="25.5" width="2.8" height="6" rx="1.4" fill="#f3ede2" stroke="#a07350" strokeWidth="1.2" />
        </g>
      ) : (
        <g>
          <path d="M22 44 q-4 3 -3 8" stroke="#a07350" strokeWidth="5" strokeLinecap="round" fill="none" />
          <path d="M42 44 q4 3 3 8" stroke="#a07350" strokeWidth="5" strokeLinecap="round" fill="none" />
        </g>
      )}

      {/* ===== 머리 ===== */}
      {/* 둥근 귀 */}
      <circle cx="18.5" cy="20" r="6.5" fill="#a07350" />
      <circle cx="45.5" cy="20" r="6.5" fill="#a07350" />
      <circle cx="18.5" cy="20.5" r="3.4" fill="#5f3f28" />
      <circle cx="45.5" cy="20.5" r="3.4" fill="#5f3f28" />
      {/* 얼굴 */}
      <path
        d="M32 17 C22 17 15 24 15 33 C15 42 22 48 32 48 C42 48 49 42 49 33 C49 24 42 17 32 17z"
        fill="#ad7a52"
      />
      {/* 흰 얼굴판(이마~볼) */}
      <path d="M32 22 C25 22 21 27 21 33 C21 40 26 44 32 44 C38 44 43 40 43 33 C43 27 39 22 32 22z" fill="#f3ede2" />

      {/* 너구리 눈가 검은 마스크 무늬(좌우) */}
      <path d="M16 31 C19 27 26 27 29 31 C31 34 30 39 26 40 C20 41 16 37 16 33z" fill={INK} />
      <path d="M48 31 C45 27 38 27 35 31 C33 34 34 39 38 40 C44 41 48 37 48 33z" fill={INK} />

      {/* 코 */}
      <ellipse cx="32" cy="41.5" rx="2.4" ry="1.8" fill={INK} />

      <Face mood={mood} />
    </svg>
  );
}

export default Mascot;
