// ⚫ 냉장고 오목 — 슬라임 알로 AI와 5목 대결. 난이도(하/중/상)로 AI 강함, 광고로 무르기·힌트.
import { gameUI, beep, chord, buzz, finishGame, diffMul, getDiff, inStageAd } from './games.js';
import { mascotSprite, enemySprite, drawSprite, C } from './pixel.js';
import { setupCanvas } from './slime.js';

const N = 9, WIN = 5;
let G = null;

export function gameGomoku() {
  const ui = gameUI();
  ui.openSheet(`
    <div class="gx gx-gmk">
      <div class="gx-bar"><b class="gx-title">⚫ 냉장고 오목</b><button class="gx-x" onclick="UI.closeSheet()">✕</button></div>
      <p class="sub" style="margin:2px 0 8px;color:#cdbde8">민트 슬라임으로 먼저 <b>5개</b>를 한 줄로! (AI는 보라 슬라임)</p>
      <div class="gx-stage" style="padding:0 8px"><canvas id="gmk-c"></canvas>
        <div id="gmk-msg" class="gmk-msg" style="display:none"></div>
      </div>
      <div class="gx-shopbar">
        <button class="gx-speed" onclick="UI.gomokuUndo()">↩ 무르기</button>
        <button class="gx-adcoin" onclick="UI.gomokuHintAd()">📺 광고 보고 힌트</button>
        <span class="gx-diff">난이도 ${({ easy: '하', normal: '중', hard: '상' })[getDiff()]}</span>
      </div>
    </div>`);
  const canvas = document.getElementById('gmk-c');
  const wrap = canvas.parentElement;
  const cssW = Math.min(wrap.clientWidth - 16 || 320, 360);
  const cell = Math.floor(cssW / N), W = cell * N;
  const { ctx } = setupCanvas(canvas, W, W);
  G = { ctx, canvas, cell, W, board: new Array(N * N).fill(0), turn: 1, moves: [], over: false, t0: performance.now(), hinted: false, win: null, hint: null };
  canvas.addEventListener('pointerdown', (e) => {
    if (!G || G.over || G.turn !== 1) return;
    const r = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left) / cell), y = Math.floor((e.clientY - r.top) / cell);
    place(x, y, 1);
  });
  render();
}

const idx = (x, y) => y * N + x;
const inB = (x, y) => x >= 0 && y >= 0 && x < N && y < N;
const DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]];

function place(x, y, who) {
  if (!inB(x, y) || G.board[idx(x, y)]) return;
  G.board[idx(x, y)] = who; G.moves.push(idx(x, y)); G.hint = null;
  beep(who === 1 ? 700 : 420, 0.05); buzz(8);
  const w = winLine(x, y, who);
  if (w) { G.win = w; endGame(who === 1); render(); return; }
  if (G.moves.length >= N * N) { endGame(null); render(); return; }
  G.turn = who === 1 ? 2 : 1;
  render();
  if (G.turn === 2) setTimeout(aiMove, 360);
}

function winLine(x, y, who) {
  for (const [dx, dy] of DIRS) {
    const line = [[x, y]];
    for (let s = 1; s < WIN; s++) { const nx = x + dx * s, ny = y + dy * s; if (inB(nx, ny) && G.board[idx(nx, ny)] === who) line.push([nx, ny]); else break; }
    for (let s = 1; s < WIN; s++) { const nx = x - dx * s, ny = y - dy * s; if (inB(nx, ny) && G.board[idx(nx, ny)] === who) line.unshift([nx, ny]); else break; }
    if (line.length >= WIN) return line.slice(0, WIN);
  }
  return null;
}

// 한 칸에 who가 두면 생기는 위협 점수 (연속+열린 끝)
function cellScore(b, x, y, who) {
  let total = 0;
  for (const [dx, dy] of DIRS) {
    let cnt = 1, open = 0;
    for (const dir of [1, -1]) {
      let s = 1; for (; s < WIN; s++) { const nx = x + dx * dir * s, ny = y + dy * dir * s; if (inB(nx, ny) && b[idx(nx, ny)] === who) cnt++; else break; }
      const ex = x + dx * dir * s, ey = y + dy * dir * s; if (inB(ex, ey) && b[idx(ex, ey)] === 0) open++;
    }
    if (cnt >= 5) total += 1000000;
    else if (cnt === 4) total += open >= 1 ? 50000 : 0 + (open === 2 ? 100000 : 8000);
    else if (cnt === 3) total += open === 2 ? 6000 : open === 1 ? 800 : 0;
    else if (cnt === 2) total += open === 2 ? 300 : 40;
    else total += open * 8;
  }
  return total;
}
function aiMove() {
  if (!G || G.over) return;
  const b = G.board;
  const cand = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (b[idx(x, y)]) continue;
    let near = false;
    for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if (inB(nx, ny) && b[idx(nx, ny)]) { near = true; break; } }
    if (!near && G.moves.length) continue;
    const atk = cellScore(b, x, y, 2), def = cellScore(b, x, y, 1);
    // 난이도: 하=방어 약·랜덤↑, 상=공수 모두 강
    const d = getDiff();
    const defW = d === 'hard' ? 1.15 : d === 'normal' ? 0.95 : 0.7;
    const noise = d === 'hard' ? 1 : d === 'normal' ? 60 : 260;
    cand.push({ x, y, s: atk + def * defW + Math.random() * noise });
  }
  if (!cand.length) { place((N - 1) / 2, (N - 1) / 2, 2); return; }
  cand.sort((a, b2) => b2.s - a.s);
  place(cand[0].x, cand[0].y, 2);
}

