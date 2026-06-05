/**
 * 키트 무드 프리셋 + 프리셋 키트 템플릿.
 * 폰트 파라미터는 packages/core의 STYLE_PRESETS/DEFAULT_PARAMS를 재사용한다(단일 출처).
 * 권고안(idea-combiner.md)의 "프리셋 키트 템플릿"을 데이터로 둬 코드 수정 없이 확장 가능하게.
 */

import {
  DEFAULT_PARAMS,
  STYLE_PRESETS,
  clampParams,
  type FontParams,
  type FontScript,
} from "@webapp/core";

/** 무드 프리셋 id → 합쳐진 FontParams (core STYLE_PRESETS를 펼침) */
export function paramsForMood(moodId: string): FontParams {
  const preset = STYLE_PRESETS.find((p) => p.id === moodId);
  return clampParams({ ...DEFAULT_PARAMS, ...(preset?.params ?? {}) });
}

/** UI에 노출할 무드 프리셋 목록(core에서 그대로 가져옴) */
export const MOOD_PRESETS = STYLE_PRESETS.map((p) => ({ id: p.id, label: p.label }));

/** 프리셋 키트 템플릿 — 폰트 무드 + 어울리는 악센트 색 묶음(1탭 빠른 시작) */
export interface KitTemplate {
  id: string;
  label: string;
  desc: string;
  moodId: string;
  accent: string;
  script: FontScript;
}

export const KIT_TEMPLATES: KitTemplate[] = [
  {
    id: "cafe",
    label: "카페 간판 키트",
    desc: "둥글고 따뜻한 글씨 + 감빛 톤",
    moodId: "bouncy",
    accent: "#c0492b",
    script: "latin",
  },
  {
    id: "wedding",
    label: "청첩장 키트",
    desc: "우아한 필기 + 차분한 자두",
    moodId: "elegant",
    accent: "#b65a6e",
    script: "latin",
  },
  {
    id: "seller",
    label: "인스타 셀러 키트",
    desc: "발랄한 글씨 + 산뜻한 코랄",
    moodId: "playful",
    accent: "#ef7a52",
    script: "latin",
  },
  {
    id: "studio",
    label: "스튜디오 키트",
    desc: "기하학적 글씨 + 민트",
    moodId: "geometric",
    accent: "#46b39a",
    script: "latin",
  },
  {
    id: "card",
    label: "명함 키트",
    desc: "단정한 글씨 + 먹빛 모노톤",
    moodId: "elegant",
    accent: "#3a3742",
    script: "latin",
  },
  {
    id: "youtube",
    label: "유튜브 썸네일 키트",
    desc: "튼튼한 글씨 + 쨍한 버터옐로",
    moodId: "bouncy",
    accent: "#f5c451",
    script: "latin",
  },
];
