/**
 * 서명(Sign) 전용 파라미터/프리셋 계약 — 로컬 정의.
 *
 * 정식 단일 출처는 `packages/core`(idea-sign.md §7의 SignParams 등)이지만,
 * 그 추가는 Shared-Agent 영역이라 현재는 sign 앱 안에 로컬로 둔다.
 * 글자 본체 변형은 폰트 엔진과 동일한 FontParams 축을 재사용하므로
 * @webapp/core의 FontParams/clampParams/FontScript를 그대로 가져다 쓴다(읽기 전용 의존).
 */
import {
  clampParams,
  type FontParams,
  type FontScript,
} from "@webapp/core";
import { sanitizeColor } from "@webapp/ui";

export type { FontScript };

/** 앞뒤 장식 획(플러리시) — 엔진 밖 절차적 SVG 합성. */
export interface SignFlourish {
  enabled: boolean;
  intensity: number; // 0~1 진폭/길이
  loops: number; // 0~3 소용돌이/루프 수
  position: "lead" | "trail" | "both";
}

/** 밑줄/스트로크 — 엔진 밖 절차적 SVG 합성. */
export interface SignUnderline {
  enabled: boolean;
  strokes: number; // 1~2획
  waviness: number; // 0~1 곡선 흔들림(오버레이 전용, 엔진 waviness와 별개)
  taper: number; // 0~1 끝 가늘기(시각 힌트)
}

/**
 * 서명 파라미터.
 * - body: 글자 본체에 쓰는 FontParams 부분집합(폰트 엔진 변형 = [REAL]).
 * - connect/flourish/underline: 절차적 SVG 오버레이(엔진 밖 = 근사).
 */
export interface SignParams {
  text: string;
  script: FontScript;
  body: FontParams; // 폰트 엔진으로 보낼 변형 축
  connect: number; // 0~1 베이스라인 연결선 강도(근사)
  flourish: SignFlourish;
  underline: SignUnderline;
  inkColor: string; // 잉크색(CSS color)
  bgMode: "transparent" | "white" | "paper"; // 배경
}

/** 무드 프리셋 — SignParams 부분 묶음(프론트 적용). */
export interface SignStylePreset {
  id: string;
  label: string;
  hint: string;
  apply: () => SignParams;
}

/** 서명 본체 FontParams 기본값(흘림/밀착 지향). */
function body(overrides: Partial<FontParams>): FontParams {
  // letterSpacing 음수(밀착)·약한 slant를 기본 출발점으로 두고 프리셋이 덮는다.
  return clampParams({
    weight: 420,
    slant: -10,
    cursive: 1,
    weirdness: 8,
    waviness: 0.1,
    waveFreq: 2,
    contrast: 0.4,
    roundness: 0.3,
    letterSpacing: -0.02,
    curvature: 0.5,
    mono: 0,
    seed: 7,
    ...overrides,
  });
}

const baseFlourish = (o: Partial<SignFlourish> = {}): SignFlourish => ({
  enabled: true,
  intensity: 0.6,
  loops: 1,
  position: "trail",
  ...o,
});

const baseUnderline = (o: Partial<SignUnderline> = {}): SignUnderline => ({
  enabled: true,
  strokes: 1,
  waviness: 0.3,
  taper: 0.6,
  ...o,
});

