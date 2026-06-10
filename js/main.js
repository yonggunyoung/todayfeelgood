// 냉비서 — 화면 렌더링과 상호작용 전부. 프레임워크 없는 단일 페이지 앱.
import { S, save, MODES, uid, today, addDays, daysLeft, won } from './store.js';
import { ING, findIng, defaultShelf, defaultLocation } from './data/ingredients.js';
import { RECIPES } from './data/recipes.js';
import { recommend, expiringItems, activeLeftovers, deductionPlan } from './engine.js';
import { scanImage } from './ai.js';
import { initSync, sync, makeSpaceCode } from './sync.js';

let tab = 'home';
let pantryLoc = 'all';
let recipeQuery = '';
let scanFile = null;
let scanResults = null;
let deductCtx = null;

const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const LOC_LABEL = { fridge: '냉장', freezer: '냉동', room: '실온' };
const LEVELS = [['full', '가득'], ['half', '절반'], ['low', '조금'], ['empty', '없음']];

window.UI = {};

/* ── 공용 위젯 ─────────────────────────────── */
function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  $('#toast-root').appendChild(el);
  setTimeout(() => el.remove(), 2200);
}

function openSheet(html) {
  $('#modal-root').innerHTML =
    `<div class="overlay" onclick="if(event.target===this)UI.closeSheet()">
       <div class="sheet"><div class="grip"></div>${html}</div>
     </div>`;
}
UI.closeSheet = () => { $('#modal-root').innerHTML = ''; scanFile = null; scanResults = null; deductCtx = null; };

function stampFor(days) {
  if (days <= 1) return `<span class="stamp stamp-danger">${days < 0 ? '기한지남' : 'D-' + Math.max(0, days)}</span>`;
  if (days <= 3) return `<span class="stamp stamp-warn">D-${days}</span>`;
  return `<span class="stamp stamp-ok">D-${days}</span>`;
}

function qtyLabel(p) {
  if (p.qtyType === 'level') return (LEVELS.find(([v]) => v === p.level) || [])[1] || '보통';
  return `${p.qty}${p.unit || ''}`;
}

/* ── 상단바 ─────────────────────────────── */
function renderTop() {
  const d = new Date();
  $('#top-date').textContent = `${d.getMonth() + 1}월 ${d.getDate()}일 · ${['일', '월', '화', '수', '목', '금', '토'][d.getDay()]}요일`;
  $('#saved-badge').textContent = won(S.ledger.saved);
  const badge = $('#sync-badge');
  const map = { off: ['로컬', 'pill pill-muted'], connecting: ['연결중…', 'pill pill-muted'], on: ['동기화 ON', 'pill pill-on'], error: ['동기화 오류', 'pill pill-err'] };
  const [label, cls] = map[sync.status] || map.off;
  badge.textContent = label;
  badge.className = cls;
}

/* ── 홈 ─────────────────────────────── */
function greeting() {
  const h = new Date().getHours();
  if (h < 10) return '좋은 아침이에요.';
  if (h < 15) return '점심은 챙기셨나요?';
  if (h < 21) return '오늘 저녁,';
  return '늦은 밤의 한 끼,';
}

