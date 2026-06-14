// 재료 매치 — 같은 재료 3개 이상을 맞춰 터뜨리는 매치3 퍼즐. 연쇄(캐스케이드) 콤보로 점수 폭발.
// 60초 안에 최대한 — 인접 두 칸을 탭해서 교환. 캔버스 렌더 + 낙하/팝 애니메이션.
import { gameUI, beep, chord, buzz, finishGame, diffMul, gameDiffRow, inStageAd } from './games.js';

const KINDS = [
  { e: '🍎', c: '#ff6b6b' }, { e: '🥕', c: '#ff9f43' }, { e: '🥛', c: '#dfe6e9' },
  { e: '🥚', c: '#ffd54d' }, { e: '🐟', c: '#74b9ff' }, { e: '🥦', c: '#55c57a' },
];
const COLS = 7, ROWS = 8, TIME = 60;
let P = null;

export function gamePuzzle() {
  const ui = gameUI();
  ui.openSheet(`
    <div class="g-hubhead"><h2 style="margin:0">🍎 재료 매치</h2>
      <button class="btn btn-sm" onclick="UI.closeSheet()">✕</button></div>
    <div class="g-hud" style="padding:0 4px"><b id="pz-score">0</b><span id="pz-combo" class="g-combo"></span><b id="pz-time">${TIME}.0초</b></div>
    <div class="pz-wrap"><canvas id="pz" class="pz-canvas"></canvas></div>
    ${gameDiffRow('gamePuzzle')}
    <p class="hint" style="text-align:center;margin:8px 0 0">인접한 두 재료를 탭해 자리를 바꾸세요 — 3개 이상이면 팡!</p>`);
  const canvas = document.getElementById('pz');
  const wrap = canvas.parentElement;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const cell = Math.floor(Math.min((wrap.clientWidth || 340), 360) / COLS);
  const W = cell * COLS, H = cell * ROWS;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  canvas.width = W * dpr; canvas.height = H * dpr;
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);

  P = {
    ctx, canvas, cell, W, H, dpr,
    grid: [], oy: [], pop: [], // oy: 낙하 오프셋(px), pop: 사라지는 진행(1→0)
    sel: -1, phase: 'idle', score: 0, combo: 0, time: Math.round(TIME / diffMul()), revived: false,
    last: performance.now(), raf: 0, running: true, t0: performance.now(),
  };
  // 초기 보드 (시작부터 매치가 없게)
  do { for (let i = 0; i < COLS * ROWS; i++) { P.grid[i] = rnd(); P.oy[i] = 0; P.pop[i] = 0; } }
  while (findMatches().size);

  const cellAt = (e) => {
    const rect = canvas.getBoundingClientRect();
    const cx = Math.floor((e.clientX - rect.left) / cell), cy = Math.floor((e.clientY - rect.top) / cell);
    return (cx < 0 || cx >= COLS || cy < 0 || cy >= ROWS) ? -1 : cy * COLS + cx;
  };
  canvas.addEventListener('pointerdown', (e) => {
    if (!P || P.phase !== 'idle') return;
    const i = cellAt(e); if (i < 0) return;
    P.down = i; P.dragged = false;
    if (P.sel < 0) { P.sel = i; beep(660, 0.04); }
    else if (P.sel === i) { P.sel = -1; }
    else if (adjacent(P.sel, i)) { trySwap(P.sel, i); P.sel = -1; }
    else { P.sel = i; beep(660, 0.04); }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!P || P.phase !== 'idle' || P.down == null || P.dragged) return;
    const i = cellAt(e);
    if (i >= 0 && i !== P.down && adjacent(P.down, i)) { P.dragged = true; trySwap(P.down, i); P.sel = -1; P.down = null; } // 슬라이드 스왑
  });
  const endDrag = () => { if (P) P.down = null; };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  P.raf = requestAnimationFrame(loop);

  function rnd() { return Math.floor(Math.random() * KINDS.length); }
  function adjacent(a, b) {
    const ax = a % COLS, ay = (a / COLS) | 0, bx = b % COLS, by = (b / COLS) | 0;
    return Math.abs(ax - bx) + Math.abs(ay - by) === 1;
  }
  function trySwap(a, b) {
    P.phase = 'swap'; P.swap = { a, b, t: 0, back: false }; // 부드러운 이동 애니메이션
  }
  // 스왑 애니메이션 진행(loop에서 호출)
  function stepSwap(dt) {
    const sw = P.swap; if (!sw) return;
    sw.t += dt / 0.2; // 0.2초 이동
    if (sw.t < 1) return;
    if (!sw.back) {
      [P.grid[sw.a], P.grid[sw.b]] = [P.grid[sw.b], P.grid[sw.a]];
      if (findMatches().size === 0) { sw.back = true; sw.t = 0; beep(200, 0.12, 'square', 0.08); buzz(20); [P.grid[sw.a], P.grid[sw.b]] = [P.grid[sw.b], P.grid[sw.a]]; return; }
      P.swap = null; P.combo = 0; buzz(10); resolve();
    } else { P.swap = null; P.phase = 'idle'; }
  }
  function findMatches() {
    const m = new Set();
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS - 2; c++) {
      const i = r * COLS + c, v = P.grid[i];
      if (v < 0) continue;
      if (P.grid[i + 1] === v && P.grid[i + 2] === v) { m.add(i); m.add(i + 1); m.add(i + 2); let k = c + 3; while (k < COLS && P.grid[r * COLS + k] === v) { m.add(r * COLS + k); k++; } }
    }
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS - 2; r++) {
      const i = r * COLS + c, v = P.grid[i];
      if (v < 0) continue;
      if (P.grid[i + COLS] === v && P.grid[i + 2 * COLS] === v) { m.add(i); m.add(i + COLS); m.add(i + 2 * COLS); let k = r + 3; while (k < ROWS && P.grid[k * COLS + c] === v) { m.add(k * COLS + c); k++; } }
    }
    return m;
  }
  function resolve() {
    const m = findMatches();
    if (m.size === 0) { P.phase = 'idle'; return; }
    P.combo += 1;
    const gain = Math.round(m.size * 10 * P.combo);
    P.score += gain;
    setHud(P.combo > 1 ? `🔥 연쇄 ×${P.combo}` : '');
    beep(700 + P.combo * 80, 0.07); if (P.combo > 1) chord([523, 659, 784].slice(0, P.combo)); buzz(8 + P.combo * 4);
    P.shakeT = Math.min(0.35, 0.08 + m.size * 0.02 + P.combo * 0.04); P.shakeA = 3 + P.combo * 2; // 타격감
    for (const i of m) P.pop[i] = 1; // 팝 애니메이션 시작
    setTimeout(() => {
      for (const i of m) { P.grid[i] = -1; P.pop[i] = 0; }
      collapse();
      setTimeout(resolve, 210); // 캐스케이드
    }, 170);
  }
  function collapse() {
    for (let c = 0; c < COLS; c++) {
      const survivors = []; // 아래→위 순서로 살아남은 재료
      for (let r = ROWS - 1; r >= 0; r--) { const v = P.grid[r * COLS + c]; if (v >= 0) survivors.push(v); }
      const refill = ROWS - survivors.length; // 위에서 새로 떨어지는 개수
      for (let r = ROWS - 1, k = 0; r >= 0; r--, k++) {
        const idx = r * COLS + c;
        if (k < survivors.length) {
          P.grid[idx] = survivors[k];
          P.oy[idx] = -refill * cell; // 빈 자리만큼 위에서 내려오는 느낌
        } else {
          P.grid[idx] = rnd();
          P.oy[idx] = -(k + 1) * cell; // 새 재료는 화면 위에서 등장
        }
      }
    }
  }
  function setHud(comboTxt) {
    const s = document.getElementById('pz-score'); if (s) s.textContent = P.score;
    const cb = document.getElementById('pz-combo'); if (cb) cb.textContent = comboTxt || '';
  }

  function loop(now) {
    if (!P || !P.running) return;
    const dt = Math.min(0.034, (now - P.last) / 1000); P.last = now;
    if (!P.canvas.isConnected) { P.running = false; return; }
    if (P.phase !== 'swap') P.time -= dt; // 스왑 애니 중엔 시간 정지
    const tEl = document.getElementById('pz-time'); if (tEl) tEl.textContent = Math.max(0, P.time).toFixed(1) + '초';
    if (P.phase === 'swap') stepSwap(dt);
    // 낙하 이징 (부드럽게 — 속도 완화 + 가속감)
    for (let i = 0; i < P.oy.length; i++) if (P.oy[i] < 0) { P.oy[i] = Math.min(0, P.oy[i] + dt * (700 + (-P.oy[i]) * 6)); }
    for (let i = 0; i < P.pop.length; i++) if (P.pop[i] > 0) P.pop[i] = Math.max(0, P.pop[i] - dt * 4);
    render(); setHud();
    if (P.time <= 0) { offerPuzzleTime(); return; }
    P.raf = requestAnimationFrame(loop);
  }
  function render() {
    const c = P.ctx;
    c.clearRect(0, 0, P.W, P.H);
    c.save();
    if (P.shakeT > 0) { P.shakeT -= 1 / 60; const a = P.shakeA * Math.max(0, P.shakeT) * 3; c.translate((Math.random() - 0.5) * a, (Math.random() - 0.5) * a); }
    // 따뜻한 주방 톤(시안: 매치3 라이트 필드)
    const bg = c.createLinearGradient(0, 0, 0, P.H);
    bg.addColorStop(0, '#ffe7c2'); bg.addColorStop(0.5, '#ffd49a'); bg.addColorStop(1, '#ffc074');
    c.fillStyle = bg; c.fillRect(-20, -20, P.W + 40, P.H + 40);
    // 스왑 이동 오프셋(부드럽게 — easeInOut)
    let sox = {}, soy = {};
    if (P.swap) {
      const sw = P.swap, f0 = Math.max(0, Math.min(1, sw.t)), f = sw.back ? 1 - f0 : f0, e = f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
      const ax = sw.a % COLS, ay = (sw.a / COLS) | 0, bx = sw.b % COLS, by = (sw.b / COLS) | 0;
      sox[sw.a] = (bx - ax) * cell * e; soy[sw.a] = (by - ay) * cell * e;
      sox[sw.b] = (ax - bx) * cell * e; soy[sw.b] = (ay - by) * cell * e;
    }
    for (let r = 0; r < ROWS; r++) for (let col = 0; col < COLS; col++) {
      const idx = r * COLS + col, v = P.grid[idx];
      if (v < 0) continue;
      const x = col * cell + (sox[idx] || 0), y = r * cell + (P.oy[idx] || 0) + (soy[idx] || 0);
      const k = KINDS[v];
      const sc = P.pop[idx] > 0 ? P.pop[idx] : 1;
      const pad = cell * 0.08 + (1 - sc) * cell * 0.4;
      c.globalAlpha = P.pop[idx] > 0 ? P.pop[idx] : 1;
      c.fillStyle = idx === P.sel ? '#ffe9a8' : k.c;
      roundRect(c, x + pad, y + pad, cell - pad * 2, cell - pad * 2, cell * 0.24); c.fill();
      if (idx === P.sel) { c.strokeStyle = '#ff8a3d'; c.lineWidth = 3; c.stroke(); }
      c.globalAlpha = P.pop[idx] > 0 ? P.pop[idx] : 1;
      c.font = `${Math.round(cell * 0.52)}px serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(k.e, x + cell / 2, y + cell / 2 + 1);
    }
    c.globalAlpha = 1; c.textBaseline = 'alphabetic';
    c.restore();
  }
  function roundRect(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function offerPuzzleTime() {
    cancelAnimationFrame(P.raf);
    const stage = canvas.parentElement;
    if (!stage || P.revived) { endPuzzle(); return; }
    const ov = document.createElement('div'); ov.className = 'draft-overlay';
    ov.innerHTML = `<div class="draft-in"><div class="draft-title">⏰ 시간 종료</div>
      <p>광고 한 번이면 <b>+20초</b> 더 — 콤보를 이어가세요</p>
      <button class="gx-btn-go" id="pz-rev">📺 광고 보고 +20초</button>
      <button class="qz-skip" id="pz-end">결과 보기</button></div>`;
    stage.appendChild(ov);
    ov.querySelector('#pz-rev').onclick = () => { ov.remove(); inStageAd(stage, '광고 보고 +20초', () => { P.revived = true; P.time = 20; P.last = performance.now(); P.raf = requestAnimationFrame(loop); }, () => endPuzzle()); };
    ov.querySelector('#pz-end').onclick = () => { ov.remove(); endPuzzle(); };
  }
  function endPuzzle() {
    const s = P; P = null; cancelAnimationFrame(s.raf);
    beep(160, 0.25, 'square', 0.1);
    finishGame('puzzle', '🍎 재료 매치', s.score, `${s.score}점`, 'UI.gamePuzzle()');
  }
}
