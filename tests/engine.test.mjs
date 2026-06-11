// 추천/차감 엔진 스모크 테스트 — node tests/engine.test.mjs
import assert from 'node:assert';
import { RECIPES } from '../js/data/recipes.js';
import { ING, findIng, defaultShelf, defaultLocation } from '../js/data/ingredients.js';
import { recommend, analyzeRecipe, deductionPlan, expiringItems, recipesUsing, modeList, getMode } from '../js/engine.js';

const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

const state = {
  settings: { mode: 'none', customModes: [] },
  myRecipes: [],
  favs: [],
  pantry: [
    { id: 'a', name: '계란', qtyType: 'count', unit: '개', qty: 6, location: 'fridge', expiresAt: nextMonth, price: 500, emoji: '🥚' },
    { id: 'b', name: '즉석밥', qtyType: 'count', unit: '개', qty: 2, location: 'room', expiresAt: nextMonth, price: 1100, emoji: '🍚' },
    { id: 'c', name: '간장', qtyType: 'level', unit: '병', level: 'half', location: 'room', expiresAt: nextMonth, price: 4000, emoji: '🍶' },
    { id: 'd', name: '두부', qtyType: 'count', unit: '모', qty: 1, location: 'fridge', expiresAt: tomorrow, price: 1800, emoji: '⬜' },
  ],
  leftovers: [],
};

// 1) 재료 정규화
assert.strictEqual(findIng('서울우유').name, '우유');
assert.strictEqual(findIng('햇반').name, '즉석밥');
assert.strictEqual(findIng('달걀').name, '계란');
assert.ok(defaultShelf(findIng('계란'), 'fridge') === 30);
assert.ok(['fridge', 'room', 'freezer'].includes(defaultLocation(findIng('라면'))));

// 2) 간장계란밥 = 계란+즉석밥 보유 + 간장(양념) → cookable
const eggRice = RECIPES.find((r) => r.id === 'egg-rice');
const a = analyzeRecipe(eggRice, state, 'none');
assert.strictEqual(a.cookable, true, '간장계란밥은 지금 가능이어야 함');
assert.strictEqual(a.missing.length, 0);

// 3) 추천 정렬: cookable 레시피가 상위권
const recos = recommend(state, 'none');
assert.ok(recos.length > 30);
assert.ok(recos[0].score >= recos[recos.length - 1].score);
assert.ok(recos.slice(0, 5).some((x) => x.cookable), '상위 5개 안에 지금 가능 레시피가 있어야 함');

// 4) 운동 모드: 고단백 레시피 점수 상승
const fit = recommend(state, 'fitness');
assert.ok(fit.find((x) => x.recipe.id === 'tofu-scramble').score > 0);

// 5) 산모 모드: 주의(참치) 레시피 제외
const { analyzed, blocked } = recommend(state, 'maternity', { includeBlocked: true });
assert.ok(blocked.length >= 2, '주의 레시피가 차단 목록에 있어야 함');
assert.ok(!analyzed.some((x) => x.recipe.caution), '추천 목록에 주의 레시피가 없어야 함');

// 6) 반찬 모드: 반찬 태그 레시피가 비반찬 동급 대비 가산점
const ban = recommend(state, 'banchan');
const jangjorim = ban.find((x) => x.recipe.id === 'gyeran-jangjorim');
const nonBanchan = analyzeRecipe(RECIPES.find((r) => r.id === 'gyeran-jangjorim'), state, 'none');
assert.ok(jangjorim.score > nonBanchan.score, '반찬 모드에서 반찬 태그 가산점이 붙어야 함');

// 7) 맞춤 모드: 제외 재료(두부)가 든 레시피는 숨김 + 선호 태그 가산
const custom = {
  settings: {
    mode: 'c_test',
    customModes: [{ key: 'c_test', label: '야식', emoji: '🌙', protein: false, expiring: true, zeroExtra: true, prefTags: ['초간단'], exclude: ['두부'] }],
  },
  myRecipes: [], favs: [], pantry: state.pantry, leftovers: [],
};
const cm = recommend(custom, 'c_test', { includeBlocked: true });
assert.ok(cm.blocked.some((r) => r.id === 'tofu-scramble'), '두부 레시피가 제외돼야 함');
assert.ok(!cm.analyzed.some((r) => r.recipe.id === 'dubu-jorim'), '두부조림도 숨겨져야 함');
assert.ok(getMode(custom, 'c_test').label === '야식');
assert.ok(modeList(custom).length === 6, '프리셋 5 + 커스텀 1');