export function gomokuUndo() {
  if (!G || G.over || G.turn !== 1 || G.moves.length < 2) return;
  // 내 수 + AI 수 한 쌍 무르기
  for (let k = 0; k < 2 && G.moves.length; k++) { const m = G.moves.pop(); G.board[m] = 0; }
  G.turn = 1; G.hint = null; beep(300, 0.06); render();
}
export function gomokuHintAd() {
  if (!G || G.over || G.turn !== 1) return;
  const stage = G.canvas.parentElement;
  inStageAd(stage, '광고 보고 최선의 한 수 힌트', () => {
    const b = G.board; let best = null, bs = -1;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { if (b[idx(x, y)]) continue; const s = cellScore(b, x, y, 1) * 1.05 + cellScore(b, x, y, 2); if (s > bs) { bs = s; best = { x, y }; } }
    G.hint = best; render();
  });
}

function render() {
  const c = G.ctx, cell = G.cell, W = G.W;
  c.fillStyle = '#1a0f2b'; c.fillRect(0, 0, W, W);
  // 격자
  c.strokeStyle = 'rgba(159,178,214,0.25)'; c.lineWidth = 1;
  for (let i = 0; i < N; i++) { const p = i * cell + cell / 2; c.beginPath(); c.moveTo(cell / 2, p); c.lineTo(W - cell / 2, p); c.moveTo(p, cell / 2); c.lineTo(p, W - cell / 2); c.stroke(); }
  // 힌트
  if (G.hint) { c.fillStyle = 'rgba(94,240,176,0.3)'; c.fillRect(G.hint.x * cell + 2, G.hint.y * cell + 2, cell - 4, cell - 4); }
  // 알
  const me = mascotSprite('happy').base, ai = enemySprite('grunt', '').base;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const v = G.board[idx(x, y)]; if (!v) continue;
    drawSprite(c, v === 1 ? me : ai, x * cell + cell / 2, y * cell + cell / 2, cell * 0.84);
  }
  // 승리 라인 강조
  if (G.win) {
    c.strokeStyle = '#ffe04a'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath();
    const a = G.win[0], b = G.win[G.win.length - 1];
    c.moveTo(a[0] * cell + cell / 2, a[1] * cell + cell / 2); c.lineTo(b[0] * cell + cell / 2, b[1] * cell + cell / 2); c.stroke();
  }
}

function endGame(playerWon) {
  G.over = true;
  const stage = G.canvas.parentElement;
  if (playerWon === false && !G._revived) {
    // 패배 직전 광고로 무르기 제안
    const ov = document.createElement('div'); ov.className = 'draft-overlay';
    ov.innerHTML = `<div class="draft-in"><div class="draft-title" style="color:#ff4d6a">한 끗 차이!</div>
      <p>광고 한 번이면 <b>마지막 두 수를 무르고</b> 다시 둘 수 있어요</p>
      <button class="gx-btn-go" id="gm-rev">📺 광고 보고 무르기</button>
      <button class="qz-skip" id="gm-end">결과 보기</button></div>`;
    stage.appendChild(ov);
    ov.querySelector('#gm-rev').onclick = () => {
      ov.remove();
      inStageAd(stage, '광고 보고 마지막 수 무르기', () => {
        G._revived = true; G.over = false; G.win = null;
        for (let k = 0; k < 2 && G.moves.length; k++) { const m = G.moves.pop(); G.board[m] = 0; }
        G.turn = 1; render();
      }, () => finishG(false));
    };
    ov.querySelector('#gm-end').onclick = () => { ov.remove(); finishG(false); };
    return;
  }
  finishG(playerWon);
}
function finishG(playerWon) {
  const secs = (performance.now() - G.t0) / 1000;
  const stones = G.moves.length;
  const score = playerWon ? Math.max(200, Math.round(2000 - secs * 8 - stones * 10) * Math.round(diffMul() * 10) / 10) : Math.round(stones * 8);
  const title = playerWon === null ? '⚫ 무승부' : playerWon ? '🏆 승리!' : '💧 패배';
  G = null;
  if (playerWon) { chord([523, 659, 784, 1047]); buzz([20, 40, 20]); }
  finishGame('gomoku', '⚫ 냉장고 오목', score, title, 'UI.gameGomoku()', { extra: `${stones}수 · ${secs.toFixed(0)}초 · 난이도 ${({ easy: '하', normal: '중', hard: '상' })[getDiff()]}` });
}
