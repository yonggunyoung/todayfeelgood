// 그림공장 — 프롬프트 빌더 엔진 (순수 함수, DOM/AI/네트워크 비의존 → node 테스트 가능)
// 사용자의 "선택(스타일/분위기/구도/색감/부스터/주제)"을 결정형으로 이미지 모델용 프롬프트로 조립한다.
// 변동비 0원 코어: AI 호출 없이도 항상 동작하며, AI 보강은 이 결과를 한 번 더 다듬는 선택 단계다.

import { STYLE_KINDS, MOODS, SHOTS, PALETTES, BOOSTERS, byId } from './styles-data.js';

/**
 * 선택값 → 최종 프롬프트 문자열(영문 위주).
 * @param {object} sel
 *   sel.subject   {string}  주제(필수, 한글 가능)
 *   sel.styleKind {string}  STYLE_KINDS id
 *   sel.mood      {string}  MOODS id
 *   sel.shot      {string}  SHOTS id
 *   sel.palette   {string}  PALETTES id
 *   sel.boosters  {string[]} BOOSTERS id 배열
 *   sel.extra     {string}  자유 추가 문구
 * @returns {string}
 */
export function buildPrompt(sel = {}) {
  const subject = (sel.subject || '').trim();
  const parts = [];
  if (subject) parts.push(subject);

  const push = (list, id) => { const it = byId(list, id); if (it) parts.push(it.en); };
  push(STYLE_KINDS, sel.styleKind);
  push(SHOTS, sel.shot);
  push(MOODS, sel.mood);
  push(PALETTES, sel.palette);

  (sel.boosters || []).forEach((id) => push(BOOSTERS, id));

  const extra = (sel.extra || '').trim();
  if (extra) parts.push(extra);

  // 중복 조각 제거 + 빈 값 제거 후 쉼표 결합
  const seen = new Set();
  const clean = parts
    .map((p) => p.trim())
    .filter((p) => p && !seen.has(p.toLowerCase()) && seen.add(p.toLowerCase()));
  return clean.join(', ');
}

/**
 * 배치에서 N장을 만들 때 살짝씩 다르게(다양성) — 같은 프롬프트라도 미세 변형 접미사를 붙인다.
 * 시드를 지원하는 제공자는 시드로 다양성을 주지만, 시드 미지원/그래도 다양화를 원할 때 사용.
 * @param {string} prompt 기본 프롬프트
 * @param {number} index  0-based 인덱스
 * @param {boolean} vary  다양화 켜짐 여부
 */
export function variantPrompt(prompt, index, vary) {
  if (!vary || index === 0) return prompt;
  const ANGLES = [
    'alternate composition', 'different angle', 'fresh variation', 'new perspective',
    'distinct framing', 'unique take', 'another interpretation', 'varied lighting',
  ];
  return `${prompt}, ${ANGLES[(index - 1) % ANGLES.length]}`;
}

/**
 * AI 프롬프트 보강에 쓸 지시문 — 텍스트 모델에게 "사용자 의도 + 선택"을 풍부한 영문 프롬프트로 확장하게 한다.
 * 번역 옵션이 켜지면 한글 주제를 영어로 옮기도록 명시.
 */
export function enrichInstruction(basePrompt, { translate = true } = {}) {
  return [
    'You are an expert prompt engineer for text-to-image models (DALL·E, Imagen, Midjourney).',
    'Rewrite the following draft into ONE vivid, concrete, comma-separated English image prompt.',
    'Keep the user\'s subject and chosen style. Add tasteful detail about composition, lighting, materials and mood.',
    'Do NOT add quotes, markdown, headings, or any commentary — output ONLY the final prompt on a single line.',
    translate ? 'If any part is not in English, translate it to natural English.' : '',
    '',
    `DRAFT: ${basePrompt}`,
  ].filter(Boolean).join('\n');
}

// 모델에 따라 너무 긴 프롬프트는 잘라준다(대략적 안전장치).
export function clampPrompt(prompt, max = 3800) {
  if (prompt.length <= max) return prompt;
  return prompt.slice(0, max).replace(/,[^,]*$/, '');
}
