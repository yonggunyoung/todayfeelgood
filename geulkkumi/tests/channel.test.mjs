// 글꾸미 — channel 채널 호환/깨짐 진단 코어 테스트.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classify, codeBlock, needsCodeBlock, compatBadge, widthWarning, channelTips,
} from "../js/engine/channel.js";

test("classify — 이모지 그림은 emoji", () => {
  const c = classify("🟥🟥🟥\n🟥⬜🟥\n🟥🟥🟥");
  assert.equal(c.kind, "emoji");
  assert.equal(c.multiline, true);
  assert.equal(c.lineCount, 3);
  assert.equal(c.emojiCells, 3);
});

test("classify — 박스/브라유/빗금 도트는 mono", () => {
  assert.equal(classify(" /\\_/\\\n( o.o )\n > ^ <").kind, "mono"); // 고양이(빗금/공백)
  assert.equal(classify("⠿⠿⠿\n⠿⠿⠿").kind, "mono");               // 브라유
  assert.equal(classify("┌──┐\n│hi│\n└──┘").kind, "mono");        // 박스드로잉
  // ★ ✦ 는 픽토그래프가 아니라 정렬 의존 → 여러 줄이면 mono
  assert.equal(classify("  ★\n ★★★").kind, "mono");
});

test("classify — 한 줄 일반/멋글씨는 plain, 서로게이트 멋글씨 감지", () => {
  assert.equal(classify("안녕하세요").kind, "plain");
  const c = classify("𝓯𝓪𝓷𝓬𝔂"); // 수학 알파벳(서로게이트) 멋글씨
  assert.equal(c.kind, "plain");
  assert.equal(c.astralFont, true);
  assert.equal(c.emoji, 0);
});

test("classify — 결합문자(지옥체) 감지", () => {
  const c = classify("á̴b̖");
  assert.equal(c.hasCombining, true);
});

test("codeBlock — 삼중 백틱으로 감싸고, 본문에 백틱 있으면 더 긴 펜스", () => {
  assert.equal(codeBlock("art"), "```\nart\n```");
  const wrapped = codeBlock("a ``` b");
  assert.equal(wrapped.startsWith("````\n"), true); // 충돌 회피로 4중
  assert.equal(wrapped.endsWith("\n````"), true);
});

test("needsCodeBlock — mono만 true", () => {
  assert.equal(needsCodeBlock("┌─┐\n└─┘"), true);
  assert.equal(needsCodeBlock("🟥🟥\n🟥🟥"), false);
  assert.equal(needsCodeBlock("hello"), false);
});

test("compatBadge — 종류별 클래스", () => {
  assert.equal(compatBadge("a̴b").cls, "warn");        // 결합문자
  assert.equal(compatBadge("┌─┐\n└─┘").cls, "info");        // mono
  assert.equal(compatBadge("🟥🟥\n🟥🟥").cls, "ok");         // emoji
  assert.equal(compatBadge("안녕").cls, "ok");               // plain 안전
});

test("widthWarning — 임계 초과 시 경고, 작으면 null", () => {
  assert.equal(widthWarning("🟥🟥\n🟥🟥"), null);
  const wide = "🟥".repeat(20);
  assert.match(widthWarning(wide + "\n" + wide) || "", /가로 20칸/);
  const wideMono = "─".repeat(40); // 박스드로잉(고정폭 의존) 한 줄
  assert.match(widthWarning(wideMono) || "", /가로 40칸/);
  assert.equal(widthWarning("hi"), null);
});

test("channelTips — mono면 코드블록 안내가 들어있다", () => {
  const tips = channelTips("┌─┐\n└─┘");
  assert.equal(Array.isArray(tips), true);
  assert.equal(tips.some(([, msg]) => /코드블록/.test(msg)), true);
});

test("변조 — null/undefined 안전", () => {
  assert.equal(classify(null).kind, "plain");
  assert.equal(codeBlock(null), "```\n\n```");
  assert.equal(widthWarning(null), null);
  assert.equal(Array.isArray(channelTips(undefined)), true);
});
