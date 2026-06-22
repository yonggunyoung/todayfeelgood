// 냉비서 — 화면 렌더링과 상호작용 전부. 프레임워크 없는 단일 페이지 앱.
import { S, save, uid, today, addDays, daysLeft, won } from './store.js';
import { ING, findIng, defaultShelf, defaultLocation, ingredientTip } from './data/ingredients.js';
import { isWeight, measureOf, baseUnit, unitOptions, toBase, perBase, fmtBase, fmtRaw, stepFor, defaultEntry } from './units.js';
import { recommend, recipesUsing, expiringItems, activeLeftovers, deductionPlan, modeList, getMode, allRecipes, buildCookPlan, setCommunityStats, communityRating } from './engine.js';
import { scanImage, extractRecipeFromYouTube } from './ai.js';
import { initSync, sync, makeSpaceCode, setSpaceCode, loginGoogle, logoutGoogle, syncAvailable, submitScore, topScores, submitRating, fetchRecipeStats } from './sync.js';
import { initAnalytics, track, trackScreen } from './analytics.js';
import { enablePush, pushSupported, pushOn, pushPermission } from './push.js';
import { AI_ENDPOINT, COUPANG_TAG, AI_FN } from './config.js';
import { canListen, speak, stopSpeak, startListen, stopListen, isListening, parseCommand } from './voice.js';
import { earn, bonus, spend, refund, EARN, earnedToday, SHOP, adFreeNow, gameBest, aiLeft, aiConsume, aiGrant, aiUnlimited, FREE_AI } from './points.js';
import { initGames, openGames, GAMES, gameFresh, gameVoice, gameVoicePass, gameDouble, setGameDiff } from './games.js';
import { gameDefense, defBuy, defStart, defSpeed, defPick, defRevive, defGiveUp, defAdSkip, defAdSkill, defResume, defDraftAd, defWallMode, defElem, defMidSkill, defMidSkip, defActive } from './game-defense.js';
import { gamePuzzle } from './game-puzzle.js';
import { gameGomoku, gomokuUndo, gomokuHintAd } from './game-gomoku.js';
import { gameQuiz, quizPick, quizNext, quizReveal, quizRevealAll, quizFinish } from './game-quiz.js';
import { tossRewardedAd } from './toss.js';

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
let vc = null;          // 음성 컨텍스트 {type:'detail'|'plan', idx, video, recipe|plan}
let ytTime = 0;         // 유튜브 현재 재생 시각 (player infoDelivery)
let ytState = -1;       // 유튜브 재생 상태 (1=재생 중) — 영상 소리의 명령 오인 방지용
let selMode = false;    // 같이 요리 — 레시피 다중 선택 모드
const cookSel = new Set();

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const LOC_LABEL = { fridge: '냉장', freezer: '냉동', room: '실온' };
const LEVELS = [['full', '가득'], ['half', '절반'], ['low', '조금'], ['empty', '없음']];
const TAGS = ['반찬', '고단백', '운동', '자취', '초간단', '국물', '집밥', '도시락', '다이어트', '순한맛', '매콤', '아침'];

// 시작 화면 — 앱을 열면 처음 뜨는 화면. 탭 + 세부 상태(냉장고 문 열림·레시피 하위탭)를 한 키로 묶는다.
const START_SCREENS = {
  home:           { tab: 'home',     icon: '🏠', label: '홈', desc: '오늘의 추천' },
  pantry:         { tab: 'pantry',   icon: '🧊', label: '냉장고', desc: '문 닫힘(꾸미기)' },
  'pantry-open':  { tab: 'pantry',   icon: '🧊', label: '냉장고 안', desc: '문 열린 내부', fridge: true },
  recipes:        { tab: 'recipes',  icon: '🍳', label: '레시피', desc: '오늘의 추천', rtab: 'reco' },
  'recipes-mine': { tab: 'recipes',  icon: '📒', label: '내 레시피', desc: '내가 저장한 것', rtab: 'mine' },
  'recipes-fav':  { tab: 'recipes',  icon: '❤️', label: '찜', desc: '찜한 레시피', rtab: 'fav' },
  shopping:       { tab: 'shopping', icon: '🧺', label: '장보기', desc: '살 것 메모' },
  games:          { tab: 'home',     icon: '🎮', label: '게임', desc: '열면 바로 게임', games: true },
};
// 시작 화면 키를 실제 라우팅 상태(tab·rTab·fridgeOpen)로 적용. 렌더는 호출부가 담당.
function applyStartTab(key) {
  const sc = START_SCREENS[key] || START_SCREENS.home;
  tab = sc.tab;
  if (sc.rtab) rTab = sc.rtab;
  if (sc.fridge) { pantryView = 'shelf'; fridgeOpen = true; } else if (sc.tab === 'pantry') { fridgeOpen = false; }
  return sc;
}

window.UI = {};

// 관리자 모드 — AI 설정은 운영자만 만진다 (이 기기에서만 해제 상태 유지)
const ADMIN_FLAG = 'naengbiseo.admin';
const isAdmin = () => { try { return localStorage.getItem(ADMIN_FLAG) === '1'; } catch { return false; } };
// 숨은 진입: 설정 맨 아래 버전 문구를 4초 안에 7번 탭 → PIN 입력 (일반 사용자에겐 보이지 않음)
let verTaps = 0;
let verTapTimer = null;
UI.verTap = () => {
  verTaps++;
  clearTimeout(verTapTimer);
  verTapTimer = setTimeout(() => { verTaps = 0; }, 4000);
  if (verTaps >= 7) { verTaps = 0; UI.adminGate(); }
};
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

// AI 사용 가능 여부 (byok=내 키 / server=운영자 게이트웨이 경유)
function aiReady() {
  const st = S.settings;
  if (st.aiMode === 'server') {
    // 게이트웨이(Cloudflare 워커)는 별도 로그인이 필요 없다 — 엔드포인트만 있으면 바로 사용 가능
    if (!(st.aiEndpoint || AI_ENDPOINT)) return { ok: false, msg: '설정 → AI에서 서버 AI 주소를 입력해 주세요.' };
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

/* ── 금액 현실화: 입고 시 기록한 실구매가(없으면 사전가)를 base 단위 단가로 환산 ── */
const LEVEL_FRAC = { full: 1, half: 0.5, low: 0.25, empty: 0 };
// 사전가(ing.price)는 '고유 단위(ing.unit) 1개' 기준 → base 1단위당 단가로 환산
function baseUnitPrice(ing) {
  if (!ing) return 0;
  return (ing.price || 2000) / Math.max(1, perBase(ing, ing.unit));
}
function unitPriceOf(p) {
  if (typeof p.unitPrice === 'number' && p.unitPrice > 0) return p.unitPrice;
  return baseUnitPrice(findIng(p.name));
}
function moneyFor(p, qty) {
  if (!p) return 0;
  if (p.qtyType === 'level') return Math.round((p.price || findIng(p.name)?.price || 2000) * (LEVEL_FRAC[p.level] ?? 0.5));
  const q = qty != null ? qty : (Number(p.qty) || 0);
  return Math.round(unitPriceOf(p) * q);
}

/* ── 위트 한마디 — 버리면 따끔(부정), 아끼면 흐뭇(긍정). 아이콘과 함께 떴다 공중으로 사라짐 ── */
const PROVERBS = {
  waste: [
    ['🌍', '버리면 지구 CO₂가 늘어요'],
    ['☔', '가랑비에 옷 젖듯… 버린 게 쌓여요'],
    ['🗑️', '음식물 1kg = CO₂ 약 2.5kg'],
    ['🥲', '아까워라 — 다음엔 딱 필요한 만큼만'],
    ['💸', '티끌 모아 태산… 버린 돈도 태산'],
  ],
  save: [
    ['⛰️', '티끌 모아 태산 — 잘 아꼈어요!'],
    ['🌱', '지구가 한숨 돌렸어요'],
    ['🪙', '가랑비에 옷 젖듯, 절약도 차곡차곡'],
    ['🌟', '버릴 뻔한 재료를 구출했어요'],
    ['💪', '오늘도 냉장고 알뜰살뜰'],
  ],
};
function proverbFloat(kind) {
  const pool = PROVERBS[kind] || PROVERBS.save;
  const [icon, text] = pool[Math.floor(Math.random() * pool.length)];
  const el = document.createElement('div');
  el.className = `proverb proverb-${kind}`;
  el.innerHTML = `<span class="pv-ico">${icon}</span><span>${esc(text)}</span>`;
  ($('#toast-root') || document.body).appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

function openSheet(html, { lock = false } = {}) {
  // lock: 보상형 광고처럼 바깥 탭으로 닫히면 안 되는 시트 (명시적 버튼으로만 종료)
  $('#modal-root').innerHTML =
    `<div class="overlay" ${lock ? '' : 'onclick="if(event.target===this)UI.closeSheet()"'}>
       <div class="sheet">${lock ? '' : '<div class="grip"></div>'}${html}</div>
     </div>`;
  if (!sheetPushed) { history.pushState({ nb: 'sheet' }, ''); sheetPushed = true; }
  // 게임(.gx) 시트는 화면을 꽉 채우는 풀 레이아웃 — :has() 미지원 대비 클래스로도 지정
  const sheetEl = $('#modal-root .sheet');
  if (sheetEl && sheetEl.querySelector('.gx')) sheetEl.classList.add('sheet-full');
  if (!lock) attachSheetDrag();
  relocateTimerChip(); // 게임 시트가 열리면 타이머를 컴팩트/전면으로
}
// 상단 손잡이(그립)·게임 상단바를 잡고 아래로 슬라이드하면 닫힘 (배경 스크롤과 충돌 안 나게 핸들에 touch-action:none)
function attachSheetDrag() {
  const sheet = $('#modal-root .sheet'); if (!sheet) return;
  let startY = 0, dy = 0, dragging = false;
  const onDown = (e) => {
    if (!e.target.closest('.grip, .gx-bar')) return; // 손잡이/게임 상단바에서만 시작
    if (e.target.closest('button, input, textarea, select, a')) return;
    dragging = true; startY = e.clientY; dy = 0;
    sheet.style.transition = 'none'; sheet.style.willChange = 'transform';
    try { sheet.setPointerCapture(e.pointerId); } catch { /* noop */ }
  };
  const onMove = (e) => {
    if (!dragging) return;
    e.preventDefault(); // 네이티브 스크롤(흐릿한 배경 움직임) 방지
    dy = Math.max(0, e.clientY - startY);
    sheet.style.transform = `translateY(${dy}px)`;
    sheet.style.opacity = String(Math.max(0.4, 1 - dy / 600));
  };
  const end = () => {
    if (!dragging) return;
    dragging = false; sheet.style.transition = ''; sheet.style.opacity = ''; sheet.style.willChange = '';
    if (dy > 90) { UI.closeSheet(); if (sheet.isConnected) sheet.style.transform = ''; } // 가드로 안 닫혔으면 제자리로
    else sheet.style.transform = '';
  };
  sheet.addEventListener('pointerdown', onDown);
  sheet.addEventListener('pointermove', onMove);
  sheet.addEventListener('pointerup', end);
  sheet.addEventListener('pointercancel', end);
}
let sheetPushed = false;   // 뒤로가기로 시트가 닫히도록 히스토리에 한 칸 쌓아둠
let ignoreNextPop = false;
let closeForce = false; // 게임 나가기 확인을 거친 강제 종료
UI.closeSheet = (fromPop = false) => {
  // 게임 진행 중엔 실수로 빠져나가지 않도록 경고 (이어하기로 저장됨)
  if (!closeForce && document.querySelector('.gx-def') && defActive()) {
    if (fromPop && !sheetPushed) { history.pushState({ nb: 'sheet' }, ''); sheetPushed = true; } // 뒤로가기로 들어와도 다음 back까지 가드
    confirmExitGame();
    return;
  }
  // 전체화면 게임이면 먼저 빠져나오고, 진행 중인 타이머 칩은 body로 옮겨 보존(모달 비우기에 같이 지워지지 않게)
  try { if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen(); } catch { /* noop */ }
  const chip = document.getElementById('timer-chip');
  if (chip && chip.parentElement !== document.body) document.body.appendChild(chip);
  $('#modal-root').innerHTML = '';
  scanFile = null; scanResults = null; deductCtx = null; draft = null; qaLoc = null;
  vc = null; stopListen(); stopSpeak();
  if (sheetPushed && !fromPop) { ignoreNextPop = true; history.back(); }
  sheetPushed = false;
  relocateTimerChip(); // 시트 닫히면 타이머 컴팩트 해제
};
// 게임 나가기 확인 — 캔버스를 살린 채 스테이지 위 오버레이로
function confirmExitGame() {
  const stage = document.querySelector('.gx-def .gx-stage'); if (!stage) { closeForce = true; UI.closeSheet(); closeForce = false; return; }
  if (stage.querySelector('.def-exit')) return;
  const ov = document.createElement('div'); ov.className = 'draft-overlay def-exit';
  ov.innerHTML = `<div class="draft-in">
    <div class="draft-title">나가시겠어요?</div>
    <p>진행 상황은 <b>이어서 하기</b>로 저장돼요</p>
    <button class="gx-btn-go" onclick="UI.exitGameStay()">🛡️ 계속 지키기</button>
    <button class="qz-skip" onclick="UI.exitGameLeave()">나가기 (저장됨)</button></div>`;
  stage.appendChild(ov);
}
UI.exitGameStay = () => { document.querySelector('.def-exit')?.remove(); };
UI.exitGameLeave = () => { document.querySelector('.def-exit')?.remove(); closeForce = true; UI.closeSheet(); closeForce = false; };

function stampFor(days) {
  if (days <= 1) return `<span class="stamp stamp-danger">${days < 0 ? '기한지남' : 'D-' + Math.max(0, days)}</span>`;
  if (days <= 3) return `<span class="stamp stamp-warn">D-${days}</span>`;
  return `<span class="stamp stamp-ok">D-${days}</span>`;
}
function qtyLabel(p) {
  if (p.qtyType === 'level') return (LEVELS.find(([v]) => v === p.level) || [])[1] || '보통';
  return fmtRaw(p.unit, p.qty); // g/kg·ml/L·개수 단위 인식 표시
}

const catClass = (name) => `t-${findIng(name)?.cat || '기타'}`;

/* ── 재료 아이콘 (디자인 시안 FoodIcon) — 재료를 귀여운 플랫 SVG 캐릭터로.
   임박(d<=1)하면 우는 표정(눈물 애니), 그 외엔 웃는 표정. 매칭 안 되는 재료는
   기존 이모지로 폴백(특이 재료·조리음식까지 커버 유지). 사진이 있으면 사진 우선. */
function foodShape(name, cat) {
  const f = String(name || '');
  const has = (...a) => a.some((x) => f.includes(x));
  if (has('토마토', '방울토마토')) return '<circle cx="16" cy="18" r="9.5" fill="#FF6B5E"/><circle cx="12.5" cy="14.5" r="2.4" fill="#fff" opacity=".18"/><path d="M16 9 l2.4 -3 M16 9 l-2.4 -3 M16 9 l0 -3.6" stroke="#3FA45A" stroke-width="1.7" stroke-linecap="round"/>';
  if (has('양배추', '배추')) return '<circle cx="16" cy="18" r="9.5" fill="#76C24F"/><path d="M9 17 Q16 11.5 23 17 M10 21 Q16 16.5 22 21" stroke="#A7DD80" stroke-width="1.4" fill="none" stroke-linecap="round"/>';
  if (has('우유', '두유')) return '<path d="M10 12 L16 7 L22 12 Z" fill="#EAF3FA"/><rect x="10" y="12" width="12" height="16" rx="2" fill="#fff" stroke="#DCE6EE" stroke-width="1"/><rect x="10" y="18" width="12" height="3.4" fill="#7FB5E6"/>';
  if (has('달걀', '계란')) return '<ellipse cx="16" cy="19" rx="8.5" ry="10.5" fill="#fff" stroke="#F0E9D8" stroke-width="1"/><ellipse cx="12.5" cy="14" rx="2.2" ry="3" fill="#fff" opacity=".7"/>';
  if (has('양파')) return '<circle cx="16" cy="18" r="9.5" fill="#E7C9E2"/><path d="M16 9 v-3 M14 9 l-1 -2.5 M18 9 l1 -2.5" stroke="#B98FB0" stroke-width="1.4" stroke-linecap="round"/><path d="M11 18 Q16 27 21 18" stroke="#CFA6C8" stroke-width="1.2" fill="none"/>';
  if (has('당근')) return '<path d="M16 28 L9.5 12 Q16 9.5 22.5 12 Z" fill="#F59331"/><path d="M16 9.5 l0 -4 M13 9.5 l-2 -3.6 M19 9.5 l2 -3.6" stroke="#5BB85C" stroke-width="1.9" stroke-linecap="round"/>';
  if (has('닭')) return '<ellipse cx="16" cy="18" rx="9.5" ry="8.4" fill="#F4C9B8"/><ellipse cx="12.5" cy="14.5" rx="2.2" ry="1.8" fill="#fff" opacity=".4"/>';
  if (has('치즈', '버터')) return '<path d="M7 24 L7 16 L25 12 L25 24 Z" fill="#FFCE4A"/><circle cx="12" cy="20" r="1.3" fill="#F0B400"/><circle cx="18.5" cy="19" r="1.5" fill="#F0B400"/>';
  if (has('브로콜리')) return '<rect x="14.5" y="18" width="3" height="9" rx="1.5" fill="#BFD89A"/><circle cx="12" cy="15" r="5" fill="#4FB36B"/><circle cx="20" cy="15" r="5" fill="#4FB36B"/><circle cx="16" cy="11.5" r="5.2" fill="#5CC078"/>';
  if (has('밥', '쌀')) return '<path d="M7.5 18 Q16 11.5 24.5 18 Z" fill="#fff"/><path d="M6.5 18 L25.5 18 Q24 26 16 26 Q8 26 6.5 18 Z" fill="#EDEFF1" stroke="#DDE2E6" stroke-width="1"/>';
  if (has('만두')) return '<path d="M7 22 Q7 13 16 13 Q25 13 25 22 Z" fill="#EFE2C2"/><path d="M10 16 l1.4 4 M14 14.5 l1 5 M18 14.5 l-1 5 M22 16 l-1.4 4" stroke="#D8C49A" stroke-width="1" stroke-linecap="round"/>';
  if (has('두부')) return '<rect x="7" y="11" width="18" height="15" rx="3.5" fill="#FFFDF6" stroke="#ECE7D6" stroke-width="1"/>';
  if (has('돼지', '삼겹')) return '<rect x="7" y="12" width="18" height="13" rx="5.5" fill="#F3B6BE"/><rect x="7" y="18" width="18" height="3" fill="#fff" opacity=".5"/>';
  if (has('애호박', '호박')) return '<rect x="8" y="13" width="16" height="10" rx="5" fill="#6FB84A" transform="rotate(-12 16 18)"/>';
  if (has('대파', '쪽파')) return '<rect x="14" y="8" width="4" height="20" rx="2" fill="#8CC63F"/><rect x="14" y="20" width="4" height="8" rx="2" fill="#EFEAD0"/>';
  if (has('바나나')) return '<path d="M9 11 Q11 24 23 23 Q15 21 13 11 Z" fill="#F6D33C"/>';
  if (has('오이')) return '<rect x="10" y="9" width="12" height="20" rx="6" fill="#5FA63F"/><rect x="12.5" y="12" width="2.4" height="14" rx="1.2" fill="#84C566" opacity=".8"/>';
  if (has('감자')) return '<ellipse cx="16" cy="18.5" rx="9.5" ry="8.2" fill="#D7B377"/><circle cx="12" cy="16" r=".9" fill="#A9854C"/><circle cx="19" cy="20" r=".9" fill="#A9854C"/>';
  if (has('고구마')) return '<path d="M8 22 Q9 12 17 11 Q25 12 23 20 Q20 27 13 26 Q9 25.5 8 22 Z" fill="#C76B8E"/>';
  if (has('마늘')) return '<path d="M16 9 Q22 13 21 21 Q21 27 16 27 Q11 27 11 21 Q10 13 16 9 Z" fill="#F4EFE6" stroke="#E4DCC9" stroke-width="1"/><path d="M16 10 L16 26" stroke="#E4DCC9" stroke-width="1"/>';
  if (has('버섯')) return '<rect x="13.5" y="18" width="5" height="9" rx="2.5" fill="#EDE2CE"/><path d="M7 18 Q7 10 16 10 Q25 10 25 18 Z" fill="#B07A4E"/>';
  if (has('사과')) return '<circle cx="16" cy="19" r="9" fill="#EF5350"/><path d="M16 10 l0 -3 q3 -1 4 1" stroke="#6B4E2E" stroke-width="1.6" fill="none" stroke-linecap="round"/><circle cx="12.5" cy="15.5" r="2" fill="#fff" opacity=".25"/>';
  if (has('옥수수')) return '<path d="M16 8 Q23 12 23 20 Q23 28 16 28 Q9 28 9 20 Q9 12 16 8 Z" fill="#F6CE43"/><path d="M12 14 L12 25 M16 13 L16 28 M20 14 L20 25" stroke="#E0A92A" stroke-width="1"/>';
  if (has('가지')) return '<path d="M11 27 Q7 21 11 16 Q15 11 21 13 Q26 16 22 22 Q18 28 11 27 Z" fill="#7E57C2"/><path d="M19 13 l3 -3" stroke="#5BA84F" stroke-width="2" stroke-linecap="round"/>';
  if (has('김치')) return '<path d="M7 17 L25 17 Q23.5 26 16 26 Q8.5 26 7 17 Z" fill="#E14B36"/><path d="M10 19 Q16 16 22 19" stroke="#F2A28F" stroke-width="1.3" fill="none"/>';
  if (has('식빵', '빵', '토스트')) return '<path d="M8 20 Q8 11 16 11 Q24 11 24 20 Z" fill="#E7B978"/><rect x="7" y="19" width="18" height="6" rx="2.5" fill="#D49A57"/>';
  if (has('새우')) return '<path d="M22 11 Q11 11 10 19 Q10 25 17 25 Q14 21 16 18 Q19 14 22 15 Z" fill="#FF9E8E"/><path d="M22 11 q3 -1 3 2" stroke="#E07A68" stroke-width="1.3" fill="none" stroke-linecap="round"/>';
  if (has('고등어', '연어', '생선', '동태', '명태', '갈치', '조기')) return '<ellipse cx="15" cy="18" rx="9" ry="6.5" fill="#8FCFEC"/><path d="M23 12.5 l4 -2 v15 l-4 -2 z" fill="#6FB8DA"/>';
  if (has('소고기', '소불고기', '한우') || /(^|[^들])소$/.test(f)) return '<rect x="7" y="12" width="18" height="13" rx="5.5" fill="#C75D63"/><path d="M11 16 q5 -2 10 0" stroke="#fff" stroke-width="1.4" fill="none" opacity=".55"/>';
  return catShape(cat);
}
// 카테고리 폴백 — 이름 매칭 실패 시 재료 분류로 일관된 아이콘 (얼굴은 공통으로 덧그림)
function catShape(cat) {
  switch (cat) {
    case '채소': case '신선': return '<circle cx="16" cy="18.5" r="9" fill="#7BC25A"/><path d="M16 10 q3.5 -2.5 6 -1 q-1.2 4 -6 3.4 z" fill="#56A23E"/>';
    case '과일': return '<circle cx="16" cy="18.5" r="9" fill="#FF8A5B"/><path d="M16 10 q2.5 -3 5 -2 q-1 3.6 -5 3.4 z" fill="#5BB85C"/><circle cx="12.7" cy="15" r="2" fill="#fff" opacity=".22"/>';
    case '육류': return '<rect x="7" y="12" width="18" height="13" rx="5.5" fill="#EF8E99"/><rect x="7" y="18.6" width="18" height="2.6" fill="#fff" opacity=".5"/>';
    case '수산': return '<ellipse cx="15" cy="18" rx="9" ry="6.8" fill="#8FCFEC"/><path d="M23 12.5 l4 -2 v15 l-4 -2 z" fill="#6FB8DA"/>';
    case '유제품': return '<path d="M11.5 11 L20.5 11 L19.6 26 a1.5 1.5 0 0 1 -1.5 1.4 L13.9 27.4 A1.5 1.5 0 0 1 12.4 26 Z" fill="#fff" stroke="#E2E7EC" stroke-width="1"/><rect x="12" y="14.5" width="8" height="3.2" fill="#9CCBEA"/>';
    case '양념': return '<rect x="12" y="12" width="8" height="15" rx="2.5" fill="#E07B4A"/><rect x="13.4" y="8.4" width="5.2" height="4" rx="1.5" fill="#9a5a32"/><rect x="13" y="16" width="6" height="6.5" rx="1" fill="#fff" opacity=".5"/>';
    case '주식': case '가공': return '<path d="M7.5 17 Q16 11 24.5 17 Z" fill="#fff"/><path d="M6.5 17 L25.5 17 Q24 25.5 16 25.5 Q8 25.5 6.5 17 Z" fill="#EDEFF1" stroke="#DDE2E6" stroke-width="1"/>';
    default: return '<circle cx="16" cy="18" r="9.5" fill="#9FCB7A"/>';
  }
}
// 조리음식 모양 — 이름(찌개·밥·면·반찬…) 우선, 없으면 종류(kind)로
function cookedShape(name, kind) {
  const f = String(name || '');
  const has = (...a) => a.some((x) => f.includes(x));
  if (has('국', '탕', '찌개', '전골', '스프', '죽', '카레')) return '<path d="M6 17 L26 17 Q24.5 26 16 26 Q7.5 26 6 17 Z" fill="#E8A24C"/><ellipse cx="16" cy="17" rx="10" ry="2.3" fill="#F3BD72"/>';
  if (has('볶음밥', '덮밥', '비빔밥', '밥', '리조또')) return '<path d="M6.5 18 L25.5 18 Q24 26 16 26 Q8 26 6.5 18 Z" fill="#EADFC9"/><path d="M8 18 Q16 12.5 24 18 Z" fill="#fff"/>';
  if (has('면', '국수', '라면', '우동', '파스타', '짜장', '짬뽕', '쌀국수')) return '<path d="M6 17 L26 17 Q24.5 26 16 26 Q7.5 26 6 17 Z" fill="#E7B25A"/><path d="M9 17 q1 -4 3 -1 M14 17 q1 -4 3 -1 M19 17 q1 -4 3 -1" stroke="#F3DCA0" stroke-width="1.3" fill="none" stroke-linecap="round"/>';
  if (has('도시락')) return '<rect x="7" y="13" width="18" height="13" rx="3" fill="#EFE2C2" stroke="#D8C49A" stroke-width="1"/><line x1="16" y1="13" x2="16" y2="26" stroke="#D8C49A" stroke-width="1"/>';
  if (has('빵', '케이크', '과자', '디저트', '쿠키', '파이', '토스트')) return '<path d="M8 20 Q8 12 16 12 Q24 12 24 20 Z" fill="#E7B978"/><rect x="7" y="19" width="18" height="6" rx="2.5" fill="#D49A57"/>';
  if (kind === 'delivery') return '<path d="M8 13 L24 13 L22.4 26 L9.6 26 Z" fill="#F0E2C0"/><path d="M8 13 L24 13 L23.2 15.5 L8.8 15.5 Z" fill="#D9C49A"/><rect x="14.5" y="9.5" width="3" height="4" fill="#c9b07f"/>';
  if (has('반찬', '볶음', '무침', '조림', '나물', '전', '구이', '튀김', '찜', '김치') || kind === 'banchan') return '<ellipse cx="16" cy="22" rx="11" ry="3" fill="#E6E9ED"/><path d="M9 20 q7 -6 14 0 Z" fill="#C98A4A"/>';
  return '<path d="M6 17 L26 17 Q24.5 26 16 26 Q7.5 26 6 17 Z" fill="#E8A24C"/><ellipse cx="16" cy="17" rx="10" ry="2.3" fill="#F3BD72"/>';
}
// SVG 캐릭터 조립 (재료/조리음식 공용) — 표정만 신선/임박 분기 (시안 FoodIcon 규격)
function svgChar(shape, expiring, size) {
  const face = expiring
    ? '<path d="M13.8 21.6 Q16 19.2 18.2 21.6" stroke="#2b2b2b" stroke-width="1.3" fill="none" stroke-linecap="round"/><path d="M20.4 18.6 Q22 21.2 22 22.4 a1.4 1.4 0 0 1 -2.8 0 Q19 21.2 20.4 18.6 Z" fill="#69B7F0" class="nb-tear"/>'
    : '<ellipse cx="9.6" cy="19.4" rx="1.8" ry="1.1" fill="#FF9E8E" opacity=".75"/><ellipse cx="22.4" cy="19.4" rx="1.8" ry="1.1" fill="#FF9E8E" opacity=".75"/><path d="M14 20 Q16 22.4 18 20" stroke="#2b2b2b" stroke-width="1.3" fill="none" stroke-linecap="round"/>';
  return '<svg class="food-ic" viewBox="0 0 32 32" width="' + size + '" height="' + size + '" style="display:block;overflow:visible" aria-hidden="true"><ellipse cx="16" cy="29.5" rx="8" ry="1.6" fill="#000" opacity=".07"/>' + shape + '<circle cx="12.5" cy="16.5" r="1.7" fill="#2b2b2b"/><circle cx="19.5" cy="16.5" r="1.7" fill="#2b2b2b"/><circle cx="11.9" cy="15.9" r=".5" fill="#fff"/><circle cx="18.9" cy="15.9" r=".5" fill="#fff"/>' + face + '</svg>';
}
// 재료 아이콘 — 이름→특정, 없으면 카테고리 폴백. 항상 SVG 반환.
function foodIcon(name, { expiring = false, size = 44, cat = '' } = {}) {
  return svgChar(foodShape(name, cat || (findIng(name) && findIng(name).cat) || ''), expiring, size);
}
// 재료 글리프: 사진 > FoodIcon SVG
function ingGlyph(name, emoji, { photo = '', expiring = false, size = 44 } = {}) {
  if (photo) return '<img src="' + photo + '" alt="" />';
  return foodIcon(name, { expiring, size });
}
// 조리음식 글리프: 사진 > 조리 SVG
function cookedGlyph(l, { expiring = false, size = 44 } = {}) {
  if (l.photo) return '<img src="' + l.photo + '" alt="" />';
  return svgChar(cookedShape(l.name, l.kind), expiring, size);
}

// 유튜브 링크 → 영상 ID
function ytId(url) {
  if (!url) return null;
  const m = String(url).match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}
const ytThumb = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

/* ── 유튜브 플레이어 원격 제어 (음성·버튼 공용) ── */
function ytCmd(func, args = []) {
  const f = $('#dt-yt iframe');
  f?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
}
function ytHandshake() { // 플레이어가 currentTime을 보내주도록 구독
  const f = $('#dt-yt iframe');
  f?.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 'nb' }), '*');
}
window.addEventListener('message', (e) => {
  if (typeof e.data !== 'string') return;
  try {
    const d = JSON.parse(e.data);
    if (d.event === 'infoDelivery' && d.info) {
      if (typeof d.info.currentTime === 'number') ytTime = d.info.currentTime;
      if (typeof d.info.playerState === 'number') ytState = d.info.playerState;
    }
  } catch { /* ignore */ }
});

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
  const pb = $('#points-badge');
  if (pb) pb.textContent = `🅿 ${(S.points?.bal || 0).toLocaleString()}`;
  const badge = $('#sync-badge');
  let label = '이 기기'; let cls = 'pill pill-muted';
  if (sync.status === 'error') { label = '동기화 오류'; cls = 'pill pill-err'; }
  else if (S.settings.spaceCode && sync.status === 'on') { label = '👨‍👩‍👧 가족 공유'; cls = 'pill pill-on'; }
  else if (sync.user && !sync.user.anon && sync.status === 'on') { label = '☁️ 내 계정'; cls = 'pill pill-on'; }
  else if (sync.status === 'connecting') { label = '연결 중…'; cls = 'pill pill-muted'; }
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
          <span class="emoji t-가공" onclick="UI.openFood('${l.id}')">${cookedGlyph(l, { expiring: daysLeft(l.expiresAt) <= 1, size: 36 })}</span>
          <div class="grow" onclick="UI.openFood('${l.id}')"><div class="name">${esc(l.name)}</div>
            <div class="sub">${foodKind(l).label} · ${LOC_LABEL[l.location]} ${stampFor(daysLeft(l.expiresAt))}</div></div>
          <button class="btn btn-sm btn-primary" onclick="UI.leftoverDone('${l.id}','eaten')">먹었어요</button>
          <button class="btn btn-sm btn-soft" onclick="UI.leftoverDone('${l.id}','wasted')">버림</button>
        </div>`).join('') +
      expiring.map((p) => `
        <div class="item">
          <span class="emoji ${catClass(p.name)}">${ingGlyph(p.name, p.emoji, { photo: p.photo, expiring: daysLeft(p.expiresAt) <= 1, size: 36 })}</span>
          <div class="grow" onclick="UI.editPantry('${p.id}')"><div class="name">${esc(p.name)}</div><div class="sub">${qtyLabel(p)} · ${LOC_LABEL[p.location]}</div></div>
          ${stampFor(daysLeft(p.expiresAt))}
          <button class="btn btn-sm btn-tint" onclick="UI.useIdeas('${esc(p.name)}')">활용 →</button>
          <button class="btn btn-sm btn-soft" onclick="UI.wasteItem('${p.id}')">버렸어요</button>
        </div>`).join('');
  }

  const hh = new Date().getHours();
  const heroPill = hh < 10 ? { i: '☀️', t: '오늘 아침 추천' } : hh < 15 ? { i: '🍱', t: '오늘 점심 추천' } : hh < 21 ? { i: '🌙', t: '오늘 저녁 추천' } : { i: '🌙', t: '야식 추천' };
  const top = recos.find((a) => a.have > 0) || recos[0];
  const rest = recos.filter((a) => a !== top);
  const heroCard = empty
    ? `<div style="margin:18px 0 0;background:#fff;border:1px solid var(--hairline);border-radius:24px;padding:28px 20px;text-align:center;box-shadow:var(--shadow-card);">
        <div style="font-size:48px;">🧊</div>
        <div style="font-family:var(--display);font-size:18px;margin-top:10px;color:var(--green-ink);">냉장고가 텅… 메아리가 들려요</div>
        <div style="font-size:12.5px;color:var(--label-2);line-height:1.6;margin-top:6px;">지금 집에 있는 재료를 등록하면<br>오늘 해먹을 요리를 바로 추천해 드려요</div>
        <button onclick="UI.starterPack()" style="width:100%;margin-top:18px;background:var(--grad-warm);color:#fff;font-family:var(--display);font-size:15px;border:none;border-radius:15px;padding:15px;cursor:pointer;box-shadow:0 8px 18px rgba(246,121,31,.3);">🧺 기본 재료 한번에 담기</button>
      </div>`
    : (top && top.have > 0)
    ? `<div onclick="UI.openRecipe('${top.recipe.id}')" style="position:relative;overflow:hidden;margin:18px 0 0;background:linear-gradient(150deg,#15A05B 0%,#0A6238 100%);border-radius:26px;padding:20px;color:#fff;box-shadow:0 16px 34px rgba(10,98,56,.28);cursor:pointer;">
        <div style="position:absolute;right:-34px;bottom:-46px;width:170px;height:170px;border-radius:50%;background:rgba(255,255,255,.06);"></div>
        <div style="display:flex;align-items:center;gap:8px;position:relative;">
          <span style="background:rgba(255,255,255,.2);font-size:11px;font-weight:800;padding:5px 11px;border-radius:999px;white-space:nowrap;">🍳 오늘의 추천</span>
          <span style="font-size:11px;font-weight:700;opacity:.88;">${top.cookable ? '지금 바로 가능' : '거의 다 있어요'}</span>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:14px;margin-top:15px;position:relative;">
          <div style="flex:1;min-width:0;">
            <div style="font-family:var(--display);font-size:27px;line-height:1.1;">${esc(top.recipe.title)}</div>
            <div style="display:flex;gap:7px;margin-top:11px;flex-wrap:wrap;">
              ${top.recipe.time ? `<span style="background:rgba(255,255,255,.16);font-size:11px;font-weight:700;padding:5px 10px;border-radius:999px;white-space:nowrap;">⏱ ${top.recipe.time}분</span>` : ''}
              ${top.recipe.protein ? `<span style="background:rgba(255,255,255,.16);font-size:11px;font-weight:700;padding:5px 10px;border-radius:999px;white-space:nowrap;">💪 단백질 ${top.recipe.protein}g</span>` : ''}
            </div>
          </div>
          <div style="width:84px;height:84px;border-radius:24px;background:linear-gradient(160deg,rgba(255,255,255,.34),rgba(255,255,255,.1));display:flex;align-items:center;justify-content:center;font-size:44px;flex:none;box-shadow:inset 0 1px 0 rgba(255,255,255,.45);">${top.recipe.emoji || '🍳'}</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;margin-top:17px;position:relative;">
          <div style="flex:1;background:#fff;color:#0A6238;font-family:var(--display);font-size:15px;border-radius:14px;padding:12px;text-align:center;">레시피 보기</div>
          <div style="background:rgba(255,255,255,.16);border-radius:14px;padding:12px 15px;font-size:12.5px;font-weight:800;white-space:nowrap;">재료 ${top.have}/${top.total}</div>
        </div>
      </div>`
    : `<div class="empty" style="margin-top:18px"><span class="e-emoji">🫥</span><b>매칭할 재료가 아직 부족해요</b><small>재료 몇 가지만 담으면 추천이 켜져요</small></div>`;
  const restCards = (!empty && rest.length)
    ? `<div class="section-title"><h2>더 추천</h2><small onclick="UI.go('recipes')" style="cursor:pointer">전체 보기 →</small></div>${rest.map(recipeCard).join('')}`
    : '';

  const mascot = `<svg width="68" height="78" viewBox="0 0 100 120" style="flex:none;margin-bottom:2px;animation:nb-bob 3.4s ease-in-out infinite;" aria-hidden="true"><ellipse cx="50" cy="114" rx="25" ry="4" fill="#0a7a44" opacity=".1"/><path d="M50 16 C50 6 56 1 64 2 C63 11 57 16 50 16 Z" fill="#9BE3BC"/><rect x="22" y="16" width="56" height="94" rx="15" fill="#fff" stroke="#E4EEE7" stroke-width="2"/><rect x="27" y="55" width="46" height="3" rx="1.5" fill="#DCEFE4"/><rect x="66" y="29" width="4" height="14" rx="2" fill="#0E8E4E"/><rect x="66" y="62" width="4" height="28" rx="2" fill="#0E8E4E"/><path d="M50 39 L41 34 L41 44 Z" fill="#0E8E4E"/><path d="M50 39 L59 34 L59 44 Z" fill="#0E8E4E"/><circle cx="50" cy="39" r="3" fill="#0E8E4E"/><circle cx="42" cy="74" r="4.2" fill="#173B28"/><circle cx="58" cy="74" r="4.2" fill="#173B28"/><circle cx="43.4" cy="72.6" r="1.3" fill="#fff"/><circle cx="59.4" cy="72.6" r="1.3" fill="#fff"/><ellipse cx="35" cy="83" rx="4" ry="2.5" fill="#FFB39B"/><ellipse cx="65" cy="83" rx="4" ry="2.5" fill="#FFB39B"/><path d="M44 83 Q50 89 56 83" stroke="#173B28" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>`;

  const gbtn = (on, ic, label) => `<button onclick="${on}" style="flex:1;background:var(--tint-etc);border:none;border-radius:14px;padding:11px 4px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;"><span style="font-size:18px;">${ic}</span><span style="font-size:10.5px;font-weight:800;color:#5f5d55;">${label}</span></button>`;

  $('#view').innerHTML = `
    <div style="padding:6px 0 0;">
      <span style="display:inline-flex;align-items:center;gap:6px;background:#fff;border:1px solid var(--hairline);border-radius:999px;padding:6px 12px;box-shadow:0 1px 2px rgba(28,40,30,.05);"><span style="font-size:12px;">${heroPill.i}</span><span style="font-size:11.5px;font-weight:800;color:#A07D2E;white-space:nowrap;">${heroPill.t}</span></span>
      <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:8px;margin-top:13px;">
        <div style="font-family:var(--display);font-size:33px;color:var(--green-ink);line-height:1.08;letter-spacing:-.5px;">오늘 뭐<br><span style="color:var(--green-deep);">해먹지?</span></div>
        ${mascot}
      </div>
      <div style="font-size:12.5px;color:var(--label-2);font-weight:600;margin-top:7px;">${mode.emoji} ${esc(mode.label)} 모드 · ${esc(mode.desc || '')}</div>
    </div>
    <div style="display:flex;gap:11px;margin-top:16px;">
      <button onclick="UI.openScan()" style="flex:1.25;position:relative;overflow:hidden;background:linear-gradient(145deg,#17A95C,#0B7240);border:none;border-radius:20px;padding:16px;text-align:left;cursor:pointer;color:#fff;box-shadow:0 10px 22px rgba(11,114,64,.26);">
        <div style="position:absolute;right:-14px;top:-14px;width:64px;height:64px;border-radius:50%;background:rgba(255,255,255,.1);"></div>
        <div style="font-size:19px;position:relative;">📷</div>
        <div style="font-size:14.5px;font-weight:800;margin-top:7px;position:relative;">AI 입고 스캔</div>
        <div style="font-size:11px;opacity:.92;margin-top:2px;position:relative;">영수증·장본 사진 한 장</div>
      </button>
      <button onclick="UI.openQuickAdd()" style="flex:1;background:#fff;border:1px solid var(--hairline);border-radius:20px;padding:16px;text-align:left;cursor:pointer;box-shadow:var(--shadow-card);">
        <div style="font-size:19px;color:var(--green-deep);font-weight:800;">＋</div>
        <div style="font-size:14.5px;font-weight:800;margin-top:7px;color:var(--green-ink);">빠른 추가</div>
        <div style="font-size:11px;color:var(--label-2);margin-top:2px;">검색해서 2탭 등록</div>
      </button>
    </div>
    ${heroCard}
    ${restCards}
    ${firstEat}
    <div style="margin:22px 0 0;background:#fff;border:1px solid var(--hairline);border-radius:24px;padding:18px;box-shadow:var(--shadow-card);">
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-family:var(--display);font-size:15px;color:var(--green-ink);">절약 &amp; 포인트</span>
        <button onclick="UI.explainLedger()" style="margin-left:auto;background:none;border:none;color:var(--label-3);font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;">계산법 ⓘ</button>
      </div>
      <div style="display:flex;align-items:stretch;gap:11px;margin-top:14px;">
        <div onclick="UI.openPoints()" style="flex:1.15;background:linear-gradient(150deg,#FFF7E1,#FFEEC2);border-radius:18px;padding:14px;cursor:pointer;">
          <div style="font-size:11px;font-weight:800;color:#B07D12;">🅿 내 포인트</div>
          <div style="font-family:var(--display);font-size:29px;color:#946400;margin-top:3px;">${(S.points?.bal || 0).toLocaleString()}</div>
        </div>
        <div style="flex:1;display:flex;flex-direction:column;gap:8px;">
          <div onclick="UI.explainLedger()" style="flex:1;background:#F1FAF4;border-radius:14px;padding:9px 12px;display:flex;flex-direction:column;justify-content:center;cursor:pointer;"><div style="font-size:10.5px;color:#7a9a86;font-weight:700;">아낀 돈</div><div style="font-family:var(--display);font-size:15px;color:var(--green-deep);white-space:nowrap;">${won(S.ledger.saved)}</div></div>
          <div onclick="UI.explainLedger()" style="flex:1;background:#FCF1F0;border-radius:14px;padding:9px 12px;display:flex;flex-direction:column;justify-content:center;cursor:pointer;"><div style="font-size:10.5px;color:#bb8a84;font-weight:700;">버린 돈</div><div style="font-family:var(--display);font-size:15px;color:var(--red);white-space:nowrap;">${won(S.ledger.wasted)}</div></div>
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:13px;">
        ${gbtn('UI.openGames()', '🎮', '게임')}${gbtn('UI.waitAd()', '⏱️', '짬시간')}${gbtn('UI.openRanks()', '🏆', '랭킹')}${gbtn('UI.openPoints()', '🎁', '포인트샵')}
      </div>
    </div>
    <div onclick="UI.openInvite()" style="margin:12px 0 0;background:linear-gradient(135deg,#FFFFFF,#FBF5E9);border:1px solid var(--hairline);border-radius:18px;padding:14px;display:flex;align-items:center;gap:12px;cursor:pointer;box-shadow:var(--shadow-card);">
      <div style="width:42px;height:42px;border-radius:12px;background:#FFF0D4;display:flex;align-items:center;justify-content:center;font-size:22px;flex:none;">👨‍👩‍👧</div>
      <div style="flex:1;min-width:0;"><div style="font-size:13.5px;font-weight:800;color:var(--green-ink);">가족과 같이 쓰기</div><div style="font-size:11px;color:var(--label-2);margin-top:2px;">코드 하나로 온 가족이 한 냉장고를 봐요</div></div>
      <span style="font-size:14px;color:#cfc7b6;">›</span>
    </div>
    <div style="margin-top:16px">${adBanner('home')}</div>`;
}

UI.starterPack = () => {
  const names = ['계란', '양파', '대파', '김치', '밥', '간장', '고추장', '식용유', '참기름', '다진마늘'];
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
  // 눈만 — 또랑또랑 꿈벅이는 동그란 눈, 임박하면 처진 슬픈 눈 + 깜빡일 때마다 눈물
  const hand = d <= 3
    ? `<span class="chr"><i class="e l"></i><i class="e r"></i>${d <= 1 ? '<i class="tear"></i>' : ''}</span>`
    : '';
  const bubble = key === bubbleKey
    ? `<span class="chr-bubble">${d <= 1 ? '흑흑… 오늘이 마지막이야 😢' : '나 먼저 먹어줘~'}</span>` : '';
  return { cls, hand, bubble };
}

function fItem(p) {
  const d = daysLeft(p.expiresAt);
  const c = chrBits(d, 'p:' + p.id);
  // 시안 FoodIcon이 매칭되면 그 자체가 표정 캐릭터 → 별도 눈/눈물 오버레이는 생략(중복 방지).
  // 매칭 안 되는 재료는 기존 이모지 + 눈 오버레이 유지(특이재료 커버 + 위트 보존).
  const useSvg = !p.photo && !!foodShape(p.name);
  return `
    <button class="f-item${c.cls}" data-move="p:${p.id}" onclick="UI.editPantry('${p.id}')">
      ${c.bubble}${useSvg ? '' : c.hand}
      ${d <= 3 ? `<span class="fi-dot ${d <= 1 ? 'dot-red' : 'dot-amber'}"></span>` : ''}
      <span class="fi-face">${ingGlyph(p.name, p.emoji, { photo: p.photo, expiring: d <= 1, size: 44 })}</span>
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
  const useSvg = !l.photo; // 조리음식도 표정 캐릭터 → 사진 없을 때만, 눈 오버레이는 생략
  return `
    <button class="f-item${c.cls}" data-move="f:${l.id}" onclick="UI.openFood('${l.id}')">
      ${c.bubble}${useSvg ? '' : c.hand}
      ${d <= 3 ? `<span class="fi-dot ${d <= 1 ? 'dot-red' : 'dot-amber'}"></span>` : ''}
      <span class="fi-face">${cookedGlyph(l, { expiring: d <= 1, size: 44 })}</span>
      <span class="fi-name">${esc(l.name)}</span>
    </button>`;
}
const foodRows = (foods) =>
  chunk(foods, 4).map((row) => `<div class="f-row">${row.map(foodTile).join('')}</div><div class="f-shelf"></div>`).join('');