function renderHome() {
  const mode = S.settings.mode;
  const recos = recommend(S, mode).slice(0, 3);
  const expiring = expiringItems(S, 3);
  const leftovers = activeLeftovers(S);
  const empty = S.pantry.length === 0;

  let firstEat = '';
  if (leftovers.length || expiring.length) {
    firstEat = `<div class="section-title"><h2>🔥 먼저 먹어요</h2><small>잔반과 임박 재료</small></div>` +
      leftovers.map((l) => `
        <div class="item ${daysLeft(l.expiresAt) <= 1 ? 'danger' : ''}">
          <span class="emoji">🍱</span>
          <div class="grow"><div class="name">${esc(l.name)}</div>
            <div class="sub">남은 음식 · ${LOC_LABEL[l.location]} ${stampFor(daysLeft(l.expiresAt))}</div></div>
          <button class="btn btn-sm btn-primary" onclick="UI.leftoverDone('${l.id}','eaten')">먹었어요</button>
          <button class="btn btn-sm btn-soft" onclick="UI.leftoverDone('${l.id}','wasted')">버림</button>
        </div>`).join('') +
      expiring.map((p) => `
        <div class="item" onclick="UI.editPantry('${p.id}')">
          <span class="emoji">${p.emoji}</span>
          <div class="grow"><div class="name">${esc(p.name)}</div><div class="sub">${qtyLabel(p)} · ${LOC_LABEL[p.location]}</div></div>
          ${stampFor(daysLeft(p.expiresAt))}
        </div>`).join('');
  }

  const recoHtml = empty ? '' :
    `<div class="section-title"><h2>${MODES[mode].emoji} 오늘의 추천</h2>
       <small onclick="UI.go('recipes')" style="cursor:pointer">전체 보기 →</small></div>` +
    (recos.every((r) => r.have === 0)
      ? `<div class="empty"><span class="e-emoji">🧺</span><b>매칭할 재료가 부족해요</b><small>냉장고에 재료를 몇 가지 담으면<br>바로 추천이 시작됩니다</small></div>`
      : recos.map(recipeCard).join(''));

  $('#view').innerHTML = `
    <div class="hero">
      <h1>${greeting()}<br><em>오늘 뭐 해먹지?</em></h1>
      <p>모드: ${MODES[mode].emoji} ${MODES[mode].label} — ${MODES[mode].desc}</p>
    </div>
    <div class="action-strip">
      <button class="btn btn-primary" onclick="UI.openScan()"><b>📷 AI 입고 스캔</b><small>영수증·장본 사진 한 장</small></button>
      <button class="btn" onclick="UI.openQuickAdd()"><b>➕ 빠른 추가</b><small>검색해서 2탭 등록</small></button>
    </div>
    ${empty ? `
      <div class="empty" style="margin-top:18px">
        <span class="e-emoji">🧊</span><b>냉장고가 비어 있어요</b>
        <small>지금 집에 있는 재료를 등록하면<br>오늘 해먹을 요리를 바로 추천해 드려요</small>
        <div class="btn-row" style="margin-top:14px">
          <button class="btn btn-accent" onclick="UI.starterPack()">🧺 기본 재료 한번에 담기</button>
        </div>
      </div>` : ''}
    ${firstEat}
    ${recoHtml}
    <div class="section-title"><h2>🧾 절약 장부</h2><small>요리 ${S.ledger.cooked}회 · 잔반 해결 ${S.ledger.leftoverEaten}회</small></div>
    <div class="card ledger-card">
      <div class="save"><div class="l-label">아낀 돈 (누적)</div><div class="l-val">${won(S.ledger.saved)}</div></div>
      <div class="waste"><div class="l-label">버린 돈 (누적)</div><div class="l-val">${won(S.ledger.wasted)}</div></div>
    </div>`;
}

UI.starterPack = () => {
  const names = ['계란', '양파', '대파', '김치', '즉석밥', '간장', '고추장', '식용유', '참기름', '다진마늘'];
  for (const n of names) addPantryByName(n, { silentToast: true });
  S.onboarded = true;
  save(); render();
  toast('기본 재료 10가지를 담았어요. 추천이 시작됩니다!');
};

/* ── 냉장고 ─────────────────────────────── */
function renderPantry() {
  const list = S.pantry
    .filter((p) => pantryLoc === 'all' || p.location === pantryLoc)
    .sort((a, b) => daysLeft(a.expiresAt) - daysLeft(b.expiresAt));

  $('#view').innerHTML = `
    <div class="hero"><h1>우리집 <em>냉장고</em></h1>
      <p>${S.pantry.length}개 보관 중 · 임박 ${expiringItems(S, 3).length}개</p></div>
    <div class="action-strip">
      <button class="btn btn-primary" onclick="UI.openScan()"><b>📷 AI 스캔</b><small>영수증/사진 입고</small></button>
      <button class="btn" onclick="UI.openQuickAdd()"><b>➕ 빠른 추가</b><small>검색 후 탭</small></button>
    </div>
    <div class="seg">
      ${['all', 'fridge', 'freezer', 'room'].map((l) =>
        `<button class="${pantryLoc === l ? 'on' : ''}" onclick="UI.setLoc('${l}')">${l === 'all' ? '전체' : LOC_LABEL[l]}</button>`).join('')}
    </div>
    ${list.length === 0
      ? `<div class="empty"><span class="e-emoji">🕳️</span><b>여긴 비어 있네요</b><small>위의 버튼으로 재료를 담아보세요</small></div>`
      : list.map((p) => `
        <div class="item ${daysLeft(p.expiresAt) <= 1 ? 'danger' : ''}" onclick="UI.editPantry('${p.id}')">
          <span class="emoji">${p.emoji}</span>
          <div class="grow"><div class="name">${esc(p.name)}</div>
            <div class="sub">${qtyLabel(p)} · ${LOC_LABEL[p.location]} · ~${p.expiresAt || '기한 없음'}</div></div>
          ${stampFor(daysLeft(p.expiresAt))}
        </div>`).join('')}`;
}

UI.setLoc = (l) => { pantryLoc = l; render(); };

function addPantryByName(rawName, { qty = 1, location, silentToast = false } = {}) {
  const ing = findIng(rawName);
  const name = ing ? ing.name : rawName;
  const loc = location || defaultLocation(ing);
  const existing = S.pantry.find((p) => p.name === name && p.location === loc);
  if (existing && existing.qtyType !== 'level') {
    existing.qty = Math.round((existing.qty + qty) * 100) / 100;
  } else if (!existing) {
    S.pantry.push({
      id: uid(), name, emoji: ing?.emoji || '🍽️',
      qtyType: ing?.qtyType || 'count', unit: ing?.unit || '개',
      qty: ing?.qtyType === 'level' ? 1 : qty, level: 'full',
      location: loc, expiresAt: addDays(defaultShelf(ing, loc)),
      price: ing?.price || 2000,
    });
  }
  save();
  if (!silentToast) toast(`${name} 담았어요`);
}
UI.addPantryByName = (n) => { addPantryByName(n); renderQuickAddGrid(); };

