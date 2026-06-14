// 🧊 냉장고 지키기 — 자동공격 인크리멘탈 타워디펜스.
// 플레이어는 적을 직접 탭하지 않는다: 냉장고가 자동 발사 → 점수=코인으로 무기/방어수단 강화.
// 슬라임 렌더러 + 파티클·셰이크·히트스톱·코인흡수 손맛. 모든 밸런스는 BALANCE 한 곳.
import { gameUI, beep, chord, buzz, finishGame } from './games.js';
import { drawSlime, blinkTick, Particles, Shake, Floaters, ease, clamp, setupCanvas } from './slime.js';

const BALANCE = {
  enemy: {
    baseHP: 7, hpGrow: 1.135, countBase: 5, countGrow: 1.7,
    speedBase: 24, speedGrow: 1.03, speedCap: 64,
    types: {
      normal: { hpx: 1.0, spx: 1.0, dmg: 9,  r: 22, color: '#9bd36a', badge: '🍞', name: '곰팡이빵' },
      fast:   { hpx: 0.55, spx: 1.8, dmg: 6, r: 16, color: '#c58be0', badge: '🦠', name: '세균' },
      heavy:  { hpx: 2.8, spx: 0.6, dmg: 18, r: 27, color: '#d99a55', badge: '🍗', name: '상한배달' },
    },
  },
  economy: { scorePerHP: 0.75 },
  weapon: { dmg: 4, fireRate: 1.7, projSpeed: 480, projR: 6 },
  boss: { every: 5, hpMult: 13, dmg: 34, reward: 70 },
  up: {
    damage: { base: 22, ratio: 1.15, add: 3, name: '데미지', icon: '⚔️', unit: '발당' },
    fireRate: { base: 28, ratio: 1.17, add: 0.2, name: '연사속도', icon: '🔥', unit: '/초' },
    multiShot: { base: 110, ratio: 1.85, add: 1, max: 5, name: '다중샷', icon: '✳️', unit: '타겟' },
    pierce: { base: 85, ratio: 1.7, add: 1, max: 4, name: '관통', icon: '➶', unit: '관통' },
    crit: { base: 65, ratio: 1.4, add: 0.06, max: 0.6, name: '치명타', icon: '💥', unit: '확률' },
    sideTurret: { base: 190, ratio: 2.0, add: 1, max: 2, unlock: 140, name: '보조 포탑', icon: '🛰️', unit: '문' },
    frostAura: { base: 150, ratio: 1.8, add: 1, max: 5, unlock: 110, name: '냉기 오라', icon: '❄️', unit: 'Lv' },
    regen: { base: 100, ratio: 1.7, add: 0.6, name: '신선도 회복', icon: '❤️', unit: '/초' },
    maxHp: { base: 90, ratio: 1.55, add: 25, name: '단열 강화', icon: '🧊', unit: '최대' },
    boost: { base: 130, ratio: 1.65, add: 0.15, name: '코인 부스트', icon: '🪙', unit: '+' },
  },
};
const UP_ORDER = ['damage', 'fireRate', 'multiShot', 'pierce', 'crit', 'frostAura', 'sideTurret', 'regen', 'maxHp', 'boost'];

let D = null;