let fridgeOpen = false, fridgeJustOpened = false; // 냉장고 문 — 기본 닫힘(꾸미기 표면), 열면 안쪽+냉기 연출(1회)
let decorEditing = false; // 냉장고 문 꾸미기 편집 모드 (붙이기·끌어 옮기기·떼기)

const DECO_STICKERS = ['🍓', '🥑', '🌶️', '🧀', '🥦', '🍅', '🥕', '🌽', '🍋', '🫐', '🍞', '🥚', '🐟', '🍗', '🍳', '✨', '⭐', '❤️', '🌈', '🌸', '🐰', '🐱', '☁️', '🔥'];
// 여행·랜드마크 테마 — 특색 있는 실루엣(다이컷) 마그넷. 🗼에펠/타워 🗿제주돌하르방 🍊제주감귤 🗽 🏰 ⛩️ 🗻후지 🎡 🌋한라산 🏝️ 🌴 🐳제주고래 🐧 🌺 🚲 ⚓ ☕
const DECO_MAGNETS = ['🗼', '🗿', '🍊', '🗽', '🏰', '⛩️', '🗻', '🎡', '🌋', '🏝️', '🌴', '🐳', '🐧', '🌺', '🚲', '⚓', '☕', '🧲', '🏠', '🍀', '🌟', '🎀'];
const NOTE_HUES = [48, 200, 132, 350, 280, 22]; // 메모지 색(hue)

// 새 꾸미기 항목 기본 위치(가운데 근처 살짝 흩뿌림) + 살짝 기울임 — 중심 기준 %
const placeNew = () => ({ x: 50 + (Math.random() * 26 - 13), y: 36 + (Math.random() * 20 - 10), rot: Math.round(Math.random() * 16 - 8) });
function pushDecor(it) {
  if (!S.decor) S.decor = { items: [] };
  if (!S.decor.items) S.decor.items = [];
  S.decor.items.push(it);
  save();
}
const decorById = (id) => ((S.decor && S.decor.items) || []).find((q) => q.id === id);