/** 무드 프리셋 6종. 한글은 cursive 무시(엔진이 자동 처리). */
export const SIGN_PRESETS: SignStylePreset[] = [
  {
    id: "elegant",
    label: "우아한 필기",
    hint: "가늘고 기울어진 클래식 서명",
    apply: () => ({
      text: "",
      script: "latin",
      body: body({ weight: 360, slant: -13, cursive: 1, contrast: 0.55, weirdness: 6 }),
      connect: 0.7,
      flourish: baseFlourish({ intensity: 0.7, loops: 2, position: "both" }),
      underline: baseUnderline({ waviness: 0.25, taper: 0.7 }),
      inkColor: "#1f3a5f",
      bgMode: "transparent",
    }),
  },
  {
    id: "swift",
    label: "날렵한 흘림",
    hint: "빠르게 휘갈긴 느낌",
    apply: () => ({
      text: "",
      script: "latin",
      body: body({ weight: 480, slant: -15, cursive: 1, weirdness: 18, waviness: 0.15, letterSpacing: -0.04 }),
      connect: 0.9,
      flourish: baseFlourish({ intensity: 0.85, loops: 1, position: "trail" }),
      underline: baseUnderline({ strokes: 1, waviness: 0.45, taper: 0.8 }),
      inkColor: "#2b2a33",
      bgMode: "transparent",
    }),
  },
  {
    id: "round",
    label: "둥근 손맛",
    hint: "통통하고 둥근 글씨",
    apply: () => ({
      text: "",
      script: "latin",
      body: body({ weight: 560, slant: -6, cursive: 0.7, roundness: 0.8, curvature: 0.8, contrast: 0.2, weirdness: 12 }),
      connect: 0.6,
      flourish: baseFlourish({ intensity: 0.5, loops: 1, position: "lead" }),
      underline: baseUnderline({ waviness: 0.5, taper: 0.5 }),
      inkColor: "#7a3b2e",
      bgMode: "transparent",
    }),
  },
  {
    id: "modern",
    label: "각진 모던",
    hint: "곧고 단정한 모던 서명",
    apply: () => ({
      text: "",
      script: "latin",
      body: body({ weight: 620, slant: -3, cursive: 0.3, roundness: 0, curvature: 0, contrast: 0.5, weirdness: 4, letterSpacing: -0.01 }),
      connect: 0.4,
      flourish: baseFlourish({ enabled: false }),
      underline: baseUnderline({ strokes: 1, waviness: 0.1, taper: 0.4 }),
      inkColor: "#2b2a33",
      bgMode: "transparent",
    }),
  },
  {
    id: "minimal",
    label: "미니멀 밑줄",
    hint: "장식 없이 밑줄 한 획만",
    apply: () => ({
      text: "",
      script: "latin",
      body: body({ weight: 440, slant: -8, cursive: 0.6, weirdness: 6, contrast: 0.3 }),
      connect: 0.3,
      flourish: baseFlourish({ enabled: false }),
      underline: baseUnderline({ strokes: 1, waviness: 0.2, taper: 0.9 }),
      inkColor: "#2b2a33",
      bgMode: "transparent",
    }),
  },
  {
    id: "hangul",
    label: "한글 흘림",
    hint: "이름 한글 서명(흘림 근사)",
    apply: () => ({
      text: "",
      script: "hangul",
      body: body({ weight: 520, slant: -8, cursive: 0, weirdness: 14, waviness: 0.1, letterSpacing: -0.03, contrast: 0.3, roundness: 0.4 }),
      connect: 0.5,
      flourish: baseFlourish({ intensity: 0.5, loops: 1, position: "trail" }),
      underline: baseUnderline({ waviness: 0.35, taper: 0.6 }),
      inkColor: "#2b2a33",
      bgMode: "transparent",
    }),
  },
];

/** 기본 서명 파라미터(첫 진입). */
export function defaultSignParams(): SignParams {
  const p = SIGN_PRESETS[0]!.apply();
  return { ...p, text: "" };
}

/** 배경 모드 → CSS 배경값(프리뷰/체커 위 표시는 컴포넌트가 처리). */
export const BG_FILL: Record<SignParams["bgMode"], string> = {
  transparent: "none",
  white: "#ffffff",
  paper: "#f6f1e7",
};

/** 안전 가드 — 사용자 입력/외부 값에서 SignParams를 정상 범위로 강제. */
export function clampSign(p: SignParams): SignParams {
  const clamp01 = (v: number) => Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0));
  return {
    ...p,
    text: (p.text ?? "").slice(0, 32),
    script: p.script === "hangul" ? "hangul" : "latin",
    // 잉크색 살균(SVG 속성 raw 보간 방어). 비허용 형식이면 기본 잉크.
    inkColor: sanitizeColor(p.inkColor, "#2b2a33"),
    bgMode: ["transparent", "white", "paper"].includes(p.bgMode) ? p.bgMode : "transparent",
    body: clampParams(p.body),
    connect: clamp01(p.connect),
    flourish: {
      enabled: !!p.flourish.enabled,
      intensity: clamp01(p.flourish.intensity),
      loops: Math.min(3, Math.max(0, Math.round(p.flourish.loops))),
      position: ["lead", "trail", "both"].includes(p.flourish.position)
        ? p.flourish.position
        : "trail",
    },
    underline: {
      enabled: !!p.underline.enabled,
      strokes: Math.min(2, Math.max(1, Math.round(p.underline.strokes))),
      waviness: clamp01(p.underline.waviness),
      taper: clamp01(p.underline.taper),
    },
  };
}
