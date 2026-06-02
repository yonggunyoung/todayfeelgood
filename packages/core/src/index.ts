/**
 * 공용 타입/상수 — 프론트엔드와 폰트 엔진이 공유하는 "계약(contract)".
 * 엔진(Python)과 프론트(TS)가 같은 파라미터 스펙을 쓰도록 단일 출처로 둔다.
 * Python 쪽은 이 파일을 직접 import하지 않으므로, 값이 바뀌면 양쪽을 함께 갱신할 것.
 *
 * v3: 스타일 다양화(mono/cursive/weirdness/seed/letterSpacing) + 한글(script) 추가.
 */

/** 생성 대상 문자 체계. latin=Recursive 변형, hangul=OFL 한글 가변폰트 변형. */
export type FontScript = "latin" | "hangul";

/** 라틴 타깃 문자셋 (a-z, A-Z, 0-9) */
export const TARGET_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/**
 * 폰트 생성 파라미터 (전통/비AI 방식 = 기본 가변폰트 변형 + 절차적 펜 디스토션).
 *
 * - weight:     굵기. UI는 100~900(친숙한 CSS 스케일)로 받고, **엔진이 베이스 폰트의
 *               실제 wght 축 범위(예: Recursive 300~1000)로 선형 매핑**한다. (v2 버그 정정)
 * - slant:      기울기(deg, 음수=오른쪽). 축이 있으면 축으로, 없으면(한글 등) 합성 shear.
 * - curvature:  곡률/둥글기 0~1. (라틴/Recursive CASL 전용 — 한글에선 무시/숨김)
 * - mono:       모노스페이스 정도 0~1. (라틴/Recursive MONO 전용)
 * - cursive:    필기체 전환 0~1. (라틴/Recursive CRSV 전용 — a/g/l 형태 변화)
 * - weirdness:  괴상함 0~100. 시드 기반 펜 디스토션(지터+베이스라인 흔들림). 0=단정.
 * - seed:       weirdness 재현용 정수(>=0). 같은 seed=같은 결과(주사위 버튼이 갱신).
 * - letterSpacing: 자간(em). 음수=좁게.
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
} as const;

export const DEFAULT_PARAMS: FontParams = {
  weight: PARAM_RANGES.weight.default,
  slant: PARAM_RANGES.slant.default,
  curvature: PARAM_RANGES.curvature.default,
  mono: PARAM_RANGES.mono.default,
  cursive: PARAM_RANGES.cursive.default,
  weirdness: PARAM_RANGES.weirdness.default,
  seed: PARAM_RANGES.seed.default,
  letterSpacing: PARAM_RANGES.letterSpacing.default,
};

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
 * 무드 프리셋 — 여러 축을 묶은 큐레이션(프론트에서 적용 → params로 펼침).
 * 정형화(클린)는 "calm" + weirdness 0으로 충족.
 */
export interface StylePreset {
  id: string;
  label: string;
  params: Partial<FontParams>;
}

export const STYLE_PRESETS: StylePreset[] = [
  { id: "calm", label: "차분 단정", params: { weight: 420, slant: 0, curvature: 0.15, weirdness: 0, cursive: 0, mono: 0 } },
  { id: "playful", label: "장난기", params: { weight: 620, slant: -6, curvature: 0.85, weirdness: 22, letterSpacing: 0.04 } },
  { id: "typewriter", label: "타자기", params: { weight: 460, slant: 0, curvature: 0, mono: 1, weirdness: 10 } },
  { id: "geometric", label: "기하학", params: { weight: 560, slant: 0, curvature: 0, cursive: 0, letterSpacing: 0.06 } },
  { id: "rough", label: "거친 손글씨", params: { weight: 540, slant: -10, curvature: 0.6, weirdness: 68 } },
  { id: "elegant", label: "우아한 필기", params: { weight: 360, slant: -12, curvature: 0.5, cursive: 1 } },
];

/** 출력 폰트 포맷. 프리뷰는 woff, 다운로드는 woff/ttf 선택. */
export type FontFormat = "woff" | "ttf";

/** 포맷별 MIME 타입과 파일 확장자 */
export const FONT_FORMATS: Record<FontFormat, { mime: string; ext: string }> = {
  woff: { mime: "font/woff", ext: "woff" },
  ttf: { mime: "font/ttf", ext: "ttf" },
};

/**
 * imagePng 업로드 상한(바이트). 프론트 BFF와 엔진 양쪽에서 동일하게 검증해
 * 거대 페이로드로 인한 메모리 고갈(무료 티어)을 막는다.
 */
export const MAX_IMAGE_PNG_BYTES = 2_000_000; // 2MB

/**
 * POST /generate 요청 바디.
 * - script: 대상 문자체계(기본 latin). hangul이면 엔진이 한글 베이스폰트 사용.
 * - format: 출력 포맷(기본 woff).
 * - imagePng: 사용자가 그린 글씨(선택). Phase 1~2 변형 방식에서는 미사용(스케치).
 *   슬라이더 자동 프리뷰 호출에는 보내지 말 것.
 */
export interface GenerateRequest {
  params: FontParams;
  script?: FontScript;
  format?: FontFormat;
  imagePng?: string | null;
}

/**
 * 엔진 /generate 응답.
 * generatedBy: 결과물 출처(정직성). 현재는 공개 가변폰트 변형.
 */
export interface GenerateResponse {
  fontBase64: string;
  format: FontFormat;
  script: FontScript;
  fontFamily: string;
  generatedBy: "baseFontVariation";
  appliedParams: FontParams;
}