export function gameDefense() {
  const ui = gameUI();
  ui.openSheet(`
    <div class="gx gx-def">
      <div class="gx-bar">
        <b class="gx-title">🧊 냉장고 지키기</b>
        <button class="gx-x" onclick="UI.closeSheet()">✕</button>
      </div>
      <div class="gx-stage"><canvas id="def-c"></canvas>
        <div class="gx-start" id="def-start">
          <div class="gx-start-in">
            <div style="font-size:2.6rem">🧊🛡️</div>
            <b>냉장고가 알아서 쏩니다</b>
            <p>상한 것들이 몰려와요. 점수로 <b>무기·방어를 강화</b>해<br>최대한 오래 버티세요 — 탭은 강화 상점에만!</p>
            <button class="gx-btn-go" id="def-go">시작!</button>
          </div>
        </div>
      </div>
      <div class="gx-shop" id="def-shop"></div>
    </div>`);
  const canvas = document.getElementById('def-c');
  const wrap = canvas.parentElement;
  const cssW = clamp(wrap.clientWidth || 340, 280, 460);
  const cssH = 380;
  const { ctx } = setupCanvas(canvas, cssW, cssH);

  D = {
    ctx, canvas, W: cssW, H: cssH,
    enemies: [], shots: [], coinsFly: [], parts: new Particles(300), fx: new Floaters(), shake: new Shake(),
    lv: { damage: 0, fireRate: 0, multiShot: 0, pierce: 0, crit: 0, sideTurret: 0, frostAura: 0, regen: 0, maxHp: 0, boost: 0 },
    coins: 0, score: 0, kills: 0,
    wave: 0, toSpawn: 0, spawnGap: 1, since: 0,
    hp: 100, maxHp: 100,
    fireCd: 0, sideCd: 0, aimAng: -Math.PI / 2, muzzle: 0,
    banner: '', bannerT: 0, hitStop: 0, vign: 0, fridge: { blink: 1 },
    last: 0, raf: 0, running: false, over: false, shopT: 0,
  };

  document.getElementById('def-go').onclick = () => {
    document.getElementById('def-start')?.remove();
    beep(660, 0.05);
    nextWave();
    D.running = true; D.last = performance.now();
    renderShop();
    D.raf = requestAnimationFrame(loop);
  };
}

/* ── 능력치 ── */
const cost = (k) => Math.floor(BALANCE.up[k].base * Math.pow(BALANCE.up[k].ratio, D.lv[k]));
const maxed = (k) => BALANCE.up[k].max != null && D.lv[k] >= BALANCE.up[k].max;
const locked = (k) => BALANCE.up[k].unlock != null && D.score < BALANCE.up[k].unlock && D.lv[k] === 0;
const stat = {
  dmg: () => BALANCE.weapon.dmg + D.lv.damage * BALANCE.up.damage.add,
  rate: () => BALANCE.weapon.fireRate + D.lv.fireRate * BALANCE.up.fireRate.add,
  multi: () => 1 + D.lv.multiShot,
  pierce: () => D.lv.pierce,
  crit: () => D.lv.crit * BALANCE.up.crit.add,
  boost: () => 1 + D.lv.boost * BALANCE.up.boost.add,
};

function fridgePos() { return { x: D.W / 2, y: D.H - 30 }; }

function nextWave() {
  D.wave += 1;
  const boss = D.wave % BALANCE.boss.every === 0;
  D.toSpawn = boss ? 1 : Math.round(BALANCE.enemy.countBase + D.wave * BALANCE.enemy.countGrow);
  D.spawnGap = clamp(1.05 - D.wave * 0.035, 0.3, 1.05);
  D.banner = boss ? `⚠ 보스 — 곰팡이대왕` : `WAVE ${D.wave}`;
  D.bannerT = 1.7;
  D.bossWave = boss;
  chord([392, 523, 659]);
}

function spawnOne() {
  const w = D.wave;
  if (D.bossWave) {
    const hp = BALANCE.enemy.baseHP * Math.pow(BALANCE.enemy.hpGrow, w - 1) * BALANCE.boss.hpMult;
    D.enemies.push(mkEnemy('boss', hp, 46, '#5a8a3c', '👑', 16 + w * 1.5, BALANCE.boss.dmg, true));
    return;
  }
  // 타입 분포 (웨이브가 오를수록 빠른/무거운 적 비중↑)
  const r = Math.random();
  let key = 'normal';
  if (w >= 3 && r < 0.22) key = 'heavy';
  else if (w >= 2 && r < 0.55) key = 'fast';
  const t = BALANCE.enemy.types[key];
  const hp = BALANCE.enemy.baseHP * Math.pow(BALANCE.enemy.hpGrow, w - 1) * t.hpx;
  const spd = Math.min(BALANCE.enemy.speedCap, BALANCE.enemy.speedBase * Math.pow(BALANCE.enemy.speedGrow, w - 1)) * t.spx;
  D.enemies.push(mkEnemy(key, hp, t.r, t.color, t.badge, spd, t.dmg, false));
}
function mkEnemy(key, hp, r, color, badge, spd, dmg, boss) {
  return {
    key, hp, maxhp: hp, r, color, badge, spd, dmg, boss,
    x: 24 + Math.random() * (D.W - 48), y: -r - 6,
    ph: Math.random() * 6.28, blinkS: { blink: 1 }, flash: 0, squash: 0,
    minionT: 1.6,
  };
}

