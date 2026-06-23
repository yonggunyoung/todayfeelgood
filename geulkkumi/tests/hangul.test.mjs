// 글꾸미 — hangul 한글 코어 테스트(자모 분해/초성/데코).
import { test } from "node:test";
import assert from "node:assert/strict";
import { decompose, decomposeSyllable, chosung, deco, isSyllable } from "../js/engine/hangul.js";

test("decomposeSyllable — 초/중/종", () => {
  assert.deepEqual(decomposeSyllable("안"), ["ㅇ", "ㅏ", "ㄴ"]);
  assert.deepEqual(decomposeSyllable("가"), ["ㄱ", "ㅏ", ""]); // 받침 없음
  assert.deepEqual(decomposeSyllable("A"), ["A", "", ""]);     // 비한글
});

test("decompose — 자모 흩뿌리기", () => {
  assert.equal(decompose("안녕"), "ㅇㅏㄴㄴㅕㅇ");
  assert.equal(decompose("아야", "/"), "ㅇㅏ/ㅇㅑ");
  assert.equal(decompose("A안"), "Aㅇㅏㄴ");
});

test("chosung — 초성체", () => {
  assert.equal(chosung("안녕하세요"), "ㅇㄴㅎㅅㅇ");
  assert.equal(chosung("AB안"), "ABㅇ");
});

test("deco — 음절 사이 기호", () => {
  assert.equal(deco("사랑", "🌸"), "사🌸랑");
  assert.equal(deco("", "x"), "");
});

test("isSyllable / 변조 안전", () => {
  assert.equal(isSyllable("한"), true);
  assert.equal(isSyllable("a"), false);
  assert.equal(decompose(null), "");
  assert.equal(chosung(undefined), "");
});
