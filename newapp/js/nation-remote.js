// 전국 기분 집계 — Firestore REST(SDK 불필요 → CSP는 connect-src만 열면 됨).
// 미설정/실패/표본부족이면 모든 함수가 안전하게 no-op/null → 앱은 예시 분포(data/nation.js)로 폴백.
// 데이터 모델: 문서 nation/{YYYY-MM-DD} 에 기분별 카운터 { happy, flutter, calm, blue, angry }.
import { NATION } from './data/nation.js';
import { FIREBASE, MIN_SAMPLES } from './firebase-config.js';
import { MOOD_KEYS } from './catalog.js';
import { todayKey } from './store.js';

const ON = !!(FIREBASE.projectId && FIREBASE.apiKey);
const DOCBASE = `projects/${FIREBASE.projectId}/databases/(default)/documents`;
const REST = `https://firestore.googleapis.com/v1/${DOCBASE}`;

let _live = null; // [[mood,pct],...] 내림차순 또는 null

export const nationEnabled = () => ON;
export const isNationLive = () => !!_live;
export const getNation = () => _live || NATION; // 라이브 캐시 우선, 없으면 예시

// 순수 함수(테스트 가능): Firestore fields → 정렬된 [[mood,pct]] 또는 null(표본 부족)
export function summarize(fields, min = MIN_SAMPLES) {
  const counts = MOOD_KEYS.map((k) => [k, Math.max(0, Math.floor(Number((fields && fields[k] && fields[k].integerValue) || 0)))]);
  const total = counts.reduce((a, [, n]) => a + n, 0);
  if (total < min) return null;
  return counts.map(([k, n]) => [k, Math.round((n / total) * 100)]).sort((a, b) => b[1] - a[1]);
}

// 오늘 전국 분포를 읽어 캐시에 저장하고 반환(또는 null).
export async function fetchNation() {
  if (!ON) return null;
  try {
    const res = await fetch(`${REST}/nation/${todayKey()}?key=${FIREBASE.apiKey}`, { cache: 'no-store' });
    if (!res.ok) return null; // 404 = 오늘 첫 기록 전
    const data = await res.json();
    _live = summarize(data.fields);
    return _live;
  } catch (e) { return null; }
}

// 오늘 내 기분 1표 반영(하루 1회, 기분 변경 시 이전 표 차감). 실패/미설정은 조용히 무시.
export async function reportMood(moodId) {
  if (!ON || !MOOD_KEYS.includes(moodId)) return;
  const day = todayKey(), flag = `oneulgibun:contributed:${day}`;
  let prev = null; try { prev = localStorage.getItem(flag); } catch (e) {}
  if (prev === moodId) return;
  const tf = [{ fieldPath: moodId, increment: { integerValue: '1' } }];
  if (prev && MOOD_KEYS.includes(prev)) tf.push({ fieldPath: prev, increment: { integerValue: '-1' } });
  try {
    const res = await fetch(`${REST}:commit?key=${FIREBASE.apiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ writes: [{ transform: { document: `${DOCBASE}/nation/${day}`, fieldTransforms: tf } }] }),
    });
    if (res.ok) { try { localStorage.setItem(flag, moodId); } catch (e) {} }
  } catch (e) { /* 네트워크 실패 → 폴백 유지 */ }
}
