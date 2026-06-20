// 냉비서 아케이드 — 미니게임 5종 독립 실행 엔트리 (게임 모듈 재사용, 자기완결 셸).
// 광고/저장은 어댑터로 분리: showRewardedAd(더미 15초) / 점수는 localStorage(points.js).
import { initGames, openGames, gameFresh, gameVoice, gameVoicePass, gameDouble, setGameDiff } from './games.js';
import { gameDefense, defBuy, defStart, defSpeed, defPick, defRevive, defGiveUp, defAdSkip, defAdSkill, defResume, defDraftAd, defWallMode, defElem, defMidSkill, defMidSkip } from './game-defense.js';
import { gamePuzzle } from './game-puzzle.js';
import { gameGomoku, gomokuUndo, gomokuHintAd } from './game-gomoku.js';
import { gameQuiz, quizPick, quizNext, quizReveal, quizRevealAll, quizFinish } from './game-quiz.js';
import { S } from './store.js';

const $ = (s) => document.querySelector(s);
const UI = {};
window.UI = UI;

/* ── 시트(게임 화면)·토스트 — 앱과 동일 마크업 구조라 게임 CSS 그대로 적용 ── */
let sheetOpen = false;
function openSheet(html, { lock = false } = {}) {
  $('#sheet').innerHTML =
    `<div class="overlay" ${lock ? '' : 'onclick="if(event.target===this)UI.closeSheet()"'}>
       <div class="sheet">${lock ? '' : '<div class="grip"></div>'}${html}</div></div>`;
  const sh = $('#sheet .sheet'); if (sh && sh.querySelector('.gx')) sh.classList.add('sheet-full'); // 게임은 풀 레이아웃(:has 미지원 대비)
  sheetOpen = true;
}
UI.closeSheet = () => { $('#sheet').innerHTML = ''; sheetOpen = false; renderHome(); };
function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast'; el.textContent = msg;
  $('#toast-root').appendChild(el);
  setTimeout(() => el.remove(), 2300);
}

/* ── 광고 어댑터 (더미 15초) — 실제 SDK 연동 시 이 함수만 교체 ── */
let adTimer = null;
function playAd({ onComplete, note = '', reward = '' }) {
  clearInterval(adTimer);
  const total = 15, R = 28, CIRC = 2 * Math.PI * R;
  openSheet(`
    <div class="adx">
      <div class="adx-head"><b>📺 광고 보고 받기</b><button class="adx-skip" onclick="UI.adQuit()">건너뛰기 ›</button></div>
      ${reward ? `<div class="adx-reward">🎁 ${reward}</div>` : ''}
      <div class="adx-stage"><div class="adx-slime">🧊</div><b>냉비서 아케이드</b><p>광고는 게임을 무료로 유지해요</p></div>
      <div class="adx-ring"><svg width="64" height="64"><circle cx="32" cy="32" r="${R}" fill="none" stroke="rgba(120,120,128,.18)" stroke-width="6"/>
        <circle id="ad-ring" cx="32" cy="32" r="${R}" fill="none" stroke="#2fae5f" stroke-width="6" stroke-linecap="round" stroke-dasharray="${CIRC.toFixed(1)}" stroke-dashoffset="0" style="transition:stroke-dashoffset ${total}s linear"/></svg>
        <span class="adx-num" id="ad-num">${total}</span></div>
      ${note ? `<p class="adx-note">${note}</p>` : ''}
      <button id="ad-btn" class="btn btn-block btn-soft" disabled style="margin-top:10px">광고 시청 중…</button>
    </div>`, { lock: true });
  const ring = $('#ad-ring'); if (ring) requestAnimationFrame(() => { ring.style.strokeDashoffset = String(CIRC); });
  let t = total;
  adTimer = setInterval(() => {
    const b = $('#ad-btn'); if (!b) { clearInterval(adTimer); return; }
    t--; const n = $('#ad-num'); if (n) n.textContent = Math.max(0, t);
    if (t > 0) return;
    clearInterval(adTimer); onComplete(b);
  }, 1000);
}
UI.adQuit = () => { clearInterval(adTimer); UI.closeSheet(); toast('광고를 끝까지 봐야 보상을 받아요'); };

/* ── 게임 핸들러 (onclick 문자열이 부른다) ── */
UI.openGames = () => openGames();
UI.gameDefense = () => gameDefense();
UI.defBuy = (k) => defBuy(k);
UI.gamePuzzle = () => gamePuzzle();
UI.gameFresh = () => gameFresh();
UI.gameVoice = () => gameVoice();
UI.gameVoicePass = () => gameVoicePass();
UI.gameQuiz = () => gameQuiz();
UI.quizPick = (i) => quizPick(i);
UI.quizNext = () => quizNext();
UI.quizReveal = () => quizReveal();
UI.quizRevealAll = () => quizRevealAll();
UI.quizFinish = () => quizFinish();
UI.gameDouble = (p) => gameDouble(p);
// 디펜스 — 시작/조작 핸들러 전부 (안 그러면 아케이드에서 버튼이 죽음)
UI.defStart = (d) => defStart(d);
UI.defResume = () => defResume();
UI.defSpeed = () => defSpeed();
UI.defElem = () => defElem();
UI.defWallMode = () => defWallMode();
UI.defPick = (i) => defPick(i);
UI.defRevive = () => defRevive();
UI.defGiveUp = () => defGiveUp();
UI.defAdSkip = () => defAdSkip();
UI.defAdSkill = () => defAdSkill();
UI.defDraftAd = () => defDraftAd();
UI.defMidSkill = () => defMidSkill();
UI.defMidSkip = () => defMidSkip();
// 오목
UI.gameGomoku = () => gameGomoku();
UI.gomokuUndo = () => gomokuUndo();
UI.gomokuHintAd = () => gomokuHintAd();
// 게임 내 난이도 칩 + 전체화면
UI.gameSetDiff = (d, key) => { setGameDiff(d); if (key && typeof UI[key] === 'function') UI[key](); };
UI.gameFull = () => { const el = document.querySelector('.gx'); if (!el) return; try { if (document.fullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen).call(document); else (el.requestFullscreen || el.webkitRequestFullscreen).call(el); } catch { toast('전체화면을 지원하지 않아요'); } };
UI.openRanks = () => toast('랭킹은 냉비서 앱(로그인)에서 제공돼요');
UI.openPoints = () => toast(`🅿 ${(S.points?.bal || 0).toLocaleString()}P 보유 중`);

/* ── 게임 모듈에 컨텍스트 주입 ── */
initGames({ openSheet, closeSheet: UI.closeSheet, toast, playAd, onPoints: () => {}, submitScore: () => {} });

/* ── 랜딩 ── */
function renderHome() {
  $('#app').innerHTML = `
    <div class="arc-hero">
      <div class="arc-mascot">🧊</div>
      <h1>냉비서 <b>아케이드</b></h1>
      <p>짬시간에 한 판 — 점수는 냉비서 포인트로</p>
      <button class="gx-btn-go" style="max-width:280px;margin:16px auto 0" onclick="UI.openGames()">🎮 게임 시작</button>
      <p class="arc-foot">🅿 ${(S.points?.bal || 0).toLocaleString()}P 보유</p>
    </div>`;
}
renderHome();