// 문에 붙은 항목 1개 렌더 — 축소판. 위치 %(중심), 회전 --rot. 탭하면 확대 상세(읽기·편집).
function decorItemHtml(it) {
  const pos = `left:${it.x}%;top:${it.y}%;--rot:${it.rot || 0}deg`;
  const tap = `onclick="UI.openDecorDetail('${it.id}')"`;
  const note = it.note ? '<span class="fd-cap"></span>' : ''; // 캡션이 있으면 작은 점 표시
  if (it.kind === 'note') {
    return `<div class="fd-mag fd-note-i" data-deco="${it.id}" style="${pos};--paper:${it.hue ?? 48}" ${tap}><span class="fd-pin"></span><span class="fd-note-tx">${esc(it.text || '')}</span></div>`;
  }
  if (it.kind === 'magnet') {
    return `<div class="fd-mag fd-magnet" data-deco="${it.id}" style="${pos}" ${tap}>${note}<span>${it.emoji || '🧲'}</span></div>`;
  }
  if (it.kind === 'recipe') {
    const r = allRecipes(S).find((q) => q.id === it.recipeId);
    return `<div class="fd-mag fd-recipe" data-deco="${it.id}" style="${pos}" ${tap}><span class="fd-rclip"></span><span class="fr-em">${r ? (r.emoji || '🍳') : '🍳'}</span><span class="fr-tt">${r ? esc(r.title) : '레시피'}</span></div>`;
  }
  if (it.kind === 'draw') {
    return `<div class="fd-mag fd-draw" data-deco="${it.id}" style="${pos}" ${tap}><img src="${it.img}" alt="그림" draggable="false" /></div>`;
  }
  return `<div class="fd-mag fd-sticker" data-deco="${it.id}" style="${pos}" ${tap}>${note}${it.emoji || '✨'}</div>`;
}

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
  const expN = all.filter((p) => daysLeft(p.expiresAt) <= 3).length;

  const display = `<div class="f-display">
        <span class="fd-temp">❄ −18° / 3°</span>
        <span class="fd-stat"><b>${all.length}</b>개 보관${expN ? ` · <em>임박 ${expN}</em>` : ' · 신선'}</span>
        <span class="fd-on">●&#xfe0e; ON</span>
      </div>`;
  const basket = `
    <div class="basket" data-loc="room">
      <div class="f-sec-label" onclick="UI.openLocList('room')" style="cursor:pointer"><span>실온 선반</span><span>${rm.length ? rm.length + '개 ' : ''}›</span></div>
      ${shelfRows(rm, 'room')}
    </div>`;

  // 닫힌 문 — 기본 상태. 문 표면이 곧 꾸미기 캔버스(메모·스티커·마그넷·핀 레시피).
  if (!fridgeOpen) {
    const items = (S.decor && S.decor.items) || [];
    return `
    <div class="fridge fridge-closed${decorEditing ? ' deco-edit' : ''}">
      ${display}
      <span class="f-handle"></span>
      <div class="fd-door">
        <div class="fd-deco">
          ${items.map(decorItemHtml).join('')}
          ${!items.length && !decorEditing ? `<div class="fd-empty">
            <div class="fd-note-demo">🧲 우리집 냉장고</div>
            <p>‘✏️ 꾸미기’를 눌러 메모·스티커·마그넷·자주 쓰는 레시피를 붙여보세요 ✨</p></div>` : ''}
          ${decorEditing ? `<div class="fd-edithint">붙인 걸 끌어 옮기고 · 탭하면 확대돼서 내용을 쓰거나 뗄 수 있어요</div>` : ''}
        </div>
      </div>
      ${decorEditing ? `
        <div class="fd-palette">
          <button onclick="UI.addDecor('note')">📝<small>메모</small></button>
          <button onclick="UI.addDecor('sticker')">✨<small>스티커</small></button>
          <button onclick="UI.addDecor('magnet')">🧲<small>마그넷</small></button>
          <button onclick="UI.openDraw('')">✏️<small>그리기</small></button>
          <button onclick="UI.pinRecipePicker()">📌<small>레시피</small></button>
        </div>
        <button class="fd-done" onclick="UI.toggleDecorEdit()">✓ 꾸미기 완료</button>`
      : `<div class="fd-actions">
          <button class="fd-decorate" onclick="UI.toggleDecorEdit()">✏️ 꾸미기</button>
          <button class="fd-open" onclick="UI.openFridge()">🚪 냉장고 열기</button>
        </div>
        <button class="fd-brag" onclick="UI.openInvite()">🎉 친구에게 냉장고 자랑하고 초대하기 — 둘 다 포인트</button>`}
    </div>
    ${basket}`;
  }

  // 열린 문 — 안쪽 + 냉기 빌로우(열 때 1회만)
  return `
    <div class="fridge fridge-open">
      ${fridgeJustOpened ? '<span class="fridge-coldair"></span>' : ''}
      ${display}
      <span class="f-handle"></span>
      <div class="f-glass"></div>
      <div class="fridge-inner" data-loc="fridge">
        <div class="f-led"></div>
        <div class="f-vent"><i></i><i></i><i></i><i></i></div>
        <div class="f-steam"><span class="mist" style="left:38%;animation-delay:1s;--dx:8px"></span></div>
        <div class="f-sec-label" onclick="UI.openLocList('fridge')" style="cursor:pointer"><span>냉장실</span><span>${fr.length ? fr.length + '개 ' : ''}›</span></div>
        ${shelfRows(frMain, 'fridge')}
        ${frFoods.length ? `<div class="f-sec-label" style="padding-top:2px"><span>🍱 반찬·조리음식 칸</span><span>${frFoods.length}개</span></div>${foodRows(frFoods)}` : ''}
        ${frDoor.length ? `<div class="f-pocket"><div class="fp-label">도어 포켓 · 소스</div><div class="fp-row">${frDoor.map(fItem).join('')}</div></div>` : ''}
      </div>
      <div class="f-divider"></div>
      <div class="fridge-inner freezer" data-loc="freezer">
        <div class="f-led dim"></div>
        <div class="f-steam"><span class="mist cold" style="left:56%;animation-delay:2.4s;--dx:-8px"></span></div>
        <span class="frost-spark" style="top:18px;left:12%">✦</span>
        <span class="frost-spark" style="top:30px;right:14%;animation-delay:1.4s">✦</span>
        <span class="frost-spark" style="bottom:18px;left:46%;animation-delay:2.3s">✦</span>
        <div class="f-sec-label" onclick="UI.openLocList('freezer')" style="cursor:pointer"><span>냉동실</span><span>${fz.length ? fz.length + '개 ' : ''}›</span></div>
        ${shelfRows(fz, 'freezer')}
        ${fzFoods.length ? `<div class="f-sec-label" style="padding-top:2px"><span>🍱 얼려둔 음식</span><span>${fzFoods.length}개</span></div>${foodRows(fzFoods)}` : ''}
      </div>
      <button class="fd-close" onclick="UI.closeFridge()">🚪 문 닫기</button>
    </div>
    ${basket}
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
      (list.length ? `<div class="ing-grid">${list.map((p) => `
        <button class="ing-card" onclick="UI.editPantry('${p.id}')">
          <span class="ing-card-badge">${stampFor(daysLeft(p.expiresAt))}</span>
          <span class="ing-card-ic ${catClass(p.name)}">${ingGlyph(p.name, p.emoji, { photo: p.photo, expiring: daysLeft(p.expiresAt) <= 1, size: 40 })}</span>
          <span class="ing-card-name">${esc(p.name)}</span>
          <span class="ing-card-sub">${qtyLabel(p)} · ${LOC_LABEL[p.location]}</span>
        </button>`).join('')}</div>`
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
UI.openLocList = (loc) => { pantryView = 'list'; pantryLoc = loc; render(); };
// 냉장고 열기/닫기 — 열 때만 냉기 빌로우 1회(렌더 직후 플래그 내려서 다음 렌더엔 안 뜸)
UI.openFridge = () => { pantryView = 'shelf'; fridgeOpen = true; fridgeJustOpened = true; render(); fridgeJustOpened = false; };
UI.closeFridge = () => { fridgeOpen = false; render(); };

/* ── 냉장고 문 꾸미기 (Phase 2) — 메모·스티커·마그넷·핀 레시피 ── */
UI.toggleDecorEdit = () => { decorEditing = !decorEditing; render(); };
UI.addDecor = (kind) => {
  if (kind === 'note') return openDecorDetail(null, 'note'); // 새 메모 — 확대 카드에서 작성
  const pool = kind === 'magnet' ? DECO_MAGNETS : DECO_STICKERS;
  openSheet(`
    <h2>${kind === 'magnet' ? '🧲 마그넷' : '✨ 스티커'} 고르기</h2>
    <p class="sub">탭하면 냉장고 문에 붙어요. 붙인 뒤 끌어서 옮기거나 탭해서 메모를 달 수 있어요.</p>
    <div class="emoji-grid">${pool.map((em) => `<button onclick="UI.placeDecor('${kind}','${em}')">${em}</button>`).join('')}</div>`);
};
UI.placeDecor = (kind, emoji) => {
  pushDecor({ id: uid(), kind, emoji, ...placeNew() });
  decorEditing = true; UI.closeSheet(); render();
  toast(kind === 'magnet' ? '🧲 마그넷을 붙였어요 — 끌어 옮기거나 탭해서 확대' : '✨ 스티커를 붙였어요 — 끌어 옮기거나 탭해서 확대');
};

/* ── 꾸미기 항목 확대 상세 — 축소판을 탭하면 항목에서 자라나는 모션으로 확대, 내용 작성·확인 ── */
let decorZoomEl = null, dzDraft = null;
UI.openDecorDetail = (id) => openDecorDetail(id, null);
function decorDetailBody(it, isNew) {
  if (it.kind === 'note' || (isNew && !it.kind)) {
    const hue = it.hue ?? 48;
    return `
      <div class="dz-note" style="--paper:${hue}"><span class="fd-pin"></span>
        <textarea id="dz-text" rows="4" maxlength="160" placeholder="메모를 적어요 — 예: 우유 이번 주까지! · 주말 장보기">${esc(it.text || '')}</textarea></div>
      <div class="hue-row dz-hues">${NOTE_HUES.map((h) => `<button class="hue-dot${hue === h ? ' on' : ''}" style="background:hsl(${h} 88% 86%)" onclick="UI.dzHue(${h},this)"></button>`).join('')}</div>`;
  }
  if (it.kind === 'recipe') {
    const r = allRecipes(S).find((q) => q.id === it.recipeId);
    return `
      <div class="dz-recipe">
        <div class="dz-rico">${r ? (r.emoji || '🍳') : '🍳'}</div>
        <h3>${r ? esc(r.title) : '레시피를 찾을 수 없어요'}</h3>
        ${r && (r.time || r.kcal) ? `<p class="sub">${r.time ? `⏱ ${r.time}분` : ''}${r.time && r.kcal ? ' · ' : ''}${r.kcal ? `${r.kcal}kcal` : ''}</p>` : ''}
        ${r ? `<button class="btn btn-primary btn-block" style="margin-top:10px" onclick="UI.dzOpenRecipe('${r.id}')">📖 레시피 열기</button>` : ''}
      </div>`;
  }
  if (it.kind === 'draw') {
    return `
      <div class="dz-draw"><img src="${it.img}" alt="그림" /></div>
      <button class="btn btn-soft btn-block" style="margin-top:12px" onclick="UI.dzRedraw('${it.id}')">✏️ 다시 그리기</button>`;
  }
  return `
    <div class="dz-emoji ${it.kind === 'magnet' ? 'is-mag' : ''}">${it.emoji || '✨'}</div>
    <div class="field" style="margin-top:12px"><textarea id="dz-text" rows="2" maxlength="120" placeholder="여기에 메모를 적어둘 수 있어요 (선택)">${esc(it.note || '')}</textarea></div>`;
}
function openDecorDetail(id, newKind) {
  if (decorZoomEl) return;
  const isNew = !id;
  const it = isNew ? { kind: newKind || 'note', hue: 48 } : decorById(id);
  if (!it) return;
  dzDraft = { id: id || null, kind: it.kind, hue: it.hue ?? 48 };
  const srcEl = id ? document.querySelector(`[data-deco="${id}"]`) : null;
  const r = srcEl ? srcEl.getBoundingClientRect() : null;
  const title = it.kind === 'note' ? (isNew ? '📝 메모 쓰기' : '📝 메모') : it.kind === 'recipe' ? '📌 붙인 레시피' : it.kind === 'magnet' ? '🧲 마그넷' : it.kind === 'draw' ? '🎨 내 그림' : '✨ 스티커';
  const ov = document.createElement('div');
  ov.className = 'decor-zoom';
  ov.innerHTML = `
    <div class="dz-card dz-${it.kind}">
      <div class="dz-head">${title}</div>
      ${decorDetailBody(it, isNew)}
      <div class="dz-actions">
        ${!isNew ? '<button class="btn btn-soft" onclick="UI.dzRemove()">🗑️ 떼기</button>' : ''}
        <button class="btn btn-primary grow" onclick="UI.dzConfirm()">${it.kind === 'recipe' || it.kind === 'draw' ? '닫기' : '확인'}</button>
      </div>
    </div>`;
  document.body.appendChild(ov);
  decorZoomEl = ov;
  const card = ov.querySelector('.dz-card');
  const cr = card.getBoundingClientRect();
  if (r) { // FLIP — 항목 위치에서 자라나는 확대 모션
    const s = Math.max(r.width / cr.width, r.height / cr.height, 0.12);
    const dx = (r.left + r.width / 2) - (cr.left + cr.width / 2);
    const dy = (r.top + r.height / 2) - (cr.top + cr.height / 2);
    card.style.transform = `translate(${dx}px,${dy}px) scale(${s})`;
    card.style.opacity = '0.5';
    void card.offsetWidth; // reflow로 시작 상태 확정
    card.style.transition = 'transform .34s cubic-bezier(.2,.85,.25,1), opacity .22s ease';
    card.style.transform = ''; card.style.opacity = '1';
  } else { card.style.animation = 'dzPop .3s ease both'; }
  requestAnimationFrame(() => ov.classList.add('show'));
  ov.addEventListener('click', (e) => { if (e.target === ov) closeDecorZoom({}); }); // 배경 탭 = 취소
}
UI.dzHue = (h, el) => {
  if (!dzDraft) return;
  dzDraft.hue = h;
  el.parentElement.querySelectorAll('.hue-dot').forEach((d) => d.classList.remove('on')); el.classList.add('on');
  const note = decorZoomEl && decorZoomEl.querySelector('.dz-note'); if (note) note.style.setProperty('--paper', h);
};
UI.dzConfirm = () => {
  if (!dzDraft) return;
  const ta = decorZoomEl && decorZoomEl.querySelector('#dz-text');
  const val = ta ? ta.value.trim() : '';
  const isNew = !dzDraft.id;
  if (dzDraft.kind === 'note') {
    if (!val) { if (isNew) { closeDecorZoom({ discard: true }); return; } toast('메모 내용을 적어주세요'); return; }
    if (isNew) pushDecor({ id: uid(), kind: 'note', text: val, hue: dzDraft.hue, ...placeNew() });
    else { const it = decorById(dzDraft.id); if (it) { it.text = val; it.hue = dzDraft.hue; } save(); }
  } else if (dzDraft.kind === 'sticker' || dzDraft.kind === 'magnet') {
    const it = decorById(dzDraft.id); if (it) { it.note = val; } save();
  }
  closeDecorZoom({});
};
UI.dzRemove = () => {
  if (dzDraft && dzDraft.id && S.decor && S.decor.items) { S.decor.items = S.decor.items.filter((q) => q.id !== dzDraft.id); save(); }
  closeDecorZoom({ removed: true });
};
UI.dzOpenRecipe = (rid) => { closeDecorZoom({}); setTimeout(() => UI.openRecipe(rid), 200); };
UI.dzRedraw = (id) => { closeDecorZoom({}); setTimeout(() => UI.openDraw(id), 220); };
function closeDecorZoom({ removed = false, discard = false } = {}) {
  const ov = decorZoomEl; if (!ov) return;
  decorZoomEl = null;
  const card = ov.querySelector('.dz-card');
  ov.classList.remove('show');
  const el = (!removed && dzDraft && dzDraft.id) ? document.querySelector(`[data-deco="${dzDraft.id}"]`) : null;
  const r = el ? el.getBoundingClientRect() : null;
  const cr = card.getBoundingClientRect();
  if (r) { // 항목 자리로 축소
    const s = Math.max(r.width / cr.width, r.height / cr.height, 0.12);
    const dx = (r.left + r.width / 2) - (cr.left + cr.width / 2);
    const dy = (r.top + r.height / 2) - (cr.top + cr.height / 2);
    card.style.transition = 'transform .26s ease, opacity .24s ease';
    card.style.transform = `translate(${dx}px,${dy}px) scale(${s})`; card.style.opacity = '0';
  } else {
    card.style.transition = 'transform .2s ease, opacity .2s ease';
    card.style.transform = 'scale(.5)'; card.style.opacity = '0';
  }
  const draftWasReal = dzDraft && !discard;
  dzDraft = null;
  setTimeout(() => { ov.remove(); if (draftWasReal) render(); }, 270);
}

/* ── 그리기 — 손그림을 그려서 냉장고에 붙이기(투명 PNG로 저장) ── */
const DRAW_W = 480, DRAW_H = 360;
const DRAW_COLORS = ['#2b2b2b', '#e2483d', '#f5a623', '#f7d038', '#3fb96b', '#3b82f6', '#9b59b6', '#ff7fbf', '#8b5a2b', '#ffffff'];
let drawState = { ctx: null, on: false, color: '#2b2b2b', size: 9, erase: false, last: null, id: '' };
UI.openDraw = (id) => {
  const it = id ? decorById(id) : null;
  drawState = { ctx: null, on: false, color: '#2b2b2b', size: 9, erase: false, last: null, id: id || '' };
  openSheet(`
    <h2>🎨 ${it ? '다시 그리기' : '그리기'}</h2>
    <p class="sub">손가락으로 그려서 냉장고 문에 붙여요.</p>
    <div class="draw-wrap"><canvas id="draw-canvas" width="${DRAW_W}" height="${DRAW_H}"></canvas></div>
    <div class="draw-tools">
      <div class="draw-colors">${DRAW_COLORS.map((c, i) => `<button class="dc-col${i === 0 ? ' on' : ''}" style="background:${c}" onclick="UI.drawColor('${c}',this)" aria-label="색"></button>`).join('')}</div>
      <div class="draw-right">
        <div class="draw-sizes">${[4, 9, 18].map((s) => `<button class="dc-sz${s === 9 ? ' on' : ''}" onclick="UI.drawSize(${s},this)"><i style="width:${Math.min(s, 16)}px;height:${Math.min(s, 16)}px"></i></button>`).join('')}</div>
        <button class="dc-erase" onclick="UI.drawErase(this)">지우개</button>
      </div>
    </div>
    <div class="btn-row" style="margin-top:10px">
      <button class="btn btn-soft" onclick="UI.drawClear()">전체 지우기</button>
      <button class="btn btn-primary grow" onclick="UI.drawDone()">붙이기</button>
    </div>`);
  setupDrawCanvas(it && it.img);
};
function setupDrawCanvas(preloadImg) {
  const c = document.getElementById('draw-canvas'); if (!c) return;
  const ctx = c.getContext('2d');
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  drawState.ctx = ctx;
  if (preloadImg) { const img = new Image(); img.onload = () => ctx.drawImage(img, 0, 0, DRAW_W, DRAW_H); img.src = preloadImg; }
  const pos = (e) => { const r = c.getBoundingClientRect(); return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) }; };
  const line = (a, b) => {
    ctx.globalCompositeOperation = drawState.erase ? 'destination-out' : 'source-over';
    ctx.strokeStyle = drawState.color; ctx.lineWidth = drawState.size;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  };
  c.addEventListener('pointerdown', (e) => { drawState.on = true; try { c.setPointerCapture(e.pointerId); } catch { /* noop */ } drawState.last = pos(e); line(drawState.last, { x: drawState.last.x + 0.1, y: drawState.last.y }); });
  c.addEventListener('pointermove', (e) => { if (!drawState.on) return; e.preventDefault(); const p = pos(e); line(drawState.last, p); drawState.last = p; });
  const stop = () => { drawState.on = false; };
  c.addEventListener('pointerup', stop); c.addEventListener('pointercancel', stop); c.addEventListener('pointerleave', stop);
}
UI.drawColor = (c, el) => { drawState.color = c; drawState.erase = false; el.parentElement.querySelectorAll('.dc-col').forEach((b) => b.classList.remove('on')); el.classList.add('on'); const er = document.querySelector('.dc-erase'); if (er) er.classList.remove('on'); };
UI.drawSize = (s, el) => { drawState.size = s; el.parentElement.querySelectorAll('.dc-sz').forEach((b) => b.classList.remove('on')); el.classList.add('on'); };
UI.drawErase = (el) => { drawState.erase = !drawState.erase; el.classList.toggle('on', drawState.erase); };
UI.drawClear = () => { if (drawState.ctx) drawState.ctx.clearRect(0, 0, DRAW_W, DRAW_H); };
UI.drawDone = () => {
  const c = document.getElementById('draw-canvas'); if (!c || !drawState.ctx) return;
  // 빈 캔버스면 안내
  const px = drawState.ctx.getImageData(0, 0, DRAW_W, DRAW_H).data;
  let any = false; for (let i = 3; i < px.length; i += 4) { if (px[i] !== 0) { any = true; break; } }
  if (!any) { toast('아직 아무것도 안 그렸어요'); return; }
  const img = c.toDataURL('image/png');
  if (drawState.id) { const it = decorById(drawState.id); if (it) it.img = img; save(); }
  else pushDecor({ id: uid(), kind: 'draw', img, ...placeNew() });
  UI.closeSheet(); render();
  toast('🎨 그림을 냉장고에 붙였어요 — 끌어 옮기거나 탭해서 확대');
};
UI.pinRecipePicker = () => {
  const favs = (S.favs || []).map((id) => allRecipes(S).find((r) => r.id === id)).filter(Boolean);
  const seen = new Set(); const list = [];
  for (const r of [...favs, ...(S.myRecipes || [])]) { if (!seen.has(r.id)) { seen.add(r.id); list.push(r); } }
  openSheet(`
    <h2>📌 자주 쓰는 레시피 붙이기</h2>
    <p class="sub">즐겨찾기 ❤️ 했거나 내가 저장한 레시피를 문에 붙여둘 수 있어요.</p>
    ${list.length ? `<div class="pin-list">${list.map((r) => `
      <button class="pin-row" onclick="UI.placeRecipe('${r.id}')"><span class="pin-em">${r.emoji || '🍳'}</span><span class="grow">${esc(r.title)}</span><span class="pin-add">붙이기</span></button>`).join('')}</div>`
    : `<div class="empty"><span class="e-emoji">📌</span><b>아직 붙일 레시피가 없어요</b><small>레시피 탭에서 ❤️를 누르거나 레시피를 저장하면 여기에 떠요</small></div>`}`);
};
UI.placeRecipe = (rid) => {
  pushDecor({ id: uid(), kind: 'recipe', recipeId: rid, ...placeNew() });
  decorEditing = true; UI.closeSheet(); render();
  toast('📌 레시피를 냉장고 문에 붙였어요');
};

/* ── 친구 초대 · 자랑하기 (Phase 3) — 신규 유입 + 성공 시 양쪽 포인트 ── */
const REF_INVITEE = 30;  // 초대로 시작한 신규 유저 환영 보너스
const REF_INVITER = 100; // 친구가 시작하면 초대한 사람 보상(가입 완료 링크 확인 시)
const REF_WEEK_CAP = 10; // 주당 초대 성공 보상 한도(어뷰징 완화)
function refDefaults() { if (!S.referral) S.referral = { rid: '', invitedBy: '', claimed: [], ok: 0 }; if (!S.referral.claimed) S.referral.claimed = []; return S.referral; }
function ensureRid() { refDefaults(); if (!S.referral.rid) { S.referral.rid = 'r' + uid(); save({ silent: true }); } return S.referral.rid; }
function ensureNid() { refDefaults(); if (!S.referral.nid) { S.referral.nid = 'n' + uid(); save({ silent: true }); } return S.referral.nid; }
function refWeekKey() { const d = new Date(); const day = (d.getDay() + 6) % 7; d.setDate(d.getDate() - day); return d.toISOString().slice(0, 10); }
const looksNew = () => !S.onboarded && (S.pantry?.length || 0) === 0 && (S.meta?.createdAt || 0) > Date.now() - 3 * 86400e3;

UI.openInvite = () => {
  ensureRid();
  const ok = S.referral.ok || 0;
  openSheet(`
    <h2>🎉 친구 초대 · 냉장고 자랑</h2>
    <p class="sub">내 냉장고를 자랑하고 친구를 초대하세요. 친구가 냉비서를 시작하면 <b>둘 다 포인트</b>를 받아요.</p>
    <div class="card flat" style="text-align:center;padding:16px">
      <div style="font-size:1.5rem">🧊🎁🧊</div>
      <p style="margin:6px 0 0;font-weight:700">친구 가입 성공 <b style="color:var(--blue,#3b82f6)">${ok}</b>명 · 받은 보상 ${(ok * REF_INVITER).toLocaleString()}P</p>
      <small class="hint">초대한 친구가 보내준 ‘가입 완료’ 링크를 누르면 +${REF_INVITER}P가 적립돼요</small>
    </div>
    <div class="btn-row" style="margin-top:12px"><button class="btn btn-primary btn-block" onclick="UI.shareInvite()">🔗 초대 링크 보내기 (친구 가입 시 +${REF_INVITER}P)</button></div>
    ${S.referral.invitedBy ? `<button class="btn btn-soft btn-block" style="margin-top:8px" onclick="UI.notifyJoined()">📨 나를 초대한 친구에게 가입 완료 알리기 (친구 +${REF_INVITER}P)</button>` : ''}
    <button class="btn btn-soft btn-block" style="margin-top:8px" onclick="UI.sendRecipePicker()">📒 레시피 보내기</button>
    <p class="hint" style="margin-top:10px">받은 ‘가입 완료’ 링크가 자동으로 안 눌리면 설정의 ‘공유받은 것 추가’에 붙여넣어도 돼요.</p>
    <div class="btn-row"><button class="btn btn-block" onclick="UI.closeSheet()">닫기</button></div>`);
};
UI.shareInvite = () => {
  const rid = ensureRid();
  track('invite_share', { ok: S.referral?.ok || 0 });
  const url = shareUrl(shareEncode('invite', { rid }));
  const text = '🧊 내 냉장고 구경할래? 냉비서로 냉장고 관리하고 레시피 추천받아요. 이 링크로 시작하면 우리 둘 다 선물 포인트 받아요 🎁';
  if (navigator.share) navigator.share({ title: '냉비서 초대', text, url }).catch(() => copyText(`${text}\n${url}`));
  else copyText(`${text}\n${url}`);
};
UI.sendRecipePicker = () => {
  const favs = (S.favs || []).map((id) => allRecipes(S).find((r) => r.id === id)).filter(Boolean);
  const seen = new Set(); const list = [];
  for (const r of [...favs, ...(S.myRecipes || [])]) { if (!seen.has(r.id)) { seen.add(r.id); list.push(r); } }
  openSheet(`
    <h2>📒 레시피 보내기</h2>
    <p class="sub">친구에게 레시피를 보내요. 친구가 링크를 누르면 냉비서에 바로 담겨요.</p>
    ${list.length ? `<div class="pin-list">${list.map((r) => `
      <button class="pin-row" onclick="UI.sendRecipe('${r.id}')"><span class="pin-em">${r.emoji || '🍳'}</span><span class="grow">${esc(r.title)}</span><span class="pin-add">보내기</span></button>`).join('')}</div>`
    : `<div class="empty"><span class="e-emoji">📒</span><b>보낼 레시피가 없어요</b><small>레시피 탭에서 ❤️ 하거나 저장하면 여기에 떠요</small></div>`}
    <div class="btn-row"><button class="btn btn-block" onclick="UI.openInvite()">← 뒤로</button></div>`);
};
UI.sendRecipe = (rid) => {
  const r = allRecipes(S).find((x) => x.id === rid);
  if (!r) return;
  const d = { ...r, id: undefined, mine: undefined, fav: undefined, photo: null }; // 사진 제외(용량) · 유튜브는 yt id 유지
  const url = shareUrl(shareEncode('recipe', d));
  const text = `🍳 [${r.title}] 레시피 보내요! 링크 누르면 냉비서에 바로 추가돼요 👇`;
  if (navigator.share) navigator.share({ title: '냉비서 레시피', text, url }).catch(() => copyText(`${text}\n${url}`));
  else copyText(`${text}\n${url}`);
};
UI.notifyJoined = () => {
  refDefaults();
  const nid = ensureNid();
  const url = shareUrl(shareEncode('joined', { rid: S.referral.invitedBy, nid }));
  const text = `🎉 친구 초대로 냉비서 시작했어! 이 링크 누르면 너도 초대 보상 +${REF_INVITER}P 받아 👇`;
  if (navigator.share) navigator.share({ title: '냉비서 가입 완료', text, url }).catch(() => copyText(`${text}\n${url}`));
  else copyText(`${text}\n${url}`);
};
function openInviteWelcome(first) {
  ensureNid();
  openSheet(`
    <h2>🎁 환영해요!</h2>
    <p class="sub">${first ? `친구 초대로 시작해서 <b>+${REF_INVITEE}P</b>를 받았어요.` : '이미 친구 초대로 시작한 계정이에요.'} 초대한 친구도 보상을 받게 ‘가입 완료’를 보내주세요.</p>
    <div class="btn-row"><button class="btn btn-primary btn-block" onclick="UI.notifyJoined()">📨 친구에게 가입 완료 알리기 (친구 +${REF_INVITER}P)</button></div>
    <div class="btn-row"><button class="btn btn-block" onclick="UI.closeSheet()">나중에</button></div>`);
}
function handleInvite(d) {
  ensureRid();
  const rid = d && d.rid;
  if (!rid || rid === S.referral.rid) { toast('내 초대 링크예요 🙂'); return; }
  if (S.referral.invitedBy) { openInviteWelcome(false); return; } // 이미 초대받음 — 보너스 중복 없이 안내만
  if (!looksNew()) { toast('이미 냉비서를 쓰고 계시네요 🙂 친구를 초대해보세요!'); return; }
  S.referral.invitedBy = rid;
  bonus(REF_INVITEE, '친구 초대로 시작 🎁');
  save(); renderTop();
  openInviteWelcome(true);
}
function handleJoined(d) {
  ensureRid();
  if (!d || d.rid !== S.referral.rid) { toast('이 링크는 다른 분의 초대 보상이에요'); return; }
  if (!d.nid) { toast('가입 완료 코드를 읽지 못했어요'); return; }
  if (S.referral.claimed.includes(d.nid)) { toast('이미 보상을 받은 친구예요 🙂'); return; }
  if (S.referral.week !== refWeekKey()) { S.referral.week = refWeekKey(); S.referral.weekOk = 0; }
  if ((S.referral.weekOk || 0) >= REF_WEEK_CAP) { toast(`이번 주 초대 보상 한도(${REF_WEEK_CAP}명)에 도달했어요`); return; }
  S.referral.claimed.push(d.nid);
  S.referral.ok = (S.referral.ok || 0) + 1;
  S.referral.weekOk = (S.referral.weekOk || 0) + 1;
  bonus(REF_INVITER, '친구 초대 성공 🎉');
  save(); renderTop();
  toast(`🎉 초대 성공! +${REF_INVITER}P — 친구가 냉비서를 시작했어요`);
}

let qaLoc = null; // 냉장고 ＋타일로 들어온 경우 그 칸으로 바로 담기
UI.quickAddAt = (loc) => { qaLoc = loc; UI.openQuickAdd(); };

// 입고 — amount+unit(또는 legacy qty)을 base 단위(g·ml·고유)로 환산해 저장. price=실구매 총액(선택).
function addPantryByName(rawName, { amount, unit, qty, price, location, silentToast = false } = {}) {
  const ing = findIng(rawName);
  const name = ing ? ing.name : rawName;
  const loc = location || qaLoc || defaultLocation(ing);
  const bu = baseUnit(ing);
  // 입력 단위/수량 결정: 명시 > legacy 숫자(무게·부피는 '팩' 단위로 해석) > 추천 기본값
  const n = amount != null ? amount : (qty != null ? qty : null);
  const inU = unit || (n != null ? ((isWeight(ing) || measureOf(ing) === 'volume') ? '팩' : bu) : defaultEntry(ing).u);
  const inAmt = n != null ? n : defaultEntry(ing).amount;
  const base = toBase(ing, inAmt, inU);
  // 실구매가(있으면) 우선 — 없으면 사전가를 이번 수량에 비례해 추정. 단가(base당)도 기록.
  const estUnit = ing ? baseUnitPrice(ing) : 2000 / Math.max(1, base || 1);
  const paid = price != null ? Math.round(price) : Math.round(estUnit * (base || 1));
  const unitPrice = (ing?.qtyType === 'level') ? undefined : (base > 0 ? Math.round((paid / base) * 100) / 100 : estUnit);
  const existing = S.pantry.find((p) => p.name === name && p.location === loc);

  if (existing && existing.qtyType === 'level') {
    existing.level = 'full'; existing.price = paid; // 양념류는 새로 사면 가득으로 갱신
  } else if (existing && daysLeft(existing.expiresAt) <= 7) {
    // 선입선출: 기존 재고가 남아있으면 합치지 않고 새 배치로 — 옛 것부터 먼저!
    S.pantry.push({
      id: uid(), name, emoji: ing?.emoji || '🍽️',
      qtyType: ing?.qtyType || 'count', unit: bu, qty: base, level: 'full',
      location: loc, expiresAt: addDays(defaultShelf(ing, loc)), price: paid, unitPrice,
    });
    save();
    if (!silentToast) toast(`${name} 새로 입고 — 기존 ${name}(D-${Math.max(0, daysLeft(existing.expiresAt))})부터 먼저 드세요! 🔄`);
    return;
  } else if (existing) {
    existing.qty = Math.round((existing.qty + base) * 100) / 100;
    existing.unit = bu;
    existing.price = Math.round((existing.price || 0) + paid);
    if (unitPrice) existing.unitPrice = unitPrice; // 최근 단가로 갱신
  } else {
    S.pantry.push({
      id: uid(), name, emoji: ing?.emoji || '🍽️',
      qtyType: ing?.qtyType || 'count', unit: bu,
      qty: ing?.qtyType === 'level' ? 1 : base, level: 'full',
      location: loc, expiresAt: addDays(defaultShelf(ing, loc)), price: paid, unitPrice,
    });
  }
  save();
  if (!silentToast) toast(`${name} 담았어요`);
}
UI.addPantryByName = (n) => { addPantryByName(n); renderQuickAddGrid(); };

// 구버전 보정: 무게·부피 품목을 base(g·ml) 기준으로 환산 (idempotent — 이미 base면 그대로)
function migratePantryUnits() {
  let changed = false;
  for (const p of S.pantry) {
    if (p.qtyType === 'level') continue;
    const ing = findIng(p.name); if (!ing) continue;
    const bu = baseUnit(ing);
    if ((isWeight(ing) || measureOf(ing) === 'volume') && p.unit !== bu) {
      p.qty = toBase(ing, p.qty, p.unit || ing.unit || bu);
      p.unit = bu; changed = true;
    }
  }
  if (changed) save({ silent: true });
}

/* ── 정밀 입고 폼: 재료 선택 후 수량·단위·위치·기한을 정확히 ── */
let addDraft = null;
function openAddItem(rawName) {
  const ing = findIng(rawName);
  const de = defaultEntry(ing);
  const loc = qaLoc || defaultLocation(ing);
  addDraft = {
    name: ing ? ing.name : rawName, emoji: ing?.emoji || '🍽️',
    level: ing?.qtyType === 'level', amount: de.amount, unit: de.u, price: null,
    location: loc, expiresAt: addDays(defaultShelf(ing, loc)),
  };
  renderAddItem();
}
// 현재 입력 수량의 예상 구매가 (실구매가 미입력 시 사용)
function estPaid(d) {
  const ing = findIng(d.name); if (!ing) return 2000;
  return Math.max(0, Math.round(baseUnitPrice(ing) * (toBase(ing, d.amount, d.unit) || 1)));
}
function renderAddItem() {
  const d = addDraft; if (!d) return;
  const ing = findIng(d.name);
  const opts = unitOptions(ing);
  const qtyBlock = d.level
    ? `<p class="hint" style="margin:2px 0 0">양념·가루류는 가득/절반/조금으로 관리돼요 — 담으면 <b>가득</b>으로 채워집니다</p>`
    : `<div class="add-qty">
         <input type="number" min="0" step="${ing && isWeight(ing) ? 50 : 'any'}" inputmode="decimal" value="${d.amount}" onchange="UI.addAmt(this.value)" oninput="UI.addAmt(this.value,1)" />
         <div class="seg add-units">${opts.map((o) => `<button class="${d.unit === o.u ? 'on' : ''}" onclick="UI.addUnit('${o.u}')">${o.u}</button>`).join('')}</div>
       </div>
       <p class="hint" id="add-prev" style="margin:6px 0 0">재고에 <b>${fmtBase(ing, toBase(ing, d.amount, d.unit))}</b> 담겨요</p>`;
  openSheet(`
    <div class="row" style="margin-bottom:6px">
      <span class="emoji ${catClass(d.name)}" style="font-size:1.5rem;width:52px;height:52px;display:grid;place-items:center;border-radius:15px">${d.emoji}</span>
      <div class="grow"><h2 style="margin:0">${esc(d.name)} 입고</h2>
        <p class="sub" style="margin:0">수량·단위를 정확히 — 계란 30구/5구, 고기 g까지</p></div>
    </div>
    <div class="field"><label>수량 · 단위</label>${qtyBlock}</div>
    ${d.level ? '' : `<div class="field"><label>구매 금액 (선택 — 아낀돈·버린돈 정확히 계산)</label>
      <input type="number" min="0" step="100" inputmode="numeric" value="${d.price != null ? d.price : ''}" placeholder="예상 ${won(estPaid(d))}" onchange="UI.addPrice(this.value)" />
      <p class="hint">실제로 낸 금액을 적으면 폐기·절약 금액이 그만큼 정확해져요</p></div>`}
    <div class="field"><label>보관 위치</label>
      <div class="seg" style="margin:0">${['fridge', 'freezer', 'room'].map((l) =>
        `<button class="${d.location === l ? 'on' : ''}" onclick="UI.addLoc('${l}')">${LOC_LABEL[l]}</button>`).join('')}</div></div>
    <div class="field"><label>소비기한</label>
      <input type="date" value="${d.expiresAt || ''}" onchange="UI.addExp(this.value)" />
      <p class="hint">권장 보관기한 기준 자동 입력 — 불확실하면 짧게 잡는 게 안전해요</p></div>
    <div class="btn-row">
      <button class="btn" onclick="UI.closeSheet()">취소</button>
      <button class="btn btn-primary" onclick="UI.commitAdd()">🧊 담기</button></div>`);
}
UI.openAddItem = (n) => openAddItem(n);
UI.addAmt = (v, live) => {
  if (!addDraft) return;
  addDraft.amount = Math.max(0, Number(v) || 0);
  if (live) { const el = $('#add-prev'); if (el) el.innerHTML = `재고에 <b>${fmtBase(findIng(addDraft.name), toBase(findIng(addDraft.name), addDraft.amount, addDraft.unit))}</b> 담겨요`; }
  else renderAddItem();
};
UI.addUnit = (u) => { if (addDraft) { addDraft.unit = u; renderAddItem(); } };
UI.addPrice = (v) => { if (addDraft) { const n = Number(v); addDraft.price = (v === '' || isNaN(n)) ? null : Math.max(0, Math.round(n)); } };
UI.addLoc = (l) => { if (addDraft) { addDraft.location = l; addDraft.expiresAt = addDays(defaultShelf(findIng(addDraft.name), l)); renderAddItem(); } };
UI.addExp = (v) => { if (addDraft) addDraft.expiresAt = v; };
UI.commitAdd = () => {
  const d = addDraft; if (!d) return;
  addPantryByName(d.name, { amount: d.amount, unit: d.unit, price: d.price, location: d.location, silentToast: true });
  // 방금 담은(또는 합쳐진) 항목 기한을 폼 값으로 맞춤
  const it = [...S.pantry].reverse().find((p) => p.name === d.name && p.location === d.location);
  if (it && d.expiresAt) { it.expiresAt = d.expiresAt; save(); }
  toast(`${d.name} ${d.level ? '담았어요' : fmtBase(findIng(d.name), toBase(findIng(d.name), d.amount, d.unit)) + ' 입고'} 🧊`);
  addDraft = null;
  UI.openQuickAdd(); // 연속 입고 — 빠른 추가 화면으로 복귀
};

UI.openQuickAdd = () => {
  openSheet(`
    <h2>빠른 추가</h2><p class="sub">아래에서 재료를 탭해 담거나, 검색해서 찾으세요 — 수량·기한은 다음 화면에서</p>
    <div class="search-row"><input id="qa-search" placeholder="재료 검색 (예: 계란, 두부…)" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" oninput="UI.qaFilter()" /></div>
    <div id="qa-grid" class="ing-pick-grid"></div>
    <div id="qa-custom"></div>
    <div class="btn-row"><button class="btn btn-block" onclick="UI.closeSheet();UI.refresh()">완료</button></div>`);
  renderQuickAddGrid();
  // 자동 포커스 제거 — 시트가 뜨자마자 키패드가 올라와 화면이 출렁이는 것을 막음(탭하면 검색)
};

function renderQuickAddGrid() {
  const q = ($('#qa-search')?.value || '').trim();
  const list = ING.filter((it) => !q || it.name.includes(q) || it.aliases.some((a) => a.includes(q)));
  const grid = $('#qa-grid');
  if (!grid) return;
  grid.innerHTML = list.map((it) => {
    const owned = S.pantry.find((p) => p.name === it.name);
    return `<button class="ing-pick" onclick="UI.openAddItem('${it.name}')">
      <span>${it.emoji}</span>${it.name}${owned ? `<small>보유 ${qtyLabel(owned)}</small>` : ''}</button>`;
  }).join('');
  // 사전에 없어도 막히지 않도록 — 정확히 같은 이름이 없으면 직접 추가를 항상 제안
  const exact = list.some((it) => it.name === q);
  $('#qa-custom').innerHTML = (q && !exact)
    ? `<button class="btn btn-soft btn-block" style="margin-top:8px" onclick="UI.openAddItem('${esc(q)}')">＂${esc(q)}＂ 그대로 직접 추가 — 수량·단위 지정해서 담기</button>` : '';
}
UI.qaFilter = renderQuickAddGrid;

UI.editPantry = (id) => {
  const p = S.pantry.find((x) => x.id === id);
  if (!p) return;
  const ing = findIng(p.name);
  const qtyControl = p.qtyType === 'level'
    ? `<div class="level-row">${LEVELS.map(([v, l]) =>
        `<button class="${p.level === v ? 'on' : ''}" onclick="UI.setLevel('${id}','${v}')">${l}</button>`).join('')}</div>`
    : `<div class="qty-edit">
         <button onclick="UI.bumpQty('${id}',-1)">−</button>
         <input id="qty-in" type="number" min="0" step="${stepFor(ing)}" inputmode="decimal" value="${p.qty}" onchange="UI.setQty('${id}',this.value)" />
         <span class="qty-unit">${p.unit || ''}</span>
         <button onclick="UI.bumpQty('${id}',1)">＋</button></div>
       ${ing && isWeight(ing) ? '<p class="hint" style="margin:6px 0 0">고기·해산물은 g(그램) 기준 — 실제 무게로 정확히 맞춰요</p>' : ''}`;
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
      <input type="date" value="${p.expiresAt || ''}" onchange="UI.setExpiry('${id}',this.value)" />
      <p class="hint">권장 보관기한 기준 자동 입력 — 기한이 불확실하면 짧게 잡는 게 안전해요</p></div>
    ${ingredientTip(p.name) ? `<div class="tipbox">💡 <b>보관 꿀팁</b><br>${esc(ingredientTip(p.name))}</div>` : ''}
    <button class="btn btn-soft btn-block" style="margin-top:2px" onclick="UI.addShopping('${esc(p.name)}', false, '', 'low');UI.closeSheet()">🧺 장보기 목록에 미리 담기</button>
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
  const step = stepFor(findIng(p.name));
  p.qty = Math.max(0, Math.round((p.qty + d * step) * 100) / 100);
  save();
  const el = $('#qty-in'); if (el) el.value = p.qty;
};
UI.setQty = (id, v) => {
  const p = S.pantry.find((x) => x.id === id); if (!p) return;
  p.qty = Math.max(0, Math.round((Number(v) || 0) * 100) / 100); save();
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
  const p = S.pantry.find((x) => x.id === id); if (!p) return;
  const empty = p.qtyType === 'level' ? p.level === 'empty' : (Number(p.qty) || 0) <= 0;
  if (empty) { doRemovePantry(id, 'used'); return; } // 이미 빈 것은 바로 정리
  // 남은 재고가 있으면 — 미세 차이가 날 수 있으니 처리 방식을 직접 선택
  openSheet(`
    <h2>🗑️ ${esc(p.name)} 정리</h2>
    <p class="sub">아직 <b>${qtyLabel(p)}</b> 남아 있어요. 어떻게 처리할까요?</p>
    <div style="display:grid;gap:8px;margin-top:6px">
      <button class="btn btn-soft btn-block" onclick="UI.removeWith('${id}','used')">✅ 다 썼어요 — 남김없이 소진</button>
      <button class="btn btn-soft btn-block" onclick="UI.removeWith('${id}','wasted')">🗑️ 상해서 버렸어요 — 폐기(버린 돈 기록)</button>
      <button class="btn btn-block" onclick="UI.editPantry('${id}')">↩ 취소</button>
    </div>`);
};
UI.removeWith = (id, how) => doRemovePantry(id, how);
UI.wasteItem = (id) => doRemovePantry(id, 'wasted'); // 홈 임박 재료에서 바로 버리기
function doRemovePantry(id, how) {
  const p = S.pantry.find((x) => x.id === id); if (!p) return;
  if (how === 'wasted') { const cost = moneyFor(p); S.ledger.wasted += cost; toast(`${p.name} 폐기 — ${won(cost)} 버린 돈에 기록`); proverbFloat('waste'); }
  else { toast(`${p.name} 정리 완료`); proverbFloat('save'); }
  S.pantry = S.pantry.filter((x) => x.id !== id);
  save(); UI.closeSheet(); render();
}
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
    <p class="hint" style="margin:-2px 0 10px">${aiUnlimited() ? '⭐ 프리미엄 — <b>무제한</b>' : `이번 달 무료 <b>${aiLeft().freeLeft}/${FREE_AI}회</b> 남음${aiLeft().credits ? ` · 충전권 ${aiLeft().credits}회` : ''}`}</p>
    <label class="btn btn-block" style="margin-bottom:10px">
      🖼️ 사진 선택 / 촬영
      <input id="scan-file" type="file" accept="image/*" style="display:none" onchange="UI.scanPicked(this)" />
    </label>
    <div id="scan-preview"></div>
    <div id="scan-result"></div>
    <div class="btn-row">
      <button class="btn" onclick="UI.closeSheet()">닫기</button>
      <button id="scan-go" class="btn btn-accent" onclick="UI.runScan()">🤖 AI 분석</button></div>`);
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
  if (!scanFile) { toast('먼저 사진을 선택하거나 촬영해 주세요 📷'); return; }
  const f = scanFile; // 광고 완주 후 같은 사진으로 분석을 이어가기 위해 보관
  const retry = () => {
    UI.openScan();
    scanFile = f;
    const pv = $('#scan-preview');
    if (pv && f) pv.innerHTML = `<img src="${URL.createObjectURL(f)}" style="width:100%;border-radius:16px;max-height:240px;object-fit:cover" />`;
    const go = $('#scan-go');
    if (go) go.disabled = false;
    UI.runScan();
  };
  if (aiLeft().total <= 0) { UI.openRecharge(retry); return; } // 무료·충전권 소진 → 광고/프리미엄 안내
  btn.disabled = true; btn.textContent = '분석 중…';
  try {
    const items = await scanImage(scanFile, S.settings);
    aiConsume(); // 성공했을 때만 1회 차감 (실패는 차감 안 함)
    track('scan_success', { items: Array.isArray(items) ? items.length : 0 });
    const fixes = loadScanFixes();
    scanResults = items.map((it) => {
      let raw = it.name;
      const learned = !!fixes[raw];
      if (learned) raw = fixes[raw]; // 지난번 사용자가 고친 대로 자동 반영(교정 학습)
      const ing = findIng(raw);
      // 신뢰도 = 모델 confidence + 결정론적 보정(사전 매칭·학습된 교정은 강한 신호)
      let conf = typeof it.confidence === 'number' ? Math.max(0, Math.min(1, it.confidence)) : (ing ? 0.9 : 0.5);
      if (learned) conf = 0.95;
      else if (ing) conf = Math.max(conf, 0.85);
      return {
        name: ing ? ing.name : raw,
        orig: it.name,            // 교정 학습용 원본 AI 이름
        qty: it.qty || 1,
        location: defaultLocation(ing),
        emoji: ing?.emoji || '🍽️',
        conf,
        confirmed: conf >= 0.85,   // 보수적 임계값 — 나머지는 1탭 확인 필요
      };
    });
    renderScanRows();
    btn.textContent = '다시 분석';
    btn.disabled = false;
  } catch (e) {
    if (e.status === 429 && S.settings.aiMode === 'server') { UI.openRecharge(retry); return; }
    toast(e.message || 'AI 분석에 실패했어요');
    btn.textContent = '🤖 AI 분석';
    btn.disabled = false;
  }
};
/* 스캔 교정 학습 — 사용자가 고친 품목명을 이 기기에 기억해 다음 스캔에 자동 반영 (백엔드 없이 localStorage) */
const SCANFIX_KEY = 'nb_scan_fixes';
function loadScanFixes() {
  try { return JSON.parse(localStorage.getItem(SCANFIX_KEY) || '{}'); } catch { return {}; }
}
function saveScanFix(from, to) {
  if (!from || !to || from === to) return;
  try {
    const m = loadScanFixes();
    m[from] = to;
    localStorage.setItem(SCANFIX_KEY, JSON.stringify(m));
  } catch { /* 저장 실패는 조용히 무시 */ }
}