/* ── 발사 ── */
function fireFrom(x, y, targets) {
  for (const tg of targets) {
    const ang = Math.atan2(tg.y - y, tg.x - x);
    D.aimAng = ang;
    D.shots.push({
      x, y, vx: Math.cos(ang) * BALANCE.weapon.projSpeed, vy: Math.sin(ang) * BALANCE.weapon.projSpeed,
      dmg: stat.dmg() * (Math.random() < stat.crit() ? 2 : 1), crit: false, pierce: stat.pierce(), hit: new Set(),
    });
  }
  D.muzzle = 0.08;
  beep(680 + Math.random() * 80, 0.04, 'square', 0.07);
}
function pickTargets(n) {
  // 가장 진격한(아래쪽) 적 N
  return [...D.enemies].sort((a, b) => b.y - a.y).slice(0, n);
}

function hitEnemy(en, dmg, fromX, fromY) {
  en.hp -= dmg; en.flash = 0.1; en.squash = 0.22;
  D.parts.burst(en.x, en.y, '#fff', 4, { spread: 0.5, life: 0.25 });
  if (en.boss) { D.hitStop = Math.max(D.hitStop, 0.04); D.shake.add(3, 0.12); }
  if (en.hp <= 0) killEnemy(en);
}
function killEnemy(en) {
  const idx = D.enemies.indexOf(en); if (idx < 0) return;
  D.enemies.splice(idx, 1); D.kills += 1;
  D.parts.burst(en.x, en.y, en.color, en.boss ? 30 : 12, { up: 30, life: 0.5 });
  const gain = Math.max(1, Math.floor(en.maxhp * BALANCE.economy.scorePerHP * stat.boost())) + (en.boss ? BALANCE.boss.reward : 0);
  D.score += gain;
  D.coinsFly.push({ x: en.x, y: en.y, t: 0, val: gain });
  D.fx.add(en.x, en.y, `+${gain}`, { color: '#ffe04a', size: en.boss ? 24 : 16, font: 'Jua' });
  if (en.boss) { chord([523, 659, 784, 1047]); D.shake.add(10, 0.4); D.hp = Math.min(D.maxHp, D.hp + 8); }
  else beep(900 + Math.random() * 120, 0.05, 'triangle', 0.08);
  buzz(en.boss ? [18, 30, 18] : 5);
}

function loop(now) {
  if (!D || !D.running) return;
  let dt = Math.min(0.034, (now - D.last) / 1000); D.last = now;
  if (!D.canvas.isConnected) { D.running = false; return; }
  if (D.hitStop > 0) { D.hitStop -= dt; } else { update(dt); }
  render(dt);
  D.shopT -= dt; if (D.shopT <= 0) { renderShop(); D.shopT = 0.25; }
  if (D.over) { endGame(); return; }
  D.raf = requestAnimationFrame(loop);
}

