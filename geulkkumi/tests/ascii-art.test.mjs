// 글꾸미 — ascii-art 변환 코어 테스트 (밝기/브라유/ASCII/이모지/ImageData).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  toBrightness, toAscii, toBraille, toHalfBlocks, toEmoji, render, imageDataToLum,
} from "../js/engine/ascii-art.js";

const black2x4 = { w: 2, h: 4, data: new Array(8).fill(0) };
const white2x4 = { w: 2, h: 4, data: new Array(8).fill(255) };

test("브라유 — 검정 전체=점 꽉 참(⣿), 흰색 전체=빈 셀(⠀)", () => {
  assert.equal(toBraille(toBrightness(black2x4, {}), {}), String.fromCodePoint(0x28FF));
  assert.equal(toBraille(toBrightness(white2x4, {}), {}), String.fromCodePoint(0x2800));
});

test("ASCII 램프 — 어두움→앞 글자, 밝음→뒤 글자", () => {
  assert.equal(toAscii(toBrightness({ w: 1, h: 1, data: [0] }, {}), "@ "), "@");
  assert.equal(toAscii(toBrightness({ w: 1, h: 1, data: [255] }, {}), "@ "), " ");
});

test("invert — 밝기 반전", () => {
  assert.equal(toAscii(toBrightness({ w: 1, h: 1, data: [0] }, { invert: true }), "@ "), " ");
});

test("하프블록 — 위만 잉크=▀, 아래만=▄, 둘 다=█", () => {
  const topOnly = { w: 1, h: 2, data: [0, 255] };
  const botOnly = { w: 1, h: 2, data: [255, 0] };
  const both = { w: 1, h: 2, data: [0, 0] };
  assert.equal(toHalfBlocks(toBrightness(topOnly, {}), {}), "▀");
  assert.equal(toHalfBlocks(toBrightness(botOnly, {}), {}), "▄");
  assert.equal(toHalfBlocks(toBrightness(both, {}), {}), "█");
});

test("이모지 — 어두움→팔레트 앞, 밝음→뒤", () => {
  assert.equal(toEmoji(toBrightness({ w: 1, h: 1, data: [0] }, {}), ["⬛", "⬜"]), "⬛");
  assert.equal(toEmoji(toBrightness({ w: 1, h: 1, data: [255] }, {}), ["⬛", "⬜"]), "⬜");
});

test("render 디스패처 — mode별 동일 결과", () => {
  assert.equal(render(black2x4, { mode: "braille" }), String.fromCodePoint(0x28FF));
  assert.equal(render({ w: 1, h: 1, data: [0] }, { mode: "ascii", ramp: "@ " }), "@");
});

test("imageDataToLum — 흑/백/투명(흰 배경 합성)", () => {
  assert.equal(imageDataToLum({ width: 1, height: 1, data: [0, 0, 0, 255] }).data[0], 0);
  assert.equal(imageDataToLum({ width: 1, height: 1, data: [255, 255, 255, 255] }).data[0], 255);
  assert.equal(imageDataToLum({ width: 1, height: 1, data: [0, 0, 0, 0] }).data[0], 255); // 투명→흰색
});

test("멀티라인 — 행 사이 개행", () => {
  const out = toAscii(toBrightness({ w: 1, h: 2, data: [0, 255] }, {}), "@ ");
  assert.equal(out, "@\n ");
});
