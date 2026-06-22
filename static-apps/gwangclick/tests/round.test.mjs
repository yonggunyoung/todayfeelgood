// gc-round.js 경계 테스트 — 기본 1h / 예외(아샷추 24h) / 경계 전환 / 결정성
import { test } from "node:test";
import assert from "node:assert/strict";
import round from "../gc-round.js";

const B = [{ id: "a" }, { id: "b" }, { id: "ashotchu" }, { id: "c" }];
const SP = { ashotchu: 24 };
const ANCHOR = 0; // 1970-01-01 UTC 기준(테스트용)
const H = 3600000;

test("cycle = 1+1+24+1 = 27h", () => {
  assert.equal(round.cycleHours(B, SP), 27);
});

test("기본 1시간 라운드 전환", () => {
  const r0 = round.roundAt(B, SP, ANCHOR, 0.5 * H);     // 0~1h → a
  const r1 = round.roundAt(B, SP, ANCHOR, 1.5 * H);     // 1~2h → b
  assert.equal(r0.id, "a"); assert.equal(r1.id, "b");
  assert.equal(r0.hours, 1);
});

test("아샷추는 24시간(예외)", () => {
  const r = round.roundAt(B, SP, ANCHOR, 2.5 * H);      // 2h부터 24h짜리 ashotchu
  assert.equal(r.id, "ashotchu"); assert.equal(r.hours, 24);
  // 2h~26h 내내 같은 라운드 키
  const mid = round.roundAt(B, SP, ANCHOR, 20 * H);
  assert.equal(mid.key, r.key);
  // 26h 지나면 c로
  const next = round.roundAt(B, SP, ANCHOR, 26.5 * H);
  assert.equal(next.id, "c");
});

test("같은 라운드 내 키 안정 / 경계서 키 변경", () => {
  const x = round.roundAt(B, SP, ANCHOR, 0.1 * H);
  const y = round.roundAt(B, SP, ANCHOR, 0.9 * H);
  assert.equal(x.key, y.key);                            // 같은 라운드 = 같은 키(집계 공유)
  const z = round.roundAt(B, SP, ANCHOR, 1.1 * H);
  assert.notEqual(x.key, z.key);
});

test("endMs/startMs 일관 + 다음 사이클 반복", () => {
  const r = round.roundAt(B, SP, ANCHOR, 0.5 * H);
  assert.equal(r.endMs - r.startMs, 1 * H);
  const cyc = 27 * H;
  const r2 = round.roundAt(B, SP, ANCHOR, 0.5 * H + cyc); // 한 사이클 뒤 같은 떡밥
  assert.equal(r2.id, r.id);
});

test("previousRound = 직전 떡밥", () => {
  const prev = round.previousRound(B, SP, ANCHOR, 1.5 * H); // 현재 b → 직전 a
  assert.equal(prev.id, "a");
});

test("변조 입력에도 throw 없이 null/기본", () => {
  assert.equal(round.roundAt(null, SP, ANCHOR, 0), null);
  assert.equal(round.roundAt([], SP, ANCHOR, 0), null);
  assert.equal(round.hoursOf({ id: "x" }, SP), 1);       // 미지정 → 1
});
