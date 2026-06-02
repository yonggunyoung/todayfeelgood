/**
 * 공용 타입/상수 — 프론트엔드와 폰트 엔진이 공유하는 "계약(contract)".
 * 엔진(Python)과 프론트(TS)가 같은 파라미터 스펙을 쓰도록 단일 출처로 둔다.
 * Python 쪽은 이 파일을 직접 import하지 않으므로, 값이 바뀌면 양쪽을 함께 갱신할 것.
 *
 * v4: 심화 컨트롤 — waviness/waveFreq/contrast/roundness([REAL] 폰트에 구워짐),
 *     감성 프리셋 확장, [PREVIEW] 전용 효과(PreviewStyle, 엔진에 보내지 않음) 분리.
 */

/** 생성 대상 문자 체계. latin=Recursive 변형, hangul=OFL 한글 가변폰트 변형. */
export type FontScript = "latin" | "hangul";

/** 라틴 타깃 문자셋 (a-z, A-Z, 0-9) */
export const TARGET_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/**
 * 폰트 생성 파라미터 (전통/비AI = 기본 가변폰트 변형 + 절차적 glyf 좌표 변형).
 * 전부 [REAL] — 실제 출력 폰트 파일(WOFF/TTF)에 반영된다.
 *
 * - weight:        굵기. UI 100~900 → 엔진이 베이스 폰트 wght 축 범위로 선형 매핑.
 * - slant:         기울기(deg). 축이 있으면 축, 없으면 합성 shear.
 * - curvature:     곡률/둥글기 0~1. (라틴/Recursive CASL 전용)
 * - mono:          모노스페이스 0~1. (라틴/Recursive MONO 전용)
 * - cursive:       필기체 0~1. (라틴/Recursive CRSV 전용)
 * - weirdness:     괴상함 0~100. 시드 기반 불규칙 손떨림(지터+베이스라인).
 * - seed:          weirdness 재현용 정수.
 * - letterSpacing: 자간(em).
 * - waviness:      구불구불 0~1. 규칙적 사인 물결(weirdness의 랜덤과 직교).
 * - waveFreq:      물결 주파수 0.5~6.
 * - contrast:      획 대비 0~1. 가로획↔세로획 굵기차 근사.
 * - roundness:     끝/모서리 둥글기 0~1.
 */
export interface FontParams {
  weight: number;
  slant: number;
  curvature: number;
  mono: number;
  cursive: number;
  weirdness: number;
  seed: number;
  letterSpacing: number;
  waviness: number;
  waveFreq: number;
  contrast: number;
  roundness: number;
}

/** 각 파라미터의 허용 범위 + 기본값 (슬라이더 UI와 엔진 검증이 공유) */
export const PARAM_RANGES = {
  weight: { min: 100, max: 900, step: 10, default: 400 },
  slant: { min: -15, max: 0, step: 1, default: 0 },
  curvature: { min: 0, max: 1, step: 0.05, default: 0 },
  mono: { min: 0, max: 1, step: 0.05, default: 0 },
  cursive: { min: 0, max: 1, step: 0.05, default: 0 },
  weirdness: { min: 0, max: 100, step: 1, default: 0 },
  seed: { min: 0, max: 999999, step: 1, default: 1 },
  letterSpacing: { min: -0.05, max: 0.6, step: 0.01, default: 0 },
  waviness: { min: 0, max: 1, step: 0.05, default: 0 },
  waveFreq: { min: 0.5, max: 6, step: 0.5, default: 2 },
  contrast: { min: 0, max: 1, step: 0.05, default: 0 },
  roundness: { min: 0, max: 1, step: 0.05, default: 0 },
} as const;

/** 기본 파라미터 (각 범위의 default에서 유도) */
export const DEFAULT_PARAMS: FontParams = Object.fromEntries(
  (Object.keys(PARAM_RANGES) as Array<keyof FontParams>).map((k) => [k, PARAM_RANGES[k].default]),
) as unknown as FontParams;

/** 한글 script에서 의미 없는(숨길) 라틴/Recursive 전용 축 */
export const LATIN_ONLY_PARAMS: ReadonlyArray<keyof FontParams> = ["curvature", "mono", "cursive"];

/** 파라미터 값을 허용 범위로 강제 (프론트/엔진 공통 가드) */
export function clampParams(p: Partial<FontParams>): FontParams {
  const clamp = (v: number, min: number, max: number) =>
    Math.min(max, Math.max(min, Number.isFinite(v) ? v : 0));
  const out = {} as FontParams;
  (Object.keys(PARAM_RANGES) as Array<keyof FontParams>).forEach((k) => {
    const r = PARAM_RANGES[k];
    out[k] = clamp(p[k] ?? DEFAULT_PARAMS[k], r.min, r.max);
  });
  return out;
}

/**
 * 무드/감성 프리셋 — 여러 축을 묶은 큐레이션(프론트에서 적용 → params로 펼침).
 * 정형화(클린)는 "calm" + weirdness 0으로 충족.
 */
