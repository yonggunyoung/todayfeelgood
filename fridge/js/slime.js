// 슬라임 렌더러 + 게임필 툴킷 — 모든 미니게임이 공유하는 캐릭터/이펙트 언어.
// 브랜드 규칙: 팔다리 없는 말랑 바디 + 깜빡이는 눈 + 미세 호흡(살아있음). 이미지 에셋 0, 전부 프로시저럴.

/* ── 이징 ── */
export const ease = {
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inQuad: (t) => t * t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  outBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  outElastic: (t) => { if (t === 0 || t === 1) return t; const c4 = (2 * Math.PI) / 3; return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1; },
};
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* ── 색 도우미 ── */
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
  r = clamp(r, 0, 255); g = clamp(g, 0, 255); b = clamp(b, 0, 255);
  return `rgb(${r|0},${g|0},${b|0})`;
}

/* ── 말랑 슬라임 캐릭터 ──
   opts: {x,y,r,color,t,squash,blink,look:{x,y}|n, expr, badge, glow, alpha} */
export function drawSlime(ctx, o) {
  const { x, y, r, color = '#5ef0b0' } = o;
  const t = o.t || 0;
  const breath = Math.sin(t * 3.4) * 0.035;
  const sq = o.squash || 0;                 // +면 납작(가로↑/세로↓)
  const sx = 1 + breath + sq, sy = 1 - breath - sq * 0.8;
  ctx.save();
  ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
  ctx.translate(x, y);
  // 바닥 그림자
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath(); ctx.ellipse(0, r * 0.92, r * 0.82, r * 0.26, 0, 0, 6.283); ctx.fill();
  // 글로우(파워업·보스 등)
  if (o.glow) { ctx.shadowColor = color; ctx.shadowBlur = o.glow; }
  ctx.scale(sx, sy);
  // 젤리 바디 — 라디얼 그라데이션
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.2, 0, 0, r * 1.15);
  g.addColorStop(0, shade(color, 45));
  g.addColorStop(0.55, color);
  g.addColorStop(1, shade(color, -38));
  ctx.fillStyle = g;
  blobPath(ctx, r);
  ctx.fill();
  ctx.shadowBlur = 0;
  // 외곽선
  ctx.lineWidth = Math.max(1.5, r * 0.06); ctx.strokeStyle = shade(color, -60); ctx.stroke();
  // 젤리 광택
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath(); ctx.ellipse(-r * 0.32, -r * 0.42, r * 0.22, r * 0.13, -0.5, 0, 6.283); ctx.fill();
  ctx.scale(1 / sx, 1 / sy); // 눈/입은 왜곡 없이
  drawFace(ctx, r, o);
  ctx.restore();
}