function renderScanRows() {
  const box = $('#scan-result');
  if (!box || !scanResults) return;
  const need = scanResults.filter((r) => !r.confirmed).length;
  const okCount = scanResults.length - need;
  // 확인 필요한 항목을 위로 — 위험한 것부터 눈에 들어오게
  const order = scanResults.map((_, i) => i).sort((a, b) => Number(scanResults[a].confirmed) - Number(scanResults[b].confirmed));
  box.innerHTML = `
    <div class="section-title" style="margin-top:8px"><h2>인식 결과 ${scanResults.length}개</h2><small>${need ? `⚠️ 확인 필요 ${need}개` : '모두 확인됨 ✓'}</small></div>
    <p class="hint" style="margin:-4px 0 8px">⚠️ 표시된 품목은 흐릿하거나 확실치 않아요 — 맞으면 <b>확인</b>, 틀리면 이름을 고치거나 ✕로 빼주세요. <b>확인한 것만 담겨요.</b> 소비기한은 품목별 권장 보관기한으로 자동 입력돼요.</p>
    ${order.map((idx) => {
      const r = scanResults[idx];
      const warn = !r.confirmed;
      return `
      <div class="item"${warn ? ' style="border-left:3px solid #f59e0b;background:rgba(245,158,11,.07)"' : ''}>
        <span class="emoji ${catClass(r.name)}">${r.emoji}</span>
        <input style="flex:2" value="${esc(r.name)}" onchange="UI.scanEdit(${idx},'name',this.value)" />
        <input style="flex:1" type="number" min="0" step="0.5" value="${r.qty}" onchange="UI.scanEdit(${idx},'qty',this.value)" />
        <select style="flex:1.2" onchange="UI.scanEdit(${idx},'location',this.value)">
          ${['fridge', 'freezer', 'room'].map((l) => `<option value="${l}" ${r.location === l ? 'selected' : ''}>${LOC_LABEL[l]}</option>`).join('')}
        </select>
        ${warn
          ? `<button onclick="UI.scanConfirm(${idx})" style="color:#b45309;font-weight:700">확인</button>`
          : '<span style="color:var(--green);font-weight:700;padding:0 4px">✓</span>'}
        <button onclick="UI.scanRemove(${idx})">✕</button>
      </div>`;
    }).join('')}
    <button class="btn btn-primary btn-block" style="margin-top:6px" onclick="UI.scanCommit()">🧊 확인한 ${okCount}개 담기</button>`;
}
UI.scanEdit = (idx, k, v) => {
  const r = scanResults?.[idx];
  if (!r) return;
  if (k === 'qty') { r.qty = Number(v); return; }
  r[k] = v;
  if (k === 'name') { // 사용자가 직접 손댄 이름은 확인된 것으로 보고 이모지·정렬 갱신
    const ing = findIng(v);
    r.emoji = ing?.emoji || '🍽️';
    r.confirmed = true;
    renderScanRows();
  }
};
UI.scanConfirm = (idx) => { if (scanResults?.[idx]) { scanResults[idx].confirmed = true; renderScanRows(); } };
UI.scanRemove = (idx) => { scanResults.splice(idx, 1); renderScanRows(); };
UI.scanCommit = () => {
  const list = (scanResults || []).filter((r) => r.confirmed);
  if (!list.length) { toast('확인한 품목이 없어요 — 맞는 품목을 확인하거나 이름을 고쳐 주세요'); return; }
  for (const r of list) {
    addPantryByName(r.name, { qty: r.qty, location: r.location, silentToast: true });
    if (r.orig && r.orig !== r.name) saveScanFix(r.orig, r.name); // 다음 스캔부터 자동 반영(교정 학습)
  }
  UI.closeSheet(); render();
  toast(`${list.length}개 품목을 입고했어요 🧊`);
};

/* ── 상단 배지 설명 — 눌러보면 다 알려준다 ── */
UI.explainLedger = () => {
  openSheet(`
    <h2>🧾 이 금액이 뭐예요?</h2>
    <p class="sub">냉비서가 지켜준 돈과 새어나간 돈의 추정치예요</p>
    <div class="card flat">
      <b style="color:var(--green)">아낀 돈 ${won(S.ledger.saved)}</b>
      <p class="hint" style="margin-top:6px">이렇게 쌓여요:<br>
      · 유통기한 임박 재료를 버리기 전에 요리에 쓰면 → 그 재료 평균 가격의 절반 적립<br>
      · 남은 음식(잔반·반찬·배달)을 버리지 않고 드시면 → 한 끼 추정 ₩4,000 적립</p>
    </div>
    <div class="card flat">
      <b style="color:var(--red)">버린 돈 ${won(S.ledger.wasted)}</b>
      <p class="hint" style="margin-top:6px">기한이 지나 폐기한 재료·음식의 평균 가격 합계예요</p>
    </div>
    <p class="hint">※ 정확한 가계부가 아니라 평균 시세 기반 <b>동기부여용 추정치</b>입니다.<br>
    지금까지: 요리 완료 ${S.ledger.cooked}회 · 잔반 해결 ${S.ledger.leftoverEaten}회 · 음식 폐기 ${S.ledger.leftoverWasted}회</p>
    <div class="btn-row"><button class="btn btn-block" onclick="UI.closeSheet()">알겠어요</button></div>`);
};

UI.explainSync = () => {
  const st = sync.status;
  const body = st === 'on'
    ? `<div class="card flat"><b style="color:var(--green)">${S.settings.spaceCode ? '👨‍👩‍👧 가족 공유 중' : '☁️ 내 계정에 백업 중'}</b>
       <p class="hint" style="margin-top:6px">${S.settings.spaceCode
         ? '가족 코드를 넣은 기기들과 냉장고가 실시간으로 합쳐져 있어요.'
         : '냉장고가 계정에 자동 백업돼요. 폰을 바꿔도 로그인만 하면 그대로 돌아옵니다.'}</p></div>`
    : st === 'error'
      ? `<div class="card flat"><b style="color:var(--red)">동기화 오류</b>
         <p class="hint" style="margin-top:6px">${esc(sync.error || '연결에 실패했어요')} — 설정에서 다시 시도해 보세요.</p></div>`
      : `<div class="card flat"><b>이 기기 (로컬 저장)</b>
         <p class="hint" style="margin-top:6px">지금 냉장고 데이터는 <b>이 기기 안에만</b> 저장되고 있어요. 외부로 전송되지 않아 프라이버시는 좋지만, 폰을 바꾸면 가져갈 수 없어요.</p></div>
       <p class="hint">${syncAvailable() ? '설정에서 <b>구글로 시작하기</b>를 누르면 백업·기기 이동·가족 공유가 켜져요 (무료).' : '계정 백업 기능은 곧 제공돼요. 그동안은 설정 → 내보내기로 백업해 두세요.'}</p>`;
  openSheet(`
    <h2>📡 이 표시가 뭐예요?</h2>
    <p class="sub">내 냉장고 데이터가 어디에 저장되는지 알려주는 상태예요</p>
    ${body}
    <div class="btn-row">
      <button class="btn" onclick="UI.closeSheet()">닫기</button>
      <button class="btn btn-primary" onclick="UI.closeSheet();UI.go('settings')">설정 열기</button></div>`);
};

/* ── 무료 한도 소진 → 그때서야 고지하고, 광고 풀시청 시 하던 작업을 이어간다 ──
   미리 광고를 노출/예고하지 않는다. AI 버튼을 눌러 한도에 걸린 순간에만 팝업. */