UI.openQuickAdd = () => {
  openSheet(`
    <h2>빠른 추가</h2><p class="sub">탭하면 바로 냉장고로 들어가요 (수량·기한은 자동, 나중에 수정 가능)</p>
    <div class="search-row"><input id="qa-search" placeholder="재료 검색 (예: 계란, 두부…)" oninput="UI.qaFilter()" /></div>
    <div id="qa-grid" class="ing-pick-grid"></div>
    <div id="qa-custom"></div>
    <div class="btn-row"><button class="btn btn-block" onclick="UI.closeSheet()">완료</button></div>`);
  renderQuickAddGrid();
  setTimeout(() => $('#qa-search')?.focus(), 50);
};

function renderQuickAddGrid() {
  const q = ($('#qa-search')?.value || '').trim();
  const list = ING.filter((it) => !q || it.name.includes(q) || it.aliases.some((a) => a.includes(q)));
  const grid = $('#qa-grid');
  if (!grid) return;
  grid.innerHTML = list.map((it) => {
    const owned = S.pantry.find((p) => p.name === it.name);
    return `<button class="ing-pick" onclick="UI.addPantryByName('${it.name}')">
      <span>${it.emoji}</span>${it.name}${owned ? `<small style="color:var(--green)">보유 ${qtyLabel(owned)}</small>` : ''}</button>`;
  }).join('');
  $('#qa-custom').innerHTML = (q && list.length === 0)
    ? `<button class="btn btn-soft btn-block" style="margin-top:8px" onclick="UI.addPantryByName('${esc(q)}')">＂${esc(q)}＂ 직접 추가</button>` : '';
}
UI.qaFilter = renderQuickAddGrid;

UI.editPantry = (id) => {
  const p = S.pantry.find((x) => x.id === id);
  if (!p) return;
  const qtyControl = p.qtyType === 'level'
    ? `<div class="level-row">${LEVELS.map(([v, l]) =>
        `<button class="${p.level === v ? 'on' : ''}" onclick="UI.setLevel('${id}','${v}')">${l}</button>`).join('')}</div>`
    : `<div class="stepper">
         <button onclick="UI.bumpQty('${id}',-1)">−</button><b id="qty-val">${p.qty}${p.unit || ''}</b>
         <button onclick="UI.bumpQty('${id}',1)">＋</button></div>`;
  openSheet(`
    <h2>${p.emoji} ${esc(p.name)}</h2><p class="sub">탭해서 수정하세요</p>
    <div class="field"><label>수량</label>${qtyControl}</div>
    <div class="field"><label>보관 위치</label>
      <div class="seg" style="margin:0">${['fridge', 'freezer', 'room'].map((l) =>
        `<button class="${p.location === l ? 'on' : ''}" onclick="UI.setItemLoc('${id}','${l}')">${LOC_LABEL[l]}</button>`).join('')}</div></div>
    <div class="field"><label>소비기한</label>
      <input type="date" value="${p.expiresAt || ''}" onchange="UI.setExpiry('${id}',this.value)" /></div>
    <div class="btn-row">
      <button class="btn btn-soft" onclick="UI.removePantry('${id}')">🗑️ 삭제</button>
      <button class="btn btn-primary" onclick="UI.closeSheet();UI.refresh()">완료</button></div>`);
};
UI.bumpQty = (id, d) => {
  const p = S.pantry.find((x) => x.id === id); if (!p) return;
  p.qty = Math.max(0, Math.round((p.qty + d * (p.qty >= 1 || d > 0 ? 1 : 0.5)) * 100) / 100);
  save();
  const el = $('#qty-val'); if (el) el.textContent = `${p.qty}${p.unit || ''}`;
};
UI.setLevel = (id, v) => { const p = S.pantry.find((x) => x.id === id); if (p) { p.level = v; save(); UI.editPantry(id); } };
UI.setItemLoc = (id, l) => { const p = S.pantry.find((x) => x.id === id); if (p) { p.location = l; save(); UI.editPantry(id); } };
UI.setExpiry = (id, v) => { const p = S.pantry.find((x) => x.id === id); if (p) { p.expiresAt = v; save(); } };
UI.removePantry = (id) => {
  const p = S.pantry.find((x) => x.id === id);
  if (p && daysLeft(p.expiresAt) < 0) { S.ledger.wasted += p.price || 2000; toast(`${p.name} 폐기 — 버린 돈에 기록했어요`); }
  S.pantry = S.pantry.filter((x) => x.id !== id);
  save(); UI.closeSheet(); render();
};
UI.refresh = () => render();

