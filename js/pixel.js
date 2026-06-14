// 픽셀 아트 스프라이트 시스템 — 디자인 시안(슬라임 냉장고)의 box-shadow 스프라이트 렌더러를
// 캔버스용으로 1:1 포팅. 절차적 슬라임/냉장고 + 아이템 스프라이트, 1px 베이크 후 nearest-neighbor 확대로 선명.
// 팔레트·조형은 시안 원본 그대로(out #160b22, mint #5ef0b0, rot/bac/mold/boss …).

export const C = {
  out: '#160b22', white: '#f6f1ff',
  mint: '#5ef0b0', mintH: '#bdffe4', mintS: '#1f9a70',
  rot: '#a172d4', rotH: '#d2adf0', rotS: '#5c3789',
  bac: '#ff5d9e', bacH: '#ffb6d7', bacS: '#c42a76',
  mold: '#2fcaa6', moldH: '#9bffe6', moldS: '#178a73',
  boss: '#9038c6', bossH: '#cf86ff', bossS: '#4d1c7a',
  yellow: '#ffe04a', yellowS: '#d29a14',
  ice: '#73cbff', iceH: '#c8edff', iceS: '#2f7fd6',
  red: '#ff4d6a', dark: '#1c0f2b',
  steel: '#9fb2d6', steelH: '#d2dff5', steelS: '#5a6f9c',
  blush: '#ff7d9c', leaf: '#3fa34d', leafH: '#6fd07a', // 볼터치 + 잎/꼭지 토퍼(식자재 개성)
};
export const PAL = {
  mascot: { body: C.mint, hi: C.mintH, sh: C.mintS, out: C.out },
  rot: { body: C.rot, hi: C.rotH, sh: C.rotS, out: C.out },
  bac: { body: C.bac, hi: C.bacH, sh: C.bacS, out: C.out },
  mold: { body: C.mold, hi: C.moldH, sh: C.moldS, out: C.out },
  boss: { body: C.boss, hi: C.bossH, sh: C.bossS, out: C.out },
  amber: { body: '#e0a64b', hi: '#f6d690', sh: '#9c6f22', out: C.out },
  steel: { body: C.steel, hi: C.steelH, sh: C.steelS, out: C.out },
  ice: { body: C.ice, hi: C.iceH, sh: C.iceS, out: C.out },          // 냉동 속성
  bone: { body: '#e8e2d0', hi: '#fffaf0', sh: '#a89f86', out: C.out }, // 뼈 속성
  sludge: { body: '#7a8a3e', hi: '#aec06a', sh: '#46521f', out: C.out }, // 거대 음식물쓰레기
};

