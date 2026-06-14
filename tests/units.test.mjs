// 단위 변환 + 차감 정확성 테스트
import { findIng } from '../js/data/ingredients.js';
import { baseUnit, toBase, recipeNeedBase, fmtBase, isWeight, measureOf, unitOptions } from '../js/units.js';
import { deductionPlan } from '../js/engine.js';

let pass = 0, fail = 0;
const eq = (a, b, msg) => { if (a === b) { pass++; } else { fail++; console.error(`✗ ${msg}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`); } };

const egg = findIng('계란');
const pork = findIng('삼겹살');
const chick = findIng('닭가슴살');
const tofu = findIng('두부');

// 계란: 판/구/개 환산 + 표시
eq(baseUnit(egg), '개', '계란 base=개');
eq(toBase(egg, 1, '판(30구)'), 30, '1판 = 30개');
eq(toBase(egg, 1, '10구'), 10, '10구 = 10개');
eq(toBase(egg, 5, '개'), 5, '5개 = 5');
eq(recipeNeedBase(egg, 2, '개'), 2, '레시피 계란 2개');
eq(fmtBase(egg, 30), '30개', '계란 표시 30개');

// 삼겹살: 무게(g) 추적, 근/kg/팩 환산
eq(isWeight(pork), true, '삼겹살=무게');
eq(baseUnit(pork), 'g', '삼겹살 base=g');
eq(toBase(pork, 1, '근'), 600, '1근 = 600g');
eq(toBase(pork, 1, 'kg'), 1000, '1kg = 1000g');
eq(toBase(pork, 500, 'g'), 500, '500g = 500');
eq(recipeNeedBase(pork, 0.3, '근'), 180, '레시피 0.3근 = 180g');
eq(fmtBase(pork, 180), '180g', '삼겹살 표시 180g');
eq(fmtBase(pork, 1200), '1.2kg', '삼겹살 1200g→1.2kg');

// 닭가슴살: 팩→g
eq(recipeNeedBase(chick, 1, '팩'), 230, '닭가슴살 1팩 = 230g');

// 두부: 개수형 고유단위 유지
eq(measureOf(tofu), 'count', '두부=개수');
eq(baseUnit(tofu), '모', '두부 base=모');
eq(recipeNeedBase(tofu, 0.5, '모'), 0.5, '두부 0.5모');

// unitOptions 형태
eq(unitOptions(pork).some((o) => o.u === 'g'), true, '삼겹살 옵션에 g');
eq(unitOptions(egg).some((o) => o.u === '판(30구)'), true, '계란 옵션에 판');

// 차감: 삼겹살 600g 재고에서 0.3근(180g) 사용 → 420g
const state = {
  pantry: [{ id: 'a', name: '삼겹살', qtyType: 'bundle', unit: 'g', qty: 600, expiresAt: '2099-01-01' }],
  myRecipes: [],
};
const recipe = { id: 't', title: '테스트', ingredients: [{ n: '삼겹살', a: 0.3, u: '근' }] };
const plan = deductionPlan(recipe, state, 1);
eq(plan.length, 1, '차감 1건');
eq(plan[0].need, 180, '필요 180g');
eq(plan[0].after, 420, '차감 후 420g');

// 계란 2개 차감 (개수형)
const st2 = { pantry: [{ id: 'b', name: '계란', qtyType: 'count', unit: '개', qty: 30, expiresAt: '2099-01-01' }], myRecipes: [] };
const r2 = { id: 't2', title: 'eggtest', ingredients: [{ n: '계란', a: 2, u: '개' }] };
const p2 = deductionPlan(r2, st2, 1);
eq(p2[0].after, 28, '계란 30→28');

console.log(`\n단위/차감 테스트: ${pass} 통과, ${fail} 실패`);
process.exit(fail ? 1 : 0);
