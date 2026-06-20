// js/units.js — 입고·표시·차감을 "실제 단위"로 정밀 처리하는 단위 변환 레이어.
// 원칙: 고기·해산물은 g(그램) 기준으로 추적/차감, 계란 등은 판/구를 개수로 환산.
// 그 외 품목은 기존 고유 단위(모·팩·봉·단…)를 그대로 base로 사용.
// measure: count(개수) | weight(무게·g) | volume(부피·ml) | level(가늠 — 차감 안 함)

// 무게로 구매·사용하는 재료 — base는 'g'. pack=1팩 그램, piece=1마리/조각 그램(선택).
const WEIGHT = {
  삼겹살: { pack: 500 }, 돼지목살: { pack: 500 }, 다짐육: { pack: 500 }, 소고기: { pack: 400 },
  닭가슴살: { pack: 230, piece: 120 }, 닭다리살: { pack: 400 }, 항정살: { pack: 400 }, 우삼겹: { pack: 500 },
  소갈비: { pack: 700 }, 돼지갈비: { pack: 700 }, 오리고기: { pack: 400 }, 닭날개: { pack: 500, piece: 60 },
  닭똥집: { pack: 400 }, 새우: { pack: 300 }, 연어: { pack: 300 }, 광어: { pack: 400 },
  쭈꾸미: { pack: 400 }, 굴: { pack: 300 }, 바지락: { pack: 400 }, 홍합: { pack: 500 },
};
// 부피로 다루면 좋은 재료 — base는 'ml'. pack=1팩/병 ml.
const VOLUME = {
  우유: { pack: 900 }, 두유: { pack: 190 }, 생크림: { pack: 500 },
};
// 개수지만 포장 단위가 여러 가지인 재료 — [표시 라벨, base(개)당 환산]
const COUNT_PACKS = {
  계란: [['개', 1], ['판(30구)', 30], ['반판(15구)', 15], ['10구', 10], ['6구', 6]],
  메추리알: [['알', 1], ['팩(20알)', 20]],
};

const G_UNIT = { g: 1, kg: 1000, 근: 600, 관: 3750 };
const ML_UNIT = { ml: 1, L: 1000, cc: 1, 컵: 200 };

export function isWeight(ing) { return !!(ing && WEIGHT[ing.name]); }
export function isVolume(ing) { return !!(ing && VOLUME[ing.name]); }
export function measureOf(ing) {
  if (!ing) return 'count';
  if (ing.qtyType === 'level') return 'level';
  if (WEIGHT[ing.name]) return 'weight';
  if (VOLUME[ing.name]) return 'volume';
  return 'count';
}

// 저장·차감의 기준(base) 단위
export function baseUnit(ing) {
  if (isWeight(ing)) return 'g';
  if (isVolume(ing)) return 'ml';
  return (ing && ing.unit) || '개';
}

// 단위 u 1개 = base 몇 개 (무게=g, 부피=ml, 개수=고유)
export function perBase(ing, u) {
  if (isWeight(ing)) {
    const w = WEIGHT[ing.name] || {};
    if (G_UNIT[u] != null) return G_UNIT[u];
    if (u === '팩') return w.pack || 400;
    if (u === '마리' || u === '조각') return w.piece || w.pack || 400;
    return w.pack || 400;
  }
  if (isVolume(ing)) {
    const v = VOLUME[ing.name] || {};
    if (ML_UNIT[u] != null) return ML_UNIT[u];
    if (u === '팩' || u === '병') return v.pack || 500;
    return v.pack || 500;
  }
  if (ing && COUNT_PACKS[ing.name]) {
    const f = COUNT_PACKS[ing.name].find(([lbl]) => lbl === u);
    if (f) return f[1];
  }
  return 1; // 고유 단위 = base 그 자체
}

// 입고/수정에서 고를 수 있는 단위 옵션 [{u, per}]
export function unitOptions(ing) {
  if (!ing) return [{ u: '개', per: 1 }];
  if (ing.qtyType === 'level') return [];
  if (isWeight(ing)) {
    const w = WEIGHT[ing.name] || {};
    return [{ u: 'g', per: 1 }, { u: '근', per: 600 }, { u: 'kg', per: 1000 }, { u: '팩', per: w.pack || 400 }];
  }
  if (isVolume(ing)) {
    const v = VOLUME[ing.name] || {};
    return [{ u: 'ml', per: 1 }, { u: '컵', per: 200 }, { u: 'L', per: 1000 }, { u: '팩', per: v.pack || 500 }];
  }
  if (COUNT_PACKS[ing.name]) return COUNT_PACKS[ing.name].map(([u, per]) => ({ u, per }));
  return [{ u: ing.unit || '개', per: 1 }];
}

// 입고 입력(amount, u) → base 수량
export function toBase(ing, amount, u) {
  const a = Number(amount) || 0;
  const v = a * perBase(ing, u);
  return (isWeight(ing) || isVolume(ing)) ? Math.round(v) : Math.round(v * 100) / 100;
}

// 레시피 재료(a, u) → 이 재료의 base 필요량
export function recipeNeedBase(ing, a, u) {
  const amt = a || 1;
  // 단위 미지정이면 재료의 고유 단위로 해석(근/팩 하드코딩 금지)
  if (isWeight(ing) || isVolume(ing)) return Math.round(amt * perBase(ing, u || (ing && ing.unit) || (isWeight(ing) ? 'g' : 'ml')));
  return Math.round(amt * 100) / 100; // 개수형: 레시피·재고가 같은 고유 단위라고 가정
}

// base 수량 → 표시 문자열
export function fmtBase(ing, q) {
  const n = Number(q) || 0;
  if (isWeight(ing)) return n >= 1000 ? (Math.round(n / 100) / 10) + 'kg' : Math.round(n) + 'g';
  if (isVolume(ing)) return n >= 1000 ? (Math.round(n / 100) / 10) + 'L' : Math.round(n) + 'ml';
  return (Math.round(n * 100) / 100) + (baseUnit(ing));
}

// 단위 문자열만 보고 표시(재료 사전에 없을 때 — 커스텀 품목)
export function fmtRaw(unit, q) {
  const n = Number(q) || 0;
  if (unit === 'g') return n >= 1000 ? (Math.round(n / 100) / 10) + 'kg' : Math.round(n) + 'g';
  if (unit === 'ml') return n >= 1000 ? (Math.round(n / 100) / 10) + 'L' : Math.round(n) + 'ml';
  return (Math.round(n * 100) / 100) + (unit || '');
}

// 스텝(＋/−) 단위 — base 기준
export function stepFor(ing) {
  if (isWeight(ing)) return 50;   // 50g
  if (isVolume(ing)) return 50;   // 50ml
  return 1;                        // 1개/모/팩…
}

// 입고 기본값 추천 (amount + 표시 단위)
export function defaultEntry(ing) {
  if (isWeight(ing)) return { amount: WEIGHT[ing.name]?.pack || 400, u: 'g' };
  if (isVolume(ing)) return { amount: VOLUME[ing.name]?.pack || 500, u: 'ml' };
  if (ing && COUNT_PACKS[ing.name]) return { amount: 1, u: COUNT_PACKS[ing.name][0][0] };
  return { amount: 1, u: baseUnit(ing) };
}