let adRetry = null; // 광고 완주 후 이어서 실행할 작업 (스캔 재실행 등)
UI.openRecharge = (retry) => {
  adRetry = typeof retry === 'function' ? retry : null;
  openSheet(`
    <h2>🔋 이번 달 무료 AI 횟수를 다 썼어요</h2>
    <p class="sub">짧은 광고를 <b>끝까지 보면 1회</b> 충전되고, 하던 작업이 바로 이어져요. 자주 쓰면 프리미엄이 편해요.</p>
    <div class="card flat row" style="gap:12px">
      <div style="font-size:1.7rem">📺</div>
      <div class="grow"><b>광고 보고 1회 충전</b>
        <p class="hint" style="margin:2px 0 0">15초 · 중간에 닫으면 충전되지 않아요</p></div>
      <button class="btn btn-sm btn-primary" onclick="UI.watchAd()">시청</button>
    </div>
    ${(S.points?.bal || 0) >= 100 ? `<div class="card flat row" style="gap:12px">
      <div style="font-size:1.7rem">🤖</div>
      <div class="grow"><b>포인트로 1회권</b>
        <p class="hint" style="margin:2px 0 0">100P · 모아둔 포인트로 바로 충전</p></div>
      <button class="btn btn-sm btn-tint" onclick="UI.redeem('ai1')">100P</button>
    </div>` : `<div class="card flat row" style="gap:12px">
      <div style="font-size:1.7rem">🎮</div>
      <div class="grow"><b>게임하고 포인트 모으기</b>
        <p class="hint" style="margin:2px 0 0">100P 모으면 1회권으로 바로 충전돼요</p></div>
      <button class="btn btn-sm btn-tint" onclick="UI.closeSheet();UI.openGames()">게임</button>
    </div>`}
    <div class="card flat row" style="gap:12px">
      <div style="font-size:1.7rem">⭐</div>
      <div class="grow"><b>프리미엄 — 무제한 · 광고 없음</b>
        <p class="hint" style="margin:2px 0 0">월 3,900원 (출시 준비 중)</p></div>
      <button class="btn btn-sm btn-tint" onclick="UI.premiumInterest()">알림받기</button>
    </div>
    <div class="btn-row"><button class="btn btn-block" onclick="UI.closeSheet()">다음에 할게요</button></div>`);
};
/* 광고 재생 코어 — 모든 보상형(AI 충전·게임 2배)이 이 한 곳을 거친다.
   토스 안: 네이티브 보상형 SDK 시도 → 개별 운영/실패: 하우스 15초 (AdFit 교체 자리) */
let adTimer = null;
function playAd({ onComplete, note = '', reward = '' }) {
  tossRewardedAd().then((r) => {
    if (r === true) { // 토스 보상형 완주 — 바로 보상 단계
      openSheet('<h2>📺 광고</h2><button id="ad-btn" class="btn btn-block btn-soft" disabled>보상 적용 중…</button>', { lock: true });
      onComplete($('#ad-btn'));
      return;
    }
    if (r === false) { toast('광고를 끝까지 봐야 보상을 받아요'); return; }
    houseAd({ onComplete, note, reward }); // null = 토스 환경 아님/광고 없음 → 폴백
  });
}
function houseAd({ onComplete, note, reward }) {
  clearInterval(adTimer);
  const total = 15;
  const R = 28, CIRC = 2 * Math.PI * R;
  // 잠금 시트: 바깥 탭으로 안 닫힘 — 완주해야 보상 (보상형 광고 표준 동작)
  openSheet(`
    <div class="adx">
      <div class="adx-head"><b>🕒 짬시간에 잠깐 보고 받기</b>
        <button class="adx-skip" onclick="UI.adQuit()">건너뛰기 ›</button></div>
      ${reward ? `<div class="adx-reward">🎁 ${reward}</div>` : ''}
      <div class="adx-stage">
        <div class="adx-slime">🧊</div>
        <b>냉비서 프리미엄이 곧 나와요</b>
        <p>AI 무제한 · 살아 움직이는 캐릭터팩 · 광고 없음</p>
      </div>
      <div class="adx-ring">
        <svg width="64" height="64"><circle cx="32" cy="32" r="${R}" fill="none" stroke="rgba(120,120,128,0.18)" stroke-width="6"/>
          <circle id="ad-ring" cx="32" cy="32" r="${R}" fill="none" stroke="var(--green)" stroke-width="6" stroke-linecap="round"
            stroke-dasharray="${CIRC.toFixed(1)}" stroke-dashoffset="0" style="transition:stroke-dashoffset ${total}s linear"/></svg>
        <span class="adx-num" id="ad-num">${total}</span>
      </div>
      ${note ? `<p class="adx-note">${note}</p>` : ''}
      <p class="adx-thanks">이 광고가 냉비서를 무료로 유지해요 — 봐주셔서 고마워요 🙏</p>
      <button id="ad-btn" class="btn btn-block btn-soft" disabled style="margin-top:10px">광고 시청 중…</button>
    </div>`, { lock: true });
  const ring = $('#ad-ring');
  if (ring) requestAnimationFrame(() => { ring.style.strokeDashoffset = String(CIRC); });
  let t = total;
  adTimer = setInterval(() => {
    const b = $('#ad-btn');
    if (!b) { clearInterval(adTimer); return; } // 시트가 닫혔으면(뒤로가기 등) 보상 없음
    t--;
    const num = $('#ad-num'); if (num) num.textContent = Math.max(0, t);
    if (t > 0) return;
    clearInterval(adTimer);
    onComplete(b);
  }, 1000);
}
UI.watchAd = () => {
  playAd({
    reward: 'AI 1회 충전 + 보너스 포인트',
    note: '끝까지 보면 AI 1회가 충전되고 하던 작업이 이어져요',
    onComplete: (b) => {
      aiGrant(1); // AI 사용권 +1 (클라 집계)
      const bonusP = earn('ad');
      b.className = 'btn btn-block btn-primary';
      if (adRetry) {
        b.textContent = `✅ +1회 충전${bonusP.ok ? ` · 🅿+${bonusP.p}P` : ''} — 이어서 진행할게요`;
        const r = adRetry; adRetry = null;
        setTimeout(() => { UI.closeSheet(); r(); }, 900);
      } else {
        b.textContent = `✅ +1회 충전 완료${bonusP.ok ? ` · 🅿+${bonusP.p}P` : ''}`;
        b.disabled = false;
        b.onclick = () => UI.closeSheet();
      }
    },
  });
};
UI.adQuit = () => {
  clearInterval(adTimer);
  adRetry = null;
  UI.closeSheet();
  toast('광고를 끝까지 봐야 보상을 받아요');
};

/* ── 앱 내 광고 슬롯 — 지금은 하우스 광고, 운영자가 애드핏/애드센스 코드로 교체하는 자리 ──
   배치: 홈 맨 아래 · 레시피 목록 아래 · 장보기 아래 (요리 진행·레시피 상세에는 두지 않는다)
   프리미엄(plan==='premium')은 모든 슬롯 미노출 */
const HOUSE_ADS = [
  { ico: '⭐', t: '냉비서 프리미엄', d: 'AI 무제한 · 광고 없음 · 월 3,900원 (준비 중)', act: 'UI.premiumInterest()' },
  { ico: '📰', t: '냉장고 파먹기 매거진', d: '버리는 식비를 줄이는 부엌 지식 읽기', act: "window.open('https://yonggunyoung.github.io/todayfeelgood/blog/','_blank')" },
  { ico: '👨‍👩‍👧', t: '가족과 같이 쓰기', d: '코드 하나로 온 가족이 한 냉장고를 봐요', act: "UI.go('settings')" },
];
function adBanner(slot) {
  if (adFreeNow()) return ''; // 프리미엄 · 포인트샵 "광고 없는 하루" · 맛보기 중
  const a = HOUSE_ADS[(new Date().getDate() + slot.length) % HOUSE_ADS.length];
  return `<div class="ad-banner" id="ad-${slot}" onclick="${a.act}">
    <span class="ad-ico">${a.ico}</span>
    <div><b>${a.t}</b><p>${a.d}</p></div>
    <span class="ad-tag">AD</span></div>`;
}

/* ── 🅿 포인트 — 절약 행동 보상 + 교환소 (충전·현금화 없음) ── */
UI.openPoints = () => {
  const rows = Object.entries(EARN).map(([k, r]) => {
    const got = earnedToday(k);
    return `<div class="p-row ${got >= r.cap ? 'done' : ''}">
      <span>${r.emoji}</span>
      <div class="grow"><b>${r.label}</b><small>${k === 'game' ? '점수만큼 (판당 최대 12P)' : `+${r.p}P`}</small></div>
      <b class="p-stat">${got}/${r.cap}</b></div>`;
  }).join('');
  const shop = SHOP.map((it) => {
    const locked = it.kind === 'locked' || (it.kind === 'aicredit' && (!aiReady().ok || aiUnlimited()));
    const can = !locked && (S.points?.bal || 0) >= it.p;
    return `<div class="p-row ${locked ? 'done' : ''}">
      <span>${it.emoji}</span>
      <div class="grow"><b>${it.name}</b><small>${it.desc}</small></div>
      ${locked
        ? `<small style="color:var(--label-3)">${it.kind === 'locked' ? '준비 중' : (aiUnlimited() ? '무제한 이용 중' : 'AI 설정 후')}</small>`
        : `<button class="btn btn-sm ${can ? 'btn-tint' : 'btn-soft'}" ${can ? '' : 'disabled'} onclick="UI.redeem('${it.id}')">${it.p.toLocaleString()}P</button>`}
    </div>`;
  }).join('');
  const hist = (S.points?.hist || []).slice(0, 6).map((h) =>
    `<div class="p-row"><small style="color:var(--label-3)">${new Date(h.t).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}</small>
      <div class="grow"><small>${esc(h.n)}</small></div><b class="${h.p > 0 ? 'p-plus' : 'p-minus'}">${h.p > 0 ? '+' : ''}${h.p}P</b></div>`).join('');
  openSheet(`
    <h2>🅿 내 포인트</h2>
    <div class="card flat" style="text-align:center;padding:18px">
      <div style="font-size:2rem;font-weight:900">${(S.points?.bal || 0).toLocaleString()}<small style="font-size:1rem">P</small></div>
      <p class="hint" style="margin:4px 0 0">누적 ${(S.points?.total || 0).toLocaleString()}P · 버리지 않을수록 쌓여요</p>
    </div>
    <div class="invite-cta" onclick="UI.openInvite()">
      <span class="ic-ico">🎉</span>
      <div class="grow"><b>친구 초대하고 +${REF_INVITER}P</b><small>친구가 냉비서를 시작하면 둘 다 포인트를 받아요</small></div>
      <span class="ic-go">초대 ›</span>
    </div>
    <div class="section-title" style="margin-top:14px"><h2>오늘 적립</h2><small>매일 자정 리셋</small></div>
    <div class="card flat">${rows}</div>
    <div class="section-title" style="margin-top:14px"><h2>교환소</h2><small>모은 포인트 쓰기</small></div>
    <div class="card flat">${shop}</div>
    ${hist ? `<div class="section-title" style="margin-top:14px"><h2>최근 내역</h2></div><div class="card flat">${hist}</div>` : ''}
    <p class="hint" style="text-align:center;margin-top:10px">포인트는 활동으로만 적립되고 현금으로 바꿀 수 없어요.<br>기프티콘·토스포인트 교환은 준비되는 대로 열립니다.</p>
    <div class="btn-row"><button class="btn btn-block" onclick="UI.closeSheet()">닫기</button></div>`);
};
UI.redeem = async (id) => {
  const it = SHOP.find((x) => x.id === id);
  if (!it) return;
  if (it.id === 'ai1') {
    if (!aiReady().ok) { toast('AI를 먼저 사용할 수 있어야 충전돼요 (설정 → AI)'); return; }
    if (!spend(it.p, it.name)) { toast('포인트가 부족해요'); return; }
    aiGrant(1);
    toast('🤖 AI 1회권 +1 충전 완료!');
  } else if (it.id === 'adfree') {
    if (!spend(it.p, it.name)) { toast('포인트가 부족해요'); return; }
    S.adFreeUntil = Date.now() + 86400e3;
    save();
    toast('🧘 24시간 동안 배너 광고가 사라져요');
  } else if (it.id === 'trial') {
    if (!spend(it.p, it.name)) { toast('포인트가 부족해요'); return; }
    S.planTrialUntil = Date.now() + 86400e3;
    save();
    toast('⭐ 프리미엄 맛보기 시작! 24시간 광고 없이 쓰세요');
  }
  UI.openPoints();
  if (tab === 'home') renderHome();
};

/* ── 🎮 게임 글루 — 각 게임 모듈의 시트가 onclick 문자열로 부른다 ── */
UI.openGames = () => openGames();
UI.gameFull = () => {
  const el = document.querySelector('.gx'); if (!el) return;
  try { if (document.fullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen).call(document); else (el.requestFullscreen || el.webkitRequestFullscreen).call(el); }
  catch { toast('이 브라우저는 전체화면을 지원하지 않아요'); }
};
// 전체화면에서도 타이머 칩이 보이도록 — 전체화면 요소 안/밖으로 옮겨 붙임
function relocateTimerChip() {
  const chip = $('#timer-chip'); if (!chip) return;
  const host = document.fullscreenElement || document.body;
  if (chip.parentElement !== host) {
    host.appendChild(chip);
    if (timerPos) { chip.style.left = timerPos.x + 'px'; chip.style.top = timerPos.y + 'px'; chip.style.right = 'auto'; chip.style.bottom = 'auto'; }
  }
  // 게임/전체화면 중엔 컴팩트(시간만) — 방해 최소화
  chip.classList.toggle('compact', !!(document.fullscreenElement || document.querySelector('.gx')));
}
document.addEventListener('fullscreenchange', relocateTimerChip);
document.addEventListener('webkitfullscreenchange', relocateTimerChip);
UI.setGameDiff = (d) => setGameDiff(d);
UI.gameSetDiff = (d, key) => { setGameDiff(d); if (key && typeof UI[key] === 'function') UI[key](); };
UI.gameGomoku = () => gameGomoku();
UI.gomokuUndo = () => gomokuUndo();
UI.gomokuHintAd = () => gomokuHintAd();
UI.gameFresh = () => gameFresh();
UI.gameVoice = () => gameVoice();
UI.gameVoicePass = () => gameVoicePass();
UI.gameDouble = (p) => gameDouble(p);
UI.gameDefense = () => gameDefense();
UI.defBuy = (k) => defBuy(k);
UI.defStart = (d) => defStart(d);
UI.defSpeed = () => defSpeed();
UI.defPick = (i) => defPick(i);
UI.defRevive = () => defRevive();
UI.defGiveUp = () => defGiveUp();
UI.defAdSkip = () => defAdSkip();
UI.defAdSkill = () => defAdSkill();
UI.defWallMode = () => defWallMode();
UI.defElem = () => defElem();
UI.defMidSkill = () => defMidSkill();
UI.defMidSkip = () => defMidSkip();
UI.defResume = () => defResume();
UI.defDraftAd = () => defDraftAd();
UI.gamePuzzle = () => gamePuzzle();
UI.gameQuiz = () => gameQuiz();
UI.quizPick = (i) => quizPick(i);
UI.quizNext = () => quizNext();
UI.quizReveal = () => quizReveal();
UI.quizRevealAll = () => quizRevealAll();
UI.quizFinish = () => quizFinish();

/* ── 🏆 랭킹 — 같은 냉장고(가족) vs 전체, 게임별 ── */
let ranksScope = 'global';
let ranksGame = 'defense';
UI.openRanks = () => { renderRanks(); };
UI.ranksScope = (s) => { ranksScope = s; renderRanks(); };
UI.ranksGame = (g) => { ranksGame = g; renderRanks(); };
async function renderRanks() {
  const gmeta = GAMES.find((g) => g.id === ranksGame) || GAMES[0];
  const chips = GAMES.filter((g) => !g.needVoice || canListen).map((g) =>
    `<button class="rk-chip ${ranksGame === g.id ? 'on' : ''}" onclick="UI.ranksGame('${g.id}')">${g.emoji} ${g.name}</button>`).join('');
  openSheet(`
    <div class="g-hubhead"><h2 style="margin:0">🏆 랭킹</h2>
      <button class="btn btn-sm" onclick="UI.openGames()">← 게임</button></div>
    <div class="seg" style="margin-top:6px">
      <button class="${ranksScope === 'global' ? 'on' : ''}" onclick="UI.ranksScope('global')">🌍 전체</button>
      <button class="${ranksScope === 'family' ? 'on' : ''}" onclick="UI.ranksScope('family')">👨‍👩‍👧 우리 냉장고</button>
    </div>
    <div class="rk-chips">${chips}</div>
    <div id="rk-body"><p class="hint" style="text-align:center;padding:20px">불러오는 중…</p></div>`);
  const body = $('#rk-body');
  const res = await topScores({ scope: ranksScope, game: ranksGame, max: 30 });
  if (!body || !body.isConnected) return;
  if (res.state === 'off') { body.innerHTML = `<p class="hint" style="text-align:center;padding:20px">랭킹은 계정 기능이 켜지면 제공돼요.</p>`; return; }
  if (res.state === 'needLogin') {
    body.innerHTML = `<div class="empty"><span class="e-emoji">🔑</span><b>로그인하면 랭킹에 참여해요</b><small>구글로 시작하면 내 최고 점수가 등록됩니다</small>
      <button class="btn btn-primary" style="margin-top:10px" onclick="UI.closeSheet();UI.go('settings')">설정에서 로그인</button></div>`; return;
  }
  if (res.state === 'noFamily') {
    body.innerHTML = `<div class="empty"><span class="e-emoji">👨‍👩‍👧</span><b>가족 공유를 켜면 가족끼리 겨뤄요</b><small>설정 → 가족과 같이 쓰기에서 코드를 만드세요</small></div>`; return;
  }
  if (!res.rows.length) { body.innerHTML = `<div class="empty"><span class="e-emoji">🥇</span><b>아직 기록이 없어요</b><small>${gmeta.name} 첫 기록의 주인공이 되세요!</small></div>`; return; }
  const medal = (i) => ['🥇', '🥈', '🥉'][i] || `<span class="rk-num">${i + 1}</span>`;
  body.innerHTML = res.rows.map((r, i) => `
    <div class="rk-row ${r.me ? 'me' : ''}">
      <span class="rk-rank">${medal(i)}</span>
      ${r.photo ? `<img class="rk-photo" src="${r.photo}" alt="" />` : '<span class="rk-photo ph">👤</span>'}
      <b class="grow">${esc(r.name)}${r.me ? ' <small style="color:var(--green)">나</small>' : ''}</b>
      <b class="rk-score">${r.score.toLocaleString()}</b>
    </div>`).join('');
}
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
  // 매칭 정도에 따라 배지 색 — 다 있으면 그린, 거의 있으면 골드, 모자라면 레드(시안 규격)
  const matchCls = a.cookable ? 'full' : (pct >= 50 ? 'part' : 'low');
  return `
    <div class="card recipe-card ${selMode && cookSel.has(r.id) ? 'selected' : ''}" onclick="UI.cardTap('${r.id}')">
      ${selMode ? `<div class="sel-badge ${cookSel.has(r.id) ? 'on' : ''}">${cookSel.has(r.id) ? '✓' : '＋'}</div>` : ''}
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
              ${r.protein ? `<span class="m-prot">단백질 <b>${r.protein}g</b></span>` : ''}
              ${a.rating ? `<span class="rstars" title="내 별점 ${a.rating}">${'★'.repeat(a.rating)}</span>` : ''}
              ${a.community ? `<span class="rcomm">★${a.community.avg} <small>(${a.community.count})</small></span>` : ''}
              ${a.usesExpiring ? '<span style="color:var(--red)">임박재료 소진</span>' : ''}
            </div>
          </div>
          <button class="heart ${a.fav ? 'on' : ''}" onclick="event.stopPropagation();UI.toggleFav('${r.id}')">❤️</button>
        </div>
        <div class="match-bar"><i style="width:${pct}%"></i></div>
        <div class="r-match">
          ${a.total === 0
            ? '<span class="chip">🎬 영상만 저장됨 — 탭해서 재료 채우기</span>'
            : `<span class="match-badge ${matchCls}">재료 ${a.have}/${a.total}</span>
          ${a.missing.slice(0, 3).map((m) =>
            `<span class="miss-chip" onclick="event.stopPropagation();UI.addShopping('${esc(m)}', false, '', 'recipe')">＋ ${esc(m)}</span>`).join('')}
          ${a.missing.length > 3 ? `<span class="match-badge">외 ${a.missing.length - 3}</span>` : ''}`}
        </div>
      </div>
    </div>`;
}

function recipeListHtml() {
  const { analyzed } = recommend(S, S.settings.mode, { includeBlocked: true });
  const q = recipeQuery.trim();
  let list = analyzed;
  if (rTab === 'mine') list = list.filter((a) => a.recipe.mine);
  if (rTab === 'fav') list = list.filter((a) => a.fav);
  list = list.filter((a) => !q || a.recipe.title.includes(q) || a.recipe.tags?.some((t) => t.includes(q)));
  const emptyMsg = rTab === 'mine'
    ? `<div class="empty"><span class="e-emoji">📒</span><b>아직 내 레시피가 없어요</b><small>유튜브에서 본 그 요리, 엄마 레시피 —<br>위 🎬/＋ 버튼으로 저장해 두면 내 재고와 자동 매칭돼요</small></div>`
    : rTab === 'fav'
      ? `<div class="empty"><span class="e-emoji">🤍</span><b>하트가 비어 있어요</b><small>레시피 카드의 ❤️를 누르면 여기 모여요</small></div>`
      : `<div class="empty"><span class="e-emoji">🔍</span><b>'${esc(recipeQuery)}' 결과가 없어요</b>
          <small>유튜브에서 찾아 바로 내 레시피로 담아보세요</small>
          ${recipeQuery ? `<button class="btn btn-accent" style="margin-top:10px" onclick="UI.openYtSearch('${esc(recipeQuery)}')">🎬 유튜브에서 '${esc(recipeQuery)}' 찾기</button>` : ''}</div>`;
  return list.length ? list.map(recipeCard).join('') : emptyMsg;
}

function renderRecipes() {
  const modeKey = S.settings.mode;
  const mode = getMode(S, modeKey);
  const { blocked } = recommend(S, modeKey, { includeBlocked: true });

  const chips = modeList(S).map((m) =>
    `<button class="mode-chip ${m.key === modeKey ? 'on' : ''}" onclick="UI.setMode('${m.key}')">${m.emoji} ${esc(m.label)}${m.custom ? ` <span onclick="event.stopPropagation();UI.openModeMaker('${m.key}')" style="opacity:.7">✎</span>` : ''}</button>`).join('') +
    `<button class="mode-chip add" onclick="UI.openModeMaker()">＋ 모드 만들기</button>`;

  $('#view').innerHTML = `
    <div class="hero"><h1>${mode.emoji} <em>${esc(mode.label)}</em> 레시피</h1>
      <p>${esc(mode.desc || '내 냉장고 기준으로 정렬했어요')}</p></div>
    <div class="mode-chips">${chips}</div>
    <div class="search-row">
      <input placeholder="요리 이름·태그 검색" value="${esc(recipeQuery)}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" oninput="UI.recipeSearch(this.value)" />
      <button class="btn btn-accent" onclick="UI.openYtSearch()" title="유튜브에서 찾기">🎬</button>
      <button class="btn btn-tint" onclick="UI.openRecipeForm()">＋</button>
    </div>
    <div class="seg" style="margin-top:4px">
      <button class="${rTab === 'reco' ? 'on' : ''}" onclick="UI.setRTab('reco')">추천</button>
      <button class="${rTab === 'mine' ? 'on' : ''}" onclick="UI.setRTab('mine')">📒 내 레시피</button>
      <button class="${rTab === 'fav' ? 'on' : ''}" onclick="UI.setRTab('fav')">❤️ 찜</button>
    </div>
    ${mode.blockCaution && blocked.length
      ? `<div class="banner warn">🤰 임신 중 <b>섭취 주의 재료</b>(참치의 수은 등)가 든 레시피 ${blocked.length}개를 가렸어요 — 상해서가 아니라 안 드시는 게 좋은 재료라서예요. 다른 모드로 바꾸면 그대로 보입니다. (의학적 조언 아님 · 식단은 의료진과 상의)</div>` : ''}
    <button class="btn ${selMode ? 'btn-tint' : 'btn-soft'} btn-block" style="margin:2px 0 8px" onclick="UI.toggleSelMode()">
      ${selMode ? '✕ 같이 요리 선택 끝내기' : '👩‍🍳 같이 요리 — 여러 개 골라 통합 순서 만들기'}</button>
    <div class="home-games" style="margin-bottom:10px">
      <button onclick="UI.openGames()">🎮 게임하기</button>
      <button class="ad" onclick="UI.waitAd()">🕒 짬시간 포인트</button>
    </div>
    <div id="recipe-list">${recipeListHtml()}</div>
    ${adBanner('recipes')}
    ${selMode && cookSel.size ? `
      <div id="cookbar">
        <b>${cookSel.size}개 선택됨</b>
        <button class="btn btn-primary btn-sm" onclick="UI.openCookPlan()">🍳 통합 순서 만들기</button>
      </div>` : ''}`;
}

UI.toggleSelMode = () => { selMode = !selMode; if (!selMode) cookSel.clear(); renderRecipes(); };
UI.cardTap = (id) => {
  if (!selMode) { UI.openRecipe(id); return; }
  const r = allRecipes(S).find((x) => x.id === id);
  if (!r?.steps?.length) { toast('단계가 없는 레시피는 같이 요리에 못 넣어요'); return; }
  if (cookSel.has(id)) cookSel.delete(id);
  else {
    if (cookSel.size >= 3) { toast('한 번에 3개까지 — 그 이상은 주방이 전쟁터가 돼요 😅'); return; }
    cookSel.add(id);
  }
  renderRecipes();
};

