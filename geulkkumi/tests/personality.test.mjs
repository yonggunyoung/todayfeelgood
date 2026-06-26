// 글꾸미 — 멋글씨 개성기능(믹스체·꾸미기 자판기) 테스트.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mixStyle, convert } from "../js/engine/unicode-fonts.js";
import { randomDecorate } from "../js/engine/decorate.js";

test("mixStyle — 같은 시드는 같은 결과(결정론적), 다른 시드는 보통 다름", () => {
  const a = mixStyle("hello", 7);
  const b = mixStyle("hello", 7);
  assert.equal(a, b);
  const c = mixStyle("hello", 8);
  assert.notEqual(a, c); // 충돌 확률 매우 낮음
});

test("mixStyle — 글자수(코드포인트) 보존 · 공백/줄바꿈 유지", () => {
  const out = mixStyle("ab cd", 3);
  assert.equal(Array.from(out).length, 5);  // a b ' ' c d → 5 코드포인트
  assert.equal(out.includes(" "), true);
  assert.equal(mixStyle("a\nb", 3).includes("\n"), true);
});

test("mixStyle — 매핑 안 되는 문자(한글)는 원형 유지", () => {
  assert.equal(mixStyle("가나", 5), "가나");
});

test("mixStyle — null/빈값 안전", () => {
  assert.equal(mixStyle(null, 1), "");
  assert.equal(mixStyle("", 1), "");
});

test("randomDecorate — 시드 결정론적 · 프레임/사이기호 적용", () => {
  const frames = ["♡ {} ♡", "✧ {} ✧", "꒰ {} ꒱"];
  const seps = ["·", "♡"];
  const a = randomDecorate("hi", 2, { frames, seps });
  const b = randomDecorate("hi", 2, { frames, seps });
  assert.equal(a, b);
  // 프레임 + 사이기호가 실제로 적용됐는지(원문보다 길어짐)
  assert.equal(a.length > 2, true);
});

test("randomDecorate — 카탈로그 없으면 원문 유지", () => {
  assert.equal(randomDecorate("hi", 1, {}), "hi");
  assert.equal(randomDecorate(null, 1, { frames: ["♡{}♡"] }), "♡♡");
});

test("믹스체+자판기 합성 — convert와 함께 쓰기(깨짐 없는 합성)", () => {
  const styled = convert("nick", "bold");
  const out = randomDecorate(styled, 9, { frames: ["⋆ {} ⋆"], seps: [""] });
  assert.equal(out.startsWith("⋆ "), true);
  assert.equal(out.endsWith(" ⋆"), true);
});
