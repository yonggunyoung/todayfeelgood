// i18n.js 경계 테스트 — 정상 / 매핑 / None / 변조 (CLAUDE.md §8 #1)
import { test } from "node:test";
import assert from "node:assert/strict";
import i18n from "../i18n.js";

test("pickLang", () => {
  assert.equal(i18n.pickLang("ko-KR"), "ko"); // 정상
  assert.equal(i18n.pickLang("en-US"), "en"); // 정상
  assert.equal(i18n.pickLang("KO_kr"), "ko"); // 매핑(대소문·_)
  assert.equal(i18n.pickLang("ja-JP"), "en"); // 매핑(미지원→en)
  assert.equal(i18n.pickLang(""), "ko"); // None(보수적 폴백)
  assert.equal(i18n.pickLang(null), "ko"); // 변조
  assert.equal(i18n.pickLang(42), "ko"); // 변조
});

test("t — 폴백 lang→ko→key", () => {
  assert.equal(i18n.t("en", "live"), "LIVE"); // 정상
  assert.equal(i18n.t("ko", "worldTitle"), "세계 광클대전"); // 정상
  assert.equal(i18n.t("ja", "worldTitle"), "세계 광클대전"); // 매핑(미지원 lang→ko)
  assert.equal(i18n.t("en", "__nope__"), "__nope__"); // None(없는 key→key)
  assert.equal(i18n.t(null, "live"), "LIVE"); // 변조(lang null→ko)
});

test("t — {placeholder} 치환", () => {
  assert.equal(i18n.t("ko", "streakDays", { n: 3 }), "3일 연속 참전"); // 정상
  assert.equal(i18n.t("en", "joinA", { a: "Team Mint" }), "Join Team Mint"); // 매핑
  assert.equal(i18n.t("ko", "streakDays", {}), "{n}일 연속 참전"); // None(값없음→토큰유지)
  assert.equal(i18n.t("ko", "streakDays"), "{n}일 연속 참전"); // 변조(vars 없음→throw 금지)
});