// 여러 요리 → 손질부터 타이밍까지 통합 타임라인 (음성으로 한 단계씩)
UI.openCookPlan = () => {
  const recipes = [...cookSel].map((id) => allRecipes(S).find((x) => x.id === id)).filter(Boolean);
  if (recipes.length < 2) { toast('2개 이상 선택해 주세요'); return; }
  const plan = buildCookPlan(recipes);
  vc = { type: 'plan', plan, idx: 0, video: false };
  openSheet(`
    <h2>👩‍🍳 같이 요리 플랜</h2>
    <p class="sub">${plan.titles.join(' + ')} · 예상 ${plan.estTime}분 · 휴리스틱 베타 — 🎤를 켜면 "다음"만 말하면 돼요</p>
    <div class="btn-row" style="margin-top:0">
      <button class="btn btn-soft btn-sm" onclick="UI.readIngs()">🔊 재료</button>
      <button class="btn btn-soft btn-sm" onclick="UI.readStep()">🔊 현재 단계</button>
      <button id="mic-btn" class="btn btn-sm ${canListen ? 'btn-tint' : 'btn-soft'}" onclick="UI.micToggle()">🎤 음성</button>
    </div>
    <div class="section-title"><h2>🧺 통합 재료</h2><small>${plan.ingredients.length}가지</small></div>
    <div>${plan.ingredients.map((g) => `<span class="chip have">${esc(g.n)} ${g.a ? fmtAmt(g.a) : ''}${esc(g.u || '')}</span>`).join('')}</div>
    ${plan.prep.length ? `
    <div class="section-title"><h2>🔪 손질 먼저 (한 번에)</h2><small>${plan.prep.length}개</small></div>
    <div class="card flat" style="padding:6px 15px"><ul class="steps">
      ${plan.prep.map((p) => `<li><b style="font-weight:700">${p.emoji}</b>&nbsp;${esc(p.text)}</li>`).join('')}</ul></div>` : ''}
    <div class="section-title"><h2>🔥 조리 타임라인</h2><small>⏲ = 기다리는 동안</small></div>
    <div id="plan-steps">
      ${plan.timeline.map((s2, i) => `
        <div class="plan-step ${i === 0 ? 'current' : ''}" id="ps-${i}" onclick="vcJump(${i})">
          <span class="ps-no">${i + 1}</span>
          <div class="grow">
            <small>${s2.parallel ? '⏲ 그동안 · ' : ''}${s2.emoji} ${esc(s2.recipe)}</small>
            <div>${esc(s2.text)}</div>
          </div>
        </div>`).join('')}
    </div>
    <div class="btn-row">
      <button class="btn" onclick="UI.planNav(-1)">◀ 이전</button>
      <button class="btn btn-primary" onclick="UI.planNav(1)">다음 단계 ▶</button>
    </div>
    <p class="hint" style="text-align:center">다 만들면 각 레시피에서 "요리 완료"로 재고 차감하세요 ${recipes.map((r) => `· <a href="#" onclick="event.preventDefault();UI.openRecipe('${r.id}')">${esc(r.title)}</a>`).join(' ')}</p>`);
};
window.vcJump = (i) => { if (vc?.type === 'plan') { vc.idx = i; vcRead(); highlightPlanStep(); } };
// 입력 중엔 목록만 갈아끼운다 — 화면 전체를 다시 그리면 한글 조합이 끊긴다
UI.recipeSearch = (v) => {
  recipeQuery = v;
  const el = $('#recipe-list');
  if (el) el.innerHTML = recipeListHtml();
};
UI.setRTab = (t) => { rTab = t; renderRecipes(); };
UI.toggleFav = (id) => {
  const i = S.favs.indexOf(id);
  if (i >= 0) S.favs.splice(i, 1); else S.favs.push(id);
  save(); render();
};
// 레시피 별점 — 내 평가(1~5)는 로컬+추천 가중, 동시에 커뮤니티(모두의 평점)에 집계 제출.
const ratingOf = (rid) => (S.ratings || {})[rid] || 0;
function starRowHtml(rid) {
  const cur = ratingOf(rid);
  const c = communityRating(rid); // {avg,count} | null
  return `<div class="star-row" id="stars-${rid}">
    ${[1, 2, 3, 4, 5].map((n) => `<button class="star${n <= cur ? ' on' : ''}" onclick="event.stopPropagation();UI.rate('${rid}',${n})" aria-label="${n}점">★</button>`).join('')}
    <span class="star-lbl">${cur ? `내 별점 ${cur}` : '눌러서 별점'}</span>
    ${c ? `<span class="star-comm">모두의 평점 ★${c.avg} <small>(${c.count.toLocaleString()})</small></span>` : ''}</div>`;
}
// 커뮤니티 평점 캐시 — 서버 집계({rid:{s,c}})를 엔진에 주입 + 즉시 표시
let communityStats = {};
function applyCommunityStats(map) { communityStats = map || {}; setCommunityStats(communityStats); }
UI.rate = (rid, n) => {
  if (!S.ratings) S.ratings = {};
  if (S.ratings[rid] === n) delete S.ratings[rid]; else S.ratings[rid] = n;
  save();
  const v = ratingOf(rid);
  track('rate_recipe', { rid, stars: v });
  const box = document.getElementById('stars-' + rid);
  if (box) box.outerHTML = starRowHtml(rid);
  toast(v ? `⭐ ${v}점으로 평가했어요 — 추천에 반영돼요` : '평가를 지웠어요');
  // 커뮤니티 집계 제출(서버가 평균 계산) → 성공 시 모두의 평점 갱신
  submitRating(rid, v).then((r) => {
    if (!r || typeof r.count !== 'number') return;
    communityStats[rid] = { s: r.avg * r.count, c: r.count };
    setCommunityStats(communityStats);
    try { localStorage.setItem('nb_cstats', JSON.stringify(communityStats)); } catch { /* 용량 무시 */ }
    const b2 = document.getElementById('stars-' + rid);
    if (b2) b2.outerHTML = starRowHtml(rid);
  });
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
  const ytSrc = r.yt ? `https://www.youtube-nocookie.com/embed/${r.yt}?rel=0&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(location.origin)}` : '';
  const startInRecipe = !!(r.yt && r.steps?.length); // 영상+레시피 둘 다 있으면 간편 보기로 시작
  vc = { type: 'detail', recipe: r, idx: 0, video: !!r.yt };
  if (r.yt && !startInRecipe) { setTimeout(ytHandshake, 900); setTimeout(ytHandshake, 2200); }
  openSheet(`
    ${r.yt ? `
      ${startInRecipe ? `<div class="seg" style="margin:2px 0 10px" id="dt-vseg">
        <button onclick="UI.dtView('video')">▶ 영상 보며</button>
        <button class="on" onclick="UI.dtView('recipe')">📒 레시피만</button>
      </div>` : ''}
      <div class="ytwrap" id="dt-yt" data-src="${ytSrc}" style="${startInRecipe ? 'display:none' : ''}">
        <iframe src="${startInRecipe ? '' : ytSrc}" allow="accelerometer; encrypted-media; picture-in-picture" allowfullscreen title="${esc(r.title)}"></iframe></div>
      <div class="row" id="dt-ytlink" style="justify-content:flex-end;margin:-4px 0 8px;${startInRecipe ? 'display:none' : ''}">
        <a class="btn btn-soft btn-sm" href="https://youtu.be/${r.yt}" target="_blank" rel="noreferrer">↗ 유튜브 앱에서 크게 보기</a></div>`
      : r.photo ? `<img src="${r.photo}" style="width:100%;border-radius:16px;margin-bottom:12px;max-height:230px;object-fit:cover" />` : ''}
    <div class="row">
      <div class="grow"><h2>${r.emoji || '🍳'} ${esc(r.title)}</h2>
        <p class="sub" style="margin:2px 0 0">${r.time ? `⏱ ${r.time}분 · ` : ''}${r.kcal ? `${r.kcal}kcal · ` : ''}${r.protein ? `단백질 ${r.protein}g` : ''}</p></div>
      <button class="heart ${a.fav ? 'on' : ''}" onclick="UI.toggleFav('${r.id}');this.classList.toggle('on')">❤️</button>
    </div>
    ${starRowHtml(r.id)}
    ${r.caution ? `<div class="banner warn">⚠️ ${esc(r.caution)}</div>` : ''}
    <div class="rcp-tools">
      <button onclick="UI.recipeTimer(${r.time || 10})"><span>⏲️</span>타이머</button>
      <button class="hot" onclick="UI.waitAd()"><span>🕒</span>짬시간P</button>
      <button onclick="UI.openGames()"><span>🎮</span>게임</button>
      <button id="mic-btn" class="${canListen ? 'on' : ''}" onclick="UI.micToggle()"><span>🎤</span>음성</button>
    </div>
    <div class="btn-row" style="margin-top:8px">
      <button class="btn btn-soft btn-sm" onclick="UI.readIngs()">🔊 재료 읽어줘</button>
      <button class="btn btn-soft btn-sm" onclick="UI.readStep()">🔊 단계 읽어줘</button>
    </div>
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
    ${r.steps?.length ? `<div class="section-title"><h2>만드는 법</h2><small class="timer-quick" onclick="UI.recipeTimer(${r.time || 10})">⏲️ ${r.time || 10}분</small></div>
    <div class="card flat" style="padding:6px 15px"><ul class="steps">${r.steps.map((st) => {
      const pm = passiveMin(st);
      return `<li>${esc(st)}${pm ? `<button class="step-wait" onclick="UI.waitGame(${pm})">⏳ ${pm}분 — 타이머·게임</button>` : ''}</li>`;
    }).join('')}</ul></div>` : ''}
    ${r.tips?.length ? `<div class="banner" style="display:block">💡 <b>키포인트</b><br>${r.tips.map((t2) => '· ' + esc(t2)).join('<br>')}</div>` : ''}
    ${r.mine ? `<div class="btn-row" style="margin-bottom:0">
      <button class="btn btn-soft" onclick="UI.openRecipeForm('${r.id}')">✎ 수정</button>
      <button class="btn btn-soft" onclick="UI.shareRecipe('${r.id}')">📤 공유</button>
      <button class="btn btn-soft" onclick="UI.deleteMyRecipe('${r.id}')">🗑️</button>
    </div>` : ''}
    <div class="btn-row">
      ${a.missing.length ? `<button class="btn" onclick="UI.addMissing('${r.id}')">🧺 부족 재료 ${a.missing.length}개 담기</button>` : ''}
      ${a.total === 0 && r.mine
        ? `<button class="btn btn-primary" onclick="UI.openRecipeForm('${r.id}')">✎ 재료 채우기</button>`
        : `<button class="btn btn-primary" onclick="UI.openDeduct('${r.id}')">🍳 요리 완료</button>`}
    </div>`);
};

// 영상 보며 ↔ 레시피만 — 전환 시 영상은 정지(언로드)되고, 레시피 읽기에 집중
UI.dtView = (m) => {
  const wrap = $('#dt-yt');
  const link = $('#dt-ytlink');
  const seg = $('#dt-vseg');
  if (!wrap) return;
  const video = m === 'video';
  const iframe = wrap.querySelector('iframe');
  iframe.src = video ? wrap.dataset.src : '';
  wrap.style.display = video ? '' : 'none';
  if (link) link.style.display = video ? '' : 'none';
  if (seg) [...seg.children].forEach((b, i) => b.classList.toggle('on', video ? i === 0 : i === 1));
  if (video) { setTimeout(ytHandshake, 900); setTimeout(ytHandshake, 2200); }
};

/* ── 🎤 음성 컨트롤 — 주방에서 손 안 대고 ── */
UI.micToggle = () => {
  if (isListening()) { UI.micOff(); toast('🎤 음성 컨트롤 종료'); return; }
  if (!canListen) {
    toast('이 브라우저는 음성인식을 지원하지 않아요 (아이폰 사파리 등) — 🔊 읽어주기 버튼은 사용할 수 있어요');
    return;
  }
  const ok = startListen(
    (t) => UI.handleVoice(t),
    (on, why) => {
      $('#mic-btn')?.classList.toggle('mic-on', !!on);
      if (why === 'denied') toast('마이크 권한이 거부됐어요 — 브라우저 설정에서 허용해 주세요');
    });
  if (ok) {
    $('#mic-btn')?.classList.add('mic-on');
    speak('음성 컨트롤을 켰어요. 다음. 정지. 십 초 뒤로. 재료 읽어줘. 타이머 오 분. 이렇게 말하면 돼요.');
  }
};
UI.micOff = () => { stopListen(); stopSpeak(); $('#mic-btn')?.classList.remove('mic-on'); };

function vcSteps() {
  if (!vc) return [];
  if (vc.type === 'plan') return vc.plan.timeline.map((s2) => `${s2.parallel ? '그동안, ' : ''}${s2.recipe}. ${s2.text}`);
  return vc.recipe?.steps || [];
}
function vcRead() {
  const steps = vcSteps();
  if (!steps.length) { speak('단계 정보가 없어요'); return; }
  speak(`${vc.idx + 1}단계. ${steps[vc.idx]}`);
}
function vcMove(d) {
  const steps = vcSteps();
  if (!vc || !steps.length) return;
  const last = vc.idx >= steps.length - 1 && d > 0;
  vc.idx = Math.min(steps.length - 1, Math.max(0, vc.idx + d));
  if (last) { speak('마지막 단계예요. 맛있게 드세요!'); }
  else vcRead();
  highlightPlanStep();
}
function highlightPlanStep() {
  if (vc?.type !== 'plan') return;
  $$('#plan-steps .plan-step').forEach((el, i) => el.classList.toggle('current', i === vc.idx));
  $(`#ps-${vc.idx}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
}
UI.planNav = (d) => vcMove(d);
UI.readStep = () => vcRead();
UI.readIngs = () => {
  if (vc?.type === 'plan') {
    speak('통합 재료. ' + vc.plan.ingredients.map((g) => `${g.n} ${g.a ? fmtAmt(g.a) : ''}${g.u || ''}`).join(', '));
    return;
  }
  const r = vc?.recipe;
  if (!r) { toast('레시피를 먼저 열어주세요'); return; }
  const main2 = r.ingredients.filter((g) => !g.st).map((g) => `${g.n} ${g.a ? fmtAmt(g.a * detailServings) : ''}${g.u || ''}`);
  const season = r.ingredients.filter((g) => g.st).map((g) => g.n);
  speak(`${detailServings}인분 재료 ${main2.length}가지. ` + main2.join(', ') + (season.length ? `. 양념은 ${season.join(', ')}.` : ''));
};

/* ── 첫 사용자 가이드 — 실제 화면 위에 스포트라이트로 짚어준다 (다시 보기 가능) ── */
const TUT_STEPS = [
  { sel: '.action-strip', emoji: '🧊', title: '① 재료를 담아요', body: '영수증을 찍거나(📷), 검색해서 2탭으로 추가(➕). 처음엔 "기본 재료 한번에 담기"로 3초면 시작!' },
  { sel: '#tabbar button[data-tab="recipes"]', emoji: '🍳', title: '② 오늘 뭐 먹지?', body: '내 냉장고에 있는 재료로 "지금 만들 수 있는 요리"부터 추천해줘요. 유튜브 레시피도 담을 수 있어요.' },
  { sel: '#tabbar button[data-tab="pantry"]', emoji: '🧊', title: '③ 한눈에 보는 냉장고', body: '담은 재료가 진짜 냉장고처럼 칸칸이 정리돼요. 유통기한이 다가오면 재료가 직접 알려줘요.' },
  { sel: '#points-badge', emoji: '🅿', title: '④ 절약이 곧 포인트', body: '요리 완료·임박 재료 구출·출석·게임으로 포인트가 쌓여요. 탭하면 포인트샵과 게임으로!' },
  { sel: '#saved-badge', emoji: '💰', title: '⑤ 아낀 돈이 보여요', body: '버리기 전에 쓴 재료가 "아낀 돈"으로 모여요. 버리는 식비, 이번엔 줄여봐요!' },
];
let tutIdx = 0;
UI.startTutorial = () => {
  tab = 'home'; render();
  tutIdx = 0;
  if (!$('#tut')) {
    const el = document.createElement('div');
    el.id = 'tut';
    el.innerHTML = '<div id="tut-hole"></div><div id="tut-card"></div>';
    document.body.appendChild(el);
  }
  tutShow();
};
function tutShow() {
  const step = TUT_STEPS[tutIdx];
  const tut = $('#tut'); if (!tut) return;
  const target = $(step.sel);
  const hole = $('#tut-hole');
  const card = $('#tut-card');
  if (target) {
    const r = target.getBoundingClientRect();
    const pad = 8;
    hole.style.cssText = `display:block;left:${r.left - pad}px;top:${r.top - pad}px;width:${r.width + pad * 2}px;height:${r.height + pad * 2}px`;
    const below = r.top < window.innerHeight / 2;
    card.style.top = below ? `${r.bottom + 16}px` : '';
    card.style.bottom = below ? '' : `${window.innerHeight - r.top + 16}px`;
  } else {
    hole.style.display = 'none';
    card.style.top = '50%'; card.style.bottom = '';
  }
  const last = tutIdx === TUT_STEPS.length - 1;
  card.innerHTML = `
    <div class="tut-emoji">${step.emoji}</div>
    <b>${step.title}</b>
    <p>${step.body}</p>
    <div class="tut-dots">${TUT_STEPS.map((_, i) => `<i class="${i === tutIdx ? 'on' : ''}"></i>`).join('')}</div>
    <div class="btn-row" style="margin-top:4px">
      <button class="btn btn-sm" onclick="UI.endTutorial()">건너뛰기</button>
      <button class="btn btn-primary btn-sm" onclick="UI.tutNext()">${last ? '시작하기 🎉' : '다음 →'}</button>
    </div>`;
}
UI.tutNext = () => { tutIdx += 1; if (tutIdx >= TUT_STEPS.length) { UI.endTutorial(); return; } tutShow(); };
UI.endTutorial = () => {
  $('#tut')?.remove();
  if (!S.tutorialDone) { S.tutorialDone = true; save({ silent: true }); }
};

/* ── 첫 실행: 사용 목적 → 시작 화면 고정 ──
   "주로 뭐 하러 오셨어요?"를 한 번 물어, 고른 기능을 앱 첫 화면으로 박아둔다.
   언제든 설정 > "시작 화면"에서 세부 상태(내 레시피·냉장고 안·장보기 등)까지 바꿀 수 있다. */
UI.openPurpose = () => {
  // 여는 순간 '물어봄' 처리 — 닫더라도(홈 기본) 다시 조르지 않음
  if (!S.purposeAsked) { S.purposeAsked = true; save({ silent: true }); }
  const opt = (k) => { const s = START_SCREENS[k]; return `
    <button class="purpose-card" onclick="UI.pickPurpose('${k}')">
      <span class="pc-emoji">${s.icon}</span><b>${s.label}</b><small>${s.desc}</small></button>`; };
  openSheet(`
    <h2>🧊 냉비서, 어떻게 쓰실 거예요?</h2>
    <p class="sub">고른 기능이 <b>앱 첫 화면</b>으로 고정돼요. 나중에 <b>설정 &gt; 시작 화면</b>에서 바꿀 수 있어요.</p>
    <div class="purpose-grid">
      ${opt('recipes')}${opt('pantry')}${opt('shopping')}${opt('games')}
    </div>
    <button class="btn btn-soft btn-block" style="margin-top:11px" onclick="UI.pickPurpose('home')">🏠 그냥 둘러볼게요 (홈 화면)</button>
  `);
};
UI.pickPurpose = (key) => {
  S.settings.startScreen = key;
  S.purposeAsked = true;
  save({ silent: true });
  UI.closeSheet();
  const sc = applyStartTab(key);
  render(); trackScreen(tab);
  track('pick_purpose', { start: key });
  if (sc.games) {
    // 게임을 고른 사람에게 냉장고 튜토리얼은 안 어울림 — 가이드는 건너뛰고(설정에서 다시 보기 가능) 바로 게임
    if (!S.tutorialDone) { S.tutorialDone = true; save({ silent: true }); }
    setTimeout(() => { if (!document.querySelector('#modal-root .sheet')) UI.openGames(); }, 250);
  } else if (!S.tutorialDone) {
    setTimeout(() => UI.startTutorial(), 350); // 가이드는 이어서 한 번
  }
};
// 설정 > 시작 화면에서 즉시 변경 (세부 상태 포함 전체 목록)
UI.setStartScreen = (key) => {
  S.settings.startScreen = START_SCREENS[key] ? key : 'home';
  save();
  toast(`시작 화면을 "${START_SCREENS[S.settings.startScreen].icon} ${START_SCREENS[S.settings.startScreen].label}"(으)로 설정했어요`);
  renderSettings();
};

/* ── 주방 타이머 — 떠있는 위젯(드래그로 빈 공간 어디든 이동). ── */
let ktTimer = null;
let ktTick = null;
let ktEnd = 0;
let timerPos = null; // 사용자가 옮긴 위치 기억
function makeTimerDraggable(chip) {
  let drag = null;
  chip.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.tc-x, .tc-game, .tc-mini')) return; // 버튼은 드래그 아님
    const r = chip.getBoundingClientRect();
    drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    chip.setPointerCapture?.(e.pointerId); chip.classList.add('dragging');
  });
  chip.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const w = chip.offsetWidth, h = chip.offsetHeight;
    const x = Math.max(6, Math.min(window.innerWidth - w - 6, e.clientX - drag.dx));
    const y = Math.max(6, Math.min(window.innerHeight - h - 6, e.clientY - drag.dy));
    chip.style.left = x + 'px'; chip.style.top = y + 'px'; chip.style.right = 'auto'; chip.style.bottom = 'auto';
    timerPos = { x, y };
  });
  const end = () => { drag = null; chip.classList.remove('dragging'); };
  chip.addEventListener('pointerup', end); chip.addEventListener('pointercancel', end);
}
function killTimerChip() { clearTimeout(ktTimer); clearInterval(ktTick); ktEnd = 0; $('#timer-chip')?.remove(); }
function startKitchenTimer(min) {
  clearTimeout(ktTimer); clearInterval(ktTick);
  speak(`${min}분 타이머 시작!`);
  toast(`⏲ ${min}분 타이머 시작`);
  ktEnd = Date.now() + min * 60000;
  let chip = $('#timer-chip');
  if (!chip) {
    chip = document.createElement('div');
    chip.id = 'timer-chip';
    (document.fullscreenElement || document.body).appendChild(chip); // 전체화면 중엔 그 안에 붙여 보이게
    if (timerPos) { chip.style.left = timerPos.x + 'px'; chip.style.top = timerPos.y + 'px'; chip.style.right = 'auto'; chip.style.bottom = 'auto'; }
    makeTimerDraggable(chip);
  }
  chip.innerHTML = `
    <div class="tc-top"><span class="tc-grip">⋮⋮</span><span class="tc-time" id="tc-time">0:00</span>
      <span class="tc-x" onclick="UI.timerStop()">✕</span></div>
    <div class="tc-game" onclick="UI.openGames()">🎮 한 판?</div>
    <div class="tc-row"><span class="tc-mini" onclick="UI.timerPlus(-1)">－</span><span class="tc-mini" onclick="UI.timerPlus(1)">＋1분</span></div>`;
  const tick = () => {
    const left = Math.max(0, ktEnd - Date.now());
    const el = $('#tc-time'); if (!el) { clearInterval(ktTick); return; }
    el.textContent = `${Math.floor(left / 60000)}:${String(Math.floor((left % 60000) / 1000)).padStart(2, '0')}`;
  };
  tick();
  ktTick = setInterval(tick, 1000);
  ktTimer = setTimeout(timerDone, min * 60000);
}
function timerDone() {
  killTimerChip();
  speak('타이머가 끝났어요! 불 확인하세요!');
  toast('⏲ 타이머 종료!');
  navigator.vibrate?.([220, 110, 220]);
}
UI.timerStop = () => { killTimerChip(); toast('타이머를 껐어요'); };
UI.timerPlus = (d = 1) => {
  if (!ktEnd) return;
  ktEnd = Math.max(Date.now() + 1000, ktEnd + d * 60000); clearTimeout(ktTimer);
  ktTimer = setTimeout(timerDone, Math.max(0, ktEnd - Date.now()));
  toast(d > 0 ? '⏲ +1분' : '⏲ −1분');
};
// 원클릭: 레시피 시간으로 즉시 시작, 떠있는 칩이 이미 있으면 시간 변경 시트
UI.recipeTimer = (min) => {
  if ($('#timer-chip')) { UI.quickTimer(); return; }
  startKitchenTimer(min);
};
UI.quickTimer = () => {
  openSheet(`
    <h2>⏲ 타이머</h2>
    <p class="sub">탭 한 번이면 시작 — 손 놓고 끓이는 시간 알려드릴게요</p>
    <div class="g-grid" style="grid-template-columns:repeat(3,1fr)">
      ${[1, 3, 5, 10, 15, 20].map((m) => `<button class="btn btn-soft" onclick="UI.closeSheet();startTimer(${m})">${m}분</button>`).join('')}
    </div>`);
};
window.startTimer = (m) => startKitchenTimer(m);

/* 긴 조리(끓이기·졸이기 등)에서 '손 놓는 시간' 감지 → 타이머 + 게임/광고 유도 */
function passiveMin(step) {
  if (!/끓|졸|삶|우려|익히|재워|절여|불려|쪄|구워|튀겨/.test(step)) return 0;
  const m = step.match(/(\d+)\s*분/);
  const n = m ? parseInt(m[1], 10) : 0;
  return n >= 3 ? n : 0;
}
UI.waitGame = (min) => {
  startKitchenTimer(min);
  openSheet(`
    <h2>⏳ ${min}분, 손 놓는 시간이에요</h2>
    <p class="sub">타이머를 켰어요. 기다리는 동안 게임 한 판 어때요? — 점수는 포인트로!</p>
    <div class="btn-row" style="flex-direction:column">
      <button class="btn btn-primary btn-block" onclick="UI.closeSheet();UI.openGames()">🎮 게임하고 포인트 받기</button>
      <button class="btn btn-accent btn-block" onclick="UI.waitAd()">🕒 짬시간 포인트 받기</button>
      <button class="btn btn-block" onclick="UI.closeSheet()">그냥 기다릴게요</button>
    </div>`);
};
UI.waitAd = () => {
  playAd({
    reward: '포인트 적립',
    note: '광고를 끝까지 보면 포인트를 드려요',
    onComplete: (btn) => {
      const r = earn('ad');
      btn.className = 'btn btn-block btn-primary';
      btn.textContent = r.ok ? `✅ +${r.p}P 적립!` : '오늘 광고 보너스는 다 받았어요';
      btn.disabled = false; btn.onclick = () => UI.closeSheet();
      renderTop();
    },
  });
};

UI.handleVoice = (t) => {
  const c = parseCommand(t);
  if (!c) return;
  const videoOn = vc?.video && $('#dt-yt iframe')?.src;
  // 영상이 소리를 내는 동안엔 영상 속 대사("다음은…")가 명령으로 오인되기 쉽다
  // → 짧은 직접 명령만 받는다 (정지/다음 등 7자, 초·분이 붙는 명령은 14자까지)
  if (videoOn && ytState === 1) {
    const bare = t.replace(/\s/g, '');
    if (bare.length > (c.cmd === 'seek' || c.cmd === 'timer' ? 14 : 7)) return;
  }
  switch (c.cmd) {
    case 'play':
      if (!vc?.video) { if (vcSteps().length) vcRead(); break; } // 영상 없으면 현재 단계 읽기
      if (!videoOn) UI.dtView('video');
      setTimeout(() => { ytHandshake(); ytCmd('playVideo'); }, videoOn ? 0 : 1100);
      toast('🎤 재생'); break;
    case 'pause':
      stopSpeak();
      if (videoOn) { ytCmd('pauseVideo'); ytState = 2; }
      toast('🎤 정지'); break;
    case 'seek':
      if (videoOn) { ytCmd('seekTo', [Math.max(0, ytTime + c.n), true]); toast(`🎤 ${c.n > 0 ? '+' : ''}${c.n}초`); }
      break;
    case 'next': vcMove(1); break;
    case 'prev': vcMove(-1); break;
    case 'restart': if (vc) { vc.idx = 0; vcRead(); highlightPlanStep(); } break;
    case 'repeat': vcRead(); break;
    case 'ingredients': UI.readIngs(); break;
    case 'timer': startKitchenTimer(c.n); break;
    case 'micoff': UI.micOff(); toast('🎤 음성 컨트롤 종료'); break;
  }
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
        ? 'AI가 영상 페이지의 설명란과 웹을 읽어 정리해요 (약 20~40초 · 사진 스캔보다 사용량을 조금 더 씁니다)'
        : '자동 정리는 곧 제공돼요 — 지금은 아래 칸을 직접 채워 저장할 수 있어요'}</p></div>
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
  const retryAuto = () => { renderRecipeForm(true); const inp = $('#rf-yt'); if (inp) inp.value = url; UI.rfAuto(); };
  if (aiLeft().total <= 0) { UI.openRecharge(retryAuto); return; } // 무료·충전권 소진
  const btn = $('#rf-auto');
  btn.disabled = true; btn.textContent = '🤖 영상 내용 정리 중… (20~40초)';
  try {
    const data = await extractRecipeFromYouTube(url, S.settings);
    aiConsume(); // 성공 시에만 차감
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
    draft.tips = (data.tips || []).slice(0, 4);
    renderRecipeForm(true);
    toast('정리 완료 ✨ 내용 확인하고 저장하세요');
  } catch (e) {
    if (e.status === 429 && S.settings.aiMode === 'server') { UI.openRecharge(retryAuto); return; }
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
/* ── 유튜브에서 레시피 찾아오기 (인앱 검색 + 원탭 퍼오기) ── */
const YT_POPULAR = ['김치찌개', '제육볶음', '된장찌개', '계란찜', '닭가슴살 요리', '비빔국수', '김밥', '간단 파스타', '에어프라이어', '자취 요리'];
UI.openYtSearch = (prefill) => {
  const q0 = prefill || recipeQuery || '';
  openSheet(`
    <div class="g-hubhead"><h2 style="margin:0">🎬 유튜브 레시피</h2>
      <button class="btn btn-sm" onclick="UI.closeSheet()">✕</button></div>
    <p class="sub" style="margin:2px 0 8px">고르면 영상이 내 레시피로 들어와요${aiReady().ok ? ' — AI가 재료·순서·키포인트까지 자동 정리' : ''}</p>
    <div class="tipbox" style="margin:2px 0 10px">📥 <b>영상 가져오는 법</b> — 유튜브로 가기 전에 확인하세요
      <br>① 아래 <b>검색 결과를 탭</b> → 앱에서 미리 보고 바로 저장 (가장 쉬움)
      <br>② 유튜브에서 찾았다면 영상 <b>공유 → 링크 복사</b> 후 아래 칸에 <b>붙여넣기</b> → 자동으로 들어와요
      <br>③ <b>“영상만 저장”</b>은 재료 없이도 📒 내 레시피·❤️ 찜에 보관돼요 (나중에 재료 채우면 매칭)</div>
    <div class="yt-search">
      <span class="yt-ico">🔍</span>
      <input id="yts-q" placeholder="요리 이름·재료로 검색" value="${esc(q0)}" onkeydown="if(event.key==='Enter')UI.ytSearch()" />
      <button class="btn btn-tint btn-sm" onclick="UI.ytSearch()">검색</button>
    </div>
    <div class="yt-chips">${YT_POPULAR.map((p) => `<button class="yt-chip" onclick="UI.ytChip('${p}')">${p}</button>`).join('')}</div>
    <div id="yts-out">${S.settings.ytKey ? `
      <p class="hint" style="text-align:center;padding:14px 0">위에서 검색하거나 인기 키워드를 눌러보세요 👆</p>` : `
      <p class="hint">키워드를 누르거나 검색하면 유튜브가 열려요. 마음에 든 영상 링크를 붙여넣으면 바로 담깁니다:</p>
      <a id="yts-ext" class="btn btn-block" style="margin:8px 0" target="_blank" rel="noreferrer"
         href="https://www.youtube.com/results?search_query=${encodeURIComponent((q0 || '레시피') + ' 레시피')}">↗ 유튜브에서 검색하기</a>
      <div class="field"><label>찾은 영상 링크 붙여넣기</label>
        <div class="search-row" style="margin:0">
          <input id="yts-link" placeholder="https://youtu.be/…" />
          <button class="btn btn-primary" onclick="UI.ytPickLink()">가져오기</button>
        </div></div>`}
    </div>`);
  if (q0) setTimeout(() => UI.ytSearch(), 80);
  // 자동 포커스 제거 — 시트 뜨자마자 키패드가 올라오는 출렁임 방지(탭하면 입력)
};
UI.ytChip = (q) => { const i = $('#yts-q'); if (i) i.value = q; UI.ytSearch(); };
UI.ytSearch = async () => {
  const q = $('#yts-q').value.trim();
  if (!q) return;
  // 인앱 검색은 YouTube Data API 키가 있어야 가능(게이트웨이 워커로는 불가) → 없으면 외부 검색+링크 붙여넣기로 안내
  if (!S.settings.ytKey) {
    const a = $('#yts-ext');
    if (a) a.href = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q + ' 레시피');
    toast('아래 "유튜브에서 검색하기"를 눌러주세요');
    return;
  }
  const out = $('#yts-out');
  out.innerHTML = '<p class="hint">검색 중…</p>';
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=8&regionCode=KR&relevanceLanguage=ko&videoEmbeddable=true&q=${encodeURIComponent(q + ' 레시피')}&key=${encodeURIComponent(S.settings.ytKey)}`);
    const j = await res.json();
    if (!res.ok) throw new Error(j.error?.message || '검색에 실패했어요');
    const items = (j.items || []).filter((x) => x.id?.videoId)
      .map((x) => ({ id: x.id.videoId, title: x.snippet?.title || '', channel: x.snippet?.channelTitle || '' }));
    out.innerHTML = items.length
      ? items.map((x) => `
        <div class="item" onclick="UI.ytPick('${x.id}','${esc(String(x.title).replace(/'/g, '’'))}')">
          <img src="https://i.ytimg.com/vi/${x.id}/mqdefault.jpg" style="width:86px;border-radius:10px;flex-shrink:0" alt="" />
          <div class="grow"><div class="name" style="font-size:.83rem;line-height:1.35">${x.title}</div>
            <div class="sub">${esc(x.channel)}</div></div>
        </div>`).join('')
      : '<p class="hint">결과가 없어요 — 다른 키워드로 검색해 보세요</p>';
  } catch (e) {
    out.innerHTML = `<p class="hint" style="color:var(--red)">${esc(e.message)}</p>`;
  }
};
const cleanYtTitle = (s) => String(s || '')
  .replace(/&quot;|&amp;|&#39;|\[.*?\]|\(.*?\)/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40);

// 검색 결과 탭 → 앱 안에서 영상을 바로 보고, 보면서 결정한다
UI.ytPick = (id, title) => {
  const t = cleanYtTitle(title);
  openSheet(`
    <div class="ytwrap"><iframe src="https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1" allow="accelerometer; encrypted-media; picture-in-picture" allowfullscreen title="미리보기"></iframe></div>
    <h2 style="font-size:1.05rem">${esc(t || '유튜브 레시피')}</h2>
    <p class="sub">앱 안에서 바로 보고, 마음에 들면 저장하세요</p>
    <div class="btn-row" style="margin-top:4px">
      <button class="btn btn-primary" onclick="UI.ytToRecipe('${id}','${esc(t.replace(/'/g, '’'))}')">🤖 영상+레시피로 저장</button>
      <button class="btn btn-tint" onclick="UI.ytSaveOnly('${id}','${esc(t.replace(/'/g, '’'))}')">⭐ 영상만 저장</button>
    </div>
    <p class="hint" style="text-align:center;margin-top:6px">위 버튼을 눌러야 <b>내 레시피로 저장</b>돼요 · 아래 ↗는 저장이 아니라 유튜브에서 크게 보기예요</p>
    <a class="btn btn-soft btn-block" style="margin-top:9px" href="https://youtu.be/${id}" target="_blank" rel="noreferrer">↗ 유튜브 앱에서 크게 보기 (저장 아님)</a>`);
};
UI.ytToRecipe = (id, title) => {
  UI.openRecipeForm();
  draft.yt = id;
  draft.title = title || '';
  renderRecipeForm(false);
  if (aiReady().ok) setTimeout(() => UI.rfAuto(), 80);
  else toast('영상 연결 완료 — 재료를 직접 적거나, AI 설정 후 자동 정리를 누르세요');
};
// 즐겨찾기처럼 영상만 담아두기 — 나중에 재료를 채우면 재고 매칭도 된다
UI.ytSaveOnly = (id, title) => {
  const rid = 'my-' + uid();
  S.myRecipes.push({
    id: rid, mine: true, videoOnly: true, title: title || '유튜브 레시피',
    emoji: '🎬', yt: id, ingredients: [], steps: [], tags: [],
  });
  if (!S.favs.includes(rid)) S.favs.push(rid);
  recipeQuery = ''; // 검색어가 남아 새로 담은 영상이 필터로 가려지지 않게
  save(); UI.closeSheet(); rTab = 'mine'; tab = 'recipes'; render();
  toast('⭐ 영상 저장 완료 — 📒 내 레시피·❤️ 찜에 담겼어요');
};
UI.ytPickLink = () => {
  const id = ytId($('#yts-link').value);
  if (!id) { toast('유튜브 링크를 인식하지 못했어요'); return; }
  UI.ytPick(id, '');
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
  } else if (parsed.t === 'invite') {
    handleInvite(parsed.d);
  } else if (parsed.t === 'joined') {
    handleJoined(parsed.d);
  }
}