/* ── AI 스캔 ─────────────────────────────── */
UI.openScan = () => {
  if (!S.settings.aiKey) {
    openSheet(`
      <h2>📷 AI 입고 스캔</h2>
      <p class="sub">영수증이나 장 봐온 식재료 사진 한 장이면 AI가 품목을 읽어 냉장고에 등록해 드려요.</p>
      <div class="banner">🔑 <span>먼저 <b>설정 → AI 스캔</b>에서 본인의 Claude API 키를 등록해 주세요. 키는 이 기기에만 저장됩니다.</span></div>
      <div class="btn-row">
        <button class="btn" onclick="UI.closeSheet()">나중에</button>
        <button class="btn btn-primary" onclick="UI.closeSheet();UI.go('settings')">설정으로 가기</button></div>`);
    return;
  }
  openSheet(`
    <h2>📷 AI 입고 스캔</h2><p class="sub">영수증 또는 펼쳐놓은 식재료 사진을 올려주세요</p>
    <label class="btn btn-block" style="margin-bottom:10px">
      🖼️ 사진 선택 / 촬영
      <input id="scan-file" type="file" accept="image/*" capture="environment" style="display:none" onchange="UI.scanPicked(this)" />
    </label>
    <div id="scan-preview"></div>
    <div id="scan-result"></div>
    <div class="btn-row">
      <button class="btn" onclick="UI.closeSheet()">닫기</button>
      <button id="scan-go" class="btn btn-accent" disabled onclick="UI.runScan()">🤖 AI 분석</button></div>`);
};
UI.scanPicked = (input) => {
  scanFile = input.files?.[0] || null;
  if (!scanFile) return;
  $('#scan-preview').innerHTML =
    `<img src="${URL.createObjectURL(scanFile)}" style="width:100%;border-radius:12px;border:1.5px solid var(--line);max-height:240px;object-fit:cover" />`;
  $('#scan-go').disabled = false;
};
UI.runScan = async () => {
  const btn = $('#scan-go');
  btn.disabled = true; btn.textContent = '분석 중…';
  try {
    const items = await scanImage(scanFile, S.settings);
    scanResults = items.map((it) => {
      const ing = findIng(it.name);
      return { name: ing ? ing.name : it.name, qty: it.qty || 1, location: defaultLocation(ing), emoji: ing?.emoji || '🍽️' };
    });
    renderScanRows();
    btn.textContent = '다시 분석';
    btn.disabled = false;
  } catch (e) {
    toast(e.message || 'AI 분석에 실패했어요');
    btn.textContent = '🤖 AI 분석';
    btn.disabled = false;
  }
};
function renderScanRows() {
  const box = $('#scan-result');
  if (!box || !scanResults) return;
  box.innerHTML = `
    <div class="section-title" style="margin-top:6px"><h2>인식 결과 ${scanResults.length}개</h2><small>틀린 건 고치고 담으세요</small></div>
    ${scanResults.map((r, idx) => `
      <div class="item">
        <span class="emoji">${r.emoji}</span>
        <input style="flex:2" value="${esc(r.name)}" onchange="UI.scanEdit(${idx},'name',this.value)" />
        <input style="flex:1" type="number" min="0" step="0.5" value="${r.qty}" onchange="UI.scanEdit(${idx},'qty',this.value)" />
        <select style="flex:1.2" onchange="UI.scanEdit(${idx},'location',this.value)">
          ${['fridge', 'freezer', 'room'].map((l) => `<option value="${l}" ${r.location === l ? 'selected' : ''}>${LOC_LABEL[l]}</option>`).join('')}
        </select>
        <button onclick="UI.scanRemove(${idx})">✕</button>
      </div>`).join('')}
    <button class="btn btn-primary btn-block" style="margin-top:6px" onclick="UI.scanCommit()">🧊 모두 냉장고에 담기 (${scanResults.length})</button>`;
}
UI.scanEdit = (idx, k, v) => { if (scanResults?.[idx]) scanResults[idx][k] = k === 'qty' ? Number(v) : v; };
UI.scanRemove = (idx) => { scanResults.splice(idx, 1); renderScanRows(); };
UI.scanCommit = () => {
  const n = scanResults?.length || 0;
  for (const r of scanResults || []) addPantryByName(r.name, { qty: r.qty, location: r.location, silentToast: true });
  UI.closeSheet(); render();
  toast(`${n}개 품목을 입고했어요 🧊`);
};

/* ── 레시피 ─────────────────────────────── */
function recipeCard(a) {
  const r = a.recipe;
  const pct = Math.round((a.have / Math.max(1, a.total)) * 100);
  return `
    <div class="card recipe-card" onclick="UI.openRecipe('${r.id}')">
      ${a.cookable ? '<div class="ready-flag">지금 가능</div>' : ''}
      <div class="r-head">
        <div class="r-emoji">${r.emoji}</div>
        <div class="grow">
          <h3>${esc(r.title)}</h3>
          <div class="meta">
            <span>⏱ ${r.time}분</span><span>🔥 ${r.kcal}kcal</span><span>단백질 <b>${r.protein}g</b></span>
            ${a.usesExpiring ? '<span style="color:var(--red)">🔥 임박재료 소진</span>' : ''}
          </div>
        </div>
      </div>
      <div class="match-bar"><i style="width:${pct}%"></i></div>
      <div style="margin-top:8px">
        <span class="chip have">재료 ${a.have}/${a.total}</span>
        ${a.missing.slice(0, 3).map((m) =>
          `<span class="chip miss" onclick="event.stopPropagation();UI.addShopping('${m}')">＋ ${m}</span>`).join('')}
        ${a.missing.length > 3 ? `<span class="chip">외 ${a.missing.length - 3}</span>` : ''}
      </div>
    </div>`;
}

