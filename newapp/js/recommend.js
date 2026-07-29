// 오늘의 노래 추천 — 순수 함수(DOM 의존 0, node 테스트 가능). D3.
import { MOOD_IDS } from './data/moods.js';
import { SONGS } from './data/songs.js';

// None-safe 폴백: 곡을 못 찾아도 절대 크래시하지 않는다(원칙1).
const FALLBACK = { title: '오늘은 음악 없이 쉬어가요', artist: '', source: 'none', url: '' };

// 날짜 시드 → 같은 날 새로고침해도 같은 곡(출력 안정, 원칙1).
function seedFrom(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

// taste(음악 성향 타입)를 시드에 섞으면 같은 기분·같은 날이라도 사람마다 다른 곡이 나온다
// → "내 취향을 아는" 개인화. taste 미지정('')이면 기존 결과와 100% 동일(하위호환).
export function recommendSong(moodId, { dateKey = '', catalog = SONGS, taste = '' } = {}) {
  if (!MOOD_IDS.has(moodId)) return { ...FALLBACK };        // 입력 불신
  const list = catalog[moodId];
  if (!Array.isArray(list) || list.length === 0) return { ...FALLBACK }; // None-safe
  const idx = seedFrom(String(dateKey) + moodId + (taste || '')) % list.length;
  return { ...list[idx] };
}
