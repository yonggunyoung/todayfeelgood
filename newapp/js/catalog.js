// 오늘 기분 — 음악 카탈로그 레이어. 관리자(admin.html)가 편집하는 localStorage 카탈로그를
// 앱이 읽고, 없으면 번들 시드(songs.js)로 폴백. 곡: {title, artist, youtubeId?, url?, source}.
import { SONGS } from './data/songs.js';

const KEY = 'oneulgibun:catalog';
export const MOOD_KEYS = ['happy', 'flutter', 'calm', 'blue', 'angry'];
export const SEED = SONGS;

export function loadCatalog() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const c = JSON.parse(raw);
      if (c && typeof c === 'object') {
        const out = {};
        for (const m of MOOD_KEYS) out[m] = Array.isArray(c[m]) ? c[m].filter((s) => s && s.title) : (SONGS[m] || []);
        return out;
      }
    }
  } catch (e) { /* 손상 시 시드 */ }
  return SONGS;
}
export function saveCatalog(c) { try { localStorage.setItem(KEY, JSON.stringify(c)); return true; } catch (e) { return false; } }
export function resetCatalog() { try { localStorage.removeItem(KEY); } catch (e) { } }

// YouTube URL/ID → 11자 영상 ID (없으면 '')
export function parseYouTubeId(u) {
  if (!u) return '';
  u = String(u).trim();
  if (/^[\w-]{11}$/.test(u)) return u;
  const m = u.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|\/v\/)([\w-]{11})/);
  return m ? m[1] : '';
}