function renderRecipes() {
  const mode = S.settings.mode;
  const { analyzed, blocked } = recommend(S, mode, { includeBlocked: true });
  const q = recipeQuery.trim();
  const list = analyzed.filter((a) => !q || a.recipe.title.includes(q) || a.recipe.tags.some((t) => t.includes(q)));

  $('#view').innerHTML = `
    <div class="hero"><h1>${MODES[mode].emoji} <em>${MODES[mode].label}</em> 레시피</h1>
      <p>${MODES[mode].desc} · 내 냉장고 기준으로 정렬했어요</p></div>
    <div class="search-row">
      <input placeholder="요리 이름·태그 검색" value="${esc(recipeQuery)}" oninput="UI.recipeSearch(this.value)" />
      <button class="btn btn-soft" onclick="UI.go('settings')">모드 변경</button>
    </div>
    ${mode === 'maternity' && blocked.length
      ? `<div class="banner">🤰 <span>주의 재료가 든 레시피 <b>${blocked.length}개</b>를 자동으로 숨겼어요 (참치 등). 본 정보는 의학적 조언이 아니며, 식단은 담당 의료진과 상의하세요.</span></div>` : ''}
    ${list.map(recipeCard).join('')}`;
}
UI.recipeSearch = (v) => { recipeQuery = v; renderRecipes(); };

UI.openRecipe = (rid) => {
  const r = RECIPES.find((x) => x.id === rid);
  if (!r) return;
  const a = recommend(S, S.settings.mode).find((x) => x.recipe.id === rid) ||
            { missing: [], have: 0, total: 1, cookable: false };
  openSheet(`
    <h2>${r.emoji} ${esc(r.title)}</h2>
    <p class="sub">⏱ ${r.time}분 · ${r.kcal}kcal · 단백질 ${r.protein}g · 1인분 기준</p>
    ${r.caution ? `<div class="banner">⚠️ <span>${esc(r.caution)}</span></div>` : ''}
    <div class="section-title" style="margin-top:8px"><h2>재료</h2><small>${a.have}/${a.total} 보유</small></div>
    <div>
      ${r.ingredients.map((g) => {
        if (g.st) return `<span class="chip">${esc(g.n)} (양념)</span>`;
        const miss = a.missing.includes(g.n);
        return `<span class="chip ${miss ? 'miss' : 'have'}" ${miss ? `onclick="UI.addShopping('${g.n}')"` : ''}>${miss ? '＋ ' : '✓ '}${esc(g.n)} ${g.a}${g.u || ''}</span>`;
      }).join('')}
    </div>
    <div class="section-title"><h2>만드는 법</h2></div>
    <ul class="steps">${r.steps.map((st) => `<li>${esc(st)}</li>`).join('')}</ul>
    <div class="btn-row">
      ${a.missing.length ? `<button class="btn" onclick="UI.addMissing('${r.id}')">🧺 부족 재료 ${a.missing.length}개 담기</button>` : ''}
      <button class="btn btn-primary" onclick="UI.openDeduct('${r.id}')">🍳 요리 완료</button>
    </div>`);
};

UI.addMissing = (rid) => {
  const a = recommend(S, S.settings.mode).find((x) => x.recipe.id === rid);
  for (const m of a?.missing || []) UI.addShopping(m, true);
  toast(`부족 재료 ${a?.missing.length || 0}개를 장보기에 담았어요`);
};

/* ── 요리 완료 → 차감 ─────────────────────── */
UI.openDeduct = (rid) => {
  const r = RECIPES.find((x) => x.id === rid);
  deductCtx = { recipe: r, servings: 1, skips: new Set() };
  renderDeduct();
};

