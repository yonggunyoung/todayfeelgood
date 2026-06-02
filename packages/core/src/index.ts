/**
 * 공용 타입/상수 — 프론트엔드와 폰트 엔진이 공유하는 "계약(contract)".
 * 엔진(Python)과 프론트(TS)가 같은 파라미터 스펙을 쓰도록 단일 출처로 둔다.
 * Python 쪽은 이 파일을 직접 import하지 않으므로, 값이 바뀌면 양쪽을 함께 갱신할 것.
 */

/** Phase 1 타깃 문자셋: 라틴 소문자/대문자/숫자 */
export const TARGET_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/**
 * 폰트 생성 파라미터.
 * Phase 1 "전통(비AI) 방식" = 기본 가변폰트를 이 축들로 변형한다.
 * - weight: 굵기 (CSS/가변폰트 wght 축, 100~900)
 * - slant:  기울기 (가변폰트 slnt 축, 음수=오른쪽 기울임, deg)
 * - curvature: 곡률/둥글기 (0=각짐 ~ 1=둥글게). 엔진이 가능한 범위에서 근사 적용.
 */
export interface FontParams {
  weight: number;
  slant: number;
  curvature: number;
}

/** 각 파라미터의 허용 범위 + 기본값 (슬라이더 UI와 엔진 검증이 공유) */
export const PARAM_RANGES = {
  weight: { min: 100, max: 900, step: 10, default: 400 },
  slant: { min: -15, max: 0, step: 1, default: 0 },
  curvature: { min: 0, max: 1, step: 0.05, default: 0 },
} as const;

export const DEFAULT_PARAMS: FontParams = {
  weight: PARAM_RANGES.weight.default,
  slant: PARAM_RANGES.slant.default,
  curvature: PARAM_RANGES.curvature.default,
};

/** 파라미터 값을 허용 범위로 강제 (프론트/엔진 공통 가드) */
export function clampParams(p: Partial<FontParams>): FontParams {
  const clamp = (v: number, min: number, max: number) =>
    Math.min(max, Math.max(min, Number.isFinite(v) ? v : 0));
  return {
    weight: clamp(p.weight ?? DEFAULT_PARAMS.weight, PARAM_RANGES.weight.min, PARAM_RANGES.weight.max),
    slant: clamp(p.slant ?? DEFAULT_PARAMS.slant, PARAM_RANGES.slant.min, PARAM_RANGES.slant.max),
    curvature: clamp(p.curvature ?? DEFAULT_PARAMS.curvature, PARAM_RANGES.curvature.min, PARAM_RANGES.curvature.max),
  };
}

/**
 * POST /generate 요청 바디.
 * imagePng: 사용자가 그린 글씨(선택). Phase 1 전통 방식에서는 스타일 참고용으로만 쓰거나 생략 가능.
 */
export interface GenerateRequest {
  params: FontParams;
  imagePng?: string | null; // data URL 또는 base64 (선택)
}

/** 엔진 /generate 응답: WOFF 폰트(base64) + 메타 */
export interface GenerateResponse {
  fontWoffBase64: string;
  fontFamily: string;
  generatedBy: "traditional";
  appliedParams: FontParams;
}