/* ── 요리 완료 → 차감 ─────────────────────── */
UI.openDeduct = (rid) => {
  const r = allRecipes(S).find((x) => x.id === rid);
  deductCtx = { recipe: r, servings: detailServings || 1, skips: new Set(), emptyAll: new Set() };
  renderDeduct();
};

function renderDeduct() {
  const { recipe, servings, skips, emptyAll } = deductCtx;
  const plan = deductionPlan(recipe, S, servings);
  openSheet(`
    <h2>🧾 재고 차감</h2>
    <p class="sub">${esc(recipe.title)} — 몇 인분 하셨어요? 양이 안 맞으면 <b>다 씀</b>으로 남김없이 비울 수 있어요.</p>
    <div class="seg" style="margin-top:0">
      ${[1, 2, 3, 4].map((n) =>
        `<button class="${servings === n ? 'on' : ''}" onclick="UI.setServ(${n})">${n}인분</button>`).join('')}
    </div>
    <div class="receipt">
      ${plan.length === 0 ? '<div class="r-line"><span>차감할 재고 없음 (등록 안 된 재료)</span></div>' : ''}
      ${(() => { const emptyNames = new Set(); plan.forEach((p, i) => { if (!p.skip && emptyAll.has(i)) emptyNames.add(p.item.name); }); return plan.map((p, idx) => {
        if (p.skip) return `<div class="r-line" style="color:var(--label-3)"><span>${p.item.emoji} ${esc(p.item.name)}</span><small>${p.label}</small></div>`;
        const ingg = findIng(p.item.name); const used = emptyAll.has(idx) || emptyNames.has(p.item.name); const after = used ? 0 : p.after;
        return `<div class="r-line" style="${skips.has(idx) ? 'opacity:.4;text-decoration:line-through' : ''}">
             <span>${p.item.emoji} ${esc(p.item.name)}${p.fifo ? ' <small style="color:var(--blue);font-weight:800">선입선출 D-' + Math.max(0, daysLeft(p.item.expiresAt)) + '</small>' : ''}</span>
             <span>${fmtBase(ingg, p.item.qty)} → <b>${fmtBase(ingg, after)}</b>
               <button class="r-mini ${used ? 'on' : ''}" onclick="UI.toggleEmpty(${idx})">다 씀</button>
               <button class="r-mini" onclick="UI.toggleSkip(${idx})">${skips.has(idx) ? '되돌리기' : '건너뛰기'}</button>
             </span></div>`;
      }).join(''); })()}
      <div class="r-line r-total"><span>합계</span><span>${plan.filter((p, i) => !p.skip && !skips.has(i)).length}개 품목 차감</span></div>
    </div>
    <div class="btn-row">
      <button class="btn" onclick="UI.closeSheet()">취소</button>
      <button class="btn btn-primary" onclick="UI.applyDeduct()">✓ 확인 (차감)</button>
    </div>`);
}
UI.setServ = (n) => { deductCtx.servings = n; renderDeduct(); };
UI.toggleSkip = (idx) => { deductCtx.skips.has(idx) ? deductCtx.skips.delete(idx) : deductCtx.skips.add(idx); renderDeduct(); };
UI.toggleEmpty = (idx) => { deductCtx.emptyAll.has(idx) ? deductCtx.emptyAll.delete(idx) : deductCtx.emptyAll.add(idx); renderDeduct(); };

UI.applyDeduct = () => {
  const { recipe, servings, skips, emptyAll } = deductCtx;
  const plan = deductionPlan(recipe, S, servings);
  const emptyNames = new Set(); // "다 씀"은 같은 재료의 모든 배치를 비움(멀티배치 의도 반영)
  plan.forEach((p, i) => { if (!p.skip && emptyAll.has(i)) emptyNames.add(p.item.name); });
  let savedFromExpiring = 0;
  plan.forEach((p, idx) => {
    if (p.skip || skips.has(idx)) return;
    const before = Number(p.item.qty) || 0;
    p.item.qty = (emptyAll.has(idx) || emptyNames.has(p.item.name)) ? 0 : p.after;
    const used = Math.max(0, before - p.item.qty);
    if (daysLeft(p.item.expiresAt) <= 3) savedFromExpiring += moneyFor(p.item, used); // 임박 재료를 실제 사용량·단가로 구출
    if (p.item.qty <= 0) {
      S.pantry = S.pantry.filter((x) => x.id !== p.item.id);
      UI.addShopping(p.item.name, true, '', 'out');
    }
  });
  S.ledger.cooked += 1;
  S.ledger.saved += savedFromExpiring;
  save();
  track('cook_complete', { servings, saved: savedFromExpiring, total_cooked: S.ledger.cooked }); // 핵심 가치 이벤트
  if (savedFromExpiring > 0) proverbFloat('save'); // 절약 위트 한마디
  // 포인트: 요리 완료 +10P, 임박 재료를 구출했으면 +20P 추가 (각각 일일 상한)
  const pCook = earn('cook');
  const pRescue = savedFromExpiring > 0 ? earn('rescue') : { ok: false };
  const pMsg = [pCook.ok ? `+${pCook.p}P 요리` : '', pRescue.ok ? `+${pRescue.p}P 임박 구출` : ''].filter(Boolean).join(' · ');
  const recipeTitle = recipe.title;
  openSheet(`
    <h2>🍽️ 맛있게 드세요!</h2>
    <p class="sub">${esc(recipeTitle)} 완료 · 재고가 알아서 줄었어요${savedFromExpiring ? ` · 임박 재료 소진으로 ${won(savedFromExpiring)} 아꼈어요 🪙` : ''}${pMsg ? ` · 🅿 ${pMsg}` : ''}</p>
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
  if (result === 'eaten') {
    S.ledger.leftoverEaten += 1; S.ledger.saved += 4000;
    const p = earn('leftover');
    toast(`한 끼 해결! 약 ₩4,000 아꼈어요 🪙${p.ok ? ` · 🅿+${p.p}P` : ''}`); proverbFloat('save');
  } else { S.ledger.leftoverWasted += 1; S.ledger.wasted += 3000; toast('버린 기록을 장부에 남겼어요'); proverbFloat('waste'); }
  save(); render();
};

/* ── 장보기 ─────────────────────────────── */
// 담긴 이유를 명확한 출처(src)로 분류 — recipe(레시피 필요)·low(거의 떨어짐)·out(다 떨어짐)·manual(내가 추가)
const SHOP_SRC = {
  recipe: { label: '레시피에 필요', cls: 's-recipe' },
  low: { label: '거의 떨어짐', cls: 's-low' },
  out: { label: '다 떨어짐', cls: 's-out' },
  manual: { label: '내가 추가', cls: 's-manual' },
};
function srcFromReason(r) { // 구버전 데이터 보정
  if (!r) return 'manual';
  if (r.includes('레시피')) return 'recipe';
  if (r.includes('다 떨어')) return 'out';
  if (r.includes('떨어져')) return 'low';
  return 'manual';
}
const shopSrcOf = (x) => x.src || srcFromReason(x.reason);
UI.addShopping = (name, silent = false, reason = '', src = '') => {
  const s = src || srcFromReason(reason || '레시피 재료');
  const ex = S.shopping.find((x) => x.name === name && !x.done);
  if (ex) { // 이미 있으면 더 시급한 출처로 승격(out>low>recipe>manual)
    const rank = { out: 3, low: 2, recipe: 1, manual: 0 };
    if ((rank[s] || 0) > (rank[shopSrcOf(ex)] || 0)) { ex.src = s; ex.reason = reason || SHOP_SRC[s].label; }
  } else {
    S.shopping.push({ id: uid(), name, reason: reason || SHOP_SRC[s].label, src: s, done: false, addedAt: Date.now() });
  }
  save();
  if (!silent) { toast(`🧺 ${name} 장보기에 담았어요`); render(); }
};

// 쿠팡 파트너스 제휴 링크 — 설정의 개별 ID가 우선, 없으면 배포 기본값(config.COUPANG_TAG).
const coupangUrl = (name) => {
  const u = `https://www.coupang.com/np/search?q=${encodeURIComponent(name)}`;
  const tag = (S.settings.coupangId || COUPANG_TAG || '').trim();
  return tag ? `${u}&lptag=${encodeURIComponent(tag)}` : u;
};
const coupangActive = () => !!((S.settings.coupangId || COUPANG_TAG || '').trim());

// 마트 코너별 묶음 — 앱 안에서 장보기 동선이 끝나도록 (채소 코너 → 정육 코너 → …)
const SHOP_CAT_ORDER = ['채소', '과일', '신선', '육류', '수산', '유제품', '가공', '주식', '양념', '기타'];
const SHOP_CAT_EMOJI = { 채소: '🥬', 과일: '🍎', 신선: '🥚', 육류: '🥩', 수산: '🐟', 유제품: '🥛', 가공: '🥫', 주식: '🍚', 양념: '🧂', 기타: '🧺' };

function shopGroupsHtml(open) {
  if (!open.length) return '';
  const groups = {};
  for (const x of open) {
    const c = findIng(x.name)?.cat || '기타';
    (groups[c] = groups[c] || []).push(x);
  }
  return SHOP_CAT_ORDER.filter((c) => groups[c]).map((c) => `
    <div class="section-title" style="margin:14px 4px 8px"><h2 style="font-size:.86rem">${SHOP_CAT_EMOJI[c]} ${c} 코너</h2><small>${groups[c].length}개</small></div>
    ${groups[c].map((x) => `
      <div class="item shop-item">
        <button class="shop-check" onclick="UI.shopToggle('${x.id}')" aria-label="샀어요로 표시"></button>
        <div class="grow" onclick="UI.shopToggle('${x.id}')"><div class="name">${esc(x.name)}</div>
          <div class="sub"><span class="shop-tag ${SHOP_SRC[shopSrcOf(x)].cls}">${SHOP_SRC[shopSrcOf(x)].label}</span></div></div>
        <a class="btn btn-sm btn-accent" href="${coupangUrl(x.name)}" target="_blank" rel="noreferrer" onclick="event.stopPropagation()">쿠팡 🛒</a>
        <button class="shop-del" onclick="UI.shopRemove('${x.id}')">✕</button>
      </div>`).join('')}`).join('');
}

function renderShopping() {
  const open = S.shopping.filter((x) => !x.done);
  const done = S.shopping.filter((x) => x.done);
  $('#view').innerHTML = `
    <div class="hero"><h1>오늘의 <em>장보기</em></h1>
      <p>태그로 출처가 한눈에 — <b>레시피에 필요·거의 떨어짐·다 떨어짐</b>은 자동, <b>내가 추가</b>는 직접</p></div>
    <div class="search-row">
      <input id="shop-new" placeholder="내가 필요한 것 직접 추가 (예: 올리브유, 키친타올…)" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" onkeydown="if(event.key==='Enter')UI.shopAdd()" />
      <button class="btn btn-tint" onclick="UI.shopAdd()">＋ 내가 추가</button>
    </div>
    <div class="shop-legend">
      <span class="shop-tag s-recipe">레시피에 필요</span><span class="shop-tag s-low">거의 떨어짐</span>
      <span class="shop-tag s-out">다 떨어짐</span><span class="shop-tag s-manual">내가 추가</span>
    </div>
    ${shopSuggestHtml()}
    ${open.length ? `<div class="btn-row" style="margin:0 0 10px">
      <button class="btn btn-soft" onclick="UI.copyShopList()">📋 목록 복사 (오프라인 메모)</button>
      <button class="btn btn-accent" onclick="UI.shopCoupangAll()">🛒 쿠팡에서 보기 (온라인)</button>
    </div>` : ''}
    ${open.length && coupangActive() ? `<p class="hint" style="margin:-4px 4px 10px;font-size:.72rem;color:var(--label-3)">이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.</p>` : ''}
    ${open.length === 0 && done.length === 0
      ? `<div class="empty"><span class="e-emoji">🧺</span><b>장보기 바구니가 비었어요</b><small>레시피의 부족 재료를 탭하거나<br>재료가 다 떨어지면 자동으로 담겨요</small></div>` : ''}
    ${shopGroupsHtml(open)}
    ${done.length ? `
      <div class="section-title"><h2>✓ 샀어요 (${done.length})</h2><small>입고하면 냉장고로 들어가요</small></div>
      ${done.map((x) => `
        <div class="item shop-item is-done">
          <button class="shop-check on" onclick="UI.shopToggle('${x.id}')" aria-label="다시 담기">✓</button>
          <div class="grow" onclick="UI.shopToggle('${x.id}')"><div class="name">${esc(x.name)}</div></div>
          <button class="shop-del" onclick="UI.shopRemove('${x.id}')">✕</button>
        </div>`).join('')}
      <button class="btn btn-primary btn-block" onclick="UI.shopCommit()">✅ 구매한 ${done.length}개 냉장고로 옮기기</button>` : ''}
    <div class="shop-promo">
      <span class="sp-star">⭐</span>
      <div class="grow"><b>냉비서 프리미엄</b><small>AI 무제한 · 광고 없음 · 월 3,900원 (준비 중)</small></div>
      <span class="sp-ad">AD</span>
    </div>
    ${adBanner('shopping')}`;
}
// 부족·임박 재료를 미리 메모로 제안 (장보기 전 한눈에)
function shopSuggestHtml() {
  const inList = new Set(S.shopping.filter((x) => !x.done).map((x) => x.name));
  const low = S.pantry.filter((p) => {
    if (inList.has(p.name)) return false;
    if (p.qtyType === 'level') return p.level === 'low' || p.level === 'empty';
    if (typeof p.qty === 'number') return p.qty <= 1;
    return false;
  });
  const soon = expiringItems(S, 2).filter((p) => !inList.has(p.name) && !low.includes(p));
  const sug = [...low, ...soon].slice(0, 10);
  if (!sug.length) return '';
  return `<div class="sug-box">
    <div class="sug-h">🧠 떨어져가요 · 미리 담아둘까요?</div>
    <div class="sug-chips">${sug.map((p) => `<button class="sug-chip" onclick="UI.shopSug('${esc(p.name)}',this)">＋ ${p.emoji || ''} ${esc(p.name)}</button>`).join('')}</div>
  </div>`;
}
UI.shopSug = (name, el) => { UI.addShopping(name, true, '', 'low'); if (el) { el.disabled = true; el.textContent = '✓ 담음'; } toast(`🧺 ${name} 담았어요`); };
UI.shopCoupangAll = () => {
  const items = S.shopping.filter((x) => !x.done);
  if (!items.length) return;
  // 쿠팡은 단일 검색어 — 첫 품목을 열고, 전체 목록은 클립보드에 복사해 이어서 검색
  copyText(items.map((x) => x.name).join(' '));
  window.open(coupangUrl(items[0].name), '_blank');
  toast('쿠팡을 열었어요 — 전체 목록은 복사돼 있어 검색창에 붙여 쓰면 돼요');
};
UI.shopAdd = () => {
  const v = $('#shop-new').value.trim();
  if (!v) return;
  UI.addShopping(v, true, '', 'manual');
  toast(`🧺 ${v} — 내가 추가한 장보기에 담았어요`);
  render();
};
UI.copyShopList = () => {
  const items = S.shopping.filter((x) => !x.done);
  copyText('🧺 장보기 목록\n' + items.map((x) => '· ' + x.name).join('\n'));
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

/* ── 만료 임박 푸시 알림 (설정 카드) ── */
function pushSettingHtml() {
  if (!pushSupported()) {
    return `<p class="hint" style="margin:0">이 기기/브라우저에선 푸시 알림이 아직 안 돼요.<br>아이폰은 <b>홈 화면에 추가(설치)</b> 후, 사파리 최신 버전에서 가능해요.</p>`;
  }
  if (pushPermission() === 'denied') {
    return `<p class="hint" style="margin:0">알림이 <b>차단</b>돼 있어요. 브라우저 사이트 설정에서 알림을 허용한 뒤 다시 시도해 주세요.</p>`;
  }
  if (pushOn()) {
    return `<div class="row"><div class="grow"><b>✅ 켜짐</b><p class="hint" style="margin:2px 0 0">재료가 상하기 전(오늘·내일)에 알려드려요. 매일 오전에 확인해요.</p></div></div>`;
  }
  return `<div class="row"><div class="grow"><b>임박 재료, 놓치지 마세요</b>
       <p class="hint" style="margin:2px 0 0">"우유 내일 상해요 — 오늘 뭐 해먹지?" 알림을 받아요. (로그인 시 기기 꺼져 있어도 도착)</p></div></div>
     <button class="btn btn-block btn-tint" style="margin-top:8px" onclick="UI.enablePush()">🔔 임박 알림 켜기</button>`;
}
UI.enablePush = async () => {
  if (!pushSupported()) { toast('이 기기/브라우저에서는 알림을 지원하지 않아요'); return; }
  toast('알림 권한을 확인할게요…');
  const r = await enablePush((S.settings.spaceCode || '').trim());
  if (r.ok) { track('push_enable'); toast('🔔 임박 알림을 켰어요 — 상하기 전에 알려드릴게요'); }
  else if (r.reason === 'denied') toast('알림이 차단돼 있어요 — 브라우저 사이트 설정에서 허용해 주세요');
  else if (r.reason === 'dismissed') toast('알림 권한을 허용하면 켤 수 있어요');
  else if (r.reason === 'unsupported') toast('이 기기에선 푸시가 안 돼요 (아이폰은 홈화면 설치 후 가능)');
  else if (r.reason === 'auth') toast('로그인이 필요해요 — 설정에서 구글로 시작하기를 눌러주세요');
  else toast('알림 켜기에 실패했어요 — 잠시 후 다시 시도해 주세요');
  if (tab === 'settings') renderSettings();
};

/* ── 의견·이탈사유 수집 (작은 인앱 설문) — 시드 테스트에서 "왜 안 남나"를 직접 듣는다 ── */
const FB_REASONS = ['복잡해요', '레시피가 안 맞아요', '스캔이 부정확', '쓸 일이 없어요', '느려요/버벅', '그냥 둘러봤어요'];
let fbDraft = { reason: '', churn: false };
UI.openFeedback = (churn = false) => {
  fbDraft = { reason: '', churn: !!churn };
  try { localStorage.setItem('nb_fb_asked', '1'); } catch { /* noop */ }
  openSheet(`
    <h2>💬 ${churn ? '냉비서, 뭐가 아쉬웠어요?' : '의견 보내기'}</h2>
    <p class="sub">${churn ? '한 번만 여쭤볼게요 — 솔직한 한마디가 큰 도움이 돼요. (익명)' : '개선에 큰 힘이 됩니다. 익명이에요.'}</p>
    <div class="tag-toggles" id="fb-reasons">
      ${FB_REASONS.map((r) => `<button onclick="UI.fbReason(this,'${r}')">${r}</button>`).join('')}
    </div>
    <div class="field" style="margin-top:10px"><textarea id="fb-text" rows="3" maxlength="500" placeholder="더 하고 싶은 말 (선택) — 어떤 점이 불편했는지, 뭐가 있으면 쓸지"></textarea></div>
    <div class="btn-row">
      <button class="btn" onclick="UI.closeSheet()">${churn ? '다음에' : '취소'}</button>
      <button class="btn btn-primary grow" onclick="UI.submitFeedback()">보내기</button>
    </div>`);
};
UI.fbReason = (el, r) => { fbDraft.reason = r; el.parentElement.querySelectorAll('button').forEach((b) => b.classList.remove('on')); el.classList.add('on'); };
UI.submitFeedback = () => {
  const text = (($('#fb-text') || {}).value || '').trim();
  if (!fbDraft.reason && !text) { toast('한 가지만 골라주거나 한 줄 적어주세요'); return; }
  track('feedback', { reason: fbDraft.reason || 'text', churn: fbDraft.churn });
  try { localStorage.setItem('nb_fb_done', '1'); } catch { /* noop */ }
  if (AI_FN) {
    fetch(`${AI_FN}/feedback`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reason: fbDraft.reason, text, churn: fbDraft.churn, opens: Number(localStorage.getItem('nb_opens')) || 0, cooked: S.ledger.cooked, pantry: S.pantry.length }),
    }).catch(() => { /* 전송 실패는 무시 */ });
  }
  UI.closeSheet();
  toast('💬 고마워요! 의견 잘 받았어요 — 꼭 반영할게요');
};

