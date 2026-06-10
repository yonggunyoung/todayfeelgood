// 추천 엔진 — 전부 비AI(정렬·필터). 변동비 0원으로 무제한 동작하는 코어.
import { RECIPES } from './data/recipes.js';
import { findIng } from './data/ingredients.js';
import { daysLeft } from './store.js';

// 보유 판단: 팬트리에서 재료명 매칭 (마스터 기준 정규화)
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

// 레시피 1개 분석: 보유/부족/임박활용/점수
export function analyzeRecipe(recipe, state, mode) {
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
  let modeScore = 0;
  if (mode === 'fitness') modeScore = Math.min(1, (recipe.protein || 0) / 40);
  else if (mode === 'frugal') modeScore = (missing.length === 0 ? 0.6 : 0) + Math.min(0.4, expiringBoost * 0.2);
  else if (mode === 'maternity') modeScore = recipe.tags.includes('순한맛') || recipe.tags.includes('국물') ? 0.5 : 0.2;

  const score =
    coverage * 0.45 +
    Math.min(1, expiringBoost / 2) * 0.25 +
    (missing.length === 0 ? 0.15 : missing.length === 1 ? 0.05 : 0) +
    modeScore * 0.15;

  return {
    recipe,
    have,
    total: required.length,
    missing,
    cookable: missing.length === 0,
    almostCookable: missing.length === 1,
    usesExpiring: expiringBoost > 0,
    score,
  };
}

// 모드 반영 전체 추천 목록
export function recommend(state, mode, { includeBlocked = false } = {}) {
  let list = RECIPES;
  let blocked = [];
  if (mode === 'maternity') {
    blocked = RECIPES.filter((r) => r.caution);
    list = RECIPES.filter((r) => !r.caution);
  }
  const analyzed = list.map((r) => analyzeRecipe(r, state, mode)).sort((a, b) => b.score - a.score);
  return includeBlocked ? { analyzed, blocked } : analyzed;
}

// 임박 재료 (D-day 이하)
export function expiringItems(state, days = 3) {
  return state.pantry
    .filter((p) => daysLeft(p.expiresAt) <= days)
    .sort((a, b) => daysLeft(a.expiresAt) - daysLeft(b.expiresAt));
}

// 활성 잔반 (임박순)
export function activeLeftovers(state) {
  return state.leftovers
    .filter((l) => l.status === 'active')
    .sort((a, b) => daysLeft(a.expiresAt) - daysLeft(b.expiresAt));
}

// 요리 완료 시 차감 계획 산출 — count/bundle만 차감, level(양념)은 건드리지 않음
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
