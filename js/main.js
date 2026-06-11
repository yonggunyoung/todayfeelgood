// 냉비서 — 화면 렌더링과 상호작용 전부. 프레임워크 없는 단일 페이지 앱.
import { S, save, uid, today, addDays, daysLeft, won } from './store.js';
import { ING, findIng, defaultShelf, defaultLocation } from './data/ingredients.js';
import { recommend, recipesUsing, expiringItems, activeLeftovers, deductionPlan, modeList, getMode, allRecipes } from './engine.js';
import { scanImage, extractRecipeFromYouTube, claimReward } from './ai.js';
import { initSync, sync, makeSpaceCode } from './sync.js';

let tab = 'home';
let pantryView = 'shelf';
let pantryLoc = 'all';
let rTab = 'reco';
let recipeQuery = '';
let scanFile = null;
let scanResults = null;
let deductCtx = null;
let draft = null; // 레시피/모드 작성 임시 객체
let detailServings = 1; // 레시피 상세에서 고른 인분 수 (차감으로 이어짐)

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const LOC_LABEL = { fridge: '냉장', freezer: '냉동', room: '실온' };
const LEVELS = [['full', '가득'], ['half', '절반'], ['low', '조금'], ['empty', '없음']];
const TAGS = ['반찬', '고단백', '운동', '자취', '초간단', '국물', '집밥', '도시락', '다이어트', '순한맛', '매콤', '아침'];

window.UI = {};

// 관리자 모드 — AI 설정은 운영자만 만진다 (이 기기에서만 해제 상태 유지)
const ADMIN_FLAG = 'naengbiseo.admin';
const isAdmin = () => { try { return localStorage.getItem(ADMIN_FLAG) === '1'; } catch { return false; } };
UI.adminGate = () => {
  if (isAdmin()) { localStorage.removeItem(ADMIN_FLAG); render(); toast('관리자 모드 잠금 🔒'); return; }
  const pin = prompt(S.settings.adminPin ? '관리자 PIN을 입력하세요' : '처음이네요 — 사용할 관리자 PIN을 정하세요');
  if (!pin) return;
  if (!S.settings.adminPin) {
    S.settings.adminPin = pin; save({ silent: true });
    localStorage.setItem(ADMIN_FLAG, '1'); toast('관리자 PIN 설정 완료 · 잠금 해제 🔓');
  } else if (pin === S.settings.adminPin) {
    localStorage.setItem(ADMIN_FLAG, '1'); toast('관리자 모드 ON 🔓');
  } else { toast('PIN이 달라요'); return; }
  render();
};

// AI 사용 가능 여부 (byok=내 키 / server=운영자 서버 경유)
function aiReady() {
  const st = S.settings;
  if (st.aiMode === 'server') {
    if (!st.aiEndpoint) return { ok: false, msg: '설정 → AI에서 서버 AI 주소를 입력해 주세요.' };
    if (!st.firebaseConfig || !st.spaceCode) return { ok: false, msg: '서버 AI는 설정의 "기기 연동"을 먼저 연결해야 해요.' };
    return { ok: true };
  }
  return st.aiKey ? { ok: true } : { ok: false, msg: '설정 → AI에서 Claude API 키를 등록해 주세요.' };
}

/* ── 공용 도우미 ─────────────────────────── */
function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  $('#toast-root').appendChild(el);
  setTimeout(() => el.remove(), 2300);
}

function openSheet(html) {
  $('#modal-root').innerHTML =
    `<div class="overlay" onclick="if(event.target===this)UI.closeSheet()">
       <div class="sheet"><div class="grip"></div>${html}</div>
     </div>`;
}
UI.closeSheet = () => { $('#modal-root').innerHTML = ''; scanFile = null; scanResults = null; deductCtx = null; draft = null; qaLoc = null; };

function stampFor(days) {
  if (days <= 1) return `<span class="stamp stamp-danger">${days < 0 ? '기한지남' : 'D-' + Math.max(0, days)}</span>`;
  if (days <= 3) return `<span class="stamp stamp-warn">D-${days}</span>`;
  return `<span class="stamp stamp-ok">D-${days}</span>`;
}
function qtyLabel(p) {
  if (p.qtyType === 'level') return (LEVELS.find(([v]) => v === p.level) || [])[1] || '보통';
  return `${p.qty}${p.unit || ''}`;
}

const catClass = (name) => `t-${findIng(name)?.cat || '기타'}`;

// 유튜브 링크 → 영상 ID
function ytId(url) {
  if (!url) return null;
  const m = String(url).match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}
const ytThumb = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

// 사진 → 축소 dataURL
function fileToDataURL(file, max = 480) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const sc = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = reject;
    img.src = url;
  });
}

// 공유 코드 (모드·레시피를 카톡 등으로 주고받기)
const shareEncode = (t, d) => 'NB1.' + btoa(unescape(encodeURIComponent(JSON.stringify({ t, d }))));
function shareDecode(code) {
  try {
    const raw = code.trim().replace(/^.*NB1\./, '');
    return JSON.parse(decodeURIComponent(escape(atob(raw))));
  } catch { return null; }
}
async function copyText(t) {
  try { await navigator.clipboard.writeText(t); toast('복사했어요 — 카톡 등으로 붙여넣어 공유하세요'); }
  catch { prompt('아래 코드를 복사하세요', t); }
}

/* ── 상단바 ─────────────────────────────── */
function renderTop() {
  const d = new Date();
  $('#top-date').textContent = `${d.getMonth() + 1}월 ${d.getDate()}일 ${['일', '월', '화', '수', '목', '금', '토'][d.getDay()]}요일`;
  $('#saved-badge').textContent = won(S.ledger.saved);
  const badge = $('#sync-badge');
  const map = { off: ['이 기기', 'pill pill-muted'], connecting: ['연결중…', 'pill pill-muted'], on: ['동기화 ✓', 'pill pill-on'], error: ['동기화 오류', 'pill pill-err'] };
  const [label, cls] = map[sync.status] || map.off;
  badge.textContent = label;
  badge.className = cls;
}

/* ── 홈 ─────────────────────────────── */
function greeting() {
  const h = new Date().getHours();
  if (h < 10) return '좋은 아침이에요 ☀️';
  if (h < 15) return '점심은 챙기셨어요?';
  if (h < 21) return '오늘 저녁,';
  return '야식의 유혹이 온다면 🌙';
}

