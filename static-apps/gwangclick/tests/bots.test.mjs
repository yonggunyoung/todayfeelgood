// gc-bots.js 경계 테스트 — 결정성 / 형태 / 자동소멸(fade) / 킬스위치 (CLAUDE.md §8)
import { test } from "node:test";
import assert from "node:assert/strict";
import bots from "../gc-bots.js";

const NOW = Date.UTC(2026, 5, 22, 12, 0, 0); // 고정 시각(결정성 보장)
const D = "2026-06-22";

test("결정성: 같은 날짜·시각 → 완전히 동일", () => {
  bots.enabled = true;
  assert.deepEqual(bots.totals(D, NOW), bots.totals(D, NOW));
  assert.deepEqual(bots.rows(D, NOW), bots.rows(D, NOW));
  assert.equal(bots.leanOf(D), bots.leanOf(D));
});

test("날짜 다르면 성향/수치도 다름", () => {
  assert.notEqual(bots.leanOf("2026-06-22"), bots.leanOf("2026-06-23"));
});

test("totals 형태·양수·진영합 일치", () => {
  const t = bots.totals(D, NOW);
  for (const k of ["a", "b", "na", "nb"]) assert.ok(t[k] >= 0, k);
  assert.equal(t.na + t.nb, bots.participants(D, NOW));
  assert.ok(t.regions.seoul && t.regions.seoul.a >= 0);   // 지역 키 = index REGIONS
  assert.ok(t.countries.KR && t.countries.KR.a >= 0);     // 국가 키 = geo NAMES
});

test("rows: 점수 내림차순·캡 미만·필수필드", () => {
  const r = bots.rows(D, NOW);
  assert.ok(r.length > 0);
  for (let i = 0; i < r.length; i++) {
    assert.ok(r[i].taps < 1500 && r[i].taps > 0);
    assert.ok(r[i].side === "a" || r[i].side === "b");
    assert.ok(typeof r[i].nick === "string" && r[i].nick.length);
    if (i) assert.ok(r[i - 1].taps >= r[i].taps);
  }
});

test("blend: 실데이터 위에 가산, null도 안전", () => {
  const real = { a: 100, b: 0, na: 5, nb: 0, regions: { seoul: { a: 100, b: 0 } }, countries: { KR: { a: 100, b: 0 } } };
  const b = bots.blend(real, D, NOW);
  assert.ok(b.a >= 100 && b.b >= 0);          // 실값 보존 + 가산
  assert.ok(b.na > 5);                          // 가상 참전 합산
  const z = bots.blend(null, D, NOW);          // null이어도 유효 객체
  assert.ok(z.a + z.b > 0);
});

test("자동 소멸: 실 참여자 많으면 fade=0 → 가상 0", () => {
  assert.equal(bots.fade(0), 1);
  assert.equal(bots.fade(bots.FADE), 0);
  assert.equal(bots.fade(bots.FADE + 999), 0);
  const real = { a: 1, b: 1, na: bots.FADE, nb: 0, regions: {}, countries: {} };
  const b = bots.blend(real, D, NOW);
  assert.equal(b.a, 1); assert.equal(b.b, 1);  // 가산 없음(원본 유지)
});

test("killswitch: enabled=false면 전부 0/빈/원본", () => {
  bots.enabled = false;
  const t = bots.totals(D, NOW);
  assert.equal(t.a + t.b + t.na + t.nb, 0);
  assert.deepEqual(bots.rows(D, NOW), []);
  const real = { a: 7, b: 3, na: 1, nb: 1, regions: {}, countries: {} };
  assert.deepEqual(bots.blend(real, D, NOW), real);
  assert.equal(bots.blendRank(null, D, 100), null);
  bots.enabled = true; // 복구
});

test("blendRank: 그럴듯한 '몇 등/몇 명', 경계 clamp", () => {
  const r = bots.blendRank({ rank: 1, total: 1 }, D, 300, NOW);
  assert.ok(r.total > 1 && r.rank >= 1 && r.rank <= r.total);
  const hi = bots.blendRank(null, D, 1499, NOW); // 최상위권 → 상위 등수
  assert.ok(hi.rank >= 1 && hi.rank <= hi.total);
});
