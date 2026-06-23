// 증분1 경계 테스트 4종(정상/매핑/None/변조) — 원칙1/원칙5.
// 실행: node newapp/tests/engine.test.mjs
import { recommendSong } from '../js/recommend.js';
import { loadState, recordMood, clampScore, emptyState } from '../js/store.js';
import { MOODS } from '../js/data/moods.js';

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; } else { fail++; console.error('  ✗', msg); } };

// ── 정상 ─────────────────────────────────────────────
const r = recommendSong('happy', { dateKey: '2026-06-23' });
ok(r && r.source !== 'none' && !!r.title, '정상: happy → 곡 추천');
ok(recommendSong('happy', { dateKey: '2026-06-23' }).title === r.title, '정상: 같은 날 동일 곡(결정적)');

// ── 매핑 ─────────────────────────────────────────────
ok(MOODS.every((m) => recommendSong(m.id, { dateKey: '2026-06-23' }).source !== 'none'),
  '매핑: 기분 5종 모두 곡 매핑됨');

// ── None ─────────────────────────────────────────────
ok(recommendSong('xxx', { dateKey: 'x' }).source === 'none', 'None: 미지 기분 → 안전 폴백');
ok(recommendSong('happy', { dateKey: 'x', catalog: {} }).source === 'none', 'None: 빈 카탈로그 → 폴백');

// ── 변조 ─────────────────────────────────────────────
ok(loadState('{깨진 JSON').schema === 1, '변조: 깨진 JSON → 기본 복구(무크래시)');
ok(loadState(null).schema === 1, '변조: null → 기본 복구');
ok(loadState(JSON.stringify({ streak: -5 })).streak === 0, '변조: 음수 streak → 0');
ok(loadState(JSON.stringify({ days: { bad: { mood: 'happy' } } })).days.bad === undefined,
  '변조: 잘못된 날짜 키 제거');
ok(loadState(JSON.stringify({ days: { '2026-06-23': { mood: 'XXX' } } })).days['2026-06-23'] === undefined,
  '변조: 허용되지 않은 기분 제거');
ok(clampScore(99) === 5 && clampScore(-3) === 1 && clampScore('x') === 1, '변조: 점수 1~5 clamp');

// 단조증가 가드: 과거 날짜 기록은 streak를 올리지 않음
let s = recordMood(emptyState(), 'calm', new Date('2026-06-23T10:00:00'));
ok(s.streak === 1, '정상: 첫 기록 → streak 1');
const past = recordMood(s, 'happy', new Date('2026-06-22T10:00:00'));
ok(past.streak === s.streak, '변조: 과거 날짜 기록 → streak 불변');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
