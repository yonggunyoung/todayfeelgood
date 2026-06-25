// 글꾸미 — 카오모지 조합 생성 엔진 테스트.
import { test } from "node:test";
import assert from "node:assert/strict";
import { assemble, countCombos, randomKaomoji, randomSel, PARTS } from "../js/engine/kaomoji-gen.js";

test("assemble — 팔[괄호 눈 입 눈]괄호[팔 효과", () => {
  // brackets[1]=("(",")"), eyes[0]="•", mouths[1]="ω", arms[1]=("ヽ","ノ"), effects[0]=""
  assert.equal(assemble({ bracket: 1, eye: 0, mouth: 1, arms: 1, effect: 0 }), "ヽ(•ω•)ノ");
});

test("mirror — 방향성 눈은 오른쪽이 대칭으로", () => {
  const eye = PARTS.eyes.indexOf("˃");
  const mouth = PARTS.mouths.indexOf("_");
  assert.equal(assemble({ bracket: 1, eye, mouth, arms: 0, effect: 0 }), "(˃_˂)");
});

test("countCombos — 수십만 가지 이상", () => {
  assert.ok(countCombos() > 100000, "10만 조합 이상");
});

test("randomKaomoji — 시드 결정론 + 안전 인덱스", () => {
  assert.equal(randomKaomoji(7), randomKaomoji(7));
  assert.ok(typeof randomKaomoji(123) === "string" && randomKaomoji(123).length > 0);
  // 인덱스 초과/음수도 래핑되어 throw 없음
  assert.ok(typeof assemble({ bracket: 999, eye: -5, mouth: 1000, arms: -1, effect: 50 }) === "string");
  const s = randomSel(42);
  assert.ok(s.bracket >= 0 && s.eye >= 0 && s.mouth >= 0);
});