function renderDeduct() {
  const { recipe, servings, skips } = deductCtx;
  const plan = deductionPlan(recipe, S, servings);
  openSheet(`
    <h2>🧾 재고 차감 전표</h2>
    <p class="sub">${esc(recipe.title)} — 몇 인분 하셨어요? 확인만 누르면 끝나요.</p>
    <div class="seg" style="margin-top:0">
      ${[1, 2, 3, 4].map((n) =>
        `<button class="${servings === n ? 'on' : ''}" onclick="UI.setServ(${n})">${n}인분</button>`).join('')}
    </div>
    <div class="receipt">
      ${plan.length === 0 ? '<div class="r-line"><span>차감할 재고 없음 (등록 안 된 재료)</span></div>' : ''}
      ${plan.map((p, idx) => p.skip
        ? `<div class="r-line" style="color:var(--ink-soft)"><span>${p.item.emoji} ${esc(p.item.name)}</span><small>${p.label}</small></div>`
        : `<div class="r-line ${skips.has(idx) ? '' : ''}" style="${skips.has(idx) ? 'opacity:.45;text-decoration:line-through' : ''}">
             <span>${p.item.emoji} ${esc(p.item.name)}</span>
             <span>${p.item.qty}${p.item.unit || ''} → <b>${p.after}${p.item.unit || ''}</b>
               <button style="margin-left:6px;font-size:.7rem;color:var(--ink-soft)" onclick="UI.toggleSkip(${idx})">${skips.has(idx) ? '되돌리기' : '건너뛰기'}</button>
             </span></div>`).join('')}
      <div class="r-line r-total"><span>합계</span><span>${plan.filter((p, i) => !p.skip && !skips.has(i)).length}개 품목 차감</span></div>
    </div>
    <div class="btn-row">
      <button class="btn" onclick="UI.closeSheet()">취소</button>
      <button class="btn btn-primary" onclick="UI.applyDeduct()">✓ 확인 (차감)</button>
    </div>`);
}
UI.setServ = (n) => { deductCtx.servings = n; renderDeduct(); };
UI.toggleSkip = (idx) => { deductCtx.skips.has(idx) ? deductCtx.skips.delete(idx) : deductCtx.skips.add(idx); renderDeduct(); };

UI.applyDeduct = () => {
  const { recipe, servings, skips } = deductCtx;
  const plan = deductionPlan(recipe, S, servings);
  let savedFromExpiring = 0;
  plan.forEach((p, idx) => {
    if (p.skip || skips.has(idx)) return;
    if (daysLeft(p.item.expiresAt) <= 3) savedFromExpiring += Math.round((p.item.price || 2000) * 0.5);
    p.item.qty = p.after;
    if (p.after <= 0) {
      S.pantry = S.pantry.filter((x) => x.id !== p.item.id);
      UI.addShopping(p.item.name, true, '다 떨어짐');
    }
  });
  S.ledger.cooked += 1;
  S.ledger.saved += savedFromExpiring;
  save();
  const recipeTitle = recipe.title;
  openSheet(`
    <h2>🍽️ 맛있게 드세요!</h2>
    <p class="sub">${esc(recipeTitle)} 완료 · 재고가 알아서 줄었어요${savedFromExpiring ? ` · 임박 재료 소진으로 ${won(savedFromExpiring)} 아꼈어요 🪙` : ''}</p>
    <div class="card flat" style="text-align:center;padding:18px">
      <div style="font-size:2rem">🥘</div>
      <b style="font-family:var(--serif)">음식이 남았나요?</b>
      <p class="hint">남았다면 등록해 두세요. 까먹기 전에 챙겨드릴게요.</p>
    </div>
    <div class="btn-row">
      <button class="btn btn-primary" onclick="UI.closeSheet();UI.refresh()">다 먹었어요</button>
      <button class="btn btn-accent" onclick="UI.openLeftoverForm('${esc(recipeTitle)}')">남았어요 → 잔반 등록</button>
    </div>`);
};

UI.openLeftoverForm = (name) => {
  openSheet(`
    <h2>🍱 잔반 등록</h2><p class="sub">홈 화면 맨 위에서 챙겨드릴게요</p>
    <div class="field"><label>이름</label><input id="lo-name" value="${esc(name)}" /></div>
    <div class="field"><label>보관</label>
      <div class="seg" style="margin:0">
        <button id="lo-fridge" class="on" onclick="UI.loLoc('fridge')">냉장 (3일)</button>
        <button id="lo-freezer" onclick="UI.loLoc('freezer')">냉동 (30일)</button>
      </div></div>
    <div class="btn-row"><button class="btn btn-primary btn-block" onclick="UI.saveLeftover()">저장</button></div>`);
  deductCtx = { loLoc: 'fridge' };
};
UI.loLoc = (l) => {
  deductCtx.loLoc = l;
  $('#lo-fridge').classList.toggle('on', l === 'fridge');
  $('#lo-freezer').classList.toggle('on', l === 'freezer');
};
UI.saveLeftover = () => {
  const loc = deductCtx?.loLoc || 'fridge';
  S.leftovers.push({
    id: uid(), name: $('#lo-name').value || '남은 음식',
    location: loc, expiresAt: addDays(loc === 'freezer' ? 30 : 3),
    createdAt: today(), status: 'active',
  });
  save(); UI.closeSheet(); render();
  toast('잔반 등록 완료 — 먼저 먹기 목록에서 챙겨드릴게요');
};
UI.leftoverDone = (id, result) => {
  const l = S.leftovers.find((x) => x.id === id);
  if (!l) return;
  l.status = result;
  if (result === 'eaten') { S.ledger.leftoverEaten += 1; S.ledger.saved += 4000; toast('한 끼 해결! 약 ₩4,000 아꼈어요 🪙'); }
  else { S.ledger.leftoverWasted += 1; S.ledger.wasted += 3000; toast('버린 기록을 장부에 남겼어요'); }
  save(); render();
};

