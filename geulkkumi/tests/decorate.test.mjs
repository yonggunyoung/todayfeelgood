// 글꾸미 — decorate 꾸미기/혼합 코어 테스트.
import { test } from "node:test";
import assert from "node:assert/strict";
import { applyFrame, interleave, wrapEach, appendEach, padSides, mix } from "../js/engine/decorate.js";

test("applyFrame — 플레이스홀더 치환 / 없으면 접두", () => {
  assert.equal(applyFrame("✧ {} ✧", "hi"), "✧ hi ✧");
  assert.equal(applyFrame("꒰ {} ꒱", "사랑"), "꒰ 사랑 ꒱");
  assert.equal(applyFrame("★", "hi"), "★hi"); // {} 없으면 접두 장식
});

test("interleave / wrapEach / appendEach", () => {
  assert.equal(interleave("abc", "-"), "a-b-c");
  assert.equal(interleave("😀a", "·"), "😀·a"); // 이모지 보존
  assert.equal(wrapEach("ab", "[", "]"), "[a][b]");
  assert.equal(appendEach("ab", "*"), "a*b*");
});

test("padSides — 양옆 반복(상한 20)", () => {
  assert.equal(padSides("hi", "*", 2), "** hi **");
  assert.equal(padSides("hi", "*", 0), "hi");
  assert.equal(padSides("hi", "*", 999).startsWith("*".repeat(20)), true);
});

test("mix — 단계 합성(wrap→interleave→append→pad→frame)", () => {
  assert.equal(mix("hi", { frame: "♡ {} ♡" }), "♡ hi ♡");
  assert.equal(mix("ab", { interleaveSep: "-", frame: "[{}]" }), "[a-b]");
  assert.equal(mix("ab", { wrap: ["(", ")"] }), "(a)(b)");
  assert.equal(mix("x", {}), "x");
});

test("변조 — null/undefined 안전", () => {
  assert.equal(applyFrame(null, "x"), "x");
  assert.equal(interleave(null, "-"), "");
  assert.equal(mix(null, { frame: "♡{}♡" }), "♡♡");
});
