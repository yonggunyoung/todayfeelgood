// ⚡ 광클대전 — 봇 시더 공용 로직 (순수·결정적, firebase 의존 0)
// gc-bots.js의 결정적 부품을 재사용(DRY)해 "개별 플레이어 문서"용 로스터를 만든다.
// seed.mjs / purge.mjs 가 이걸 가져다 Firestore에 실제 플레이어처럼 기록/회수한다.
import bots from "./gc-bots.cjs";

const RKEYS = Object.keys(bots.RW);
const CKEYS = Object.keys(bots.CW);

export function emptyAgg() { return { a: 0, b: 0, na: 0, nb: 0, regions: {}, countries: {} }; }

function pick(keys, weights, r) {
  let sum = 0; for (const k of keys) sum += weights[k];
  let x = r() * sum;
  for (const k of keys) { x -= weights[k]; if (x <= 0) return k; }
  return keys[keys.length - 1];
}

// 오늘·이 시각의 봇 로스터 + 그 합산(집계). 결정적(date,now) → 어디서 돌려도 동일.
// 인원은 시간대 곡선으로 자라고(아침↓저녁↑), 점수는 일찍 합류한 봇일수록 성숙(높음).
export function buildRoster(date, now) {
  const P = bots.participants(date, now);
  const lean = bots.leanOf(date);
  const players = [], agg = emptyAgg();
  for (let i = 0; i < P; i++) {
    const r = bots._rng(bots._hash(date + "|p" + i));
    const endTaps = Math.round(60 + Math.pow(r(), 2.0) * 1420);
    const maturity = bots._clamp(1 - (i / Math.max(1, P)) * 0.6, 0.4, 1);
    const taps = bots._clamp(Math.round(endTaps * maturity), 1, 1499);
    const side = r() < lean ? "a" : "b";
    const region = pick(RKEYS, bots.RW, r);
    const foreign = r() > 0.85;
    const country = foreign ? CKEYS[1 + Math.floor(r() * (CKEYS.length - 1))] : "KR";
    let nick = bots.NICKS[bots._hash(date + "|n" + i) % bots.NICKS.length];
    if (r() > 0.25) nick += String(2 + Math.floor(r() * 97));       // 중복 닉 완화(게이머태그식 숫자)
    const badge = r() > 0.6 ? bots.BADGES[Math.floor(r() * bots.BADGES.length)] : "";
    const comment = r() > 0.72 ? bots.COMMENTS[Math.floor(r() * bots.COMMENTS.length)] : "";
    const uid = "bot__" + String(i).padStart(4, "0");
    players.push({ uid, nick, side, taps, region, country, badge, comment });
    agg[side] += taps; agg[side === "a" ? "na" : "nb"] += 1;
    (agg.regions[region] = agg.regions[region] || { a: 0, b: 0 })[side] += taps;
    (agg.countries[country] = agg.countries[country] || { a: 0, b: 0 })[side] += taps;
  }
  return { players, agg };
}

// 목표 집계 − 이전 원장 = 적용할 증감(증가/감소 모두 가능). 중첩 맵 포함.
export function diffAgg(target, prev) {
  prev = prev || emptyAgg();
  const d = {
    a: (target.a || 0) - (prev.a || 0), b: (target.b || 0) - (prev.b || 0),
    na: (target.na || 0) - (prev.na || 0), nb: (target.nb || 0) - (prev.nb || 0),
    regions: {}, countries: {},
  };
  for (const fld of ["regions", "countries"]) {
    const keys = new Set([...Object.keys(target[fld] || {}), ...Object.keys(prev[fld] || {})]);
    for (const k of keys) {
      const t = (target[fld] || {})[k] || { a: 0, b: 0 }, p = (prev[fld] || {})[k] || { a: 0, b: 0 };
      const da = (t.a || 0) - (p.a || 0), db = (t.b || 0) - (p.b || 0);
      if (da || db) d[fld][k] = { a: da, b: db };
    }
  }
  return d;
}

// 부호 반전(제거 시 집계에서 빼기 위함).
export function negAgg(a) {
  const n = { a: -(a.a || 0), b: -(a.b || 0), na: -(a.na || 0), nb: -(a.nb || 0), regions: {}, countries: {} };
  for (const fld of ["regions", "countries"])
    for (const k of Object.keys(a[fld] || {})) n[fld][k] = { a: -(a[fld][k].a || 0), b: -(a[fld][k].b || 0) };
  return n;
}

export function summarize(roster) {
  const { players, agg } = roster, tot = agg.a + agg.b;
  const top = players.slice().sort((x, y) => y.taps - x.taps).slice(0, 5);
  return {
    participants: players.length, aShare: tot ? (agg.a / tot * 100).toFixed(1) + "%" : "-",
    aTaps: agg.a, bTaps: agg.b,
    top5: top.map((p, i) => `${i + 1}. ${p.nick}(${p.side}) ${p.taps} ${p.region}/${p.country}${p.badge ? " " + p.badge : ""}`),
  };
}