/* ── 장보기 ─────────────────────────────── */
UI.addShopping = (name, silent = false, reason = '레시피 재료') => {
  if (!S.shopping.find((x) => x.name === name && !x.done)) {
    S.shopping.push({ id: uid(), name, reason, done: false });
    save();
  }
  if (!silent) { toast(`🧺 ${name} 장보기에 담았어요`); render(); }
};

function coupangUrl(name) {
  return `https://www.coupang.com/np/search?q=${encodeURIComponent(name)}`;
}

function renderShopping() {
  const open = S.shopping.filter((x) => !x.done);
  const done = S.shopping.filter((x) => x.done);
  $('#view').innerHTML = `
    <div class="hero"><h1>오늘의 <em>장보기</em></h1>
      <p>부족·소진 재료가 자동으로 담겨요. 쿠팡 버튼이면 두 탭 만에 장바구니까지.</p></div>
    <div class="search-row">
      <input id="shop-new" placeholder="직접 추가 (예: 휴지, 올리브유…)" onkeydown="if(event.key==='Enter')UI.shopAdd()" />
      <button class="btn" onclick="UI.shopAdd()">담기</button>
    </div>
    ${open.length === 0 && done.length === 0
      ? `<div class="empty"><span class="e-emoji">🧺</span><b>장보기 바구니가 비었어요</b><small>레시피의 부족 재료를 탭하거나<br>재료가 다 떨어지면 자동으로 담겨요</small></div>` : ''}
    ${open.map((x) => `
      <div class="item">
        <button style="font-size:1.2rem" onclick="UI.shopToggle('${x.id}')">⬜</button>
        <div class="grow"><div class="name">${esc(x.name)}</div><div class="sub">${esc(x.reason)}</div></div>
        <a class="btn btn-sm btn-accent" href="${coupangUrl(x.name)}" target="_blank" rel="noreferrer">쿠팡 🛒</a>
        <button onclick="UI.shopRemove('${x.id}')">✕</button>
      </div>`).join('')}
    ${done.length ? `
      <div class="section-title"><h2>✓ 샀어요 (${done.length})</h2><small>입고하면 냉장고로 들어가요</small></div>
      ${done.map((x) => `
        <div class="item" style="opacity:.65">
          <button style="font-size:1.2rem" onclick="UI.shopToggle('${x.id}')">✅</button>
          <div class="grow"><div class="name" style="text-decoration:line-through">${esc(x.name)}</div></div>
          <button onclick="UI.shopRemove('${x.id}')">✕</button>
        </div>`).join('')}
      <button class="btn btn-primary btn-block" onclick="UI.shopCommit()">🧊 산 것들 냉장고로 입고 (${done.length})</button>` : ''}`;
}
UI.shopAdd = () => {
  const v = $('#shop-new').value.trim();
  if (!v) return;
  UI.addShopping(v, true, '직접 추가');
  render();
};
UI.shopToggle = (id) => { const x = S.shopping.find((s2) => s2.id === id); if (x) { x.done = !x.done; save(); render(); } };
UI.shopRemove = (id) => { S.shopping = S.shopping.filter((x) => x.id !== id); save(); render(); };
UI.shopCommit = () => {
  const done = S.shopping.filter((x) => x.done);
  for (const x of done) addPantryByName(x.name, { silentToast: true });
  S.shopping = S.shopping.filter((x) => !x.done);
  save(); render();
  toast(`${done.length}개 품목 입고 완료 🧊`);
};

