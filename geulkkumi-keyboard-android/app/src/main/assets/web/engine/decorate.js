/* 글꾸미 — decorate.js : 텍스트 꾸미기·혼합 코어 (순수·무 DOM).
 * 프레임(틀) 적용 · 글자 사이 기호 끼우기 · 글자별 감싸기 · 반복 장식.
 * 프레임 카탈로그 자체는 data/templates.js, 여기서는 '적용 함수'만.
 */
"use strict";

const PLACEHOLDER = "{}";

// 프레임 템플릿 적용: "✧ {} ✧" + "사랑" → "✧ 사랑 ✧"
export function applyFrame(template, text) {
  if (template == null) return String(text == null ? "" : text);
  const t = String(text == null ? "" : text);
  if (String(template).includes(PLACEHOLDER)) return String(template).split(PLACEHOLDER).join(t);
  return String(template) + t; // 플레이스홀더 없으면 접두 장식으로 간주
}

// 코드포인트 배열(서로게이트/이모지 보존).
function cps(s) { return Array.from(String(s == null ? "" : s)); }

// 글자 사이에 기호 끼우기: "사랑", "🌸" → "사🌸랑"
export function interleave(text, sep) {
  return cps(text).join(String(sep == null ? "" : sep));
}

// 글자별 좌우 감싸기: "AB", "[", "]" → "[A][B]"
export function wrapEach(text, left, right) {
  const l = String(left == null ? "" : left);
  const r = String(right == null ? "" : right);
  return cps(text).map((c) => l + c + r).join("");
}

// 글자별 결합문자/접미 덧붙이기(예: 별이 따라다니는 글씨): "AB","⃝" → "A⃝B⃝"
export function appendEach(text, mark) {
  const m = String(mark == null ? "" : mark);
  return cps(text).map((c) => c + m).join("");
}

// 양옆 반복 장식: "hi", "˚｡⋆", 2 → "˚｡⋆˚｡⋆ hi ˚｡⋆˚｡⋆"
export function padSides(text, ornament, times) {
  const n = Math.max(0, Math.min(20, times | 0));
  const orn = String(ornament == null ? "" : ornament).repeat(n);
  const t = String(text == null ? "" : text);
  return orn ? `${orn} ${t} ${orn}` : t;
}

// 혼합: 폰트 변환 결과(styled) 위에 프레임/끼우기/감싸기를 단계적으로 적용.
// opts: { frame, interleaveSep, wrap:[l,r], appendMark, pad:[orn,times] }
export function mix(styledText, opts) {
  opts = opts || {};
  let out = String(styledText == null ? "" : styledText);
  if (opts.wrap) out = wrapEach(out, opts.wrap[0], opts.wrap[1]);
  if (opts.interleaveSep) out = interleave(out, opts.interleaveSep);
  if (opts.appendMark) out = appendEach(out, opts.appendMark);
  if (opts.pad) out = padSides(out, opts.pad[0], opts.pad[1]);
  if (opts.frame) out = applyFrame(opts.frame, out);
  return out;
}
