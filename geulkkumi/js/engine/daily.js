/* 글꾸미 — daily.js : '오늘의 글꾸밈' 날짜 시드 일일 추천 (순수·무 DOM).
 * 같은 날짜엔 모두 같은 추천이 뜬다(결정론적) → "오늘 거 봤어?" 재방문·공유 훅.
 * Date 접근은 뷰에서 — 여기는 dateStr("YYYY-MM-DD")을 받는 순수 함수만.
 */
"use strict";

import { randomKaomoji } from "./kaomoji-gen.js";
import { NICK_PRESETS } from "../data/presets.js";
import { DECO_LINES } from "../data/templates.js";

// 문자열 → 32bit 시드(FNV-1a 축약).
export function dateSeed(dateStr) {
  const s = String(dateStr == null ? "" : dateStr);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 0x01000193) >>> 0; }
  return h >>> 0;
}

function lcg(seed) { let s = (seed >>> 0) || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

/** 오늘의 추천 세트: 카오모지 1 + 닉 프리셋 1 + 구분선 1. */
export function dailyPicks(dateStr) {
  const seed = dateSeed(dateStr);
  const rnd = lcg(seed);
  return {
    seed,
    kaomoji: randomKaomoji(seed),
    preset: NICK_PRESETS[Math.floor(rnd() * NICK_PRESETS.length)],
    line: DECO_LINES[Math.floor(rnd() * DECO_LINES.length)],
  };
}