/* ── 설정 ─────────────────────────────── */
function renderSettings() {
  const st = S.settings;
  $('#view').innerHTML = `
    <div class="hero"><h1>내 <em>모드</em>와 설정</h1><p>모드를 바꾸면 추천이 통째로 달라져요</p></div>
    <div class="mode-grid">
      ${Object.entries(MODES).map(([k, m]) => `
        <button class="mode-card ${st.mode === k ? 'on' : ''}" onclick="UI.setMode('${k}')">
          <span class="m-emoji">${m.emoji}</span><b>${m.label} 모드</b><small>${m.desc}</small>
        </button>`).join('')}
    </div>

    <div class="section-title"><h2>🤖 AI 스캔</h2><small>영수증·사진 인식</small></div>
    <div class="card flat">
      <div class="field"><label>Claude API 키 (이 기기에만 저장 · 동기화 안 됨)</label>
        <input id="set-aikey" type="password" placeholder="sk-ant-…" value="${esc(st.aiKey)}" /></div>
      <div class="field"><label>모델</label>
        <select id="set-aimodel">
          ${[['claude-opus-4-8', 'Opus 4.8 — 가장 정확 (기본)'], ['claude-sonnet-4-6', 'Sonnet 4.6 — 균형'], ['claude-haiku-4-5', 'Haiku 4.5 — 가장 저렴']]
            .map(([v, l]) => `<option value="${v}" ${st.aiModel === v ? 'selected' : ''}>${l}</option>`).join('')}
        </select></div>
      <p class="hint">키는 console.anthropic.com에서 발급해요. 호출 비용은 본인 계정으로 과금되며, 영수증 1장에 수~수십 원 수준입니다. 공용 기기에서는 등록하지 마세요.</p>
      <button class="btn btn-block" style="margin-top:6px" onclick="UI.saveAI()">저장</button>
    </div>

    <div class="section-title"><h2>🔄 기기 연동 · 가족 공유</h2><small>같은 코드 = 같은 냉장고</small></div>
    <div class="card flat">
      <p class="hint" style="margin-bottom:10px">휴대폰(앱)과 컴퓨터(웹), 또는 가족끼리 같은 냉장고를 보려면:
      ① <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer">Firebase</a>에서 무료 프로젝트 생성 → 웹앱 추가
      ② Authentication에서 "익명" 로그인 켜기, Firestore 데이터베이스 만들기
      ③ 발급된 설정(JSON)을 아래에 붙여넣기 ④ 모든 기기에서 같은 동기화 코드 입력.</p>
      <div class="field"><label>Firebase 설정 (JSON)</label>
        <textarea id="set-fb" rows="3" placeholder='{"apiKey":"…","projectId":"…", …}'>${esc(st.firebaseConfig)}</textarea></div>
      <div class="field"><label>동기화 코드</label>
        <div class="search-row" style="margin:0">
          <input id="set-code" placeholder="예: 두부-x3k9" value="${esc(st.spaceCode)}" />
          <button class="btn btn-soft" onclick="UI.genCode()">생성</button>
        </div></div>
      <button class="btn btn-primary btn-block" onclick="UI.connectSync()">연결</button>
      ${sync.status === 'error' ? `<p class="hint" style="color:var(--red)">오류: ${esc(sync.error)}</p>` : ''}
      ${sync.status === 'on' ? `<p class="hint" style="color:var(--green)">✓ 동기화 작동 중 — 다른 기기에서 같은 코드를 입력하면 냉장고가 합쳐져요</p>` : ''}
    </div>

    <div class="section-title"><h2>🗂️ 데이터</h2></div>
    <div class="btn-row" style="margin-top:0">
      <button class="btn" onclick="UI.exportData()">내보내기</button>
      <label class="btn">가져오기<input type="file" accept=".json" style="display:none" onchange="UI.importData(this)" /></label>
      <button class="btn btn-soft" onclick="UI.resetAll()">초기화</button>
    </div>
    <p class="hint" style="margin-top:14px;text-align:center">냉비서 v0.1 · 데이터는 내 기기(와 내 Firebase)에만 저장됩니다<br>제품 설계 문서: 레포 docs/ 폴더 참고</p>`;
}
UI.setMode = (k) => {
  S.settings.mode = k; save(); render();
  toast(`${MODES[k].emoji} ${MODES[k].label} 모드로 바꿨어요 — 추천이 달라집니다`);
};
UI.saveAI = () => {
  S.settings.aiKey = $('#set-aikey').value.trim();
  S.settings.aiModel = $('#set-aimodel').value;
  save(); toast('AI 설정 저장 완료');
};
UI.genCode = () => { $('#set-code').value = makeSpaceCode(); };
UI.connectSync = () => {
  S.settings.firebaseConfig = $('#set-fb').value.trim();
  S.settings.spaceCode = $('#set-code').value.trim();
  save({ silent: true });
  initSync(() => { renderTop(); if (tab === 'settings') renderSettings(); });
  toast('동기화 연결을 시도합니다…');
};
UI.exportData = () => {
  const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `naengbiseo-${today()}.json`;
  a.click();
};
UI.importData = (input) => {
  const f = input.files?.[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      for (const k of ['settings', 'pantry', 'leftovers', 'shopping', 'ledger']) if (data[k]) S[k] = data[k];
      save(); render(); toast('데이터를 불러왔어요');
    } catch { toast('파일을 읽을 수 없어요'); }
  };
  reader.readAsText(f);
};
UI.resetAll = () => {
  if (!confirm('정말 모든 데이터를 지울까요? 되돌릴 수 없어요.')) return;
  localStorage.removeItem('naengbiseo.v1');
  location.reload();
};

/* ── 라우팅 ─────────────────────────────── */
const SCREENS = { home: renderHome, pantry: renderPantry, recipes: renderRecipes, shopping: renderShopping, settings: renderSettings };

function render() {
  renderTop();
  (SCREENS[tab] || renderHome)();
  document.querySelectorAll('#tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  window.scrollTo({ top: 0 });
}
UI.go = (t) => { tab = t; render(); };

document.querySelectorAll('#tabbar button').forEach((b) => b.addEventListener('click', () => UI.go(b.dataset.tab)));

render();
initSync(() => renderTop());
