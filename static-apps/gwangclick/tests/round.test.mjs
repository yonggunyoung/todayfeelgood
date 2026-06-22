// gc-round.js 경계 테스트 — 기본 6h 순환 / 1회 특집(아샷추 24h) / 경계 / 결정성
import { test } from "node:test";
import assert from "node:assert/strict";
import round from "../gc-round.js";

const B = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
const H = 3600000;
const OPTS = { defaultHours: 6, anchorMs: 0 };
const FOPTS = { defaultHours: 6, anchorMs: 0, featured: { id: "c", startMs: 100 * H, hours: 24 } };

test("기본 6시간 순환", () => {
  assert.equal(round.roundAt(B, OPTS, 1 * H).id, "a");   // slot0
  assert.equal(round.roundAt(B, OPTS, 7 * H).id, "b");   // slot1
  assert.equal(round.roundAt(B, OPTS, 1 * H).hours, 6);
});

test("같은 6h 라운드 내 키 안정 / 경계서 변경", () => {
  const x = round.roundAt(B, OPTS, 1 * H), y = round.roundAt(B, OPTS, 5 * H);
  assert.equal(x.key, y.key);
  assert.notEqual(x.key, round.roundAt(B, OPTS, 7 * H).key);
});

test("1회 특집(아샷추=c) 24h 오버라이드", () => {
  const f = round.roundAt(B, FOPTS, 100.5 * H);
  assert.equal(f.id, "c"); assert.equal(f.hours, 24); assert.equal(f.featured, true);
  assert.equal(round.roundAt(B, FOPTS, 123 * H).key, f.key);   // 100~124h 내내 같은 라운드
});

test("특집 끝나면 일반 순환 복귀", () => {
  const after = round.roundAt(B, FOPTS, 125 * H);             // 124h 이후
  assert.equal(after.featured, false);
  assert.equal(after.hours, 6);
});

test("특집 전/후 일반 순환은 정상", () => {
  assert.equal(round.roundAt(B, FOPTS, 1 * H).id, "a");        // 특집 창 밖 → 일반
  assert.equal(round.roundAt(B, FOPTS, 1 * H).featured, false);
});

test("previousRound — 직전 라운드", () => {
  const prev = round.previousRound(B, OPTS, 7 * H);            // 현재 b → 직전 a
  assert.equal(prev.id, "a");
  const prevF = round.previousRound(B, FOPTS, 100.5 * H);      // 특집 직전 = 일반 라운드
  assert.equal(prevF.featured, false);
});

test("변조 입력 throw 없이 null", () => {
  assert.equal(round.roundAt(null, OPTS, 0), null);
  assert.equal(round.roundAt([], OPTS, 0), null);
});