/* ── 눈/입 표정 (시안 포팅) ── */
function eyesOf(g, mask, N, cx, expr) {
  const eyeY = Math.round(N * 0.46), dx = Math.round(N * 0.18), lx = cx - dx, rx = cx + dx, er = N * 0.115;
  const set = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= N || y >= N || !mask[y][x]) return; g[y][x] = c; };
  const disc = (gx, gy, r, c) => { for (let y = Math.floor(gy - r); y <= Math.ceil(gy + r); y++) for (let x = Math.floor(gx - r); x <= Math.ceil(gx + r); x++) { if (x < 0 || y < 0 || x >= N || y >= N || !mask[y][x]) continue; if (Math.hypot(x - gx, y - gy) <= r + 0.2) g[y][x] = c; } };
  if (expr === 'blink' || expr === 'dull') {
    for (let x = Math.round(lx - er); x <= Math.round(lx + er); x++) set(x, eyeY, C.out);
    for (let x = Math.round(rx - er); x <= Math.round(rx + er); x++) set(x, eyeY, C.out);
  } else {
    const r = (expr === 'surprised' || expr === 'boss') ? er + 0.7 : er;
    disc(lx, eyeY, r, C.out); disc(rx, eyeY, r, C.out);
    set(lx - 0.6 * r, eyeY - 0.6 * r, C.white); set(rx - 0.6 * r, eyeY - 0.6 * r, C.white);
    if (expr === 'angry' || expr === 'boss') {
      const by = Math.round(eyeY - er - 1), span = Math.round(er * 2);
      for (let i = 0; i <= span; i++) { set(lx - er + i, by + Math.round(i * 0.55), C.out); set(rx - er + i, by + Math.round((span - i) * 0.55), C.out); }
    }
  }
}
function mouthOf(g, mask, N, cx, expr) {
  const my = Math.round(N * 0.66);
  const set = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= N || y >= N || !mask[y][x]) return; g[y][x] = c; };
  if (expr === 'happy') { set(cx - 2, my, C.out); set(cx + 2, my, C.out); set(cx - 1, my + 1, C.out); set(cx, my + 1, C.out); set(cx + 1, my + 1, C.out); }
  else if (expr === 'angry' || expr === 'boss') { set(cx - 2, my + 1, C.out); set(cx + 2, my + 1, C.out); set(cx - 1, my, C.out); set(cx, my, C.out); set(cx + 1, my, C.out); }
  else { set(cx - 1, my, C.out); set(cx, my, C.out); set(cx + 1, my, C.out); }
}
export function drips(g, N, cx) {
  [cx - 3, cx + 2].forEach((x0) => { const x = Math.round(x0); let by = -1; for (let y = N - 1; y >= 0; y--) { if (g[y][x] != null) { by = y; break; } } if (by >= 0) for (let k = 1; k <= 2; k++) if (by + k < N && g[by + k][x] == null) g[by + k][x] = C.rotS; });
}
function crown(g, N, cx) {
  const y = 1; const set = (x, yy, c) => { if (x >= 0 && yy >= 0 && x < N && yy < N) g[yy][x] = c; };
  for (let i = -3; i <= 3; i++) set(cx + i, y + 2, C.yellow);
  [-3, 0, 3].forEach((i) => { set(cx + i, y, C.yellow); set(cx + i, y + 1, C.yellow); });
  set(cx, y - 1, C.red);
}