function blobPath(ctx, r) {
  ctx.beginPath();
  for (let a = 0; a <= 6.2832; a += 0.35) {
    const rr = r * (1 + Math.sin(a * 3 + 0.6) * 0.035) * (a > 3.14 ? 1.02 : 1); // 아래가 살짝 무겁게
    const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
    a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawFace(ctx, r, o) {
  const blink = o.blink == null ? 1 : o.blink; // 0=감음 1=뜸
  const look = typeof o.look === 'object' ? o.look : { x: 0, y: o.look || 0 };
  const expr = o.expr || 'normal';
  const ex = r * 0.34, ey = -r * 0.06, ew = r * 0.27, eh = r * 0.32 * blink;
  // 화남: 눈썹
  if (expr === 'angry') {
    ctx.strokeStyle = 'rgba(40,20,30,0.85)'; ctx.lineWidth = r * 0.09; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-ex - ew * 0.7, ey - eh - r * 0.16); ctx.lineTo(-ex + ew * 0.5, ey - eh * 0.4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ex + ew * 0.7, ey - eh - r * 0.16); ctx.lineTo(ex - ew * 0.5, ey - eh * 0.4); ctx.stroke();
  }
  // 흰자
  ctx.fillStyle = '#fff';
  eyeEllipse(ctx, -ex, ey, ew, eh);
  eyeEllipse(ctx, ex, ey, ew, eh);
  // 동공
  if (blink > 0.35) {
    const px = clamp(look.x, -1, 1) * ew * 0.4, py = clamp(look.y, -1, 1) * eh * 0.4;
    ctx.fillStyle = '#1a1426';
    eyeEllipse(ctx, -ex + px, ey + py, ew * 0.5, eh * 0.5);
    eyeEllipse(ctx, ex + px, ey + py, ew * 0.5, eh * 0.5);
    // 캐치라이트
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    eyeEllipse(ctx, -ex + px - ew * 0.16, ey + py - eh * 0.16, ew * 0.13, eh * 0.13);
    eyeEllipse(ctx, ex + px - ew * 0.16, ey + py - eh * 0.16, ew * 0.13, eh * 0.13);
  }
  // 입
  ctx.strokeStyle = 'rgba(40,20,30,0.7)'; ctx.lineWidth = r * 0.06; ctx.lineCap = 'round';
  ctx.beginPath();
  if (expr === 'hurt') { ctx.arc(0, r * 0.45, r * 0.18, Math.PI * 1.15, Math.PI * 1.85); }
  else if (expr === 'happy') { ctx.arc(0, r * 0.32, r * 0.2, 0.15 * Math.PI, 0.85 * Math.PI); }
  else { ctx.arc(0, r * 0.5, r * 0.16, Math.PI * 1.1, Math.PI * 1.9); } // 살짝 찡그림(적 기본)
  ctx.stroke();
  // 상징 이모지 배지
  if (o.badge) {
    ctx.font = `${Math.round(r * 0.7)}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.globalAlpha = (o.alpha == null ? 1 : o.alpha) * 0.92;
    ctx.fillText(o.badge, 0, r * 0.04);
    ctx.textBaseline = 'alphabetic';
  }
}
function eyeEllipse(ctx, x, y, w, h) { ctx.beginPath(); ctx.ellipse(x, y, w, Math.max(0.5, h), 0, 0, 6.283); ctx.fill(); }

/* ── 깜빡임 상태 머신 (개체별 보관) ── */
export function blinkTick(st, dt) {
  st.blink = st.blink == null ? 1 : st.blink;
  st.next = st.next == null ? 1 + Math.random() * 3.5 : st.next;
  st.next -= dt;
  if (st.closing == null) st.closing = 0;
  if (st.closing > 0) { st.closing -= dt; st.blink = clamp(Math.abs(st.closing - 0.06) / 0.06, 0, 1); if (st.closing <= 0) st.blink = 1; }
  else if (st.next <= 0) { st.closing = 0.12; st.next = 1.5 + Math.random() * 3.5; }
  return st.blink;
}

/* ── 파티클 풀 ── */
export class Particles {
  constructor(max = 280) { this.max = max; this.p = []; }
  burst(x, y, color, n, opt = {}) {
    const spread = opt.spread || 1, up = opt.up || 0, sz = opt.size || 3.5, life = opt.life || 0.55;
    for (let i = 0; i < n; i++) {
      if (this.p.length >= this.max) break;
      const a = Math.random() * 6.283, sp = (40 + Math.random() * 150) * spread;
      this.p.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - up, life: life + Math.random() * 0.3, max: life + 0.3, r: sz * (0.6 + Math.random()), color, grav: opt.grav == null ? 320 : opt.grav });
    }
  }
  update(dt) {
    for (let i = this.p.length - 1; i >= 0; i--) {
      const q = this.p[i]; q.life -= dt;
      if (q.life <= 0) { this.p.splice(i, 1); continue; }
      q.vy += q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt;
    }
  }
  draw(ctx) {
    for (const q of this.p) {
      ctx.globalAlpha = clamp(q.life / q.max * 1.6, 0, 1);
      ctx.fillStyle = q.color;
      ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  get count() { return this.p.length; }
}

/* ── 화면 흔들림 (이징 감쇠) ── */
export class Shake {
  constructor() { this.t = 0; this.dur = 0; this.amp = 0; }
  add(amp, dur = 0.25) { if (amp > this.amp || this.t <= 0) { this.amp = amp; this.dur = dur; this.t = dur; } }
  apply(ctx, dt) {
    if (this.t <= 0) return;
    this.t -= dt;
    const k = clamp(this.t / this.dur, 0, 1), a = this.amp * k * k;
    ctx.translate((Math.random() - 0.5) * a, (Math.random() - 0.5) * a);
  }
}

/* ── 떠오르는 점수 텍스트 ── */
export class Floaters {
  constructor(max = 60) { this.f = []; this.max = max; }
  add(x, y, txt, opt = {}) { if (this.f.length >= this.max) this.f.shift(); this.f.push({ x, y, txt, t: opt.life || 0.9, max: opt.life || 0.9, vy: opt.vy || -38, color: opt.color || '#fff', size: opt.size || 17, font: opt.font || 'Jua' }); }
  update(dt) { for (let i = this.f.length - 1; i >= 0; i--) { const f = this.f[i]; f.t -= dt; if (f.t <= 0) { this.f.splice(i, 1); continue; } f.y += f.vy * dt; f.vy *= 0.94; } }
  draw(ctx) {
    ctx.textAlign = 'center';
    for (const f of this.f) {
      const p = f.t / f.max;
      ctx.globalAlpha = clamp(p * 1.5, 0, 1);
      ctx.font = `${f.size * (1 + (1 - p) * 0.2)}px ${f.font}, sans-serif`;
      ctx.fillStyle = f.color;
      ctx.fillText(f.txt, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }
}

/* ── 캔버스 셋업(DPR) ── */
export function setupCanvas(canvas, cssW, cssH) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px';
  canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  return { ctx, dpr, W: cssW, H: cssH };
}