function update(dt) {
  const f = fridgePos();
  D.bannerT -= dt; D.muzzle -= dt; D.vign *= 0.92;
  D.maxHp = 100 + D.lv.maxHp * BALANCE.up.maxHp.add;
  if (D.lv.regen) D.hp = Math.min(D.maxHp, D.hp + D.lv.regen * BALANCE.up.regen.add * dt);

  // 스폰
  if (D.toSpawn > 0) { D.since += dt; if (D.since >= D.spawnGap) { D.since = 0; spawnOne(); D.toSpawn -= 1; } }
  else if (D.enemies.length === 0) nextWave();

  // 메인 발사
  D.fireCd -= dt;
  if (D.fireCd <= 0 && D.enemies.length) {
    fireFrom(f.x, f.y - 26, pickTargets(stat.multi()));
    D.fireCd = 1 / stat.rate();
  }
  // 보조 포탑
  if (D.lv.sideTurret) {
    D.sideCd -= dt;
    if (D.sideCd <= 0 && D.enemies.length) {
      const tg = pickTargets(1);
      fireFrom(20, D.H - 40, tg); if (D.lv.sideTurret >= 2) fireFrom(D.W - 20, D.H - 40, tg);
      D.sideCd = 1 / (stat.rate() * 0.7);
    }
  }
  // 냉기 오라
  const auraR = D.lv.frostAura ? 60 + D.lv.frostAura * 22 : 0;
  const slow = D.lv.frostAura ? 1 - Math.min(0.6, D.lv.frostAura * 0.12) : 1;

  // 적 이동
  for (let i = D.enemies.length - 1; i >= 0; i--) {
    const en = D.enemies[i];
    en.ph += dt * 3; if (en.flash > 0) en.flash -= dt; if (en.squash > 0) en.squash = Math.max(0, en.squash - dt * 1.5);
    blinkTick(en.blinkS, dt);
    let sp = en.spd;
    if (auraR && Math.hypot(en.x - f.x, en.y - f.y) < auraR) sp *= slow;
    en.y += sp * dt; en.x += Math.sin(en.ph) * 6 * dt;
    if (en.boss) { en.minionT -= dt; if (en.minionT <= 0) { en.minionT = 2.2; if (D.enemies.length < 16) { const t = BALANCE.enemy.types.fast; D.enemies.push(mkEnemy('fast', en.maxhp * 0.04 + 4, t.r, t.color, t.badge, t.spd * 30, t.dmg, false)); } } }
    if (en.y >= f.y - 8) { // 냉장고 침투
      D.enemies.splice(i, 1); D.hp -= en.dmg; D.vign = 1; D.shake.add(en.boss ? 12 : 7, 0.3);
      beep(130, 0.2, 'square', 0.13); buzz([40, 30, 50]);
      D.fx.add(f.x, f.y - 40, `-${en.dmg}`, { color: '#ff4d6a', size: 18 });
      if (D.hp <= 0) { D.hp = 0; D.over = true; }
    }
  }
  // 발사체
  for (let i = D.shots.length - 1; i >= 0; i--) {
    const s = D.shots[i];
    s.x += s.vx * dt; s.y += s.vy * dt;
    if (s.x < -20 || s.x > D.W + 20 || s.y < -20 || s.y > D.H + 20) { D.shots.splice(i, 1); continue; }
    for (const en of D.enemies) {
      if (s.hit.has(en)) continue;
      if ((s.x - en.x) ** 2 + (s.y - en.y) ** 2 <= (en.r + BALANCE.weapon.projR) ** 2) {
        s.hit.add(en); hitEnemy(en, s.dmg);
        if (s.hit.size > s.pierce) { D.shots.splice(i, 1); break; }
      }
    }
  }
  // 코인 흡수
  for (let i = D.coinsFly.length - 1; i >= 0; i--) {
    const c = D.coinsFly[i]; c.t += dt * 2.2;
    if (c.t >= 1) { D.coins += c.val; D.coinsFly.splice(i, 1); }
  }
  D.parts.update(dt); D.fx.update(dt);
}

