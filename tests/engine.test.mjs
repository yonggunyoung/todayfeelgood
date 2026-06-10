// 추천/차감 엔진 스모크 테스트 — node tests/engine.test.mjs
import assert from 'node:assert';
import { RECIPES } from '../js/data/recipes.js';
import { ING, findIng, defaultShelf, defaultLocation } from '../js/data/ingredients.js';
import { recommend, analyzeRecipe, deductionPlan, expiringItems } from '../js/engine.js';

const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

const state = {
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
assert.ok(recos.length > 10);
assert.ok(recos[0].score >= recos[recos.length - 1].score);
assert.ok(recos.slice(0, 5).some((x) => x.cookable), '상위 5개 안에 지금 가능 레시피가 있어야 함');

// 4) 운동 모드: 고단백 레시피 점수 상승
const fit = recommend(state, 'fitness');
const eggRiceFit = fit.find((x) => x.recipe.id === 'egg-rice');
const tofuScr = fit.find((x) => x.recipe.id === 'tofu-scramble');
assert.ok(tofuScr.score > 0, '두부 스크램블 점수 존재');
assert.ok(eggRiceFit, '운동 모드에도 전체 레시피 노출');

// 5) 산모 모드: 참치(주의) 레시피 제외
const { analyzed, blocked } = recommend(state, 'maternity', { includeBlocked: true });
assert.ok(blocked.length >= 2, '주의 레시피가 차단 목록에 있어야 함');
assert.ok(!analyzed.some((x) => x.recipe.caution), '추천 목록에 주의 레시피가 없어야 함');

// 6) 차감 계획: 2인분 → 계란 4개 차감, 양념(간장)은 전표에서 제외
const plan = deductionPlan(eggRice, state, 2);
const eggLine = plan.find((p) => p.item.name === '계란');
assert.strictEqual(eggLine.need, 4);
assert.strictEqual(eggLine.after, 2);
assert.ok(!plan.some((p) => p.item.name === '간장'), '양념(staple)은 차감표에 나오지 않음');

// 6-1) 비양념 level 재료(김치)는 "차감 안 함" 라벨로 표시
state.pantry.push({ id: 'e', name: '김치', qtyType: 'level', unit: '통', level: 'half', location: 'fridge', expiresAt: nextMonth, price: 10000, emoji: '🥬' });
const kimchiPlan = deductionPlan(RECIPES.find((r) => r.id === 'kimchi-jjigae'), state, 1);
const kimchiLine = kimchiPlan.find((p) => p.item.name === '김치');
assert.strictEqual(kimchiLine.skip, true, 'level 재료는 자동 차감하지 않음');

// 7) 임박 재료: 내일 만료 두부 포함
const exp = expiringItems(state, 3);
assert.ok(exp.some((p) => p.name === '두부'));

// 8) 데이터 무결성: 모든 레시피 비양념 재료가 마스터에 매핑됨
for (const r of RECIPES) {
  for (const g of r.ingredients) {
    if (g.st) continue;
    assert.ok(findIng(g.n), `레시피 [${r.title}] 재료 [${g.n}]가 마스터 사전에 없음`);
  }
}
assert.ok(ING.length >= 70, '재료 사전 70종 이상');
assert.ok(RECIPES.length >= 35, '레시피 35종 이상');

console.log(`✓ 엔진 스모크 테스트 통과 — 레시피 ${RECIPES.length}종, 재료 ${ING.length}종`);
