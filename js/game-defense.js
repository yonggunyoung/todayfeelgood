// 냉장고 지키기 — 웨이브 디펜스. 상한 음식·세균·곰팡이가 냉장고로 진격하면 탭으로 처치한다.
// 캔버스 단독 렌더 + 파티클·화면흔들림·콤보·보스로 타격감/중독성. 귀여운 눈 중심 캐릭터(팔다리 없음).
import { gameUI, beep, chord, buzz, finishGame } from './games.js';

// 적 도감 — 색(슬라임 바디) + 눈 + 상징 이모지 배지. cute하고 종류가 다양하게.
const TYPES = [
  { key: 'mold',  color: '#86c06a', badge: '🍞', score: 10, spd: 38, r: 24, name: '곰팡이' },
  { key: 'germ',  color: '#b18be0', badge: '🦠', score: 12, spd: 52, r: 21, name: '세균' },
  { key: 'sour',  color: '#e7e08a', badge: '🥛', score: 9,  spd: 34, r: 25, name: '쉰우유' },
  { key: 'bug',   color: '#6b5340', badge: '🐛', score: 16, spd: 70, r: 17, name: '벌레' },
  { key: 'rot',   color: '#d99a55', badge: '🍗', score: 14, spd: 46, r: 23, name: '상한배달' },
  { key: 'fish',  color: '#8fb6c9', badge: '🐟', score: 13, spd: 50, r: 22, name: '비린생선' },
];
const POWER = [
  { key: 'freeze', glyph: '❄️', name: '냉기' },
  { key: 'bomb',   glyph: '💣', name: '급속냉동' },
  { key: 'heal',   glyph: '❤️', name: '온도복구' },
];

let G = null;

