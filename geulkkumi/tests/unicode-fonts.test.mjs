// 글꾸미 — unicode-fonts 변환 코어 경계 테스트 (정상/예외표/미매핑/변조).
import { test } from "node:test";
import assert from "node:assert/strict";
import { convert, convertAll, STYLES, styleName } from "../js/engine/unicode-fonts.js";

test("수학 알파벳 범위 매핑(볼드/더블스트럭/전각)", () => {
  assert.equal(convert("A", "bold"), String.fromCodePoint(0x1D400));
  assert.equal(convert("a", "bold"), String.fromCodePoint(0x1D41A));
  assert.equal(convert("0", "bold"), String.fromCodePoint(0x1D7CE));
  assert.equal(convert("0", "doublestruck"), String.fromCodePoint(0x1D7D8));
  assert.equal(convert("A", "fullwidth"), "Ａ");
});

test("Letterlike 예외표(스크립트/프락투어/더블스트럭/이탤릭 h)", () => {
  assert.equal(convert("B", "script"), "ℬ");
  assert.equal(convert("A", "script"), String.fromCodePoint(0x1D49C));
  assert.equal(convert("C", "fraktur"), "ℭ");
  assert.equal(convert("R", "doublestruck"), "ℝ");
  assert.equal(convert("h", "italic"), "ℎ"); // U+210E (수학 이탤릭 h 자리 메움)
});

test("원/숫자 매핑(동그라미·괄호)", () => {
  assert.equal(convert("A", "circled"), "Ⓐ");
  assert.equal(convert("1", "circled"), "①");
  assert.equal(convert("0", "circled"), "⓪");
  assert.equal(convert("1", "circledneg"), "❶");
});

test("커스텀 맵(작은대문자) + 뒤집기(매핑 후 역순)", () => {
  assert.equal(convert("abc", "smallcaps"), "ᴀʙᴄ");
  assert.equal(convert("ab", "upsidedown"), "qɐ"); // a→ɐ b→q, 역순 → qɐ
});

test("결합문자 스타일(취소선) — 코드포인트마다 마크 부착", () => {
  assert.equal(convert("A", "strike"), "A̶");
  assert.equal(convert("AB", "underline"), "A̲B̲");
});

test("미매핑/변조 입력 — 안전 폴백", () => {
  assert.equal(convert("한", "bold"), "한");      // 한글은 원형 유지
  assert.equal(convert("x", "없는스타일"), "x");   // 미지정 스타일 → 원형
  assert.equal(convert(null, "bold"), "");          // null → ""
  assert.equal(convert(undefined, "bold"), "");
  assert.equal(convert(123, "bold"), convert("123", "bold")); // 비문자 → 문자화
});

test("convertAll — 모든 스타일 결과 + styleName", () => {
  const all = convertAll("Hi");
  assert.equal(all.length, STYLES.length);
  assert.ok(all.every((s) => typeof s.result === "string" && s.name && s.id));
  assert.equal(styleName("bold"), "볼드");
  assert.equal(styleName("nope"), "nope");
});

test("호환성 플래그(risk) + 전각 공백(U+3000)", () => {
  const all = convertAll("Ab");
  assert.equal(all.find((s) => s.id === "fraktur").risk, true);
  assert.equal(all.find((s) => s.id === "bold").risk, false);
  assert.equal(convert("A B", "fullwidth"), "Ａ　Ｂ"); // 전각 A + 전각 공백 + 전각 B
});