/* ── 절차적 슬라임 (시안 포팅) ── */
// opts.blush: 볼터치(식자재 캐릭터 개성). extra: 토퍼(꼭지/잎/크라운 등)
export function slime(N, pal, expr, extra, opts = {}) {
  const g = []; for (let i = 0; i < N; i++) g.push(new Array(N).fill(null));
  const cx = (N - 1) / 2, rx = N * 0.42, dome = 0.5;
  for (let y = 0; y < N; y++) {
    const ny = y / (N - 1); let hw;
    if (ny < dome) { const t = (dome - ny) / dome; hw = rx * Math.sqrt(Math.max(0, 1 - t * t)); }
    else { const t = (ny - dome) / (1 - dome); hw = rx * (1 - 0.10 * t * t); }
    for (let x = 0; x < N; x++) if (Math.abs(x - cx) <= hw - 0.0001) g[y][x] = pal.body;
  }
  const mask = g.map((r) => r.map((c) => c != null));
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { if (!mask[y][x]) continue; let edge = false; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach((d) => { const xx = x + d[0], yy = y + d[1]; if (xx < 0 || yy < 0 || xx >= N || yy >= N || !mask[yy][xx]) edge = true; }); if (edge) g[y][x] = pal.out; }
  const hx = cx - rx * 0.42, hy = N * 0.30, hr = rx * 0.34;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (g[y][x] === pal.body && Math.hypot(x - hx, y - hy) <= hr) g[y][x] = pal.hi;
  const sb = Math.round(N * 0.76);
  for (let y = sb; y < N; y++) for (let x = 0; x < N; x++) if (g[y][x] === pal.body) g[y][x] = pal.sh;
  eyesOf(g, mask, N, cx, expr); mouthOf(g, mask, N, cx, expr);
  if (opts.blush) blushOn(g, N, cx, mask, opts.blush === true ? C.blush : opts.blush);
  if (extra) extra(g, N, cx, mask);
  return g;
}
// 볼터치 — 눈 아래 양 볼
function blushOn(g, N, cx, mask, col) {
  const by = Math.round(N * 0.56), dx = Math.round(N * 0.27), big = N > 16;
  [Math.round(cx - dx), Math.round(cx + dx)].forEach((x0) => {
    for (let yy = by; yy <= by + (big ? 1 : 0); yy++) for (let xx = x0; xx <= x0 + (big ? 1 : 0); xx++) { if (mask[yy] && mask[yy][xx]) g[yy][xx] = col; }
  });
}
// ── 식자재 토퍼(꼭지/잎) — 슬라임 윗변 위에 그린다 ──
const topSet = (g, N, x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < N && y < N) g[y][x] = c; };
function stemTop(g, N, cx) { topSet(g, N, cx, 0, C.leaf); topSet(g, N, cx, 1, C.leaf); topSet(g, N, cx - 1, 1, C.leafH); }
function leafTop(g, N, cx) { topSet(g, N, cx, 1, C.leaf); topSet(g, N, cx + 1, 0, C.leafH); topSet(g, N, cx + 1, 1, C.leaf); }
function leavesTop(g, N, cx) { [[-2, 2], [-1, 1], [0, 0], [1, 1], [2, 2]].forEach(([dx, dy]) => topSet(g, N, cx + dx, dy, dy < 1 ? C.leafH : C.leaf)); }
function bumpsTop(g, N, cx) {
  for (let x = Math.round(cx - N * 0.30); x <= Math.round(cx + N * 0.30); x++) {
    if (x < 0 || x >= N) continue;
    let ty = -1; for (let y = 0; y < N; y++) { if (g[y][x] != null) { ty = y; break; } }
    if (ty > 0) { topSet(g, N, x, ty - 1, ((x & 1) ? C.leafH : C.leaf)); if ((x & 1) === 0 && ty > 1) topSet(g, N, x, ty - 2, C.leaf); }
  }
}

/* ── 냉장고(거점) — 픽셀 + 카와이 얼굴 (시안 포팅·간소화) ── */
export function fridgeGrid() {
  const W = 22, H = 28, x0 = 2, y0 = 1, w = W - 4, h = H - 2, r = 3;
  const g = []; for (let i = 0; i < H; i++) g.push(new Array(W).fill(null));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const cxn = Math.min(x, w - 1 - x), cyn = Math.min(y, h - 1 - y); if (cxn < r && cyn < r && (r - cxn) * (r - cxn) + (r - cyn) * (r - cyn) > r * r + 1) continue; g[y0 + y][x0 + x] = C.steel; }
  const mask = g.map((row) => row.map((c) => c != null));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (g[y][x] === C.steel) { if (x <= x0 + 1) g[y][x] = C.steelH; else if (x >= x0 + w - 2) g[y][x] = C.steelS; } }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (!mask[y][x]) continue; let edge = false; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach((d) => { const xx = x + d[0], yy = y + d[1]; if (xx < 0 || yy < 0 || xx >= W || yy >= H || !mask[yy][xx]) edge = true; }); if (edge) g[y][x] = C.out; }
  const dy = y0 + Math.round(h * 0.34);
  for (let x = x0; x < x0 + w; x++) if (mask[dy][x]) g[dy][x] = C.out;
  const hx = x0 + w - 4;
  for (let y = y0 + 2; y < dy - 1; y++) if (mask[y][hx]) g[y][hx] = C.out;
  for (let y = dy + 2; y < y0 + h - 3; y++) if (mask[y][hx]) g[y][hx] = C.out;
  for (let x = x0 + 2; x < x0 + 6; x++) if (mask[y0 + 2][x]) g[y0 + 2][x] = C.iceH; // 성에
  // 카와이 얼굴 (하단 도어)
  const fey = dy + Math.round((y0 + h - dy) * 0.42), fcx = x0 + Math.round(w * 0.42);
  [[fcx - 3, fey], [fcx + 3, fey]].forEach((p) => { const ex = p[0], ey = p[1]; for (let yy = ey - 1; yy <= ey + 1; yy++) for (let xx = ex - 1; xx <= ex + 1; xx++) if (Math.hypot(xx - ex, yy - ey) <= 1.4 && mask[yy] && mask[yy][xx]) g[yy][xx] = C.out; if (g[ey - 1]) g[ey - 1][ex - 1] = C.iceH; });
  [[fcx - 2, fey + 3], [fcx - 1, fey + 4], [fcx, fey + 4], [fcx + 1, fey + 4], [fcx + 2, fey + 3]].forEach((p) => { if (mask[p[1]] && mask[p[1]][p[0]]) g[p[1]][p[0]] = C.out; });
  return g;
}