function render(dt) {
  const c = D.ctx, W = D.W, H = D.H, f = fridgePos();
  c.save();
  D.shake.apply(c, dt);
  // 배경 — 어두운 보라 냉기 그라데이션
  const bg = c.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#160b22'); bg.addColorStop(0.7, '#0c1830'); bg.addColorStop(1, '#0a2030');
  c.fillStyle = bg; c.fillRect(-30, -30, W + 60, H + 60);
  // 레인 성에
  c.globalAlpha = 0.06; c.fillStyle = '#73cbff';
  for (let i = 1; i < 5; i++) c.fillRect(i * W / 5 - 1, 0, 2, H);
  c.globalAlpha = 1;
  // 냉기 오라
  if (D.lv.frostAura) {
    const auraR = 60 + D.lv.frostAura * 22;
    const ag = c.createRadialGradient(f.x, f.y, auraR * 0.3, f.x, f.y, auraR);
    ag.addColorStop(0, 'rgba(115,203,255,0.05)'); ag.addColorStop(1, 'rgba(115,203,255,0.18)');
    c.fillStyle = ag; c.beginPath(); c.arc(f.x, f.y, auraR, 0, 6.28); c.fill();
  }
  // 적
  for (const en of D.enemies) {
    drawSlime(c, { x: en.x, y: en.y, r: en.r, color: en.flash > 0 ? '#ffffff' : en.color, t: en.ph, squash: en.squash, blink: en.blinkS.blink, look: { x: 0, y: 0.5 }, expr: 'angry', badge: en.badge, glow: en.boss ? 16 : 0 });
    if (en.boss || en.maxhp > BALANCE.enemy.baseHP * 3) {
      const w = en.r * 1.8, hpx = en.x - w / 2, hpy = en.y - en.r - 12;
      c.fillStyle = 'rgba(0,0,0,0.4)'; rr(c, hpx, hpy, w, 5, 2.5); c.fill();
      c.fillStyle = en.boss ? '#ff4d6a' : '#9bd36a'; rr(c, hpx, hpy, w * clamp(en.hp / en.maxhp, 0, 1), 5, 2.5); c.fill();
    }
  }
  // 발사체
  for (const s of D.shots) {
    c.fillStyle = '#bdffe4'; c.shadowColor = '#5ef0b0'; c.shadowBlur = 8;
    c.beginPath(); c.arc(s.x, s.y, BALANCE.weapon.projR, 0, 6.28); c.fill(); c.shadowBlur = 0;
  }
  drawFridge(c, f);
  D.parts.draw(c);
  // 코인 흡수 모션
  for (const cn of D.coinsFly) {
    const tx = 30, ty = 26; const t = ease.inQuad(cn.t);
    const x = cn.x + (tx - cn.x) * t, y = cn.y + (ty - cn.y) * t;
    c.font = '14px serif'; c.textAlign = 'center'; c.fillText('🪙', x, y);
  }
  D.fx.draw(c);
  drawHud(c, W, H);
  // 위험 비네트
  if (D.hp <= D.maxHp * 0.3 || D.vign > 0.04) {
    const pulse = D.hp <= D.maxHp * 0.3 ? 0.3 + Math.sin(performance.now() / 160) * 0.18 : D.vign * 0.5;
    const vg = c.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.7);
    vg.addColorStop(0, 'rgba(255,77,106,0)'); vg.addColorStop(1, `rgba(255,77,106,${clamp(pulse, 0, 0.6)})`);
    c.fillStyle = vg; c.fillRect(0, 0, W, H);
  }
  // 웨이브 배너
  if (D.bannerT > 0) {
    c.globalAlpha = clamp(D.bannerT * 1.3, 0, 1);
    c.fillStyle = D.bannerT > 0 && D.banner.includes('보스') ? '#ff4d6a' : '#5ef0b0';
    c.font = "900 30px Jua, sans-serif"; c.textAlign = 'center';
    c.fillText(D.banner, W / 2, H / 2 - 10);
    c.globalAlpha = 1;
  }
  c.restore();
}

function drawFridge(c, f) {
  // 포신 (조준 방향)
  c.save(); c.translate(f.x, f.y - 24); c.rotate(D.aimAng + Math.PI / 2);
  const tier = Math.min(3, Math.floor(D.lv.damage / 4));
  const bw = 8 + tier * 2, bl = 22 + tier * 4;
  c.fillStyle = ['#9fb2d6', '#73cbff', '#5ef0b0', '#ffe04a'][tier];
  rr(c, -bw / 2, -bl, bw, bl, bw / 2); c.fill();
  if (D.muzzle > 0) { c.fillStyle = 'rgba(255,240,150,0.9)'; c.beginPath(); c.arc(0, -bl, 7, 0, 6.28); c.fill(); }
  c.restore();
  // 냉장고 바디 (슬라임 얼굴)
  const w = 96, h = 46;
  c.fillStyle = '#d7e6f2'; rr(c, f.x - w / 2, f.y - 18, w, h, 12); c.fill();
  c.strokeStyle = '#9fb6c4'; c.lineWidth = 2; c.stroke();
  c.fillStyle = '#fff';
  c.beginPath(); c.ellipse(f.x - 15, f.y, 7, D.hp <= D.maxHp * 0.3 ? 5 : 8, 0, 0, 6.28); c.ellipse(f.x + 15, f.y, 7, D.hp <= D.maxHp * 0.3 ? 5 : 8, 0, 0, 6.28); c.fill();
  c.fillStyle = '#1a1426';
  c.beginPath(); c.arc(f.x - 15, f.y + 1, 3.2, 0, 6.28); c.arc(f.x + 15, f.y + 1, 3.2, 0, 6.28); c.fill();
  c.strokeStyle = '#1a1426'; c.lineWidth = 2.2; c.beginPath();
  if (D.hp <= D.maxHp * 0.3) c.arc(f.x, f.y + 16, 6, Math.PI, 2 * Math.PI);
  else c.arc(f.x, f.y + 12, 6, 0, Math.PI);
  c.stroke();
}