export function gameDefense() {
  const ui = gameUI();
  ui.openSheet(`
    <div class="g-hubhead"><h2 style="margin:0">🧊 냉장고 지키기</h2>
      <button class="btn btn-sm" onclick="UI.closeSheet()">✕</button></div>
    <p class="sub" style="margin:2px 0 8px">상한 것들이 냉장고로! <b>탭으로 막아내세요</b> · ❄️💣❤️ 아이템도 탭</p>
    <div class="dfz-wrap"><canvas id="dfz" class="dfz-canvas"></canvas>
      <div class="dfz-start" id="dfz-start"><div><div style="font-size:2.6rem">🧊🛡️</div>
        <b>냉장고를 지켜라!</b><p>다가오는 상한 음식을 탭으로 처치<br>3번 뚫리면 끝 — 웨이브가 갈수록 거세져요</p>
        <button class="btn btn-primary btn-block" id="dfz-go" style="margin-top:12px">시작!</button></div></div>
    </div>`);
  const canvas = document.getElementById('dfz');
  const wrap = canvas.parentElement;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const cssW = wrap.clientWidth || 340;
  const cssH = 400;
  canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px';
  canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  G = {
    ctx, canvas, W: cssW, H: cssH, dpr,
    enemies: [], powers: [], parts: [], floats: [],
    hp: 3, score: 0, kills: 0, combo: 1, maxCombo: 1,
    wave: 0, toSpawn: 0, gap: 1.1, since: 0, baseSpd: 1, pool: 2,
    freezeT: 0, shake: 0, flash: 0, hurt: 0, banner: '', bannerT: 0,
    last: 0, raf: 0, running: false, over: false,
  };
  const floorY = () => G.H - 64; // 냉장고 입구 윗선

  document.getElementById('dfz-go').onclick = () => {
    document.getElementById('dfz-start')?.remove();
    try { beep(660, 0.05); } catch { /* audioctx warmup */ }
    nextWave();
    G.running = true; G.last = performance.now();
    G.raf = requestAnimationFrame(loop);
  };

  canvas.addEventListener('pointerdown', (e) => {
    if (!G || !G.running) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left), y = (e.clientY - rect.top);
    tapAt(x, y);
  });

  function nextWave() {
    G.wave += 1;
    G.toSpawn = 4 + G.wave * 2;
    G.gap = Math.max(0.32, 1.15 - G.wave * 0.07);
    G.baseSpd = 1 + G.wave * 0.06;
    G.pool = Math.min(TYPES.length, 2 + Math.floor(G.wave / 1.5));
    G.banner = (G.wave % 5 === 0) ? `⚠ 보스 웨이브 ${G.wave}` : `WAVE ${G.wave}`;
    G.bannerT = 1.6;
    if (G.wave % 5 === 0) spawnBoss();
    chord([392, 523, 659]);
  }
  function spawnEnemy() {
    const t = TYPES[Math.floor(Math.random() * G.pool)];
    G.enemies.push({
      x: 30 + Math.random() * (G.W - 60), y: -30, t,
      r: t.r, hp: 1, max: 1, spd: t.spd * G.baseSpd,
      ph: Math.random() * 6.28, blink: 2 + Math.random() * 3, eye: 0, boss: false,
    });
  }
  function spawnBoss() {
    G.enemies.push({
      x: G.W / 2, y: -60, t: { color: '#5a8a3c', badge: '👹', score: 120, name: '곰팡이대왕' },
      r: 46, hp: 8 + G.wave, max: 8 + G.wave, spd: 20 * G.baseSpd,
      ph: 0, blink: 3, eye: 0, boss: true, minionT: 1.4,
    });
  }
  function dropPower() {
    const p = POWER[Math.floor(Math.random() * POWER.length)];
    G.powers.push({ x: 28 + Math.random() * (G.W - 56), y: -24, r: 19, spd: 60, p, ph: Math.random() * 6.28 });
  }

  function tapAt(x, y) {
    // 파워업 우선 (위에 그려지므로)
    for (let i = G.powers.length - 1; i >= 0; i--) {
      const pw = G.powers[i];
      if ((x - pw.x) ** 2 + (y - pw.y) ** 2 <= (pw.r + 8) ** 2) {
        usePower(pw.p.key); G.powers.splice(i, 1); spawnParts(pw.x, pw.y, '#bfe3ff', 14); return;
      }
    }
    // 적 — 가장 앞(아래)쪽 우선
    let hit = -1, best = -1;
    for (let i = 0; i < G.enemies.length; i++) {
      const en = G.enemies[i];
      const rr = (en.r + 10) ** 2;
      if ((x - en.x) ** 2 + (y - en.y) ** 2 <= rr && en.y > best) { best = en.y; hit = i; }
    }
    if (hit < 0) { G.combo = 1; return; } // 헛탭 → 콤보 끊김
    const en = G.enemies[hit];
    en.hp -= 1;
    if (en.boss && en.hp > 0) { en.flash = 0.12; beep(220, 0.05, 'square', 0.1); buzz(8); G.shake = 4; return; }
    // 처치
    const gain = Math.round(en.t.score * G.combo);
    G.score += gain; G.kills += 1;
    G.combo = Math.min(6, G.combo + 1); G.maxCombo = Math.max(G.maxCombo, G.combo);
    spawnParts(en.x, en.y, en.t.color, en.boss ? 30 : 12);
    G.floats.push({ x: en.x, y: en.y, txt: `+${gain}`, t: 0.9, vy: -34, big: en.boss });
    G.enemies.splice(hit, 1);
    if (en.boss) { chord([523, 659, 784, 1047]); buzz([18, 30, 18]); G.shake = 9; dropPower(); }
    else { beep(700 + G.combo * 60, 0.06); buzz(6); }
  }
  function usePower(key) {
    if (key === 'freeze') { G.freezeT = 2.6; chord([880, 988, 1175]); G.flash = 0.25; }
    else if (key === 'bomb') {
      chord([300, 240, 180], 0.16, 'sawtooth'); G.shake = 12;
      for (const en of G.enemies) { G.score += en.t.score; G.kills += 1; spawnParts(en.x, en.y, en.t.color, 10); }
      G.enemies = []; G.floats.push({ x: G.W / 2, y: G.H / 2, txt: '급속냉동!', t: 1.1, vy: -20, big: true });
    } else if (key === 'heal') { G.hp = Math.min(3, G.hp + 1); chord([659, 880, 1047]); G.floats.push({ x: G.W / 2, y: floorY() - 30, txt: '+1 ❤', t: 1, vy: -26 }); }
    buzz(14);
  }
  function spawnParts(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.28, sp = 40 + Math.random() * 150;
      G.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, t: 0.5 + Math.random() * 0.4, r: 2 + Math.random() * 4, color });
    }
  }

  function loop(now) {
    if (!G || !G.running) return;
    const dt = Math.min(0.034, (now - G.last) / 1000); G.last = now;
    if (!G.canvas.isConnected) { G.running = false; return; } // 시트 닫힘
    update(dt); render();
    if (G.over) { endDefense(); return; }
    G.raf = requestAnimationFrame(loop);
  }

  function update(dt) {
    const frozen = G.freezeT > 0;
    if (frozen) G.freezeT -= dt;
    G.bannerT -= dt; G.shake *= 0.86; G.flash *= 0.9; G.hurt *= 0.9;
    // 스폰
    if (G.toSpawn > 0) {
      G.since += dt;
      if (G.since >= G.gap) { G.since = 0; spawnEnemy(); G.toSpawn -= 1; }
    } else if (G.enemies.length === 0) {
      nextWave();
    }
    // 가끔 파워업
    if (Math.random() < dt * 0.12 && G.powers.length < 2) dropPower();

    const fy = floorY();
    for (let i = G.enemies.length - 1; i >= 0; i--) {
      const en = G.enemies[i];
      en.ph += dt * 3; en.eye -= dt;
      if (en.flash) en.flash -= dt;
      if (!frozen) en.y += en.spd * dt;
      en.x += Math.sin(en.ph) * 8 * dt;
      if (en.boss && !frozen) { en.minionT -= dt; if (en.minionT <= 0) { en.minionT = 1.6; if (G.enemies.length < 14) spawnEnemy(); } }
      if (en.y >= fy) { // 냉장고 침투
        G.enemies.splice(i, 1); G.hp -= 1; G.combo = 1; G.shake = 10; G.hurt = 1;
        beep(120, 0.22, 'square', 0.14); buzz([50, 40, 60]);
        G.floats.push({ x: en.x, y: fy - 6, txt: '뚫림!', t: 0.9, vy: -24, bad: true });
        if (G.hp <= 0) G.over = true;
      }
    }
    for (let i = G.powers.length - 1; i >= 0; i--) {
      const pw = G.powers[i]; pw.ph += dt * 3; pw.y += pw.spd * dt; pw.x += Math.sin(pw.ph) * 6 * dt;
      if (pw.y > fy + 30) G.powers.splice(i, 1);
    }
    for (let i = G.parts.length - 1; i >= 0; i--) {
      const p = G.parts[i]; p.t -= dt; if (p.t <= 0) { G.parts.splice(i, 1); continue; }
      p.vy += 320 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    }
    for (let i = G.floats.length - 1; i >= 0; i--) {
      const f = G.floats[i]; f.t -= dt; if (f.t <= 0) { G.floats.splice(i, 1); continue; } f.y += f.vy * dt;
    }
  }

  function render() {
    const c = G.ctx, W = G.W, H = G.H;
    c.save();
    if (G.shake > 0.4) c.translate((Math.random() - 0.5) * G.shake, (Math.random() - 0.5) * G.shake);
    // 냉장고 내부 배경 (차가운 그라데이션 + 성에)
    const bg = c.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#dff1fb'); bg.addColorStop(1, '#bfe0f2');
    c.fillStyle = bg; c.fillRect(-20, -20, W + 40, H + 40);
    c.globalAlpha = 0.5; c.fillStyle = '#fff';
    for (let i = 0; i < 5; i++) { const lx = (i + 0.5) * W / 5; c.fillRect(lx - 1, 0, 2, floorY()); }
    c.globalAlpha = 1;
    if (G.freezeT > 0) { c.fillStyle = 'rgba(150,210,255,0.28)'; c.fillRect(-20, -20, W + 40, H + 40); }

    drawFridge(c, W, floorY(), H);
    for (const en of G.enemies) drawCreature(c, en);
    for (const pw of G.powers) drawPower(c, pw);
    for (const p of G.parts) { c.globalAlpha = Math.max(0, p.t * 2); c.fillStyle = p.color; c.beginPath(); c.arc(p.x, p.y, p.r, 0, 6.28); c.fill(); }
    c.globalAlpha = 1;
    for (const f of G.floats) {
      c.globalAlpha = Math.min(1, f.t * 1.6);
      c.fillStyle = f.bad ? '#e8503a' : (f.big ? '#ff8a3d' : '#1d2733');
      c.font = `800 ${f.big ? 26 : 17}px Pretendard, sans-serif`; c.textAlign = 'center';
      c.fillText(f.txt, f.x, f.y);
    }
    c.globalAlpha = 1;
    // HUD
    c.fillStyle = '#1d2733'; c.font = '800 16px Pretendard, sans-serif'; c.textAlign = 'left';
    c.fillText(`${G.score}`, 12, 26);
    c.font = '700 12px Pretendard, sans-serif'; c.fillStyle = '#6b7280';
    c.fillText(`WAVE ${G.wave}`, 12, 44);
    c.textAlign = 'right'; c.font = '16px serif';
    c.fillText('❤'.repeat(Math.max(0, G.hp)) + '🤍'.repeat(Math.max(0, 3 - G.hp)), W - 10, 24);
    if (G.combo > 1) { c.textAlign = 'center'; c.fillStyle = '#ff8a3d'; c.font = '800 15px Pretendard, sans-serif'; c.fillText(`🔥 콤보 ×${G.combo}`, W / 2, 24); }
    // 위험 비네트
    if (G.hp <= 1 || G.hurt > 0.05) {
      c.strokeStyle = `rgba(232,80,58,${G.hp <= 1 ? 0.35 + Math.sin(performance.now() / 180) * 0.2 : G.hurt * 0.6})`;
      c.lineWidth = 9; c.strokeRect(3, 3, W - 6, H - 6);
    }
    // 웨이브 배너
    if (G.bannerT > 0) {
      c.globalAlpha = Math.min(1, G.bannerT * 1.4);
      c.fillStyle = G.banner.includes('보스') ? '#e8503a' : '#1d2733';
      c.font = '900 30px Pretendard, sans-serif'; c.textAlign = 'center';
      c.fillText(G.banner, W / 2, H / 2);
      c.globalAlpha = 1;
    }
    c.restore();
  }

  function drawFridge(c, W, topY, H) {
    // 입구(문 열린 냉장고) — 하단 가로 바, 가운데 귀여운 얼굴
    c.fillStyle = '#eef4f8'; c.strokeStyle = '#9fb6c4'; c.lineWidth = 2;
    roundRect(c, 8, topY, W - 16, H - topY - 6, 14); c.fill(); c.stroke();
    c.fillStyle = '#d4e6f0'; roundRect(c, 16, topY + 8, W - 32, H - topY - 22, 10); c.fill();
    // 브랜드 얼굴 (눈)
    const cx = W / 2, ey = topY + 26;
    c.fillStyle = '#fff'; eye(c, cx - 16, ey, 8); eye(c, cx + 16, ey, 8);
    c.fillStyle = '#1d2733';
    const look = G.hurt > 0.1 ? 0 : 2;
    c.beginPath(); c.arc(cx - 16, ey + look, 3.4, 0, 6.28); c.arc(cx + 16, ey + look, 3.4, 0, 6.28); c.fill();
    // 입: 평소 ◡, 아프면 ◠
    c.strokeStyle = '#1d2733'; c.lineWidth = 2.4; c.beginPath();
    if (G.hurt > 0.1) c.arc(cx, ey + 16, 7, Math.PI, 2 * Math.PI);
    else c.arc(cx, ey + 12, 7, 0, Math.PI);
    c.stroke();
  }
  function eye(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, 6.28); c.fill(); }

  function drawCreature(c, en) {
    const sx = 1 + Math.sin(en.ph) * 0.06, sy = 1 - Math.sin(en.ph) * 0.06;
    c.save(); c.translate(en.x, en.y); c.scale(sx, sy);
    // 그림자
    c.fillStyle = 'rgba(20,30,40,0.12)'; c.beginPath(); c.ellipse(0, en.r * 0.9, en.r * 0.8, en.r * 0.3, 0, 0, 6.28); c.fill();
    // 바디 (말랑 슬라임)
    c.fillStyle = en.flash > 0 ? '#fff' : en.t.color;
    blob(c, en.r);
    if (en.boss) { // 왕관
      c.fillStyle = '#ffd54d'; c.beginPath();
      c.moveTo(-en.r * 0.6, -en.r * 0.7); c.lineTo(-en.r * 0.3, -en.r * 1.05);
      c.lineTo(0, -en.r * 0.72); c.lineTo(en.r * 0.3, -en.r * 1.05); c.lineTo(en.r * 0.6, -en.r * 0.7);
      c.closePath(); c.fill();
    }
    // 눈 (깜빡임)
    const open = en.eye > 0 ? 0.12 : 1;
    if (en.eye <= 0 && Math.random() < 0.006) en.eye = 0.12;
    const er = en.r * 0.26;
    c.fillStyle = '#fff';
    c.save(); c.scale(1, open); c.beginPath(); c.arc(-en.r * 0.34, -en.r * 0.1, er, 0, 6.28); c.arc(en.r * 0.34, -en.r * 0.1, er, 0, 6.28); c.fill(); c.restore();
    if (open > 0.5) {
      c.fillStyle = '#222'; c.beginPath();
      c.arc(-en.r * 0.34, -en.r * 0.04, er * 0.5, 0, 6.28); c.arc(en.r * 0.34, -en.r * 0.04, er * 0.5, 0, 6.28); c.fill();
    }
    // 찡그린 입
    c.strokeStyle = '#3a2a2a'; c.lineWidth = 2; c.beginPath(); c.arc(0, en.r * 0.5, en.r * 0.28, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
    // 상징 배지
    c.font = `${Math.round(en.r * 0.85)}px serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.globalAlpha = 0.95; c.fillText(en.t.badge, 0, en.r * 0.12); c.globalAlpha = 1;
    c.textBaseline = 'alphabetic';
    // 보스 HP 바
    if (en.boss) {
      c.fillStyle = 'rgba(0,0,0,0.25)'; roundRect(c, -en.r, -en.r - 14, en.r * 2, 6, 3); c.fill();
      c.fillStyle = '#e8503a'; roundRect(c, -en.r, -en.r - 14, en.r * 2 * (en.hp / en.max), 6, 3); c.fill();
    }
    c.restore();
  }
  function blob(c, r) {
    c.beginPath();
    for (let a = 0; a <= 6.2832; a += 0.4) {
      const rr = r * (1 + Math.sin(a * 3) * 0.04);
      const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
      a === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
    }
    c.closePath(); c.fill();
  }
  function drawPower(c, pw) {
    c.save(); c.translate(pw.x, pw.y + Math.sin(pw.ph) * 2);
    c.shadowColor = 'rgba(80,170,255,0.7)'; c.shadowBlur = 14;
    c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, pw.r, 0, 6.28); c.fill();
    c.shadowBlur = 0; c.font = `${Math.round(pw.r * 1.3)}px serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(pw.p.glyph, 0, 1); c.textBaseline = 'alphabetic';
    c.restore();
  }
  function roundRect(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }

  function endDefense() {
    const s = G; G = null;
    cancelAnimationFrame(s.raf);
    beep(160, 0.3, 'square', 0.12);
    finishGame('defense', '🧊 냉장고 지키기', s.score, `${s.score}점`,
      'UI.gameDefense()', { extra: `${s.wave}웨이브 · ${s.kills}마리 처치 · 최대 콤보 ×${s.maxCombo}` });
  }
}
