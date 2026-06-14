// 광클대전 순수 헬퍼 스모크 테스트 — node tests/faction.test.mjs
import assert from 'node:assert';
import {
  BATTLES, dayNumber, battleOfDay, dailyBias, comboMult, titleForTaps, rankEstimate, comma,
} from '../js/data/battles.js';

// 1) 소재 데이터 무결성 — 모든 대전이 두 진영·색·구호를 갖춘다
assert.ok(BATTLES.length >= 6, '소재는 최소 6개');
for (const b of BATTLES) {
  for (const side of ['a', 'b']) {
    const s = b[side];
    assert.ok(s.key && s.name && s.emoji, `${b.id}.${side} 필수 필드`);
    assert.match(s.color, /^#[0-9a-fA-F]{6}$/, `${b.id}.${side} 색상 hex`);
  }
  assert.notStrictEqual(b.a.key, b.b.key, `${b.id} 두 진영 키는 달라야`);
  assert.ok(Array.isArray(b.taunts) && b.taunts.length >= 3, `${b.id} 도발 멘트 3개 이상`);
}

// 2) 오늘의 대전 — 날짜로 결정적이고 전국 동일 (같은 날 = 같은 떡밥)
assert.strictEqual(battleOfDay('2026-06-14').id, battleOfDay('2026-06-14').id);
assert.strictEqual(dayNumber('1970-01-02'), 1, '에폭 일수');
// 연속한 날은 소재가 한 칸씩 돈다 (전국 로테이션)
const seq = [0, 1, 2, 3].map((d) => battleOfDay(`2026-06-${10 + d}`).id);
assert.ok(new Set(seq).size >= 3, '며칠에 걸쳐 소재가 바뀐다');

// 3) 시작 편향 — 같은 날 결정적, 범위 -6~+6
const today = '2026-06-14';
const bt = battleOfDay(today);
assert.strictEqual(dailyBias(today, bt), dailyBias(today, bt));
assert.ok(dailyBias(today, bt) >= -6 && dailyBias(today, bt) <= 6, '편향 범위');

// 4) 콤보 배수 — 단조 증가, 1~3 클램프
assert.strictEqual(comboMult(0), 1);
assert.ok(comboMult(10) > comboMult(0));
assert.ok(comboMult(25) > comboMult(10));
assert.strictEqual(comboMult(50), 3, '50콤보면 최대 ×3');
assert.strictEqual(comboMult(999), 3, '상한 ×3');

// 5) 칭호 — 누를수록 등급 상승, 경계값 정확
assert.strictEqual(titleForTaps(0), '구경꾼 👀');
assert.strictEqual(titleForTaps(49), '구경꾼 👀');
assert.strictEqual(titleForTaps(50), '일반인 🙂');
assert.strictEqual(titleForTaps(1200), '광클의 신 👑');
assert.strictEqual(titleForTaps(99999), '손가락 분신술 🌀');

// 6) 예상 등수 — 많이 누를수록 상위(작은 숫자), 1 이상
assert.ok(rankEstimate(1000) < rankEstimate(100), '많이 누르면 상위권');
assert.ok(rankEstimate(100) < rankEstimate(0));
assert.ok(rankEstimate(5000) >= 1, '등수는 1 이상');
assert.ok(rankEstimate(0) > 50000, '0탭은 한참 하위');

// 7) 콤마 포매팅
assert.strictEqual(comma(3412), '3,412');
assert.strictEqual(comma(0), '0');

console.log('✓ faction.test.mjs — 광클대전 헬퍼 통과');