export interface StylePreset {
  id: string;
  label: string;
  params: Partial<FontParams>;
}

export const STYLE_PRESETS: StylePreset[] = [
  { id: "calm", label: "차분 단정", params: { weight: 420, slant: 0, curvature: 0.15, weirdness: 0, waviness: 0, contrast: 0.1, cursive: 0, mono: 0 } },
  { id: "playful", label: "발랄 장난기", params: { weight: 620, slant: -6, curvature: 0.85, weirdness: 22, waviness: 0.25, letterSpacing: 0.04 } },
  { id: "typewriter", label: "타자기", params: { weight: 460, slant: 0, curvature: 0, mono: 1, weirdness: 10, contrast: 0 } },
  { id: "geometric", label: "기하학", params: { weight: 560, slant: 0, curvature: 0, cursive: 0, roundness: 0.1, letterSpacing: 0.06 } },
  { id: "rough", label: "거친 손글씨", params: { weight: 540, slant: -10, curvature: 0.6, weirdness: 68, waviness: 0.15 } },
  { id: "elegant", label: "우아한 필기", params: { weight: 360, slant: -12, curvature: 0.5, cursive: 1, contrast: 0.5 } },
  { id: "bouncy", label: "통통 물결", params: { weight: 580, slant: 0, curvature: 0.7, waviness: 0.7, waveFreq: 3, roundness: 0.6 } },
  { id: "dreamy", label: "몽환", params: { weight: 320, slant: -8, curvature: 0.9, waviness: 0.45, waveFreq: 1.5, contrast: 0.3 } },
  { id: "sharp", label: "날카로움", params: { weight: 680, slant: -4, curvature: 0, contrast: 0.6, roundness: 0, letterSpacing: -0.02 } },
];

/** 출력 폰트 포맷. 프리뷰는 woff, 다운로드는 woff/woff2/ttf/otf 선택. */
export type FontFormat = "woff" | "woff2" | "ttf" | "otf";

/** 포맷별 MIME 타입과 파일 확장자 */
export const FONT_FORMATS: Record<FontFormat, { mime: string; ext: string }> = {
  woff: { mime: "font/woff", ext: "woff" },
  woff2: { mime: "font/woff2", ext: "woff2" },
  ttf: { mime: "font/ttf", ext: "ttf" },
  otf: { mime: "font/otf", ext: "otf" },
};

/** 무료 기본 포맷과 "풀포맷"(상업/내보내기) 구분 — 수익화 게이팅 기준점 */
export const FREE_FORMATS: FontFormat[] = ["woff", "ttf"];
export const FULL_FORMATS: FontFormat[] = ["woff", "woff2", "ttf", "otf"];

/**
 * [PREVIEW] 전용 스타일 — 벡터 폰트 파일에는 구울 수 없는 표면 효과.
 * 프리뷰 렌더와 PNG/이미지(스티커) 내보내기에만 적용하며 **엔진(/generate)에는 보내지 않는다.**
 * 사용자에게 "이미지 전용 효과 · 폰트 파일 미포함"으로 정직하게 고지할 것.
 */
export type PreviewTexture = "none" | "grain" | "paper" | "rough";
export type PreviewPattern = "none" | "stripe" | "dots" | "grid";

export interface PreviewStyle {
  texture: PreviewTexture;
  pattern: PreviewPattern;
  /** 글자 색 / 배경 색 (CSS color) */
  inkColor: string;
  bgColor: string;
}

export const DEFAULT_PREVIEW_STYLE: PreviewStyle = {
  texture: "none",
  pattern: "none",
  inkColor: "#2b2a33",
  bgColor: "transparent",
};

export const PREVIEW_TEXTURES: PreviewTexture[] = ["none", "grain", "paper", "rough"];
export const PREVIEW_PATTERNS: PreviewPattern[] = ["none", "stripe", "dots", "grid"];

/**
 * imagePng 업로드 상한(바이트). 프론트 BFF와 엔진 양쪽에서 동일하게 검증해
 * 거대 페이로드로 인한 메모리 고갈(무료 티어)을 막는다.
 */
export const MAX_IMAGE_PNG_BYTES = 2_000_000; // 2MB

/**
 * POST /generate 요청 바디. (PreviewStyle은 포함하지 않음 — 프리뷰/이미지 전용)
 * - script: 대상 문자체계(기본 latin).
 * - format: 출력 포맷(기본 woff).
 * - imagePng: 사용자가 그린 글씨(선택, 현재 변형 방식에서는 미사용 스케치).
 */
export interface GenerateRequest {
  params: FontParams;
  script?: FontScript;
  format?: FontFormat;
  imagePng?: string | null;
}

/** 엔진 /generate 응답. generatedBy=출처(정직성): 공개 가변폰트 변형. */
export interface GenerateResponse {
  fontBase64: string;
  format: FontFormat;
  script: FontScript;
  fontFamily: string;
  generatedBy: "baseFontVariation";
  appliedParams: FontParams;
}
