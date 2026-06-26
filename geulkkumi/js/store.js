/* 글꾸미 — store.js : 상태 + localStorage 영속(즐겨찾기·최근·설정). 의존성 0. */
"use strict";

const KEY = "geulkkumi.v1";
const MAX_HISTORY = 60;
const MAX_FAV = 300;
const MAX_SLOTS = 120;

// 용도별 슬롯 — 완성한 닉/바이오를 여기 모아두고 원탭 복사.
export const SLOT_CATS = ["인스타 바이오", "카톡 닉", "디코 닉", "게임 닉", "프로필"];

const DEFAULTS = {
  favorites: [],   // [{ text, kind, ts }]
  history: [],     // [{ text, kind, ts }]
  slots: [],       // [{ id, cat, text, ts }]
  settings: { theme: "auto", lastStyle: "bold", artMode: "braille", artWidth: 80, tabUses: {} },
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULTS);
    const obj = JSON.parse(raw);
    return {
      favorites: Array.isArray(obj.favorites) ? obj.favorites : [],
      history: Array.isArray(obj.history) ? obj.history : [],
      slots: Array.isArray(obj.slots) ? obj.slots : [],
      settings: Object.assign({}, DEFAULTS.settings, obj.settings || {}),
    };
  } catch { return structuredClone(DEFAULTS); }
}

let state = load();
const subs = new Set();

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* 용량초과 등 무시 */ }
  subs.forEach((fn) => { try { fn(state); } catch { /* 구독자 오류 격리 */ } });
}

export function subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }
export function getState() { return state; }
export const settings = () => state.settings;

export function setSetting(key, val) {
  state.settings = Object.assign({}, state.settings, { [key]: val });
  persist();
}

export function addHistory(text, kind) {
  if (!text) return;
  state.history = state.history.filter((h) => h.text !== text);
  state.history.unshift({ text, kind: kind || "text", ts: Date.now() });
  if (state.history.length > MAX_HISTORY) state.history.length = MAX_HISTORY;
  persist();
}

export function isFavorite(text) { return state.favorites.some((f) => f.text === text); }

export function toggleFavorite(text, kind) {
  if (!text) return false;
  if (isFavorite(text)) {
    state.favorites = state.favorites.filter((f) => f.text !== text);
    persist();
    return false;
  }
  state.favorites.unshift({ text, kind: kind || "text", ts: Date.now() });
  if (state.favorites.length > MAX_FAV) state.favorites.length = MAX_FAV;
  persist();
  return true;
}

export function removeFavorite(text) {
  state.favorites = state.favorites.filter((f) => f.text !== text);
  persist();
}
export function clearHistory() { state.history = []; persist(); }

// ── 슬롯 ──
export function getSlots() { return state.slots || (state.slots = []); }
export function addSlot(cat, text) {
  if (!text) return;
  const id = "s" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
  getSlots().unshift({ id, cat: cat || "기타", text, ts: Date.now() });
  if (state.slots.length > MAX_SLOTS) state.slots.length = MAX_SLOTS;
  persist();
}
export function removeSlot(id) { state.slots = getSlots().filter((s) => s.id !== id); persist(); }

// ── 탭 사용 빈도(자주 쓰는 기능을 메인으로 자동) ──
export function bumpTab(id) {
  if (!id) return;
  const uses = Object.assign({}, state.settings.tabUses || {});
  uses[id] = (uses[id] || 0) + 1;
  state.settings = Object.assign({}, state.settings, { tabUses: uses });
  persist();
}
// 가장 많이 쓴 탭(없으면 fallback). 동률이면 먼저 본 키 유지(안정적).
export function topTab(fallback) {
  const uses = state.settings.tabUses || {};
  let best = null, max = 0;
  for (const k in uses) if (uses[k] > max) { max = uses[k]; best = k; }
  return best || fallback || "fonts";
}