// 8) 내 레시피 병합 + 즐겨찾기 가산
const mine = {
  ...state,
  myRecipes: [{ id: 'my-1', mine: true, title: '우리집 계란탕', emoji: '🥚', tags: ['국물'], protein: 12, time: 8, kcal: 150,
    ingredients: [{ n: '계란', a: 2, u: '개' }], steps: ['끓인다'] }],
  favs: ['my-1'],
};
const mineRecos = recommend(mine, 'none');
const myEntry = mineRecos.find((x) => x.recipe.id === 'my-1');
assert.ok(myEntry, '내 레시피가 추천 풀에 포함돼야 함');
assert.ok(myEntry.cookable && myEntry.fav, '계란 보유로 cookable + 즐겨찾기 표시');

// 9) 차감 계획: 2인분 → 계란 4개 차감, 양념(간장)은 전표에서 제외
const plan = deductionPlan(eggRice, state, 2);
const eggLine = plan.find((p) => p.item.name === '계란');
assert.strictEqual(eggLine.need, 4);
assert.strictEqual(eggLine.after, 2);
assert.ok(!plan.some((p) => p.item.name === '간장'), '양념(staple)은 차감표에 나오지 않음');

// 9-1) 비양념 level 재료(김치)는 "차감 안 함" 라벨
state.pantry.push({ id: 'e', name: '김치', qtyType: 'level', unit: '통', level: 'half', location: 'fridge', expiresAt: nextMonth, price: 10000, emoji: '🥬' });
const kimchiPlan = deductionPlan(RECIPES.find((r) => r.id === 'kimchi-jjigae'), state, 1);
assert.strictEqual(kimchiPlan.find((p) => p.item.name === '김치').skip, true);

// 10) 재료 활용 추천: 두부를 쓰는 레시피가 나온다
const ideas = recipesUsing(state, '두부', 'none');
assert.ok(ideas.length >= 3 && ideas.every((x) => x.recipe.ingredients.some((g) => !g.st && findIng(g.n)?.name === '두부')));

// 10-1) 선입선출(FIFO): 계란이 두 배치(임박 2개 + 신선 6개)일 때 4개 차감 → 임박 배치부터 소진
const fifoState = {
  ...state,
  pantry: [
    { id: 'new', name: '계란', qtyType: 'count', unit: '개', qty: 6, location: 'fridge', expiresAt: nextMonth, price: 500, emoji: '🥚' },
    { id: 'old', name: '계란', qtyType: 'count', unit: '개', qty: 2, location: 'fridge', expiresAt: tomorrow, price: 500, emoji: '🥚' },
    { id: 'rice', name: '즉석밥', qtyType: 'count', unit: '개', qty: 2, location: 'room', expiresAt: nextMonth, price: 1100, emoji: '🍚' },
  ],
};
const fifoPlan = deductionPlan(eggRice, fifoState, 2); // 계란 4개 필요
const eggLines = fifoPlan.filter((p) => p.item.name === '계란');
assert.strictEqual(eggLines.length, 2, '두 배치에 걸쳐 차감돼야 함');
assert.strictEqual(eggLines[0].item.id, 'old', '임박 배치가 먼저');
assert.strictEqual(eggLines[0].need, 2);
assert.strictEqual(eggLines[0].after, 0);
assert.strictEqual(eggLines[1].item.id, 'new');
assert.strictEqual(eggLines[1].need, 2);
assert.strictEqual(eggLines[1].after, 4);
assert.ok(eggLines[0].fifo && eggLines[1].fifo, 'FIFO 표시 플래그');

// 10-2) 영상만 저장(재료 0개) 레시피는 "지금 가능" 배지가 붙지 않는다
const videoOnly = { ...state, myRecipes: [{ id: 'my-v', mine: true, videoOnly: true, title: '영상', yt: 'x', ingredients: [], steps: [], tags: [] }], favs: [] };
const vo = recommend(videoOnly, 'none').find((x) => x.recipe.id === 'my-v');
assert.strictEqual(vo.cookable, false, '재료 없는 레시피는 cookable 아님');
assert.strictEqual(vo.total, 0);

// 11) 임박 재료 + 데이터 무결성
assert.ok(expiringItems(state, 3).some((p) => p.name === '두부'));
for (const r of RECIPES) {
  for (const g of r.ingredients) {
    if (g.st) continue;
    assert.ok(findIng(g.n), `레시피 [${r.title}] 재료 [${g.n}]가 마스터 사전에 없음`);
  }
}
assert.ok(ING.length >= 75, '재료 사전 75종 이상');
assert.ok(RECIPES.length >= 55, '레시피 55종 이상');
assert.ok(RECIPES.filter((r) => r.tags.includes('반찬')).length >= 7, '반찬 레시피 7종 이상');

console.log(`✓ 엔진 스모크 테스트 통과 — 레시피 ${RECIPES.length}종 (반찬 ${RECIPES.filter((r) => r.tags.includes('반찬')).length}종), 재료 ${ING.length}종, 모드 프리셋 ${modeList(state).length}종`);
