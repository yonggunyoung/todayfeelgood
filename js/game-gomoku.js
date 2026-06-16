// ⚫ 냉장고 오목 — 슬라임 알로 AI와 5목 대결. 난이도(하/중/상)로 AI 강함, 광고로 무르기·힌트.
import { gameUI, beep, chord, buzz, finishGame, diffMul, getDiff, gameDiffRow, inStageAd } from './games.js';
import { setupCanvas } from './slime.js';

const N = 13, WIN = 5;
let G = null;

export function gameGomoku() {
  const ui = gameUI();
  ui.openSheet(`
    <div class="gx gx-gmk">
      <div class="gx-bar"><b class="gx-title">⚫ 냉장고 오목</b><button class="gx-x" onclick="UI.closeSheet()">✕</button></div>
      <p class="sub" style="margin:2px 0 6px;color:#cdbde8">민트 슬라임으로 먼저 <b>5개</b>를 한 줄로! (AI는 보라 슬라임)</p>
      ${gameDiffRow('gameGomoku')}
      <div class="gx-stage" style="padding:0 8px"><canvas id="gmk-c"></canvas>
        <div id="gmk-msg" class="gmk-msg" style="display:none"></div>
      </div>
      <div class="gx-shopbar">
        <button class="gx-speed" onclick="UI.gomokuUndo()">↩ 무르기</button>
        <button class="gx-adcoin" onclick="UI.gomokuHintAd()">📺 광고 보고 힌트</button>
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
    else if (cnt === 4) total += open === 2 ? 200000 : open === 1 ? 50000 : 500;
    else if (cnt === 3) total += open === 2 ? 10000 : open === 1 ? 1000 : 30;
    else if (cnt === 2) total += open === 2 ? 500 : open === 1 ? 100 : 8;
    else total += open * 10;
  }
  return total;
}
// 한 칸에 who가 두면 생기는 "강한 위협" 방향 수 (열린4=2, 열린3=1) → 2 이상이면 양수겸장(포크)
function threatCount(b, x, y, who) {
  let t = 0;
  for (const [dx, dy] of DIRS) {
    let cnt = 1, open = 0;
    for (const dir of [1, -1]) {
      let s = 1; for (; s < WIN; s++) { const nx = x + dx * dir * s, ny = y + dy * dir * s; if (inB(nx, ny) && b[idx(nx, ny)] === who) cnt++; else break; }
      const ex = x + dx * dir * s, ey = y + dy * dir * s; if (inB(ex, ey) && b[idx(ex, ey)] === 0) open++;
    }
    if (cnt >= 4 && open >= 1) t += 2;        // 열린 4 (막기 어려움)
    else if (cnt === 3 && open === 2) t += 1; // 열린 3
  }
  return t;
}
const isFork = (b, x, y, who) => threatCount(b, x, y, who) >= 2;
// 돌 주변(한 칸 이내) 빈칸 후보
function genCands(b) {
  const cand = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (b[idx(x, y)]) continue;
    let near = false;
    for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if (inB(nx, ny) && b[idx(nx, ny)]) { near = true; break; } }
    if (near) cand.push({ x, y });
  }
  return cand;
}
function aiMove() {
  if (!G || G.over) return;
  const b = G.board, d = getDiff(), mid = (N - 1) / 2 | 0;
  if (!G.moves.length) { place(mid, mid, 2); return; }
  const cands = genCands(b);
  if (!cands.length) { place(mid, mid, 2); return; }
  // 1) 즉시 이기는 수  2) 상대 즉승 방어 (난이도 무관 — 기본기)
  for (const c of cands) if (cellScore(b, c.x, c.y, 2) >= 1000000) { place(c.x, c.y, 2); return; }
  for (const c of cands) if (cellScore(b, c.x, c.y, 1) >= 1000000) { place(c.x, c.y, 2); return; }
  if (d !== 'easy') {
    // 3) 내가 양수겸장(포크)을 만들 수 있으면 — 사실상 승리 확정
    for (const c of cands) { b[idx(c.x, c.y)] = 2; const f = isFork(b, c.x, c.y, 2); b[idx(c.x, c.y)] = 0; if (f) { place(c.x, c.y, 2); return; } }
    // 4) 상대의 열린4·포크를 미리 차단 (그 자리에 상대가 두면 막기 힘든 지점 선점)
    let blk = null, bs = 1;
    for (const c of cands) { b[idx(c.x, c.y)] = 1; const tc = threatCount(b, c.x, c.y, 1); b[idx(c.x, c.y)] = 0; if (tc >= 2 && tc > bs) { bs = tc; blk = c; } }
    if (blk) { place(blk.x, blk.y, 2); return; }
  }
  // 난이도: 하=방어 약·랜덤↑, 중=균형+기본 수읽기, 상=공수 강 + 2수 앞 예측(무 노이즈)
  const defW = d === 'hard' ? 1.4 : d === 'normal' ? 1.0 : 0.72;
  const noise = d === 'hard' ? 0 : d === 'normal' ? 45 : 240;
  for (const c of cands) c.base = cellScore(b, c.x, c.y, 2) + cellScore(b, c.x, c.y, 1) * defW;
  if (d === 'hard') {
    // 상위 후보에 내가 둔 뒤, 상대 최선 응수(위협·포크 포함)를 차감 → 함정·되치기 회피
    cands.sort((a, b2) => b2.base - a.base);
    const top = cands.slice(0, 12);
    for (const c of top) {
      b[idx(c.x, c.y)] = 2;
      let opp = 0;
      for (const o of genCands(b)) {
        let s = cellScore(b, o.x, o.y, 1);
        b[idx(o.x, o.y)] = 1; if (isFork(b, o.x, o.y, 1)) s += 80000; b[idx(o.x, o.y)] = 0;
        if (s > opp) opp = s;
      }
      b[idx(c.x, c.y)] = 0;
      c.look = c.base - opp * 0.9;
    }
    top.sort((a, b2) => b2.look - a.look);
    place(top[0].x, top[0].y, 2);
    return;
  }
  let best = null, bs = -Infinity;
  for (const c of cands) { const s = c.base + Math.random() * noise; if (s > bs) { bs = s; best = c; } }
  place(best.x, best.y, 2);
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
  // 밝은 아이스 냉장고 내부(시안: 다른 게임과 달리 라이트 보드)
  const bg = c.createLinearGradient(0, 0, 0, W);
  bg.addColorStop(0, '#dcefff'); bg.addColorStop(0.55, '#b6d6f5'); bg.addColorStop(1, '#9cc4ec');
  c.fillStyle = bg; c.fillRect(0, 0, W, W);
  // 가로 선반 라인(냉장고 칸)
  c.fillStyle = 'rgba(111,159,206,0.18)';
  for (let yy = cell * 1.5; yy < W; yy += cell * 3) c.fillRect(0, yy, W, 2);
  // 격자
  c.strokeStyle = 'rgba(95,130,170,0.5)'; c.lineWidth = 1;
  for (let i = 0; i < N; i++) { const p = i * cell + cell / 2; c.beginPath(); c.moveTo(cell / 2, p); c.lineTo(W - cell / 2, p); c.moveTo(p, cell / 2); c.lineTo(p, W - cell / 2); c.stroke(); }
  // 힌트
  if (G.hint) { c.fillStyle = 'rgba(47,140,90,0.32)'; c.fillRect(G.hint.x * cell + 2, G.hint.y * cell + 2, cell - 4, cell - 4); }
  // 오목돌 — 광택 있는 흑/백 돌(나=흑, 상대=백)
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const v = G.board[idx(x, y)]; if (!v) continue;
    drawStone(c, x * cell + cell / 2, y * cell + cell / 2, cell * 0.4, v === 1);
  }
  // 승리 라인 강조
  if (G.win) {
    c.strokeStyle = '#ffe04a'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath();
    const a = G.win[0], b = G.win[G.win.length - 1];
    c.moveTo(a[0] * cell + cell / 2, a[1] * cell + cell / 2); c.lineTo(b[0] * cell + cell / 2, b[1] * cell + cell / 2); c.stroke();
  }
}

// 광택 오목돌 — black=내 돌(흑), 아니면 백돌. 라이트 보드에서 또렷.
function drawStone(c, cx, cy, r, black) {
  c.save();
  c.fillStyle = 'rgba(25,45,80,0.22)'; c.beginPath(); c.ellipse(cx, cy + r * 0.34, r * 0.92, r * 0.4, 0, 0, 6.28); c.fill();
  const g = c.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.2, cx, cy, r);
  if (black) { g.addColorStop(0, '#5d6c88'); g.addColorStop(0.5, '#2b3650'); g.addColorStop(1, '#141b2c'); }
  else { g.addColorStop(0, '#ffffff'); g.addColorStop(0.6, '#eef4fb'); g.addColorStop(1, '#ccd8ea'); }
  c.fillStyle = g; c.beginPath(); c.arc(cx, cy, r, 0, 6.28); c.fill();
  c.lineWidth = 1.2; c.strokeStyle = black ? 'rgba(8,12,20,0.55)' : 'rgba(120,150,185,0.75)'; c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.ellipse(cx - r * 0.32, cy - r * 0.4, r * 0.3, r * 0.17, -0.5, 0, 6.28); c.fill();
  c.restore();
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
