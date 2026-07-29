// 상태 단일 출처 + 저장 불신 가드 — D5/D6. 순수 헬퍼는 node 테스트 가능.
import { MOOD_IDS } from './data/moods.js';

export const SCHEMA = 1;
const KEY = 'oneulgibun:state';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const isValidMood = (id) => MOOD_IDS.has(id);

// 점수는 항상 1~5 정수로 clamp(원칙1). 증분2 강도 입력 대비.
export function clampScore(n) {
  n = Math.round(Number(n));
  if (!Number.isFinite(n)) return 1;
  return Math.min(5, Math.max(1, n));
}

// 엔진 날짜: 로컬 자정 기준 YYYY-MM-DD (클라 Date를 신뢰하되 키로 정규화) — D4.
export function todayKey(now = new Date()) {
  const d = new Date(now);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function prevDay(key, n = 1) {
  const d = new Date(`${key}T00:00:00`);
  d.setDate(d.getDate() - n);
  return todayKey(d);
}
export const MAX_FREEZE = 2;            // 연속 보호 프리즈 최대치
function clampFreeze(n) { n = Math.floor(Number(n)); return (!Number.isFinite(n) || n < 0) ? 0 : Math.min(MAX_FREEZE, n); }

export const emptyState = () => ({ schema: SCHEMA, days: {}, lastDate: '', streak: 0, freezes: 1 });

// 안전 로드: 깨진/변조 데이터도 throw·와이프 없이 복구(원칙1/D5).
export function loadState(raw) {
  if (raw == null) return emptyState();
  let obj;
  try { obj = JSON.parse(raw); } catch { return emptyState(); }
  if (typeof obj !== 'object' || obj === null) return emptyState();

  const out = emptyState();
  if (obj.days && typeof obj.days === 'object') {
    for (const [k, v] of Object.entries(obj.days)) {
      if (DATE_RE.test(k) && v && isValidMood(v.mood)) {        // 잘못된 키/기분 제거
        out.days[k] = { mood: v.mood, ts: Number(v.ts) || 0 };
        if (typeof v.songId === 'string') out.days[k].songId = v.songId;
      }
    }
  }
  out.streak = Math.max(0, Math.floor(Number(obj.streak) || 0)); // 음수/NaN → 0
  out.lastDate = DATE_RE.test(obj.lastDate) ? obj.lastDate : '';
  out.freezes = obj.freezes == null ? 1 : clampFreeze(obj.freezes);
  return out;
}

// 기록 reducer(순수) + 단조증가 가드(원칙1/D4):
//   과거 날짜로 조작/재기록되면 streak를 올리지 않는다.
export function recordMood(state, moodId, now = new Date()) {
  if (!isValidMood(moodId)) return state;             // 입력 불신
  const key = todayKey(now);
  const next = { ...state, days: { ...state.days, [key]: { mood: moodId, ts: +new Date(now) } }, freezes: clampFreeze(state.freezes), frozeToday: false };
  if (key > state.lastDate) {                          // 새 날만 streak 갱신
    if (!state.lastDate) next.streak = 1;
    else if (state.lastDate === prevDay(key)) next.streak = state.streak + 1;       // 연속
    else if (state.lastDate === prevDay(key, 2) && clampFreeze(state.freezes) > 0) { // 하루 빠짐 + 프리즈 보유
      next.streak = state.streak + 1; next.freezes = clampFreeze(state.freezes) - 1; next.frozeToday = true;
    } else next.streak = 1;                            // 이틀 이상 공백 → 리셋
    next.lastDate = key;
    if (next.streak > 0 && next.streak % 7 === 0) next.freezes = clampFreeze(next.freezes + 1); // 7일마다 프리즈 +1
  }
  return next;
}

// 브라우저 인스턴스(얇은 래퍼).
export const store = {
  load() { try { return loadState(localStorage.getItem(KEY)); } catch { return emptyState(); } },
  save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* 저장 실패 무시 */ } },
};
