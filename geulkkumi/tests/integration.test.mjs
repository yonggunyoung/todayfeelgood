// 글꾸미 — 통합/무결성 테스트: 임포트 그래프가 살아있고 DB가 충분한지 가드.
// (뷰 모듈은 top-level에서 DOM을 만지지 않으므로 node에서 import만 해도 안전 — mount는 호출 안 함)
import { test } from "node:test";
import assert from "node:assert/strict";

import fonts from "../js/views/fonts.js";
import photo from "../js/views/photo.js";
import draw from "../js/views/draw.js";
import library from "../js/views/library.js";
import saved from "../js/views/saved.js";

import { allSymbolItems, SYMBOLS } from "../js/data/symbols.js";
import { allKaomoji, KAOMOJI } from "../js/data/kaomoji.js";
import { FRAMES, DECO_LINES, BLOCKS, renderTemplate } from "../js/data/templates.js";
import { RAMPS, EMOJI_PALETTES, ART_MODES } from "../js/data/ramps.js";
import { convertAll } from "../js/engine/unicode-fonts.js";

test("뷰 모듈 5종 — 임포트 + 인터페이스(id/label/mount)", () => {
  for (const v of [fonts, photo, draw, library, saved]) {
    assert.equal(typeof v.id, "string");
    assert.equal(typeof v.label, "string");
    assert.equal(typeof v.mount, "function");
  }
  assert.deepEqual([fonts, photo, draw, library, saved].map((v) => v.id),
    ["fonts", "photo", "draw", "library", "saved"]);
});

test("DB 규모 — '엄청난 DB'가 실제로 채워져 있음", () => {
  assert.ok(allSymbolItems().length > 300, "특수문자 300+");
  assert.ok(allKaomoji().length > 200, "카오모지 200+");
  assert.ok(SYMBOLS.length >= 18 && KAOMOJI.length >= 15);
  assert.ok(FRAMES.length >= 20 && DECO_LINES.length >= 18 && BLOCKS.length >= 14);
  assert.ok(RAMPS.length >= 6 && EMOJI_PALETTES.length >= 5 && ART_MODES.length === 5);
});

test("텍대 블록 무결성 — 모든 블록에 {} 자리 존재(사다리 버그 회귀 방지)", () => {
  for (const b of BLOCKS) {
    assert.ok(b.tpl.includes("{}"), `블록 '${b.id}'에 {} 없음`);
    assert.ok(renderTemplate(b.tpl, "x").includes("x"), `블록 '${b.id}' 치환 실패`);
  }
});

test("멋글씨 스타일 수 + 결과 일관성(tier 포함)", () => {
  const all = convertAll("Aa1");
  assert.ok(all.length >= 30);
  assert.ok(all.every((s) => typeof s.result === "string" && "risk" in s && "tier" in s));
  assert.ok(all.some((s) => s.tier === 1) && all.some((s) => s.tier >= 2));
});
