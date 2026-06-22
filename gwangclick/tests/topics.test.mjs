// topics.js 경계 테스트 — 정상 / 매핑 / None / 변조 (CLAUDE.md §8 #1)
import { test } from "node:test";
import assert from "node:assert/strict";
import topics from "../topics.js";

const { BATTLES, localize, pick } = topics;

test("BATTLES — 양어 원본 무결성", () => {
  assert.ok(Array.isArray(BATTLES));
  assert.ok(BATTLES.length >= 12); // 기존 8 + 해외 4
  for (const bt of BATTLES) {
    assert.ok(bt.id, "id 필수");
    assert.equal(typeof bt.tag.ko, "string");
    assert.equal(typeof bt.tag.en, "string");
    assert.equal(typeof bt.q.ko, "string");
    assert.equal(typeof bt.q.en, "string");
    for (const k of ["a", "b"]) {
      const s = bt[k];
      assert.ok(s.key && s.emoji && s.color, k + " key/emoji/color");
      assert.equal(typeof s.name.ko, "string");
      assert.equal(typeof s.name.en, "string");
      assert.equal(typeof s.slogan.ko, "string");
      assert.equal(typeof s.slogan.en, "string");
    }
    assert.ok(Array.isArray(bt.taunts.ko) && bt.taunts.ko.length > 0);
    assert.ok(Array.isArray(bt.taunts.en) && bt.taunts.en.length > 0);
  }
  // id 유일성
  const ids = BATTLES.map((b) => b.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("localize — 정상 (ko/en 평탄화)", () => {
  const raw = BATTLES.find((b) => b.id === "mintchoco");
  const ko = localize(raw, "ko");
  assert.equal(ko.id, "mintchoco");
  assert.equal(ko.tag, "민초대전");
  assert.equal(ko.q, "민트초코, 너는?");
  assert.equal(ko.a.name, "민초단");
  assert.equal(ko.a.key, "mint"); // 비언어 데이터 보존
  assert.equal(ko.a.emoji, "🌿");
  assert.equal(ko.a.color, "#12b39a");
  assert.equal(ko.b.slogan, "디저트에 치약을 왜 넣냐고");
  assert.ok(Array.isArray(ko.taunts) && ko.taunts.length === 4);

  const en = localize(raw, "en");
  assert.equal(en.tag, "Mint Choco");
  assert.equal(en.q, "Mint choco — you in?");
  assert.equal(en.a.name, "Team Mint");
  assert.equal(en.a.key, "mint"); // key는 언어 무관 동일
  assert.equal(en.b.name, "Team No-Mint");
  assert.equal(en.taunts[0], "Enough toothpaste talk 🪥");
});

test("localize — 매핑(언어 폴백): 누락 필드는 ko로", () => {
  // en 누락 필드들이 ko로 폴백되는지
  const partial = {
    id: "p1",
    tag: { ko: "한글태그" }, // en 없음
    q: { ko: "질문?", en: "Q?" },
    a: { key: "a", emoji: "🅰️", color: "#111", name: { ko: "에이" }, slogan: { ko: "슬로건" } }, // name/slogan en 없음
    b: { key: "b", emoji: "🅱️", color: "#222", name: { ko: "비", en: "Bee" }, slogan: { ko: "S", en: "S2" } },
    taunts: { ko: ["한글도발"] }, // en 없음
  };
  const en = localize(partial, "en");
  assert.equal(en.tag, "한글태그"); // en 없음 → ko 폴백
  assert.equal(en.q, "Q?"); // en 있음
  assert.equal(en.a.name, "에이"); // en 없음 → ko 폴백
  assert.equal(en.a.slogan, "슬로건"); // en 없음 → ko 폴백
  assert.equal(en.b.name, "Bee"); // en 있음
  assert.deepEqual(en.taunts, ["한글도발"]); // en 배열 없음 → ko 폴백
});

test("localize — None/미지원 lang → ko, 빈 입력 안전", () => {
  const raw = BATTLES.find((b) => b.id === "coffee");
  const unknown = localize(raw, "ja"); // 미지원 lang → ko
  assert.equal(unknown.tag, "아아따아");
  assert.equal(unknown.a.name, "아이스파");

  const noLang = localize(raw); // lang 없음 → ko
  assert.equal(noLang.q, "커피는 역시?");

  // 빈 객체: throw 금지 + 안전 기본값
  const empty = localize({}, "en");
  assert.equal(empty.id, "");
  assert.equal(empty.tag, "");
  assert.equal(empty.q, "");
  assert.equal(empty.a.name, "");
  assert.equal(empty.a.color, "#888888"); // color 기본값(렌더 안 깨짐)
  assert.deepEqual(empty.taunts, []);
});

test("localize — 변조 입력에도 throw 금지", () => {
  assert.doesNotThrow(() => localize(null, "en"));
  assert.doesNotThrow(() => localize(undefined));
  assert.doesNotThrow(() => localize(42, "ko"));
  assert.doesNotThrow(() => localize("nonsense", "ko"));
  assert.doesNotThrow(() => localize({ taunts: "not-an-array" }, "en"));
  assert.doesNotThrow(() => localize({ a: 123, b: null }, "ko"));

  const bad = localize(null, "en");
  assert.equal(bad.id, "");
  assert.deepEqual(bad.taunts, []);
  assert.equal(bad.a.name, "");

  // taunts가 문자열(변조)이면 빈 배열
  const t = localize({ taunts: "oops" }, "en");
  assert.deepEqual(t.taunts, []);

  // 진영이 비객체(변조)면 안전 기본값
  const s = localize({ a: 123 }, "ko");
  assert.equal(s.a.key, "");
  assert.equal(s.a.color, "#888888");
});

test("pick — 양어/평문/변조", () => {
  assert.equal(pick({ ko: "가", en: "A" }, "en"), "A"); // 정상
  assert.equal(pick({ ko: "가", en: "A" }, "ko"), "가"); // 정상
  assert.equal(pick({ ko: "가" }, "en"), "가"); // 매핑(en 없음 → ko)
  assert.equal(pick("평문", "en"), "평문"); // 평문 하위호환
  assert.equal(pick(null, "en"), ""); // None
  assert.equal(pick(undefined, "ko"), ""); // 변조
  assert.equal(pick({}, "en"), ""); // 빈 객체 → ''
});