/* ── 문자열 스프라이트 (코인·발사체·아이템) ── */
export function mapGrid(rows, pal) {
  return rows.map((r) => r.split('').map((ch) => (ch === ' ' || ch === '.') ? null : (pal[ch] || null)));
}
export const ROWS = {
  coin: [' oooo ', 'oYhYYo', 'oYhYYo', 'oYYYYo', 'oYYYYo', ' oooo '],
  bolt: ['  I  ', ' III ', 'IIwII', ' III ', '  I  ', '  c  ', '  c  '],
  snow: ['    I    ', ' I  I  I ', '  I I I  ', '   III   ', 'IIIIhIIII', '   III   ', '  I I I  ', ' I  I  I ', '    I    '],
  bomb: ['       f   ', '      f    ', '     f     ', '   BBBB    ', '  BBBBBB   ', ' BBBBBBBB  ', ' BBBhBBBB  ', ' BBBBBBBB  ', ' BBBBBBBB  ', '  BBBBBB   ', '   BBBB    '],
  heart: [' oo  oo ', 'oPPooPPo', 'ohPPPPPo', 'oPPPPPPo', ' oPPPPo ', '  oPPo  ', '   oo   '],
  star: ['    Y    ', '    Y    ', '   YhY   ', 'oYYYYYYYo', ' YYYYYYY ', '  YYYYY  ', ' YYY YYY ', 'YYo   oYY'],
};
export const ITEM_PAL = {
  coin: { o: C.yellowS, Y: C.yellow, h: C.white },
  bolt: { I: C.mintH, w: C.white, c: C.mint },
  snow: { I: C.ice, h: C.iceH },
  bomb: { B: C.dark, h: C.white, f: C.yellow },
  heart: { o: C.bacS, P: C.bac, h: C.bacH },
  star: { Y: C.yellow, o: C.yellowS, h: C.white },
};

/* ── 베이크(1px 캔버스) + 캐시 ── */
function bakeGrid(grid, color) {
  const h = grid.length, w = grid[0].length;
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const x = cv.getContext('2d');
  for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) { const c = grid[y][xx]; if (c) { x.fillStyle = color || c; x.fillRect(xx, y, 1, 1); } }
  return cv;
}
const cache = new Map();
function cached(key, build) { let v = cache.get(key); if (!v) { v = build(); cache.set(key, v); } return v; }

