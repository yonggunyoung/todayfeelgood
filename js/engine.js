// 추천 엔진 — 전부 비AI(정렬·필터). 변동비 0원으로 무제한 동작하는 코어.
// 프리셋 모드 + 사용자가 만든 맞춤 모드를 같은 파이프라인으로 처리한다.
import { RECIPES } from './data/recipes.js';
import { findIng } from './data/ingredients.js';
import { recipeNeedBase } from './units.js';
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

/* ── 커뮤니티 평점(다른 사용자들의 별점 집계) — main에서 서버 값을 주입 ── */
let CSTATS = {}; // { [recipeId]: { s: sum, c: count } }
export function setCommunityStats(map) { CSTATS = map || {}; }
export function communityRating(id) { const x = CSTATS[id]; return x && x.c ? { avg: Math.round((x.s / x.c) * 10) / 10, count: x.c } : null; }

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

// 같은 재료의 모든 배치를 임박순으로 — 선입선출(FIFO)의 기반
function findPantryBatches(pantry, name) {
  const target = findIng(name);
  return pantry
    .filter((p) => {
      if (p.name === name) return true;
      const pi = findIng(p.name);
      return target && pi && pi.name === target.name;
    })
    .sort((a, b) => daysLeft(a.expiresAt) - daysLeft(b.expiresAt));
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
  // 내 별점 — 추천 가중(5★:+0.13 … 3★:0 … 1★:-0.13). 낮게 준 건 가라앉고 높게 준 건 위로.
  const rating = (state.ratings || {})[recipe.id] || 0;
  const ratingScore = rating ? ((rating - 3) / 2) * 0.13 : 0;
  // 커뮤니티 평점 — 표본(count)이 많을수록 신뢰. 최대 +0.10(평균 5★·20명 이상).
  const cr = CSTATS[recipe.id];
  const cAvg = cr && cr.c ? cr.s / cr.c : 0;
  const commScore = cAvg ? ((cAvg - 3) / 2) * Math.min(1, cr.c / 20) * 0.10 : 0;

  const score =
    coverage * 0.42 +
    Math.min(1, expiringBoost / 2) * 0.2 +
    (missing.length === 0 ? 0.12 : missing.length === 1 ? 0.04 : 0) +
    (fav ? 0.06 : 0) +
    modeScore * 0.2 +
    ratingScore + commScore;

  return {
    recipe, have, total: required.length, missing,
    cookable: required.length > 0 && missing.length === 0, // 영상만 저장(재료 0)은 "지금 가능" 아님
    almostCookable: missing.length === 1,
    usesExpiring: expiringBoost > 0,
    fav, rating, community: cr && cr.c ? { avg: Math.round(cAvg * 10) / 10, count: cr.c } : null, score,
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

/* ── 요리 완료 차감 계획 — 선입선출(FIFO): 같은 재료가 여러 배치면 임박한 것부터 소진 ── */
export function deductionPlan(recipe, state, servings = 1) {
  const plan = [];
  for (const g of recipe.ingredients) {
    if (g.st) continue;
    const batches = findPantryBatches(state.pantry, g.n);
    if (!batches.length) continue;
    if (batches[0].qtyType === 'level') {
      plan.push({ item: batches[0], skip: true, label: '양념 — 차감 안 함' });
      continue;
    }
    // 레시피 단위(근·팩·개…)를 재고의 base 단위(g·ml·고유)로 환산해 정확히 차감
    const ing = findIng(g.n);
    let need = Math.round(recipeNeedBase(ing, g.a, g.u) * servings * 100) / 100;
    for (const item of batches) {
      if (need <= 0) break;
      const take = Math.min(item.qty, need);
      if (take <= 0) continue;
      plan.push({
        item, need: take,
        after: Math.max(0, Math.round((item.qty - take) * 100) / 100),
        fifo: batches.length > 1,
      });
      need = Math.round((need - take) * 100) / 100;
    }
  }
  return plan;
}

/* ── 같이 요리: 여러 레시피 → 통합 조리 타임라인 (비AI 휴리스틱) ──
   원칙: ① 손질은 전부 먼저 모아서 ② 오래 걸리는 요리부터 불에 올리고
        ③ 끓이는·굽는 대기 시간에 다른 요리 단계를 끼워넣는다 */
const PREP_RE = /(썰|다듬|다지|씻|손질|불리|재워|밑간|풀어|섞어 ?둔|깐다|까서|데쳐 ?둔)/;
const PASSIVE_RE = /(끓인다|끓이|조린다|조리|굽는다|구워|튀긴|찐다|쪄|오븐|기다|동안|분간|뜸)/;

export function buildCookPlan(recipes) {
  const list = recipes.slice().sort((a, b) => (b.time || 10) - (a.time || 10));

  // 통합 재료 (양념 제외 합산)
  const merged = new Map();
  for (const r of list) {
    for (const g of r.ingredients) {
      if (g.st) continue;
      const key = findIng(g.n)?.name || g.n;
      const cur = merged.get(key);
      if (cur && cur.u === (g.u || '')) cur.a = Math.round((cur.a + (g.a || 0)) * 100) / 100;
      else if (!cur) merged.set(key, { n: key, a: g.a || 0, u: g.u || '' });
      else merged.set(key + '·' + r.title, { n: key, a: g.a || 0, u: g.u || '' });
    }
  }

  // 각 레시피의 선두 손질 단계 분리
  const prep = [];
  const queues = list.map((r) => {
    const steps = (r.steps || []).slice();
    while (steps.length > 1 && PREP_RE.test(steps[0])) {
      prep.push({ recipe: r.title, emoji: r.emoji || '🍳', text: steps.shift() });
    }
    return { r, steps };
  });

  // 타임라인: 긴 요리부터, 대기 단계 뒤엔 다른 요리를 끼워넣기
  const timeline = [];
  const pending = queues.filter((q) => q.steps.length);
  let main = 0;
  while (pending.some((q) => q.steps.length)) {
    if (!pending[main] || !pending[main].steps.length) {
      main = pending.findIndex((q) => q.steps.length);
      if (main < 0) break;
    }
    const q = pending[main];
    const text = q.steps.shift();
    timeline.push({ recipe: q.r.title, emoji: q.r.emoji || '🍳', text, parallel: false });
    if (PASSIVE_RE.test(text)) {
      // 기다리는 동안 → 다른 요리에서 한 단계
      const other = pending.find((o, i) => i !== main && o.steps.length);
      if (other) {
        timeline.push({
          recipe: other.r.title, emoji: other.r.emoji || '🍳',
          text: other.steps.shift(), parallel: true,
        });
      }
    }
  }

  const totalTime = Math.max(...list.map((r) => r.time || 10)) + (list.length - 1) * 5;
  return {
    titles: list.map((r) => `${r.emoji || '🍳'} ${r.title}`),
    estTime: totalTime,
    ingredients: [...merged.values()],
    prep,
    timeline,
  };
}