/* ── 설정 ─────────────────────────────── */
function renderSettings() {
  const st = S.settings;
  const modes = modeList(S);
  const acct = !syncAvailable()
    ? `<div class="card flat"><p class="hint" style="margin:0">☁️ 계정 백업·가족 공유는 <b>곧 제공</b>돼요. 지금은 데이터가 이 기기에 안전하게 저장됩니다 (아래 "데이터 → 내보내기"로 수동 백업 가능).</p></div>`
    : (sync.user && !sync.user.anon)
      ? `<div class="card flat">
           <div class="row">
             ${sync.user.photo ? `<img src="${sync.user.photo}" alt="" style="width:44px;height:44px;border-radius:99px" />`
               : '<span class="emoji t-기타" style="font-size:1.3rem;width:44px;height:44px;display:grid;place-items:center;border-radius:99px">👤</span>'}
             <div class="grow"><b>${esc(sync.user.name || '내 계정')}</b>
               <p class="hint" style="margin:2px 0 0">${esc(sync.user.email)} · ${sync.status === 'on' ? '☁️ 자동 백업 중' : '연결 중…'}</p></div>
             <button class="btn btn-sm btn-soft" onclick="UI.doLogout()">로그아웃</button>
           </div>
           <div class="divider" style="margin:12px 0"></div>
           ${st.spaceCode
             ? `<div class="row"><div class="grow"><b>👨‍👩‍👧 가족 공유 중</b>
                  <p class="hint" style="margin:2px 0 0">코드 <b>${esc(st.spaceCode)}</b> — 가족 기기에도 같은 코드를 입력하면 냉장고가 합쳐져요</p></div>
                <button class="btn btn-sm btn-soft" onclick="UI.famShare()">초대 복사</button>
                <button class="btn btn-sm btn-soft" onclick="UI.famLeave()">해제</button></div>`
             : `<div class="row"><div class="grow"><b>가족과 같이 쓰기</b>
                  <p class="hint" style="margin:2px 0 0">한 냉장고를 온 가족이 함께 — 코드 하나면 끝</p></div>
                <button class="btn btn-sm btn-tint" onclick="UI.famCreate()">코드 만들기</button>
                <button class="btn btn-sm btn-soft" onclick="UI.famJoin()">코드 입력</button></div>`}
         </div>`
      : `<button class="btn btn-block" style="background:#fff;border:1px solid var(--hairline);box-shadow:var(--shadow-card);font-weight:800" onclick="UI.doLogin()">
           <span style="font-weight:900;color:#4285F4">G</span>&nbsp; 구글로 시작하기 — 백업 · 기기 이동 · 가족 공유
         </button>
         <p class="hint" style="text-align:center;margin:8px 0 0">로그인 없이도 이 기기에서는 모든 기능을 쓸 수 있어요</p>`;

  $('#view').innerHTML = `
    <div class="hero"><h1>내 <em>계정</em>과 설정</h1><p>모드를 바꾸면 추천이 통째로 달라져요</p></div>
    ${acct}
    <div class="section-title"><h2>🔔 임박 알림</h2><small>상하기 전에 알려줘요</small></div>
    <div class="card flat">${pushSettingHtml()}</div>
    <button class="btn btn-soft btn-block" style="margin-top:8px" onclick="UI.openFeedback()">💬 의견·건의 보내기 (개선에 큰 힘이 돼요)</button>
    <div class="section-title"><h2>🚪 시작 화면</h2><small>앱을 열면 바로 뜨는 곳</small></div>
    <div class="start-grid">
      ${Object.entries(START_SCREENS).map(([k, s]) => `
        <button class="start-card ${st.startScreen === k ? 'on' : ''}" onclick="UI.setStartScreen('${k}')">
          <span class="sc-emoji">${s.icon}</span><b>${s.label}</b><small>${s.desc}</small></button>`).join('')}
    </div>
    <div class="section-title"><h2>🍽️ 추천 모드</h2><small>나에게 맞게</small></div>
    <div class="mode-grid">
      ${modes.map((m) => `
        <button class="mode-card ${st.mode === m.key ? 'on' : ''}" onclick="UI.setMode('${m.key}')">
          <span class="m-emoji">${m.emoji}</span><b>${esc(m.label)} 모드</b><small>${esc(m.desc || '내가 만든 모드')}</small>
          ${m.custom ? `<small style="color:var(--blue);margin-top:4px" onclick="event.stopPropagation();UI.openModeMaker('${m.key}')">✎ 수정 · 공유</small>` : ''}
        </button>`).join('')}
      <button class="mode-card" style="border:1.5px dashed var(--hairline);box-shadow:none" onclick="UI.openModeMaker()">
        <span class="m-emoji">＋</span><b>새 모드 만들기</b><small>나만의 추천 기준 설계</small></button>
    </div>

    <div class="section-title"><h2>✨ AI 기능</h2><small>영수증 스캔 · 유튜브 정리</small></div>
    ${!isAdmin() ? (aiReady().ok ? `
    <div class="card flat">
      <p class="hint" style="margin:0 0 6px">영수증 스캔과 유튜브 레시피 자동 정리에 쓰여요. <b>매달 무료 ${FREE_AI}회</b>가 새로 채워지고, 다 쓰면 광고를 보거나 포인트(1회권)로 충전할 수 있어요.</p>
      <p class="hint" style="margin:0 0 10px;color:var(--label)">${aiUnlimited() ? '⭐ 프리미엄 — <b>무제한</b> 이용 중' : `이번 달 <b>${aiLeft().freeLeft}/${FREE_AI}회</b> 남음${aiLeft().credits ? ` · 충전권 ${aiLeft().credits}회` : ''}`}</p>
      <div class="row" style="gap:12px">
        <div style="font-size:1.5rem">⭐</div>
        <div class="grow"><b>프리미엄 — 무제한 · 광고 없음</b><p class="hint" style="margin:2px 0 0">월 3,900원 (출시 준비 중)</p></div>
        <button class="btn btn-sm btn-tint" onclick="UI.premiumInterest()">알림받기</button>
      </div>
    </div>` : `
    <div class="card flat">
      <p class="hint" style="margin:0">✨ AI 기능(영수증 스캔 · 유튜브 빠른 레시피)은 <b>곧 무료로 열려요</b> —
      별도 설치나 설정 없이 업데이트로 자동 적용됩니다. 그동안은 빠른 추가(2탭 등록)를 써주세요.</p>
    </div>`) : `
    <div class="card flat">
      <div class="seg" style="margin-top:0">
        <button class="${st.aiMode !== 'server' ? 'on' : ''}" onclick="UI.setAiMode('byok')">🔑 내 키 (베타)</button>
        <button class="${st.aiMode === 'server' ? 'on' : ''}" onclick="UI.setAiMode('server')">☁️ 서버 (유료화)</button>
      </div>
      ${st.aiMode === 'server' ? `
      <div class="field"><label>AI 게이트웨이 주소 (Cloudflare 워커 URL)</label>
        <input id="set-aiendpoint" placeholder="https://ai2.ddukkit.com" value="${esc(st.aiEndpoint)}" /></div>
      <p class="hint">운영 모드 — 사용자는 키 없이 바로 AI를 써요. Anthropic 키는 워커 Secret(ANTHROPIC_API_KEY)에만 저장되고 앱·저장소엔 주소만 남아요. 비워두면 config.js의 AI_ENDPOINT가 쓰여요. 예산 보호는 Anthropic 월 한도 + Cloudflare 레이트리밋으로.</p>`
      : `
      <div class="field"><label>Claude API 키 (이 기기에만 저장 · 동기화 안 됨)</label>
        <input id="set-aikey" type="password" placeholder="sk-ant-…" value="${esc(st.aiKey)}" /></div>
      <div class="field"><label>모델</label>
        <select id="set-aimodel">
          ${[['claude-opus-4-8', 'Opus 4.8 — 가장 정확 (기본)'], ['claude-sonnet-4-6', 'Sonnet 4.6 — 균형'], ['claude-haiku-4-5', 'Haiku 4.5 — 가장 저렴']]
            .map(([v, l]) => `<option value="${v}" ${st.aiModel === v ? 'selected' : ''}>${l}</option>`).join('')}
        </select></div>
      <p class="hint">개발·베타용. 키는 console.anthropic.com에서 발급, 비용은 본인 계정 과금 (영수증 1장 수~수십 원). 공용 기기에서는 등록하지 마세요.</p>`}
      <div class="field" style="margin-top:4px"><label>유튜브 검색 API 키 (선택 — 앱 안 검색용 · 이 기기에만)</label>
        <input id="set-ytkey" placeholder="AIza…" value="${esc(st.ytKey)}" />
        <p class="hint">Google Cloud 콘솔에서 YouTube Data API v3 키 발급 (무료 일 100회 검색) — 없으면 링크 붙여넣기 방식으로 동작해요</p></div>
      <div class="field"><label>쿠팡 파트너스 추적 ID (선택 — 비우면 배포 기본값 사용)</label>
        <input id="set-coupang" placeholder="${esc(COUPANG_TAG) || 'AF…'}" value="${esc(st.coupangId)}" />
        <p class="hint">장보기 "쿠팡" 버튼에 이 ID가 <code>lptag</code>로 붙어요. 실제 적립 여부는 파트너스 대시보드에서 꼭 확인하세요 — 안 잡히면 대시보드에서 만든 딥링크(link.coupang.com)로 바꿔야 합니다. 공정위 고지 문구는 장보기 화면에 자동 노출됩니다.</p></div>
      <button class="btn btn-block btn-tint" style="margin-top:6px" onclick="UI.saveAI()">저장</button>
      <p class="hint" style="margin-top:8px">터미널 테스트: <b>tools/ai-test.mjs</b> — 폰 없이 스캔·레시피 정리 파이프라인을 검증할 수 있어요 (docs/07)</p>
    </div>`}

    ${isAdmin() ? `
    <div class="section-title"><h2>🛠️ 고급 (관리자)</h2><small>베타·수동 설정</small></div>
    <div class="card flat">
      <div class="field"><label>Firebase 구성 JSON (config.js 미설정 시 폴백)</label>
        <textarea id="set-fb" rows="3" placeholder='{"apiKey":"…","projectId":"…", …}'>${esc(st.firebaseConfig)}</textarea></div>
      <div class="field"><label>가족 코드 수동 입력</label>
        <div class="search-row" style="margin:0">
          <input id="set-code" placeholder="예: 두부-x3k9" value="${esc(st.spaceCode)}" />
          <button class="btn btn-soft" onclick="UI.genCode()">생성</button>
        </div></div>
      <button class="btn btn-block btn-tint" onclick="UI.connectSync()">수동 연결</button>
      ${sync.status === 'error' ? `<p class="hint" style="color:var(--red)">오류: ${esc(sync.error)}</p>` : ''}
      <p class="hint" style="margin-top:8px">상용 전환: js/config.js에 FIREBASE_CONFIG·AI_ENDPOINT를 채워 커밋하면 모든 사용자에게 "구글로 시작"과 서버 AI가 기본 적용돼요. 입력값 목록은 레포 <b>OPERATOR.md</b>, 절차는 docs/09.</p>
      <button class="btn btn-block btn-soft" style="margin-top:6px" onclick="UI.adminGate()">🔒 관리자 모드 잠그기 (재진입: 버전 문구 7번 탭)</button>
    </div>` : ''}

    <div class="section-title"><h2>🗂️ 데이터</h2></div>
    <div class="btn-row" style="margin-top:0">
      <button class="btn" onclick="UI.exportData()">내보내기</button>
      <label class="btn">가져오기<input type="file" accept=".json" style="display:none" onchange="UI.importData(this)" /></label>
      <button class="btn btn-soft" onclick="UI.resetAll()">초기화</button>
    </div>
    <button class="btn btn-soft btn-block" style="margin-top:9px" onclick="UI.openImport()">📥 공유받은 레시피·모드 추가 (링크 붙여넣기)</button>
    <button class="btn btn-soft btn-block" style="margin-top:9px" onclick="UI.startTutorial()">📖 사용법 다시 보기 (튜토리얼)</button>
    <p class="hint" style="margin-top:16px;text-align:center" onclick="UI.verTap()">냉비서 v0.3 · 내 데이터는 내 기기${syncAvailable() ? '(로그인 시 내 계정)' : ''}에만 저장됩니다</p>`;
}
UI.setAiMode = (m) => { S.settings.aiMode = m; save(); renderSettings(); };
UI.saveAI = () => {
  if (S.settings.aiMode === 'server') {
    S.settings.aiEndpoint = $('#set-aiendpoint').value.trim();
  } else {
    S.settings.aiKey = $('#set-aikey').value.trim();
    S.settings.aiModel = $('#set-aimodel').value;
  }
  const yk = $('#set-ytkey');
  if (yk) S.settings.ytKey = yk.value.trim();
  const cp = $('#set-coupang');
  if (cp) S.settings.coupangId = cp.value.trim();
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

/* ── 계정 (간편 로그인) · 가족 공유 ── */
UI.doLogin = async () => {
  try {
    toast('구글 로그인 창을 여는 중…');
    await loginGoogle();
    setTimeout(() => { renderTop(); if (tab === 'settings') renderSettings(); }, 600);
  } catch (e) { toast(e.message || '로그인에 실패했어요'); }
};
UI.doLogout = async () => {
  await logoutGoogle();
  toast('로그아웃했어요 — 데이터는 이 기기와 클라우드에 그대로 있어요');
  renderTop(); renderSettings();
};
UI.famCreate = async () => {
  const code = makeSpaceCode();
  await setSpaceCode(code);
  renderSettings(); renderTop();
  copyText(`🧊 우리집 냉장고 같이 써요!\n냉비서 앱 → 설정 → "코드 입력"에 이 코드를 넣어주세요: ${code}\n앱: ${location.origin}${location.pathname}`);
};
UI.famShare = () => {
  const code = S.settings.spaceCode;
  if (!code) { toast('먼저 가족 공유를 시작해 주세요'); return; }
  const text = `🧊 우리집 냉장고 같이 써요!\n냉비서 앱 → 설정 → "코드 입력"에 이 코드를 넣어주세요: ${code}\n앱: ${location.origin}${location.pathname}`;
  if (navigator.share) navigator.share({ title: '냉비서 가족 공유', text }).catch(() => copyText(text));
  else copyText(text);
  toast('초대 메시지를 복사했어요 📋');
};
UI.famJoin = async () => {
  const code = prompt('가족에게 받은 코드를 입력하세요 (예: 두부-x3k9)');
  if (!code) return;
  await setSpaceCode(code);
  renderSettings(); renderTop();
  toast('👨‍👩‍👧 가족 냉장고에 연결했어요');
};
UI.famLeave = async () => {
  if (!confirm('가족 공유를 해제할까요? (데이터는 사라지지 않고, 내 계정 백업으로 전환돼요)')) return;
  await setSpaceCode('');
  renderSettings(); renderTop();
  toast('가족 공유를 해제했어요');
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
      migratePantryUnits(); // 구버전 내보내기(근/팩/병)도 g·ml 기준으로 보정
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
UI.go = (t) => { endMove(); tab = t; render(); trackScreen(t); };

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

/* 냉장고 문 꾸미기 — 붙인 항목 끌어 옮기기(편집 모드 한정, 중심 기준 %로 저장) */
view.addEventListener('pointerdown', (e) => {
  if (!decorEditing) return;
  const el = e.target.closest('[data-deco]');
  if (!el) return;
  const layer = el.closest('.fd-deco'); if (!layer) return;
  const rect = layer.getBoundingClientRect();
  const id = el.dataset.deco;
  const sx = e.clientX, sy = e.clientY; let moved = false, nx = 0, ny = 0;
  try { el.setPointerCapture(e.pointerId); } catch { /* noop */ }
  el.classList.add('fd-dragging');
  const onMove = (ev) => {
    if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 5) moved = true;
    if (!moved) return;
    nx = Math.max(6, Math.min(94, ((ev.clientX - rect.left) / rect.width) * 100));
    ny = Math.max(5, Math.min(95, ((ev.clientY - rect.top) / rect.height) * 100));
    el.style.left = nx + '%'; el.style.top = ny + '%';
  };
  const onUp = () => {
    el.classList.remove('fd-dragging');
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerup', onUp);
    el.removeEventListener('pointercancel', onUp);
    if (moved) {
      suppressClick = true; // 드래그 직후의 click(편집·열기) 억제
      const it = ((S.decor && S.decor.items) || []).find((q) => q.id === id);
      if (it) { it.x = +nx.toFixed(1); it.y = +ny.toFixed(1); save(); }
    }
  };
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onUp);
});

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

/* ── 뒤로가기 경로 + 실수 종료 방지 ─────────
   시트 열림 → 뒤로가기는 시트만 닫음 → 홈 아니면 홈으로 → 홈에서 한 번 더 경고 → 그다음에야 종료 */
let exitArmed = false;
history.pushState({ nb: 'guard' }, '');
window.addEventListener('popstate', () => {
  if (ignoreNextPop) { ignoreNextPop = false; return; }
  if (sheetPushed) { sheetPushed = false; UI.closeSheet(true); return; }
  if (moveCtx) { endMove(); render(); history.pushState({ nb: 'guard' }, ''); return; }
  if (tab !== 'home') { tab = 'home'; render(); history.pushState({ nb: 'guard' }, ''); return; }
  if (!exitArmed) {
    exitArmed = true;
    toast('한 번 더 뒤로 누르면 앱이 종료돼요');
    history.pushState({ nb: 'guard' }, '');
    setTimeout(() => { exitArmed = false; }, 2000);
    return;
  }
  history.back(); // 진짜 종료
});

// 상용 기본값: config.js에 서버 AI 주소가 채워져 있으면 전 사용자 자동 적용
// 배포에 게이트웨이가 설정돼 있으면: 본인 키가 없는 사용자는 서버 모드로 자동 정렬(엔드포인트 보정 포함).
// 키를 직접 넣은 사용자는 BYOK 그대로 존중. (구버전 테스트로 남은 aiMode='byok'+키없음 상태도 여기서 정상화)
if (AI_ENDPOINT) {
  let changed = false;
  // 막혔던 ddukkit.com 커스텀 도메인을 저장해 둔 기기는 새 게이트웨이(config) 주소로 자동 이전
  if (/ddukkit\.com/.test(S.settings.aiEndpoint || '') && S.settings.aiEndpoint !== AI_ENDPOINT) { S.settings.aiEndpoint = ''; changed = true; }
  if (!S.settings.aiEndpoint) { S.settings.aiEndpoint = AI_ENDPOINT; changed = true; }
  if (!S.settings.aiKey && S.settings.aiMode !== 'server') { S.settings.aiMode = 'server'; changed = true; }
  if (changed) save({ silent: true });
}

migratePantryUnits(); // 무게·부피 재고를 g·ml 기준으로 일괄 정렬(구버전 데이터 보정)
// 커뮤니티 평점 — 캐시 즉시 적용 후 서버에서 갱신(실패해도 앱은 그대로 동작)
try { applyCommunityStats(JSON.parse(localStorage.getItem('nb_cstats') || '{}')); } catch { /* noop */ }
// 시작 화면 — 사용자가 고른 기본 화면으로 진입(첫 실행은 목적 질문 전이라 home 기본)
const bootStart = applyStartTab(S.settings.startScreen);
render();
initSync(() => { renderTop(); if (tab === 'settings') renderSettings(); });
fetchRecipeStats().then((m) => {
  if (!m) return;
  applyCommunityStats(m);
  try { localStorage.setItem('nb_cstats', JSON.stringify(m)); } catch { /* 용량 무시 */ }
  if (tab === 'recipes' || tab === 'home') render();
});

// 게임 모듈에 UI 콘텍스트 주입 (시트·토스트·광고 코어 공유)
initGames({
  openSheet,
  closeSheet: (fromPop) => UI.closeSheet(fromPop),
  toast,
  playAd,
  onPoints: () => { renderTop(); if (tab === 'home') renderHome(); },
  submitScore,
});

// 사용 계측 시작 — 앱 진입 + 첫 화면(무엇이 쓰이나/리텐션 측정). measurementId 없으면 조용히 no-op.
initAnalytics();
track('app_open', { pantry: S.pantry.length, recipes: (S.myRecipes || []).length, logged_in: !!(sync.user && !sync.user.anon) });
trackScreen(tab);
// 이탈사유 수집 — 3번 이상 열었는데 한 번도 요리 안 한(미활성) 사용자에게 딱 1회만 살짝 물어봄
try {
  const opens = (Number(localStorage.getItem('nb_opens')) || 0) + 1;
  localStorage.setItem('nb_opens', String(opens));
  if (opens >= 3 && S.ledger.cooked === 0 && !localStorage.getItem('nb_fb_asked') && !localStorage.getItem('nb_fb_done')) {
    setTimeout(() => { if (!document.querySelector('#modal-root .sheet')) UI.openFeedback(true); }, 2500);
  }
} catch { /* noop */ }

// 출석 포인트 — 하루 한 번, 앱을 연 것 자체가 절약의 시작
{
  const att = earn('daily');
  if (att.ok) setTimeout(() => toast(`📅 출석 +${att.p}P — 오늘도 냉장고부터!`), 1400);
}

// 공유 링크로 진입한 경우 (?share=NB1.…)
const shared = new URLSearchParams(location.search).get('share');
if (shared) {
  history.replaceState(null, '', location.pathname);
  handleShareCode(shared);
} else if (!S.purposeAsked && !S.tutorialDone) {
  // 첫 실행(가이드도 아직)일 때만 목적 질문 → 시작 화면 고정 → 이어서 튜토리얼.
  // 기존 사용자(이미 튜토리얼 완료)는 방해하지 않음 — 설정 > 시작 화면에서 직접 바꿀 수 있음.
  setTimeout(() => UI.openPurpose(), 500);
} else if (!S.tutorialDone) {
  setTimeout(() => UI.startTutorial(), 700); // 첫 사용자 가이드
} else if (bootStart.games && !document.querySelector('#modal-root .sheet')) {
  setTimeout(() => { if (!document.querySelector('#modal-root .sheet')) UI.openGames(); }, 350); // 시작 화면=게임이면 열자마자 게임
}

/* ── 앱 설치 유도 (PWA) — 완전 자동 설치는 브라우저가 막음(보안). 안드로이드/크롬은 1탭 설치, 아이폰 사파리는 안내. ── */
(() => {
  const KEY = 'nb_install_snooze';
  const installed = () => (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  const snoozed = () => { try { return Number(localStorage.getItem(KEY) || 0) > Date.now(); } catch { return false; } };
  const snooze = (days) => { try { localStorage.setItem(KEY, String(Date.now() + days * 864e5)); } catch { /* ignore */ } };
  const canShow = () => S.tutorialDone && !installed() && !snoozed() && !document.getElementById('nb-install');
  let deferred = null;

  function banner(inner) {
    const el = document.createElement('div');
    el.id = 'nb-install';
    el.style.cssText = 'position:fixed;left:12px;right:12px;bottom:calc(78px + env(safe-area-inset-bottom));z-index:45;background:#1f2937;color:#fff;border-radius:14px;padding:11px 14px;display:flex;align-items:center;gap:10px;box-shadow:0 8px 24px rgba(0,0,0,.28)';
    el.innerHTML = inner;
    el.querySelector('[data-x]').addEventListener('click', () => { el.remove(); snooze(14); });
    document.body.appendChild(el);
    return el;
  }

  // 안드로이드/데스크톱 크롬: 네이티브 설치 프롬프트를 잡아뒀다가 버튼으로 띄움
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    if (!canShow()) return;
    const el = banner(
      '<span style="font-size:1.5rem">📲</span>'
      + '<div style="flex:1;line-height:1.3"><b>냉비서 앱으로 설치</b><div style="opacity:.8;font-size:.8rem">홈 화면에서 바로 열려요 · 오프라인도 OK</div></div>'
      + '<button id="nb-i-yes" style="background:#22c55e;color:#04130f;border:0;border-radius:10px;padding:9px 14px;font-weight:800;font-size:.9rem">설치</button>'
      + '<button data-x style="background:transparent;color:#9ca3af;border:0;font-size:1.25rem;line-height:1">✕</button>');
    el.querySelector('#nb-i-yes').addEventListener('click', async () => {
      el.remove();
      if (!deferred) return;
      deferred.prompt();
      try { await deferred.userChoice; } catch { /* ignore */ }
      deferred = null;
    });
  });

  window.addEventListener('appinstalled', () => { document.getElementById('nb-install')?.remove(); snooze(3650); });

  // 아이폰 사파리: beforeinstallprompt 미지원 → "공유 → 홈 화면에 추가" 수동 안내 (인앱 브라우저 제외)
  window.addEventListener('load', () => setTimeout(() => {
    const ua = navigator.userAgent || '';
    const iOS = /iPhone|iPad|iPod/.test(ua);
    const safari = iOS && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|KAKAOTALK|NAVER|Instagram|FBAN|FBAV|Line/i.test(ua);
    if (!safari || !canShow()) return;
    banner(
      '<span style="font-size:1.5rem">📲</span>'
      + '<div style="flex:1;line-height:1.3"><b>앱으로 추가하기</b><div style="opacity:.85;font-size:.8rem">공유 <b>⬆︎</b> → <b>"홈 화면에 추가"</b> 누르면 앱처럼 써요</div></div>'
      + '<button data-x style="background:transparent;color:#9ca3af;border:0;font-size:1.25rem;line-height:1">✕</button>');
  }, 3500));
})();