// 적 도감 — 타입별 팔레트/크기/표정 (몬스터 다양화)
const ENEMY_SPR = {
  grunt:  { N: 18, pal: PAL.rot,   expr: 'angry', drip: true },
  swarm:  { N: 11, pal: PAL.bac,   expr: 'angry' },
  runner: { N: 14, pal: PAL.mold,  expr: 'angry' },
  tank:   { N: 24, pal: PAL.amber, expr: 'dull',  drip: true },
  shield: { N: 20, pal: PAL.steel, expr: 'angry' },
  split:  { N: 18, pal: PAL.mold,  expr: 'angry', drip: true },
  mini:   { N: 9,  pal: PAL.mold,  expr: 'angry' },
  // 맷집 강한 신종(속성 다양화) — 냉동/뼈/거대 폐기물
  frost:  { N: 26, pal: PAL.ice,   expr: 'dull',  drip: false },
  bone:   { N: 24, pal: PAL.bone,  expr: 'angry' },
  brute:  { N: 30, pal: PAL.sludge,expr: 'angry', drip: true },
  midboss:{ N: 30, pal: PAL.rot,   expr: 'boss',  drip: true },
  boss:   { N: 40, pal: PAL.boss,  expr: 'boss',  crown: true },
};
export function enemySprite(type, expr) {
  return cached(`e:${type}:${expr}`, () => {
    const d = ENEMY_SPR[type] || ENEMY_SPR.grunt;
    const ex = expr || d.expr;
    const extra = d.crown ? ((g, n, cx) => crown(g, n, cx)) : (d.drip ? ((g, n, cx) => drips(g, n, cx)) : null);
    const g = slime(d.N, d.pal, ex, extra);
    return { base: bakeGrid(g), white: bakeGrid(g, C.white), n: d.N };
  });
}
export function mascotSprite(expr = 'happy') { return cached(`m:${expr}`, () => ({ base: bakeGrid(slime(20, PAL.mascot, expr, null, { blush: true })), n: 20 })); }
// 식자재 슬라임 — 매치3 6종(색 + 꼭지/잎 토퍼 + 볼터치). 색맹 대응 형태마크는 게임에서 코너에 표기.
const vp = (body, hi, sh) => ({ body, hi, sh, out: C.out });
const VEG = {
  tomato:    { pal: vp('#ff5a4d', '#ff8a7d', '#c2371f'), top: stemTop },
  lemon:     { pal: vp('#ffd24a', '#ffe48a', '#c99a16'), top: leafTop },
  broccoli:  { pal: vp('#56c66a', '#8fe09f', '#2c7d3c'), top: bumpsTop },
  eggplant:  { pal: vp('#9b6bff', '#c4a6ff', '#5e3bb0'), top: stemTop },
  blueberry: { pal: vp('#5b8def', '#9ab8f7', '#2f57a8'), top: leafTop },
  carrot:    { pal: vp('#ff8a3d', '#ffb27a', '#c45e16'), top: leavesTop },
};
export function veggieSprite(key) {
  return cached(`v:${key}`, () => { const d = VEG[key] || VEG.tomato; return { base: bakeGrid(slime(18, d.pal, 'happy', d.top, { blush: true })), white: bakeGrid(slime(18, d.pal, 'happy', d.top, { blush: true }), C.white), n: 18 }; });
}
export function fridgeSprite() { return cached('fridge', () => { const g = fridgeGrid(); return { base: bakeGrid(g), white: bakeGrid(g, C.white), w: g[0].length, h: g.length }; }); }
export function itemSprite(key) { return cached(`i:${key}`, () => { const cv = bakeGrid(mapGrid(ROWS[key], ITEM_PAL[key])); return { base: cv, w: cv.width, h: cv.height }; }); }

/* ── 캔버스에 베이크 스프라이트 그리기 (nearest-neighbor 확대로 선명) ── */
export function drawSprite(ctx, cv, cx, cy, targetH, opt = {}) {
  const sx = (opt.sx || 1), sy = (opt.sy || 1);
  const scale = targetH / cv.height;
  const w = cv.width * scale * sx, h = cv.height * scale * sy;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (opt.alpha != null) ctx.globalAlpha = opt.alpha;
  if (opt.glow) { ctx.shadowColor = opt.glow; ctx.shadowBlur = opt.glowR || 14; }
  ctx.drawImage(cv, Math.round(cx - w / 2), Math.round(cy - h / 2), Math.round(w), Math.round(h));
  ctx.restore();
}
