/* 글꾸미 — kaomoji-gen.js : 카오모지 '조합 생성' 코어 (순수·무 DOM).
 * 부품(괄호·눈·입·팔·효과)을 조합해 수십만 가지 카오모지를 만들어낸다. 다 저장하지 않는 구조.
 * 결정론적(시드 RNG) → tests/kaomoji-gen.test.mjs 검증.
 */
"use strict";
import { KAOMOJI_PARTS as P } from "../data/kaomoji-parts.js";

const at = (arr, i) => arr[((i % arr.length) + arr.length) % arr.length]; // 안전 인덱스

// 선택(부품 인덱스 모음) → 카오모지 문자열. 팔[외] 괄호[ 눈 입 눈 ]괄호 팔[외] 효과.
export function assemble(sel) {
  sel = sel || {};
  const b = at(P.brackets, sel.bracket | 0);
  const eL = at(P.eyes, sel.eye | 0);
  const eR = P.mirror[eL] || eL;
  const m = at(P.mouths, sel.mouth | 0);
  const a = at(P.arms, sel.arms | 0);
  const fx = at(P.effects, sel.effect | 0);
  return a[0] + b[0] + eL + m + eR + b[1] + a[1] + fx;
}

export function countCombos() {
  return P.brackets.length * P.eyes.length * P.mouths.length * P.arms.length * P.effects.length;
}

// 시드 기반 결정론 RNG(엔진은 Math.random 비사용 — 테스트 안정).
function lcg(seed) {
  let s = (seed >>> 0) || 1;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}
export function randomSel(seed) {
  const r = lcg(seed), i = (n) => Math.floor(r() * n);
  return {
    bracket: i(P.brackets.length), eye: i(P.eyes.length), mouth: i(P.mouths.length),
    arms: i(P.arms.length), effect: i(P.effects.length),
  };
}
export function randomKaomoji(seed) { return assemble(randomSel(seed)); }

export const PARTS = P;