function renderHome() {
  const mode = getMode(S, S.settings.mode);
  const recos = recommend(S, S.settings.mode).slice(0, 3);
  const expiring = expiringItems(S, 3);
  const leftovers = activeLeftovers(S);
  const empty = S.pantry.length === 0;

  let firstEat = '';
  if (leftovers.length || expiring.length) {
    firstEat = `<div class="section-title"><h2>🔥 먼저 먹어요</h2><small>잔반과 임박 재료</small></div>` +
      leftovers.map((l) => `
        <div class="item ${daysLeft(l.expiresAt) <= 1 ? 'danger' : ''}">
          <span class="emoji t-가공" onclick="UI.openFood('${l.id}')">${l.photo ? `<img src="${l.photo}" alt="" />` : foodKind(l).emoji}</span>
          <div class="grow" onclick="UI.openFood('${l.id}')"><div class="name">${esc(l.name)}</div>
            <div class="sub">${foodKind(l).label} · ${LOC_LABEL[l.location]} ${stampFor(daysLeft(l.expiresAt))}</div></div>
          <button class="btn btn-sm btn-primary" onclick="UI.leftoverDone('${l.id}','eaten')">먹었어요</button>
          <button class="btn btn-sm btn-soft" onclick="UI.leftoverDone('${l.id}','wasted')">버림</button>
        </div>`).join('') +
      expiring.map((p) => `
        <div class="item">
          <span class="emoji ${catClass(p.name)}">${p.photo ? `<img src="${p.photo}" alt="" />` : p.emoji}</span>
          <div class="grow" onclick="UI.editPantry('${p.id}')"><div class="name">${esc(p.name)}</div><div class="sub">${qtyLabel(p)} · ${LOC_LABEL[p.location]}</div></div>
          ${stampFor(daysLeft(p.expiresAt))}
          <button class="btn btn-sm btn-tint" onclick="UI.useIdeas('${esc(p.name)}')">활용 →</button>
        </div>`).join('');
  }

  const recoHtml = empty ? '' :
    `<div class="section-title"><h2>${mode.emoji} 오늘의 추천</h2>
       <small onclick="UI.go('recipes')" style="cursor:pointer">전체 보기 →</small></div>` +
    (recos.every((r) => r.have === 0)
      ? `<div class="empty"><span class="e-emoji">🫥</span><b>매칭할 재료가 아직 부족해요</b><small>재료 몇 가지만 담으면 추천이 켜져요</small></div>`
      : recos.map(recipeCard).join(''));

  $('#view').innerHTML = `
    <div class="hero">
      <h1>${greeting()}<br><em>오늘 뭐 해먹지?</em></h1>
      <p>${mode.emoji} ${mode.label} 모드 — ${esc(mode.desc || '')}</p>
    </div>
    <div class="action-strip">
      <button class="btn btn-primary" onclick="UI.openScan()"><b>📷 AI 입고 스캔</b><small>영수증·장본 사진 한 장</small></button>
      <button class="btn" onclick="UI.openQuickAdd()"><b>➕ 빠른 추가</b><small>검색해서 2탭 등록</small></button>
    </div>
    ${empty ? `
      <div class="empty" style="margin-top:18px">
        <span class="e-emoji">🧊</span><b>냉장고가 텅… 메아리가 들려요</b>
        <small>지금 집에 있는 재료를 등록하면<br>오늘 해먹을 요리를 바로 추천해 드려요</small>
        <div class="btn-row" style="margin-top:14px">
          <button class="btn btn-accent btn-block" onclick="UI.starterPack()">🧺 기본 재료 한번에 담기</button>
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

// 임박 재료 활용 아이디어
UI.useIdeas = (name) => {
  const ideas = recipesUsing(S, name, S.settings.mode).slice(0, 5);
  openSheet(`
    <h2>${findIng(name)?.emoji || '🍽️'} ${esc(name)}, 이렇게 써요</h2>
    <p class="sub">버리기 전에 — 이 재료를 쓰는 요리 (잘 맞는 순)</p>
    ${ideas.length ? ideas.map(recipeCard).join('') : '<div class="empty"><span class="e-emoji">🤔</span><b>이 재료를 쓰는 레시피가 없어요</b><small>레시피 탭에서 나만의 레시피로 만들어 보세요</small></div>'}
  `);
};

/* ── 냉장고 (프리미엄 내부 뷰) ───────────── */
let bubbleKey = ''; // 가장 급한 재료 1개가 말풍선으로 조른다 (무료 캐릭터 모션)

function chrBits(d, key) {
  const cls = d <= 1 ? ' urgent' : d <= 3 ? ' soon' : '';
  const hand = d <= 3 ? '<span class="chr-hand">👋</span>' : '';
  const bubble = key === bubbleKey
    ? `<span class="chr-bubble">${d <= 1 ? '오늘 안 먹으면 끝이야!' : '나 먼저 먹어줘~'}</span>` : '';
  return { cls, hand, bubble };
}

function fItem(p) {
  const d = daysLeft(p.expiresAt);
  const c = chrBits(d, 'p:' + p.id);
  return `
    <button class="f-item${c.cls}" data-move="p:${p.id}" onclick="UI.editPantry('${p.id}')">
      ${c.bubble}${c.hand}
      ${d <= 3 ? `<span class="fi-dot ${d <= 1 ? 'dot-red' : 'dot-amber'}"></span>` : ''}
      <span class="fi-face">${p.photo ? `<img src="${p.photo}" alt="" />` : p.emoji}</span>
      <span class="fi-name">${esc(p.name)}</span>
    </button>`;
}
const chunk = (arr, n) => arr.reduce((acc, x, i) => (i % n ? acc[acc.length - 1].push(x) : acc.push([x]), acc), []);
const addTile = (loc) => `<button class="f-item f-add" onclick="UI.quickAddAt('${loc}')" title="이 칸에 추가">＋</button>`;
const shelfRows = (items, loc) => {
  const cells = items.map(fItem);
  if (loc) cells.push(addTile(loc));
  if (!cells.length) return `<p class="f-empty">텅 비었어요</p>`;
  return chunk(cells, 4).map((row) => `<div class="f-row">${row.join('')}</div><div class="f-shelf"></div>`).join('');
};

function foodTile(l) {
  const d = daysLeft(l.expiresAt);
  const c = chrBits(d, 'f:' + l.id);
  return `
    <button class="f-item${c.cls}" data-move="f:${l.id}" onclick="UI.openFood('${l.id}')">
      ${c.bubble}${c.hand}
      ${d <= 3 ? `<span class="fi-dot ${d <= 1 ? 'dot-red' : 'dot-amber'}"></span>` : ''}
      <span class="fi-face">${l.photo ? `<img src="${l.photo}" alt="" />` : foodKind(l).emoji}</span>
      <span class="fi-name">${esc(l.name)}</span>
    </button>`;
}
const foodRows = (foods) =>
  chunk(foods, 4).map((row) => `<div class="f-row">${row.map(foodTile).join('')}</div><div class="f-shelf"></div>`).join('');

function fridgeHtml(all) {
  const fr = all.filter((p) => p.location === 'fridge');
  const frMain = fr.filter((p) => p.qtyType !== 'level');
  const frDoor = fr.filter((p) => p.qtyType === 'level');
  const fz = all.filter((p) => p.location === 'freezer');
  const rm = all.filter((p) => p.location === 'room');
  const foods = activeLeftovers(S);
  const frFoods = foods.filter((l) => l.location === 'fridge');
  const fzFoods = foods.filter((l) => l.location === 'freezer');

  // 가장 급한 1개만 말풍선으로 조르기 (시끄럽지 않게)
  bubbleKey = '';
  let best = 4;
  for (const p of all) { const d = daysLeft(p.expiresAt); if (d <= 3 && d < best) { best = d; bubbleKey = 'p:' + p.id; } }
  for (const l of foods) { const d = daysLeft(l.expiresAt); if (d <= 3 && d < best) { best = d; bubbleKey = 'f:' + l.id; } }
  return `
    <div class="fridge">
      <div class="fridge-inner" data-loc="fridge">
        <div class="f-led"></div>
        <div class="f-vent"><i></i><i></i><i></i><i></i></div>
        <span class="mist" style="left:16%"></span>
        <span class="mist" style="left:46%;animation-delay:1.7s;--dx:-16px"></span>
        <span class="mist" style="left:71%;animation-delay:3.2s;--dx:9px"></span>
        <div class="f-sec-label"><span>냉장실</span><span>${fr.length ? fr.length + '개' : ''}</span></div>
        ${shelfRows(frMain, 'fridge')}
        ${frFoods.length ? `<div class="f-sec-label" style="padding-top:2px"><span>🍱 반찬·조리음식 칸</span><span>${frFoods.length}개</span></div>${foodRows(frFoods)}` : ''}
        ${frDoor.length ? `<div class="f-pocket"><div class="fp-label">도어 포켓 · 소스</div><div class="fp-row">${frDoor.map(fItem).join('')}</div></div>` : ''}
      </div>
      <div class="f-divider"></div>
      <div class="fridge-inner freezer" data-loc="freezer">
        <div class="f-sec-label"><span>냉동실</span><span>${fz.length ? fz.length + '개' : ''}</span></div>
        ${shelfRows(fz, 'freezer')}
        ${fzFoods.length ? `<div class="f-sec-label" style="padding-top:2px"><span>🍱 얼려둔 음식</span><span>${fzFoods.length}개</span></div>${foodRows(fzFoods)}` : ''}
      </div>
    </div>
    <div class="basket" data-loc="room">
      <div class="f-sec-label"><span>실온 선반</span><span>${rm.length ? rm.length + '개' : ''}</span></div>
      ${shelfRows(rm, 'room')}
    </div>
    <p class="hint" style="text-align:center;margin-top:2px">길게 누르면 칸 이동 · ＋를 누르면 그 칸에 추가돼요</p>`;
}

function renderPantry() {
  const all = S.pantry.slice().sort((a, b) => daysLeft(a.expiresAt) - daysLeft(b.expiresAt));
  const exp = expiringItems(S, 3).length;

  let body = '';
  if (pantryView === 'shelf') {
    body = fridgeHtml(all);
  } else {
    const list = all.filter((p) => pantryLoc === 'all' || p.location === pantryLoc);
    body = `
      <div class="seg" style="margin-top:0">
        ${['all', 'fridge', 'freezer', 'room'].map((l) =>
          `<button class="${pantryLoc === l ? 'on' : ''}" onclick="UI.setLoc('${l}')">${l === 'all' ? '전체' : LOC_LABEL[l]}</button>`).join('')}
      </div>` +
      (list.length ? list.map((p) => `
        <div class="item" onclick="UI.editPantry('${p.id}')">
          <span class="emoji ${catClass(p.name)}">${p.photo ? `<img src="${p.photo}" alt="" />` : p.emoji}</span>
          <div class="grow"><div class="name">${esc(p.name)}</div>
            <div class="sub">${qtyLabel(p)} · ${LOC_LABEL[p.location]} · ~${p.expiresAt || '기한 없음'}</div></div>
          ${stampFor(daysLeft(p.expiresAt))}
        </div>`).join('')
      : `<div class="empty"><span class="e-emoji">🕳️</span><b>여긴 비어 있네요</b><small>위의 버튼으로 재료를 담아보세요</small></div>`);
  }

  $('#view').innerHTML = `
    <div class="hero"><h1>우리집 <em>냉장고</em></h1>
      <p>${S.pantry.length ? `${S.pantry.length}개 보관 중${exp ? ` · 빨간 점 ${exp}개 먼저 드세요` : ' · 모두 신선해요 ❄️'}` : '재료를 담으면 추천이 시작돼요'}</p></div>
    <div class="action-strip">
      <button class="btn btn-primary" onclick="UI.openScan()"><b>📷 AI 스캔</b><small>영수증/사진 입고</small></button>
      <button class="btn" onclick="UI.openQuickAdd()"><b>➕ 빠른 추가</b><small>검색 후 탭</small></button>
    </div>
    <button class="btn btn-soft btn-block" style="margin-top:9px" onclick="UI.openFoodForm()">🍱 만든 요리·반찬·배달음식 보관하기</button>
    <div class="seg">
      <button class="${pantryView === 'shelf' ? 'on' : ''}" onclick="UI.setPantryView('shelf')">🧊 냉장고</button>
      <button class="${pantryView === 'list' ? 'on' : ''}" onclick="UI.setPantryView('list')">📋 자세히 보기</button>
    </div>
    ${body}`;
}
UI.setLoc = (l) => { pantryLoc = l; render(); };
UI.setPantryView = (v) => { pantryView = v; render(); };

let qaLoc = null; // 냉장고 ＋타일로 들어온 경우 그 칸으로 바로 담기
UI.quickAddAt = (loc) => { qaLoc = loc; UI.openQuickAdd(); };

function addPantryByName(rawName, { qty = 1, location, silentToast = false } = {}) {
  const ing = findIng(rawName);
  const name = ing ? ing.name : rawName;
  const loc = location || qaLoc || defaultLocation(ing);
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
    <h2>빠른 추가</h2><p class="sub">탭하면 바로 냉장고로 — 수량·기한은 자동, 나중에 수정 가능</p>
    <div class="search-row"><input id="qa-search" placeholder="재료 검색 (예: 계란, 두부…)" oninput="UI.qaFilter()" /></div>
    <div id="qa-grid" class="ing-pick-grid"></div>
    <div id="qa-custom"></div>
    <div class="btn-row"><button class="btn btn-block" onclick="UI.closeSheet();UI.refresh()">완료</button></div>`);
  renderQuickAddGrid();
  setTimeout(() => $('#qa-search')?.focus(), 60);
};

function renderQuickAddGrid() {
  const q = ($('#qa-search')?.value || '').trim();
  const list = ING.filter((it) => !q || it.name.includes(q) || it.aliases.some((a) => a.includes(q)));
  const grid = $('#qa-grid');
  if (!grid) return;
  grid.innerHTML = list.map((it) => {
    const owned = S.pantry.find((p) => p.name === it.name);
    return `<button class="ing-pick" onclick="UI.addPantryByName('${it.name}')">
      <span>${it.emoji}</span>${it.name}${owned ? `<small>보유 ${qtyLabel(owned)}</small>` : ''}</button>`;
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
    <div class="row" style="margin-bottom:4px">
      <span class="emoji ${catClass(p.name)}" style="font-size:1.5rem;width:52px;height:52px;display:grid;place-items:center;border-radius:15px;overflow:hidden">
        ${p.photo ? `<img src="${p.photo}" style="width:100%;height:100%;object-fit:cover" />` : p.emoji}</span>
      <div class="grow"><h2 style="margin:0">${esc(p.name)}</h2>
        <p class="sub" style="margin:0">~${p.expiresAt || '기한 없음'} ${stampFor(daysLeft(p.expiresAt))}</p></div>
    </div>
    <div class="field" style="margin-top:12px"><label>수량</label>${qtyControl}</div>
    <div class="field"><label>보관 위치</label>
      <div class="seg" style="margin:0">${['fridge', 'freezer', 'room'].map((l) =>
        `<button class="${p.location === l ? 'on' : ''}" onclick="UI.setItemLoc('${id}','${l}')">${LOC_LABEL[l]}</button>`).join('')}</div></div>
    <div class="field"><label>소비기한</label>
      <input type="date" value="${p.expiresAt || ''}" onchange="UI.setExpiry('${id}',this.value)" /></div>
    <div class="field"><label>실사 사진 (선반에서 진짜 내 재료로 보여요)</label>
      <div class="btn-row" style="margin-top:0">
        <label class="btn btn-soft">📸 사진 ${p.photo ? '바꾸기' : '추가'}<input type="file" accept="image/*" capture="environment" style="display:none" onchange="UI.itemPhoto('${id}',this)" /></label>
        ${p.photo ? `<button class="btn btn-soft" onclick="UI.itemPhotoClear('${id}')">사진 지우기</button>` : ''}
      </div></div>
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
UI.itemPhoto = async (id, input) => {
  const p = S.pantry.find((x) => x.id === id);
  const f = input.files?.[0];
  if (!p || !f) return;
  try { p.photo = await fileToDataURL(f, 320); save(); UI.editPantry(id); toast('사진을 붙였어요 📸'); }
  catch { toast('사진을 읽지 못했어요'); }
};
UI.itemPhotoClear = (id) => { const p = S.pantry.find((x) => x.id === id); if (p) { delete p.photo; save(); UI.editPantry(id); } };
UI.removePantry = (id) => {
  const p = S.pantry.find((x) => x.id === id);
  if (p && daysLeft(p.expiresAt) < 0) { S.ledger.wasted += p.price || 2000; toast(`${p.name} 폐기 — 버린 돈에 기록했어요`); }
  S.pantry = S.pantry.filter((x) => x.id !== id);
  save(); UI.closeSheet(); render();
};
UI.refresh = () => render();

/* ── AI 스캔 ─────────────────────────────── */
UI.openScan = () => {
  const ready = aiReady();
  if (!ready.ok) {
    openSheet(`
      <h2>📷 AI 입고 스캔</h2>
      <p class="sub">영수증이나 장 봐온 식재료 사진 한 장이면 AI가 품목을 읽어 냉장고에 등록해 드려요.</p>
      ${isAdmin()
        ? `<div class="banner">🔑 <span>${esc(ready.msg)}</span></div>
           <div class="btn-row">
             <button class="btn" onclick="UI.closeSheet()">나중에</button>
             <button class="btn btn-primary" onclick="UI.closeSheet();UI.go('settings')">설정으로 가기</button></div>`
        : `<div class="banner">✨ <span>AI 스캔은 베타 준비 중이에요 — 곧 무료로 제공됩니다. 그동안은 <b>빠른 추가</b>로 2탭 등록을 써주세요!</span></div>
           <div class="btn-row">
             <button class="btn" onclick="UI.closeSheet()">알겠어요</button>
             <button class="btn btn-primary" onclick="UI.closeSheet();UI.openQuickAdd()">➕ 빠른 추가 열기</button></div>`}`);
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
    `<img src="${URL.createObjectURL(scanFile)}" style="width:100%;border-radius:16px;max-height:240px;object-fit:cover" />`;
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
    if (e.status === 429 && S.settings.aiMode === 'server') { UI.openRecharge(); return; }
    toast(e.message || 'AI 분석에 실패했어요');
    btn.textContent = '🤖 AI 분석';
    btn.disabled = false;
  }
};
function renderScanRows() {
  const box = $('#scan-result');
  if (!box || !scanResults) return;
  box.innerHTML = `
    <div class="section-title" style="margin-top:8px"><h2>인식 결과 ${scanResults.length}개</h2><small>틀린 건 고치고 담으세요</small></div>
    ${scanResults.map((r, idx) => `
      <div class="item">
        <span class="emoji ${catClass(r.name)}">${r.emoji}</span>
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

/* ── 무료 한도 소진 → 광고 충전 / 구독 유도 ── */
UI.openRecharge = () => {
  openSheet(`
    <h2>🔋 무료 횟수를 다 썼어요</h2>
    <p class="sub">이번 달 무료 AI를 모두 사용했어요 — 두 가지 방법으로 계속 쓸 수 있어요</p>
    <div class="card flat row" style="gap:12px">
      <div style="font-size:1.7rem">📺</div>
      <div class="grow"><b>광고 보고 +1회 충전</b>
        <p class="hint" style="margin:2px 0 0">15초 시청 · 하루 3회까지</p></div>
      <button class="btn btn-sm btn-primary" onclick="UI.watchAd()">시청</button>
    </div>
    <div class="card flat row" style="gap:12px">
      <div style="font-size:1.7rem">⭐</div>
      <div class="grow"><b>프리미엄 — AI 무제한</b>
        <p class="hint" style="margin:2px 0 0">월 3,900원 · 살아있는 캐릭터팩 · 가족 공유 (출시 준비 중)</p></div>
      <button class="btn btn-sm btn-tint" onclick="UI.premiumInterest()">알림받기</button>
    </div>
    <div class="btn-row"><button class="btn btn-block" onclick="UI.closeSheet()">닫기</button></div>`);
};
UI.watchAd = () => {
  openSheet(`
    <h2>📺 광고</h2><p class="sub">베타 기간엔 자체 소식으로 대신해요 — 곧 실제 광고로 바뀝니다</p>
    <div class="card" style="text-align:center;padding:26px 16px">
      <div style="font-size:2.4rem">🧊✨</div>
      <b style="display:block;margin-top:6px">냉비서 프리미엄이 곧 나와요</b>
      <p class="hint">AI 무제한 · 살아 움직이는 재료 캐릭터팩 · 가족 공유 냉장고</p>
    </div>
    <button id="ad-btn" class="btn btn-block btn-soft" disabled>15초 후 충전돼요…</button>`);
  let t = 15;
  const iv = setInterval(async () => {
    const b = $('#ad-btn');
    if (!b) { clearInterval(iv); return; }
    t--;
    if (t > 0) { b.textContent = `${t}초 후 충전돼요…`; return; }
    clearInterval(iv);
    b.textContent = '충전 중…';
    try {
      await claimReward(S.settings);
      b.className = 'btn btn-block btn-primary';
      b.textContent = '✅ +1회 충전 완료 — 닫고 다시 시도하세요';
    } catch (e) {
      b.className = 'btn btn-block btn-soft';
      b.textContent = e.message || '충전에 실패했어요';
    }
    b.disabled = false;
    b.onclick = () => UI.closeSheet();
  }, 1000);
};
UI.premiumInterest = () => {
  S.premiumWish = true;
  save({ silent: true });
  toast('등록 완료! 프리미엄 출시 때 가장 먼저 알려드릴게요 🙌');
};

/* ── 레시피 ─────────────────────────────── */
function recipeVisual(r) {
  if (r.photo) return `<img class="r-photo" src="${r.photo}" alt="" loading="lazy" />`;
  if (r.yt) return `<img class="r-photo" src="${ytThumb(r.yt)}" alt="" loading="lazy" />`;
  return '';
}

function recipeCard(a) {
  const r = a.recipe;
  const pct = Math.round((a.have / Math.max(1, a.total)) * 100);
  const visual = recipeVisual(r);
  return `
    <div class="card recipe-card" onclick="UI.openRecipe('${r.id}')">
      ${a.cookable ? '<div class="ready-flag">✓ 지금 가능</div>' : ''}
      ${r.yt ? '<div class="yt-flag">▶ YouTube</div>' : (r.mine ? '<div class="yt-flag">내 레시피</div>' : '')}
      ${visual}
      <div class="r-body">
        <div class="r-head">
          ${visual ? '' : `<div class="r-emoji ${a.usesExpiring ? 't-meat' : ''}">${r.emoji || '🍳'}</div>`}
          <div class="grow">
            <h3>${esc(r.title)}</h3>
            <div class="meta">
              ${r.time ? `<span>⏱ ${r.time}분</span>` : ''}${r.kcal ? `<span>🔥 ${r.kcal}kcal</span>` : ''}
              ${r.protein ? `<span>단백질 <b>${r.protein}g</b></span>` : ''}
              ${a.usesExpiring ? '<span style="color:var(--red)">임박재료 소진</span>' : ''}
            </div>
          </div>
          <button class="heart ${a.fav ? 'on' : ''}" onclick="event.stopPropagation();UI.toggleFav('${r.id}')">❤️</button>
        </div>
        <div class="match-bar"><i style="width:${pct}%"></i></div>
        <div style="margin-top:9px">
          <span class="chip have">재료 ${a.have}/${a.total}</span>
          ${a.missing.slice(0, 3).map((m) =>
            `<span class="chip miss" onclick="event.stopPropagation();UI.addShopping('${esc(m)}')">＋ ${esc(m)}</span>`).join('')}
          ${a.missing.length > 3 ? `<span class="chip">외 ${a.missing.length - 3}</span>` : ''}
        </div>
      </div>
    </div>`;
}

function renderRecipes() {
  const modeKey = S.settings.mode;
  const mode = getMode(S, modeKey);
  const { analyzed, blocked } = recommend(S, modeKey, { includeBlocked: true });
  const q = recipeQuery.trim();

  let list = analyzed;
  if (rTab === 'mine') list = analyzed.filter((a) => a.recipe.mine);
  if (rTab === 'fav') list = analyzed.filter((a) => a.fav);
  list = list.filter((a) => !q || a.recipe.title.includes(q) || a.recipe.tags?.some((t) => t.includes(q)));

  const chips = modeList(S).map((m) =>
    `<button class="mode-chip ${m.key === modeKey ? 'on' : ''}" onclick="UI.setMode('${m.key}')">${m.emoji} ${esc(m.label)}${m.custom ? ` <span onclick="event.stopPropagation();UI.openModeMaker('${m.key}')" style="opacity:.7">✎</span>` : ''}</button>`).join('') +
    `<button class="mode-chip add" onclick="UI.openModeMaker()">＋ 모드 만들기</button>`;

  const emptyMsg = rTab === 'mine'
    ? `<div class="empty"><span class="e-emoji">📒</span><b>아직 내 레시피가 없어요</b><small>유튜브에서 본 그 요리, 엄마 레시피 —<br>아래 버튼으로 저장해 두면 내 재고와 자동 매칭돼요</small></div>`
    : rTab === 'fav'
      ? `<div class="empty"><span class="e-emoji">🤍</span><b>하트가 비어 있어요</b><small>레시피 카드의 ❤️를 누르면 여기 모여요</small></div>`
      : `<div class="empty"><span class="e-emoji">🔍</span><b>검색 결과가 없어요</b><small>다른 키워드로 찾아보세요</small></div>`;

  $('#view').innerHTML = `
    <div class="hero"><h1>${mode.emoji} <em>${esc(mode.label)}</em> 레시피</h1>
      <p>${esc(mode.desc || '내 냉장고 기준으로 정렬했어요')}</p></div>
    <div class="mode-chips">${chips}</div>
    <div class="search-row">
      <input placeholder="요리 이름·태그 검색" value="${esc(recipeQuery)}" oninput="UI.recipeSearch(this.value)" />
      <button class="btn btn-tint" onclick="UI.openRecipeForm()">＋ 레시피</button>
    </div>
    <div class="seg" style="margin-top:4px">
      <button class="${rTab === 'reco' ? 'on' : ''}" onclick="UI.setRTab('reco')">추천</button>
      <button class="${rTab === 'mine' ? 'on' : ''}" onclick="UI.setRTab('mine')">📒 내 레시피</button>
      <button class="${rTab === 'fav' ? 'on' : ''}" onclick="UI.setRTab('fav')">❤️ 찜</button>
    </div>
    ${mode.blockCaution && blocked.length
      ? `<div class="banner warn">🤰 주의 재료가 든 레시피 ${blocked.length}개를 자동으로 숨겼어요. 본 정보는 의학적 조언이 아니며, 식단은 담당 의료진과 상의하세요.</div>` : ''}
    ${list.length ? list.map(recipeCard).join('') : emptyMsg}`;
}
UI.recipeSearch = (v) => { recipeQuery = v; renderRecipes(); };
UI.setRTab = (t) => { rTab = t; renderRecipes(); };
UI.toggleFav = (id) => {
  const i = S.favs.indexOf(id);
  if (i >= 0) S.favs.splice(i, 1); else S.favs.push(id);
  save(); render();
};
UI.setMode = (k) => {
  S.settings.mode = k; save(); render();
  const m = getMode(S, k);
  toast(`${m.emoji} ${m.label} 모드 — 추천이 달라졌어요`);
};

const fmtAmt = (x) => String(Math.round(x * 100) / 100);

UI.openRecipe = (rid) => {
  const r = allRecipes(S).find((x) => x.id === rid);
  if (!r) return;
  detailServings = 1;
  const a = recommend(S, S.settings.mode).find((x) => x.recipe.id === rid) ||
            { missing: [], have: 0, total: 1, cookable: false, fav: S.favs.includes(rid) };
  openSheet(`
    ${r.yt ? `<div class="ytwrap"><iframe src="https://www.youtube-nocookie.com/embed/${r.yt}?rel=0&playsinline=1" allow="accelerometer; encrypted-media; picture-in-picture" allowfullscreen title="${esc(r.title)}"></iframe></div>
      <div class="row" style="justify-content:flex-end;margin:-4px 0 8px">
        <a class="btn btn-soft btn-sm" href="https://youtu.be/${r.yt}" target="_blank" rel="noreferrer">↗ 유튜브 앱에서 크게 보기</a></div>`
      : r.photo ? `<img src="${r.photo}" style="width:100%;border-radius:16px;margin-bottom:12px;max-height:230px;object-fit:cover" />` : ''}
    <div class="row">
      <div class="grow"><h2>${r.emoji || '🍳'} ${esc(r.title)}</h2>
        <p class="sub" style="margin:2px 0 0">${r.time ? `⏱ ${r.time}분 · ` : ''}${r.kcal ? `${r.kcal}kcal · ` : ''}${r.protein ? `단백질 ${r.protein}g` : ''}</p></div>
      <button class="heart ${a.fav ? 'on' : ''}" onclick="UI.toggleFav('${r.id}');this.classList.toggle('on')">❤️</button>
    </div>
    ${r.caution ? `<div class="banner warn">⚠️ ${esc(r.caution)}</div>` : ''}
    <div class="section-title" style="margin-top:12px"><h2>재료</h2><small>${a.have}/${a.total} 보유 · 인분을 바꾸면 양이 환산돼요</small></div>
    <div class="seg" id="dt-serv" style="margin:2px 0 10px">
      ${[1, 2, 3, 4].map((n) => `<button class="${n === 1 ? 'on' : ''}" onclick="UI.dtServ(${n})">${n}인분</button>`).join('')}
    </div>
    <div>
      ${r.ingredients.map((g) => {
        if (g.st) return `<span class="chip">${esc(g.n)} (양념)</span>`;
        const miss = a.missing.includes(g.n);
        return `<span class="chip ${miss ? 'miss' : 'have'}" ${miss ? `onclick="UI.addShopping('${esc(g.n)}')"` : ''}>${miss ? '＋ ' : '✓ '}${esc(g.n)} <b class="amt" data-b="${g.a || 0}" data-u="${esc(g.u || '')}">${g.a ? fmtAmt(g.a) + (g.u || '') : ''}</b></span>`;
      }).join('')}
    </div>
    ${r.steps?.length ? `<div class="section-title"><h2>만드는 법</h2></div>
    <div class="card flat" style="padding:6px 15px"><ul class="steps">${r.steps.map((st) => `<li>${esc(st)}</li>`).join('')}</ul></div>` : ''}
    ${r.mine ? `<div class="btn-row" style="margin-bottom:0">
      <button class="btn btn-soft" onclick="UI.openRecipeForm('${r.id}')">✎ 수정</button>
      <button class="btn btn-soft" onclick="UI.shareRecipe('${r.id}')">📤 공유</button>
      <button class="btn btn-soft" onclick="UI.deleteMyRecipe('${r.id}')">🗑️</button>
    </div>` : ''}
    <div class="btn-row">
      ${a.missing.length ? `<button class="btn" onclick="UI.addMissing('${r.id}')">🧺 부족 재료 ${a.missing.length}개 담기</button>` : ''}
      <button class="btn btn-primary" onclick="UI.openDeduct('${r.id}')">🍳 요리 완료</button>
    </div>`);
};

UI.dtServ = (n) => {
  detailServings = n;
  $$('#dt-serv button').forEach((b, i) => b.classList.toggle('on', i + 1 === n));
  $$('#modal-root .amt').forEach((el) => {
    const b = parseFloat(el.dataset.b) || 0;
    el.textContent = b ? fmtAmt(b * n) + (el.dataset.u || '') : '';
  });
};

UI.addMissing = (rid) => {
  const a = recommend(S, S.settings.mode).find((x) => x.recipe.id === rid);
  for (const m of a?.missing || []) UI.addShopping(m, true);
  toast(`부족 재료 ${a?.missing.length || 0}개를 장보기에 담았어요`);
};

/* ── 내 레시피 만들기 (유튜브 저장 포함) ──── */
UI.openRecipeForm = (editId) => {
  const ex = editId ? S.myRecipes.find((r) => r.id === editId) : null;
  draft = ex ? JSON.parse(JSON.stringify(ex)) : {
    id: 'my-' + uid(), mine: true, title: '', emoji: '🍳', yt: null, photo: null,
    time: '', kcal: '', protein: '', tags: [], steps: [],
    ingredients: [{ n: '', a: 1, u: '' }],
  };
  renderRecipeForm(!!ex);
};

function renderRecipeForm(isEdit) {
  openSheet(`
    <h2>${isEdit ? '레시피 수정' : '📒 나만의 레시피'}</h2>
    <p class="sub">유튜브에서 본 요리, 우리집 비법 — 저장하면 내 냉장고와 자동 매칭돼요</p>
    <div class="field"><label>유튜브 링크 — 붙여넣으면 영상·실사 썸네일 자동 연결</label>
      <input id="rf-yt" placeholder="https://youtu.be/…" value="${draft.yt ? 'https://youtu.be/' + draft.yt : ''}" onchange="UI.rfYt(this.value)" />
      <div id="rf-ytprev">${draft.yt ? `<img src="${ytThumb(draft.yt)}" style="width:100%;border-radius:14px;margin-top:8px" />` : ''}</div>
      <button id="rf-auto" class="btn btn-tint btn-block" style="margin-top:9px" onclick="UI.rfAuto()">🤖 빠른 레시피 — 영상 안 보고 재료·순서 자동 정리</button>
      <p class="hint">${aiReady().ok
        ? 'AI가 영상 페이지의 설명란과 웹을 읽어 정리해요 (약 20~40초 · 사진 스캔보다 토큰을 조금 더 씁니다)'
        : '자동 정리는 설정 → AI 설정을 마친 뒤 사용할 수 있어요'}</p></div>
    <div class="field"><label>이름 *</label><input id="rf-title" placeholder="예: 백종원 김치찜" value="${esc(draft.title)}" /></div>
    <div class="field"><label>또는 완성 사진</label>
      <div class="btn-row" style="margin-top:0">
        <label class="btn btn-soft">📸 사진 ${draft.photo ? '바꾸기' : '추가'}<input type="file" accept="image/*" style="display:none" onchange="UI.rfPhoto(this)" /></label>
      </div>
      <div id="rf-photoprev">${draft.photo ? `<img src="${draft.photo}" style="width:100%;border-radius:14px;margin-top:8px;max-height:180px;object-fit:cover" />` : ''}</div></div>
    <div class="field"><label>재료 (이름은 자동완성 — 사전에 있으면 재고와 매칭돼요)</label>
      <div id="rf-ings">${draft.ingredients.map(rfIngRow).join('')}</div>
      <button class="btn btn-soft btn-sm" onclick="UI.rfAddIng()">＋ 재료 추가</button></div>
    <div class="field"><label>태그 (모드 추천에 쓰여요)</label>
      <div class="tag-toggles" id="rf-tags">${TAGS.map((t) =>
        `<button class="${draft.tags.includes(t) ? 'on' : ''}" onclick="UI.rfTag(this,'${t}')">${t}</button>`).join('')}</div></div>
    <div class="row" style="gap:8px">
      <div class="field grow"><label>시간(분)</label><input id="rf-time" type="number" value="${draft.time || ''}" placeholder="15" /></div>
      <div class="field grow"><label>칼로리</label><input id="rf-kcal" type="number" value="${draft.kcal || ''}" placeholder="400" /></div>
      <div class="field grow"><label>단백질(g)</label><input id="rf-protein" type="number" value="${draft.protein || ''}" placeholder="20" /></div>
    </div>
    <div class="field"><label>만드는 법 (줄바꿈으로 단계 구분 — 비워도 돼요)</label>
      <textarea id="rf-steps" rows="4" placeholder="고기를 볶는다&#10;김치를 넣고 끓인다">${esc((draft.steps || []).join('\n'))}</textarea></div>
    <datalist id="ing-dl">${ING.map((i) => `<option value="${i.name}">`).join('')}</datalist>
    <div class="btn-row">
      <button class="btn" onclick="UI.closeSheet()">취소</button>
      <button class="btn btn-primary" onclick="UI.saveRecipeForm()">저장</button></div>`);
}

// 화면의 현재 입력값을 draft로 회수 (자동 정리 전·저장 전 공용)
function collectForm() {
  if (!draft) return;
  if ($('#rf-title')) draft.title = $('#rf-title').value.trim();
  if ($('#rf-time')) draft.time = Number($('#rf-time').value) || null;
  if ($('#rf-kcal')) draft.kcal = Number($('#rf-kcal').value) || null;
  if ($('#rf-protein')) draft.protein = Number($('#rf-protein').value) || null;
  if ($('#rf-steps')) draft.steps = $('#rf-steps').value.split('\n').map((s2) => s2.trim()).filter(Boolean);
  const rows = $$('#rf-ings .ing-row');
  if (rows.length) {
    draft.ingredients = rows.map((row) => ({
      n: row.querySelector('.i-name').value.trim(),
      a: Number(row.querySelector('.i-amt').value) || 1,
      u: row.querySelector('.i-unit').value.trim(),
      ...(row.querySelector('.i-st').classList.contains('on') ? { st: 1 } : {}),
    })).filter((g) => g.n);
  }
}

// 빠른 레시피: 영상을 보지 않고 AI가 재료·순서를 채워준다
UI.rfAuto = async () => {
  const url = $('#rf-yt').value.trim();
  if (!ytId(url)) { toast('유튜브 링크를 먼저 붙여넣어 주세요'); return; }
  const ready = aiReady();
  if (!ready.ok) { toast(isAdmin() ? ready.msg : '빠른 레시피는 베타 준비 중이에요 ✨ 곧 제공됩니다'); return; }
  collectForm();
  const btn = $('#rf-auto');
  btn.disabled = true; btn.textContent = '🤖 영상 내용 정리 중… (20~40초)';
  try {
    const data = await extractRecipeFromYouTube(url, S.settings);
    draft.yt = ytId(url);
    if (!draft.title) draft.title = data.title || '';
    draft.time = data.time || draft.time;
    draft.kcal = data.kcal || draft.kcal;
    draft.protein = data.protein || draft.protein;
    draft.tags = [...new Set([...(draft.tags || []), ...(data.tags || []).filter((t) => TAGS.includes(t))])];
    draft.ingredients = data.ingredients.map((g) => ({
      n: g.name, a: g.amount || 1, u: g.unit || '', ...(g.seasoning ? { st: 1 } : {}),
    }));
    draft.steps = data.steps || [];
    renderRecipeForm(true);
    toast('정리 완료 ✨ 내용 확인하고 저장하세요');
  } catch (e) {
    if (e.status === 429 && S.settings.aiMode === 'server') { UI.openRecharge(); return; }
    toast(e.message || '정리에 실패했어요');
    const b = $('#rf-auto');
    if (b) { b.disabled = false; b.textContent = '🤖 빠른 레시피 — 영상 안 보고 재료·순서 자동 정리'; }
  }
};

function rfIngRow(g, idx) {
  return `<div class="ing-row" data-idx="${idx}">
    <input class="i-name" list="ing-dl" placeholder="재료명" value="${esc(g.n)}" />
    <input class="i-amt" type="number" step="0.1" min="0" placeholder="양" value="${g.a ?? ''}" />
    <input class="i-unit" placeholder="단위" value="${esc(g.u || '')}" />
    <button class="i-st ${g.st ? 'on' : ''}" onclick="UI.rfSt(this)" title="양념이면 매칭·차감에서 제외">양념</button>
    <button onclick="this.parentElement.remove()">✕</button>
  </div>`;
}
UI.rfAddIng = () => { $('#rf-ings').insertAdjacentHTML('beforeend', rfIngRow({ n: '', a: 1, u: '' }, 0)); };
UI.rfSt = (el) => el.classList.toggle('on');
UI.rfTag = (el, t) => {
  el.classList.toggle('on');
  const i = draft.tags.indexOf(t);
  if (i >= 0) draft.tags.splice(i, 1); else draft.tags.push(t);
};
UI.rfYt = (url) => {
  draft.yt = ytId(url);
  $('#rf-ytprev').innerHTML = draft.yt ? `<img src="${ytThumb(draft.yt)}" style="width:100%;border-radius:14px;margin-top:8px" />` : '';
  if (url && !draft.yt) toast('유튜브 링크를 인식하지 못했어요');
};
UI.rfPhoto = async (input) => {
  const f = input.files?.[0];
  if (!f) return;
  draft.photo = await fileToDataURL(f, 640);
  $('#rf-photoprev').innerHTML = `<img src="${draft.photo}" style="width:100%;border-radius:14px;margin-top:8px;max-height:180px;object-fit:cover" />`;
};
UI.saveRecipeForm = () => {
  collectForm();
  if (!draft.title) { toast('레시피 이름을 적어주세요'); return; }
  if (!draft.ingredients.length || !draft.ingredients.some((g) => g.n)) { toast('재료를 1개 이상 넣어주세요'); return; }
  const i = S.myRecipes.findIndex((r) => r.id === draft.id);
  if (i >= 0) S.myRecipes[i] = draft; else S.myRecipes.push(draft);
  save();
  const savedId = draft.id;
  UI.closeSheet(); rTab = 'mine'; tab = 'recipes'; render();
  toast('내 레시피로 저장했어요 📒');
  setTimeout(() => UI.openRecipe(savedId), 150);
};
UI.deleteMyRecipe = (id) => {
  if (!confirm('이 레시피를 삭제할까요?')) return;
  S.myRecipes = S.myRecipes.filter((r) => r.id !== id);
  save(); UI.closeSheet(); render();
};
const shareUrl = (code) => `${location.origin}${location.pathname}?share=${encodeURIComponent(code)}`;

UI.shareRecipe = (id) => {
  const r = S.myRecipes.find((x) => x.id === id);
  if (!r) return;
  const d = { ...r, photo: null }; // 사진은 용량상 제외 (유튜브 썸네일은 유지)
  const url = shareUrl(shareEncode('recipe', d));
  const text = `🧊 [${r.title}] 레시피 공유! 링크 누르면 냉비서에 바로 추가돼요 👇`;
  if (navigator.share) navigator.share({ title: '냉비서 레시피', text, url }).catch(() => copyText(`${text}\n${url}`));
  else copyText(`${text}\n${url}`);
};

/* ── 맞춤 모드 만들기 ─────────────────────── */
UI.openModeMaker = (editKey) => {
  const ex = editKey ? S.settings.customModes.find((m) => m.key === editKey) : null;
  draft = ex ? JSON.parse(JSON.stringify(ex)) : {
    key: 'c_' + uid(), label: '', emoji: '⭐', desc: '',
    protein: false, expiring: false, zeroExtra: false, prefTags: [], exclude: [],
  };
  openSheet(`
    <h2>${ex ? '모드 수정' : '⭐ 나만의 모드 만들기'}</h2>
    <p class="sub">예: "야식 모드", "아빠 도시락", "당 줄이기" — 추천 기준을 직접 설계하세요</p>
    <div class="row" style="gap:8px">
      <div class="field" style="flex:0 0 76px"><label>이모지</label><input id="mf-emoji" value="${esc(draft.emoji)}" maxlength="4" style="text-align:center;font-size:1.3rem" /></div>
      <div class="field grow"><label>모드 이름 *</label><input id="mf-label" placeholder="예: 야식" value="${esc(draft.label)}" /></div>
    </div>
    <div class="field"><label>한 줄 설명</label><input id="mf-desc" placeholder="예: 늦은 밤엔 가볍고 빠르게" value="${esc(draft.desc || '')}" /></div>
    <div class="field"><label>추천 기준 (누르면 켜져요)</label>
      <div class="tag-toggles">
        <button id="mf-protein" class="${draft.protein ? 'on' : ''}" onclick="this.classList.toggle('on')">💪 단백질 우선</button>
        <button id="mf-expiring" class="${draft.expiring ? 'on' : ''}" onclick="this.classList.toggle('on')">⏳ 임박 재료 우선</button>
        <button id="mf-zero" class="${draft.zeroExtra ? 'on' : ''}" onclick="this.classList.toggle('on')">🪙 추가 지출 0원 우선</button>
      </div></div>
    <div class="field"><label>좋아하는 태그 (이 태그가 달린 요리가 위로 와요)</label>
      <div class="tag-toggles" id="mf-tags">${TAGS.map((t) =>
        `<button class="${draft.prefTags.includes(t) ? 'on' : ''}" onclick="UI.mfTag(this,'${t}')">${t}</button>`).join('')}</div></div>
    <div class="field"><label>빼고 싶은 재료 (쉼표로 — 이 재료가 든 요리는 숨겨요)</label>
      <input id="mf-exclude" placeholder="예: 오이, 고수" value="${esc((draft.exclude || []).join(', '))}" /></div>
    <div class="btn-row">
      ${ex ? `<button class="btn btn-soft" onclick="UI.deleteMode('${ex.key}')">🗑️</button>
              <button class="btn btn-soft" onclick="UI.shareMode('${ex.key}')">📤 공유</button>` : ''}
      <button class="btn btn-primary" onclick="UI.saveMode()">저장하고 적용</button></div>`);
};
UI.mfTag = (el, t) => {
  el.classList.toggle('on');
  const i = draft.prefTags.indexOf(t);
  if (i >= 0) draft.prefTags.splice(i, 1); else draft.prefTags.push(t);
};
UI.saveMode = () => {
  const label = $('#mf-label').value.trim();
  if (!label) { toast('모드 이름을 적어주세요'); return; }
  Object.assign(draft, {
    label,
    emoji: $('#mf-emoji').value.trim() || '⭐',
    desc: $('#mf-desc').value.trim(),
    protein: $('#mf-protein').classList.contains('on'),
    expiring: $('#mf-expiring').classList.contains('on'),
    zeroExtra: $('#mf-zero').classList.contains('on'),
    exclude: $('#mf-exclude').value.split(',').map((s2) => s2.trim()).filter(Boolean),
  });
  const i = S.settings.customModes.findIndex((m) => m.key === draft.key);
  if (i >= 0) S.settings.customModes[i] = draft; else S.settings.customModes.push(draft);
  S.settings.mode = draft.key;
  save(); UI.closeSheet(); tab = 'recipes'; render();
  toast(`${draft.emoji} ${draft.label} 모드 적용!`);
};
UI.deleteMode = (key) => {
  S.settings.customModes = S.settings.customModes.filter((m) => m.key !== key);
  if (S.settings.mode === key) S.settings.mode = 'none';
  save(); UI.closeSheet(); render();
};
UI.shareMode = (key) => {
  const m = S.settings.customModes.find((x) => x.key === key);
  if (!m) return;
  const url = shareUrl(shareEncode('mode', { ...m, key: undefined }));
  const text = `🧊 [${m.emoji} ${m.label}] 모드 공유! 링크 누르면 냉비서에 바로 적용돼요 👇`;
  if (navigator.share) navigator.share({ title: '냉비서 모드', text, url }).catch(() => copyText(`${text}\n${url}`));
  else copyText(`${text}\n${url}`);
};

/* ── 공유 코드 가져오기 ───────────────────── */
UI.openImport = () => {
  openSheet(`
    <h2>📥 공유받은 것 추가</h2>
    <p class="sub">보통은 받은 링크를 그냥 누르면 자동으로 추가돼요. 링크가 안 눌리면 여기에 통째로 붙여넣으세요.</p>
    <div class="field"><textarea id="imp-code" rows="4" placeholder="받은 링크 또는 NB1.… 코드"></textarea></div>
    <div class="btn-row"><button class="btn btn-primary btn-block" onclick="UI.runImport()">추가하기</button></div>`);
};
UI.runImport = () => { handleShareCode($('#imp-code').value); };
function handleShareCode(code) {
  const parsed = shareDecode(code || '');
  if (!parsed || !parsed.t || !parsed.d) { toast('코드를 읽지 못했어요 — NB1. 부분부터 끝까지 붙여넣어 주세요'); return; }
  if (parsed.t === 'recipe') {
    const r = { ...parsed.d, id: 'my-' + uid(), mine: true };
    S.myRecipes.push(r);
    save(); UI.closeSheet(); rTab = 'mine'; tab = 'recipes'; render();
    toast(`📒 "${r.title}" 레시피를 가져왔어요`);
  } else if (parsed.t === 'mode') {
    const m = { ...parsed.d, key: 'c_' + uid() };
    S.settings.customModes.push(m);
    S.settings.mode = m.key;
    save(); UI.closeSheet(); tab = 'recipes'; render();
    toast(`${m.emoji} "${m.label}" 모드를 가져와 적용했어요`);
  }
}

/* ── 요리 완료 → 차감 ─────────────────────── */
UI.openDeduct = (rid) => {
  const r = allRecipes(S).find((x) => x.id === rid);
  deductCtx = { recipe: r, servings: detailServings || 1, skips: new Set() };
  renderDeduct();
};

function renderDeduct() {
  const { recipe, servings, skips } = deductCtx;
  const plan = deductionPlan(recipe, S, servings);
  openSheet(`
    <h2>🧾 재고 차감</h2>
    <p class="sub">${esc(recipe.title)} — 몇 인분 하셨어요? 확인만 누르면 끝나요.</p>
    <div class="seg" style="margin-top:0">
      ${[1, 2, 3, 4].map((n) =>
        `<button class="${servings === n ? 'on' : ''}" onclick="UI.setServ(${n})">${n}인분</button>`).join('')}
    </div>
    <div class="receipt">
      ${plan.length === 0 ? '<div class="r-line"><span>차감할 재고 없음 (등록 안 된 재료)</span></div>' : ''}
      ${plan.map((p, idx) => p.skip
        ? `<div class="r-line" style="color:var(--label-3)"><span>${p.item.emoji} ${esc(p.item.name)}</span><small>${p.label}</small></div>`
        : `<div class="r-line" style="${skips.has(idx) ? 'opacity:.4;text-decoration:line-through' : ''}">
             <span>${p.item.emoji} ${esc(p.item.name)}</span>
             <span>${p.item.qty}${p.item.unit || ''} → <b>${p.after}${p.item.unit || ''}</b>
               <button style="margin-left:6px;font-size:.7rem;color:var(--label-3)" onclick="UI.toggleSkip(${idx})">${skips.has(idx) ? '되돌리기' : '건너뛰기'}</button>
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
    <div class="card flat" style="text-align:center;padding:20px">
      <div style="font-size:2.2rem">🥘</div>
      <b style="display:block;margin-top:6px">음식이 남았나요?</b>
      <p class="hint">등록해 두면 까먹기 전에 챙겨드릴게요</p>
    </div>
    <div class="btn-row">
      <button class="btn btn-primary" onclick="UI.closeSheet();UI.refresh()">다 먹었어요</button>
      <button class="btn btn-accent" onclick="UI.openLeftoverForm('${esc(recipeTitle)}')">남았어요 → 잔반 등록</button>
    </div>`);
};

/* ── 음식 보관 (만든 요리·반찬·배달음식) ───── */
const FOOD_KINDS = {
  cooked:   { emoji: '🍲', label: '만든 요리', fridgeDays: 3 },
  banchan:  { emoji: '🥢', label: '반찬',      fridgeDays: 5 },
  delivery: { emoji: '🥡', label: '배달음식',  fridgeDays: 2 },
};
const foodKind = (l) => FOOD_KINDS[l.kind] || FOOD_KINDS.cooked;
let foodCtx = null;

UI.openFoodForm = (name = '', kind = 'cooked') => {
  foodCtx = { kind, loc: 'fridge', photo: null };
  openSheet(`
    <h2>🍱 음식 보관</h2><p class="sub">만든 요리·반찬·배달음식 — 넣어두면 기한을 챙겨드려요</p>
    <div class="field"><label>이름</label><input id="fo-name" placeholder="예: 엄마표 멸치볶음, 남은 치킨" value="${esc(name)}" /></div>
    <div class="field"><label>종류</label>
      <div class="seg" style="margin:0" id="fo-kind">
        ${Object.entries(FOOD_KINDS).map(([k, v]) =>
          `<button class="${k === kind ? 'on' : ''}" onclick="UI.foKind('${k}',this)">${v.emoji} ${v.label}</button>`).join('')}
      </div></div>
    <div class="field"><label>보관</label>
      <div class="seg" style="margin:0" id="fo-loc">
        <button class="on" onclick="UI.foLoc('fridge',this)">냉장</button>
        <button onclick="UI.foLoc('freezer',this)">냉동</button>
      </div>
      <p class="hint" id="fo-exp"></p></div>
    <div class="field">
      <label class="btn btn-soft">📸 사진 (선택)<input type="file" accept="image/*" capture="environment" style="display:none" onchange="UI.foPhoto(this)" /></label>
      <span id="fo-photoprev" class="hint"></span></div>
    <div class="btn-row"><button class="btn btn-primary btn-block" onclick="UI.saveFood()">냉장고에 넣기</button></div>`);
  updateFoExp();
};
const foodDays = () => (foodCtx.loc === 'freezer' ? 30 : FOOD_KINDS[foodCtx.kind].fridgeDays);
function updateFoExp() {
  const el = $('#fo-exp');
  if (el) el.textContent = `소비기한 자동 설정: ${foodDays()}일 (저장 후 수정 가능)`;
}
UI.foKind = (k, el) => { foodCtx.kind = k; $$('#fo-kind button').forEach((b) => b.classList.toggle('on', b === el)); updateFoExp(); };
UI.foLoc = (l, el) => { foodCtx.loc = l; $$('#fo-loc button').forEach((b) => b.classList.toggle('on', b === el)); updateFoExp(); };
UI.foPhoto = async (input) => {
  const f = input.files?.[0];
  if (!f) return;
  try { foodCtx.photo = await fileToDataURL(f, 320); $('#fo-photoprev').textContent = '✓ 사진 첨부됨'; }
  catch { toast('사진을 읽지 못했어요'); }
};
UI.saveFood = () => {
  const k = FOOD_KINDS[foodCtx.kind];
  const name = $('#fo-name').value.trim() || k.label;
  S.leftovers.push({
    id: uid(), name, kind: foodCtx.kind, photo: foodCtx.photo,
    location: foodCtx.loc, expiresAt: addDays(foodDays()),
    createdAt: today(), status: 'active',
  });
  save(); UI.closeSheet(); render();
  toast(`${k.emoji} ${name} 보관 완료 — 기한 챙겨드릴게요`);
};
UI.openLeftoverForm = (name) => UI.openFoodForm(name, 'cooked');

UI.openFood = (id) => {
  const l = S.leftovers.find((x) => x.id === id);
  if (!l) return;
  const k = foodKind(l);
  openSheet(`
    ${l.photo ? `<img src="${l.photo}" style="width:100%;border-radius:16px;margin-bottom:10px;max-height:200px;object-fit:cover" />` : ''}
    <h2>${k.emoji} ${esc(l.name)}</h2>
    <p class="sub">${k.label} · ${LOC_LABEL[l.location]} ${stampFor(daysLeft(l.expiresAt))}</p>
    <div class="field"><label>소비기한</label>
      <input type="date" value="${l.expiresAt}" onchange="UI.foExpEdit('${id}',this.value)" /></div>
    <div class="btn-row">
      <button class="btn btn-soft" onclick="UI.leftoverDone('${id}','wasted');UI.closeSheet()">🗑️ 버렸어요</button>
      <button class="btn btn-primary" onclick="UI.leftoverDone('${id}','eaten');UI.closeSheet()">먹었어요 🪙</button></div>`);
};
UI.foExpEdit = (id, v) => { const l = S.leftovers.find((x) => x.id === id); if (l) { l.expiresAt = v; save(); } };
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

const coupangUrl = (name) => `https://www.coupang.com/np/search?q=${encodeURIComponent(name)}`;

function renderShopping() {
  const open = S.shopping.filter((x) => !x.done);
  const done = S.shopping.filter((x) => x.done);
  $('#view').innerHTML = `
    <div class="hero"><h1>오늘의 <em>장보기</em></h1>
      <p>부족·소진 재료가 자동으로 담겨요 — 쿠팡 버튼이면 두 탭에 장바구니</p></div>
    <div class="search-row">
      <input id="shop-new" placeholder="직접 추가 (예: 올리브유…)" onkeydown="if(event.key==='Enter')UI.shopAdd()" />
      <button class="btn btn-tint" onclick="UI.shopAdd()">담기</button>
    </div>
    ${open.length === 0 && done.length === 0
      ? `<div class="empty"><span class="e-emoji">🧺</span><b>장보기 바구니가 비었어요</b><small>레시피의 부족 재료를 탭하거나<br>재료가 다 떨어지면 자동으로 담겨요</small></div>` : ''}
    ${open.map((x) => `
      <div class="item">
        <button style="font-size:1.25rem" onclick="UI.shopToggle('${x.id}')">⚪</button>
        <div class="grow"><div class="name">${esc(x.name)}</div><div class="sub">${esc(x.reason)}</div></div>
        <a class="btn btn-sm btn-accent" href="${coupangUrl(x.name)}" target="_blank" rel="noreferrer">쿠팡 🛒</a>
        <button style="color:var(--label-3)" onclick="UI.shopRemove('${x.id}')">✕</button>
      </div>`).join('')}
    ${done.length ? `
      <div class="section-title"><h2>✓ 샀어요 (${done.length})</h2><small>입고하면 냉장고로 들어가요</small></div>
      ${done.map((x) => `
        <div class="item" style="opacity:.6">
          <button style="font-size:1.25rem" onclick="UI.shopToggle('${x.id}')">✅</button>
          <div class="grow"><div class="name" style="text-decoration:line-through">${esc(x.name)}</div></div>
          <button style="color:var(--label-3)" onclick="UI.shopRemove('${x.id}')">✕</button>
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
  const modes = modeList(S);
  $('#view').innerHTML = `
    <div class="hero"><h1>내 <em>모드</em>와 설정</h1><p>모드를 바꾸면 추천이 통째로 달라져요</p></div>
    <div class="mode-grid">
      ${modes.map((m) => `
        <button class="mode-card ${st.mode === m.key ? 'on' : ''}" onclick="UI.setMode('${m.key}')">
          <span class="m-emoji">${m.emoji}</span><b>${esc(m.label)} 모드</b><small>${esc(m.desc || '내가 만든 모드')}</small>
          ${m.custom ? `<small style="color:var(--blue);margin-top:4px" onclick="event.stopPropagation();UI.openModeMaker('${m.key}')">✎ 수정 · 공유</small>` : ''}
        </button>`).join('')}
      <button class="mode-card" style="border:1.5px dashed var(--hairline);box-shadow:none" onclick="UI.openModeMaker()">
        <span class="m-emoji">＋</span><b>새 모드 만들기</b><small>나만의 추천 기준 설계</small></button>
    </div>

    <div class="section-title"><h2>🤖 AI 기능</h2>
      <small style="cursor:pointer" onclick="UI.adminGate()">${isAdmin() ? '🔓 관리자 ON · 잠그기' : '🔒 관리자'}</small></div>
    ${!isAdmin() ? `
    <div class="card flat">
      <p class="hint" style="margin:0">✨ AI 기능(영수증 스캔 · 유튜브 빠른 레시피)은 베타 운영 중이에요.
      운영자가 서버를 켜면 모든 사용자에게 무료 월 10회로 제공됩니다. 설정은 관리자만 가능해요.</p>
    </div>` : `
    <div class="card flat">
      <div class="seg" style="margin-top:0">
        <button class="${st.aiMode !== 'server' ? 'on' : ''}" onclick="UI.setAiMode('byok')">🔑 내 키 (베타)</button>
        <button class="${st.aiMode === 'server' ? 'on' : ''}" onclick="UI.setAiMode('server')">☁️ 서버 (유료화)</button>
      </div>
      ${st.aiMode === 'server' ? `
      <div class="field"><label>서버 AI 주소 (Functions 배포 URL)</label>
        <input id="set-aiendpoint" placeholder="https://ai-xxxxxxxx.a.run.app" value="${esc(st.aiEndpoint)}" /></div>
      <p class="hint">운영 모드 — 사용자는 키 없이 가입만으로 AI를 쓰고, 운영자 키는 서버에만 저장되며 무료 월 한도(기본 10회)가 자동 집계돼요. 위 "기기 연동" 연결이 먼저 필요하고, 서버 배포 방법은 레포의 <b>docs/07</b> 문서에 있어요.</p>`
      : `
      <div class="field"><label>Claude API 키 (이 기기에만 저장 · 동기화 안 됨)</label>
        <input id="set-aikey" type="password" placeholder="sk-ant-…" value="${esc(st.aiKey)}" /></div>
      <div class="field"><label>모델</label>
        <select id="set-aimodel">
          ${[['claude-opus-4-8', 'Opus 4.8 — 가장 정확 (기본)'], ['claude-sonnet-4-6', 'Sonnet 4.6 — 균형'], ['claude-haiku-4-5', 'Haiku 4.5 — 가장 저렴']]
            .map(([v, l]) => `<option value="${v}" ${st.aiModel === v ? 'selected' : ''}>${l}</option>`).join('')}
        </select></div>
      <p class="hint">개발·베타용. 키는 console.anthropic.com에서 발급, 비용은 본인 계정 과금 (영수증 1장 수~수십 원). 공용 기기에서는 등록하지 마세요.</p>`}
      <button class="btn btn-block btn-tint" style="margin-top:6px" onclick="UI.saveAI()">저장</button>
      <p class="hint" style="margin-top:8px">터미널 테스트: <b>tools/ai-test.mjs</b> — 폰 없이 스캔·레시피 정리 파이프라인을 검증할 수 있어요 (docs/07)</p>
    </div>`}

    <div class="section-title"><h2>🔄 기기 연동 · 가족 공유</h2><small>같은 코드 = 같은 냉장고</small></div>
    <div class="card flat">
      <p class="hint" style="margin-bottom:10px">휴대폰(앱)과 컴퓨터(웹), 또는 가족끼리 같은 냉장고를 보려면:
      ① <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer">Firebase</a> 무료 프로젝트 생성 → 웹앱 추가
      ② Authentication "익명" 로그인 켜기 + Firestore 만들기
      ③ 설정 JSON을 아래에 붙여넣기 ④ 모든 기기에서 같은 동기화 코드 입력.</p>
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
    <button class="btn btn-soft btn-block" style="margin-top:9px" onclick="UI.openImport()">📥 공유받은 레시피·모드 추가 (링크 붙여넣기)</button>
    <p class="hint" style="margin-top:16px;text-align:center">냉비서 v0.2 · 데이터는 내 기기(와 내 Firebase)에만 저장됩니다<br>제품 설계 문서: 레포 docs/ 폴더</p>`;
}
UI.setAiMode = (m) => { S.settings.aiMode = m; save(); renderSettings(); };
UI.saveAI = () => {
  if (S.settings.aiMode === 'server') {
    S.settings.aiEndpoint = $('#set-aiendpoint').value.trim();
  } else {
    S.settings.aiKey = $('#set-aikey').value.trim();
    S.settings.aiModel = $('#set-aimodel').value;
  }
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
      for (const k of ['settings', 'pantry', 'leftovers', 'shopping', 'myRecipes', 'favs', 'ledger']) if (data[k]) S[k] = data[k];
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
  $$('#tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  window.scrollTo({ top: 0 });
}
UI.go = (t) => { endMove(); tab = t; render(); };

$$('#tabbar button').forEach((b) => b.addEventListener('click', () => UI.go(b.dataset.tab)));

/* ── 길게 눌러 칸 이동 (냉장↔냉동↔실온) ───── */
let moveCtx = null;
let holdTimer = null;
let holdStart = null;
let suppressClick = false;

function endMove() {
  moveCtx = null;
  document.body.classList.remove('move-mode');
}

const view = $('#view');
view.addEventListener('pointerdown', (e) => {
  const t = e.target.closest('[data-move]');
  if (!t || moveCtx) return;
  holdStart = [e.clientX, e.clientY];
  holdTimer = setTimeout(() => {
    holdTimer = null;
    suppressClick = true;
    moveCtx = t.dataset.move;
    t.classList.add('moving');
    document.body.classList.add('move-mode');
    navigator.vibrate?.(30);
    toast('옮길 칸(냉장·냉동·실온)을 탭하세요 — 다른 곳 탭하면 취소');
  }, 400);
});
view.addEventListener('pointermove', (e) => {
  if (holdTimer && holdStart && Math.hypot(e.clientX - holdStart[0], e.clientY - holdStart[1]) > 12) {
    clearTimeout(holdTimer); holdTimer = null;
  }
});
['pointerup', 'pointercancel'].forEach((ev) =>
  view.addEventListener(ev, () => { if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; } }));

document.addEventListener('click', (e) => {
  if (suppressClick) { suppressClick = false; e.preventDefault(); e.stopPropagation(); return; }
  if (!moveCtx) return;
  e.preventDefault(); e.stopPropagation();
  const loc = e.target.closest('[data-loc]')?.dataset.loc;
  const [kind, id] = moveCtx.split(':');
  if (loc) {
    if (kind === 'p') {
      const p = S.pantry.find((x) => x.id === id);
      if (p && p.location !== loc) { p.location = loc; save(); toast(`${p.name} → ${LOC_LABEL[loc]}로 옮겼어요`); }
    } else {
      const l = S.leftovers.find((x) => x.id === id);
      if (l && loc === 'room') toast('조리음식은 냉장·냉동에만 보관할 수 있어요');
      else if (l && l.location !== loc) { l.location = loc; save(); toast(`${l.name} → ${LOC_LABEL[loc]}로 옮겼어요`); }
    }
  }
  endMove(); render();
}, true);

render();
initSync(() => renderTop());

// 공유 링크로 진입한 경우 (?share=NB1.…)
const shared = new URLSearchParams(location.search).get('share');
if (shared) {
  history.replaceState(null, '', location.pathname);
  handleShareCode(shared);
}
