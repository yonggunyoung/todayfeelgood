// 추천 엔진 — 전부 비AI(정렬·필터). 변동비 0원으로 무제한 동작하는 코어.
// 프리셋 모드 + 사용자가 만든 맞춤 모드를 같은 파이프라인으로 처리한다.
import { RECIPES } from './data/recipes.js';
import { findIng } from './data/ingredients.js';
import { daysLeft } from './store.js';

/* ── 모드 정의 ───────────────────────────── */
export const PRESET_MODES = [
  { key: 'none',      label: '기본',     emoji: '🍽️', desc: '지금 만들 수 있는 요리부터' },
  { key: 'fitness',   label: '운동',     emoji: '💪', desc: '단백질 우선 · 매크로 표시', protein: true },
  { key: 'frugal',    label: '자린고비', emoji: '🪙', desc: '임박 재료 소진 · 추가 지출 0원', expiring: true, zeroExtra: true },
  { key: 'banchan',   label: '반찬',     emoji: '🥢', desc: '밑반찬·도시락 곁들임 우선', prefTags: ['반찬', '도시락'] },
  { key: 'maternity', label: '산모',     emoji: '🤰', desc: '주의 재료 자동 제외 · 순한 요리', blockCaution: true, prefTags: ['순한맛', '국물'] },
];

export function modeList(state) {
  const customs = (state.settings?.customModes || []).map((c) => ({ ...c, custom: true }));
  return [...PRESET_MODES, ...customs];
}

export function getMode(state, key) {
  return modeList(state).find((m) => m.key === key) || PRESET_MODES[0];
}

/* ── 레시피 풀: 내장 + 내 레시피 ─────────── */
export function allRecipes(state) {
  return [...RECIPES, ...(state.myRecipes || [])];
}

/* ── 보유 판단 ───────────────────────────── */
function findPantryItem(pantry, name) {
  const target = findIng(name);
  return pantry.find((p) => {
    if (p.name === name) return true;
    const pi = findIng(p.name);
    return target && pi && pi.name === target.name;
  });
}

function hasEnough(item) {
  if (!item) return false;
  if (item.qtyType === 'level') return item.level !== 'empty';
  return (item.qty ?? 0) > 0;
}

function sameIng(a, b) {
  if (a === b) return true;
  const ia = findIng(a), ib = findIng(b);
  return !!(ia && ib && ia.name === ib.name);
}

/* ── 레시피 분석 + 모드 점수 ─────────────── */
export function analyzeRecipe(recipe, state, modeOrKey) {
  const mode = typeof modeOrKey === 'string' ? getMode(state, modeOrKey) : (modeOrKey || PRESET_MODES[0]);
  const required = recipe.ingredients.filter((g) => !g.st);
  const missing = [];
  let have = 0;
  let expiringBoost = 0;

  for (const g of required) {
    const item = findPantryItem(state.pantry, g.n);
    if (hasEnough(item)) {
      have++;
      const d = daysLeft(item.expiresAt);
      if (d <= 3) expiringBoost += d <= 1 ? 1 : 0.6;
    } else {
      missing.push(g.n);
    }
  }

  const coverage = required.length ? have / required.length : 0;

  let m = 0;
  if (mode.protein) m += Math.min(1, (recipe.protein || 0) / 40);
  if (mode.expiring) m += Math.min(1, expiringBoost);
  if (mode.zeroExtra && missing.length === 0) m += 0.6;
  if (mode.prefTags?.length) m += recipe.tags?.some((t) => mode.prefTags.includes(t)) ? 0.8 : 0;
  const modeScore = Math.min(1, m);

  const fav = (state.favs || []).includes(recipe.id);

  const score =
    coverage * 0.42 +
    Math.min(1, expiringBoost / 2) * 0.2 +
    (missing.length === 0 ? 0.12 : missing.length === 1 ? 0.04 : 0) +
    (fav ? 0.06 : 0) +
    modeScore * 0.2;

  return {
    recipe, have, total: required.length, missing,
    cookable: missing.length === 0,
    almostCookable: missing.length === 1,
    usesExpiring: expiringBoost > 0,
    fav, score,
  };
}

/* ── 모드 반영 전체 추천 ─────────────────── */
export function recommend(state, modeKey, { includeBlocked = false } = {}) {
  const mode = getMode(state, modeKey);
  const pool = allRecipes(state);
  const blocked = [];
  const list = pool.filter((r) => {
    if (mode.blockCaution && r.caution) { blocked.push(r); return false; }
    if (mode.exclude?.length && r.ingredients.some((g) => !g.st && mode.exclude.some((x) => sameIng(g.n, x)))) {
      blocked.push(r); return false;
    }
    return true;
  });
  const analyzed = list.map((r) => analyzeRecipe(r, state, mode)).sort((a, b) => b.score - a.score);
  return includeBlocked ? { analyzed, blocked } : analyzed;
}

/* ── 재료 활용 추천: 이 재료로 뭐 하지? ──── */
export function recipesUsing(state, name, modeKey) {
  return allRecipes(state)
    .filter((r) => r.ingredients.some((g) => !g.st && sameIng(g.n, name)))
    .map((r) => analyzeRecipe(r, state, modeKey))
    .sort((a, b) => b.score - a.score);
}

/* ── 임박/잔반 ───────────────────────────── */
export function expiringItems(state, days = 3) {
  return state.pantry
    .filter((p) => daysLeft(p.expiresAt) <= days)
    .sort((a, b) => daysLeft(a.expiresAt) - daysLeft(b.expiresAt));
}

export function activeLeftovers(state) {
  return state.leftovers
    .filter((l) => l.status === 'active')
    .sort((a, b) => daysLeft(a.expiresAt) - daysLeft(b.expiresAt));
}

/* ── 요리 완료 차감 계획 ─────────────────── */
export function deductionPlan(recipe, state, servings = 1) {
  const plan = [];
  for (const g of recipe.ingredients) {
    if (g.st) continue;
    const item = findPantryItem(state.pantry, g.n);
    if (!item) continue;
    if (item.qtyType === 'level') {
      plan.push({ item, skip: true, label: '양념 — 차감 안 함' });
    } else {
      const need = Math.round((g.a || 1) * servings * 100) / 100;
      plan.push({ item, need, after: Math.max(0, Math.round((item.qty - need) * 100) / 100) });
    }
  }
  return plan;
}
