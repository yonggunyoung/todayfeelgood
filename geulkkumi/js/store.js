/* 글꾸미 — store.js : 상태 + localStorage 영속(즐겨찾기·최근·설정). 의존성 0. */
"use strict";

const KEY = "geulkkumi.v1";
const MAX_HISTORY = 60;
const MAX_FAV = 300;

const DEFAULTS = {
  favorites: [],   // [{ text, kind, ts }]
  history: [],     // [{ text, kind, ts }]
  settings: { theme: "auto", lastStyle: "bold", artMode: "braille", artWidth: 80 },
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULTS);
    const obj = JSON.parse(raw);
    return {
      favorites: Array.isArray(obj.favorites) ? obj.favorites : [],
      history: Array.isArray(obj.history) ? obj.history : [],
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