function drawHud(c, W, H) {
  // 코인 (점수=통화)
  c.font = '15px serif'; c.textAlign = 'left'; c.textBaseline = 'middle';
  c.fillText('🪙', 14, 26);
  c.fillStyle = '#ffe04a'; c.font = "800 17px 'Press Start 2P', Jua, monospace";
  c.font = "800 18px Jua, sans-serif"; c.fillText(`${D.coins}`, 32, 27);
  // 웨이브
  c.fillStyle = '#9fb2d6'; c.font = "700 12px Jua, sans-serif"; c.textAlign = 'center';
  c.fillText(`WAVE ${D.wave}  ·  ${D.kills}처치`, W / 2, 18);
  // 신선도 바
  const bw = 120, bx = W - bw - 14, by = 18;
  c.textAlign = 'right'; c.font = '13px serif'; c.fillText('❄️', bx - 4, 24);
  c.fillStyle = 'rgba(255,255,255,0.15)'; rr(c, bx, by, bw, 10, 5); c.fill();
  const hpRatio = clamp(D.hp / D.maxHp, 0, 1);
  c.fillStyle = hpRatio > 0.5 ? '#5ef0b0' : hpRatio > 0.25 ? '#ffe04a' : '#ff4d6a';
  rr(c, bx, by, bw * hpRatio, 10, 5); c.fill();
  c.textBaseline = 'alphabetic';
}

function rr(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}

/* ── 강화 상점 (DOM) ── */
function renderShop() {
  const el = document.getElementById('def-shop'); if (!el || !D) return;
  const cards = UP_ORDER.map((k) => {
    const u = BALANCE.up[k];
    if (locked(k)) return `<button class="up-card locked" disabled><span class="up-ico">${u.icon}</span><b>${u.name}</b><small>🔒 ${u.unlock}점</small></button>`;
    if (maxed(k)) return `<button class="up-card maxed" disabled><span class="up-ico">${u.icon}</span><b>${u.name}</b><small>MAX</small></button>`;
    const cst = cost(k); const can = D.coins >= cst;
    return `<button class="up-card ${can ? 'can' : ''}" ${can ? '' : 'disabled'} onclick="UI.defBuy('${k}')">
      <span class="up-ico">${u.icon}</span><b>${u.name}</b>
      <span class="up-lv">Lv.${D.lv[k]}</span>
      <small class="up-cost">🪙 ${cst}</small></button>`;
  }).join('');
  el.innerHTML = cards;
}
export function defBuy(k) {
  if (!D || locked(k) || maxed(k)) return;
  const cst = cost(k);
  if (D.coins < cst) { beep(200, 0.1, 'square', 0.08); return; }
  D.coins -= cst; D.lv[k] += 1;
  if (k === 'maxHp') D.hp += BALANCE.up.maxHp.add;
  chord([523, 698, 880]); buzz(16); D.shake.add(3, 0.12);
  D.fx.add(D.W / 2, D.H - 60, `${BALANCE.up[k].icon} Lv.${D.lv[k]}!`, { color: '#5ef0b0', size: 18 });
  renderShop();
}

function endGame() {
  const s = D; D = null; cancelAnimationFrame(s.raf);
  beep(160, 0.3, 'square', 0.12);
  finishGame('defense', '🧊 냉장고 지키기', s.score, `${s.score.toLocaleString()}점`,
    'UI.gameDefense()', { extra: `${s.wave}웨이브 · ${s.kills}마리 처치` });
}
