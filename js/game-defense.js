// 🧊 냉장고 지키기 — 자동공격 인크리멘탈 타워디펜스.
// 플레이어는 적을 직접 탭하지 않는다: 냉장고가 자동 발사 → 점수=코인으로 무기/방어수단 강화.
// 슬라임 렌더러 + 파티클·셰이크·히트스톱·코인흡수 손맛. 모든 밸런스는 BALANCE 한 곳.
import { gameUI, beep, chord, buzz, finishGame } from './games.js';
import { blinkTick, Particles, Shake, Floaters, ease, clamp, setupCanvas } from './slime.js';
import { enemySprite, fridgeSprite, itemSprite, drawSprite } from './pixel.js';

// ── 밸런스: 100+ 웨이브용 완만한 곡선. 초반은 아주 너그럽게(잘 안 죽음), 후반은 업그레이드로 따라잡기. ──
const BALANCE = {
  enemy: {
    baseHP: 7, hpGrow: 1.098, speedBase: 16, speedGrow: 1.014, speedCap: 46,
    countBase: 4, countGrow: 1.25, countCap: 36,
    // dmg=냉장고에 닿을 때 깎는 신선도 (작게 — 누적 실수만 위험). from=등장 시작 웨이브.
    types: {
      grunt:  { hpx: 1.0,  spx: 1.0,  dmg: 3, r: 18, from: 1,  w: 1.0,  name: '곰팡이빵' },
      swarm:  { hpx: 0.4,  spx: 1.7,  dmg: 2, r: 12, from: 3,  w: 0.9, group: 3, name: '세균 떼' },
      runner: { hpx: 0.7,  spx: 2.2,  dmg: 4, r: 14, from: 6,  w: 0.7,  name: '날쌘 곰팡이' },
      tank:   { hpx: 3.4,  spx: 0.5,  dmg: 6, r: 24, from: 5,  w: 0.55, name: '상한 배달' },
      split:  { hpx: 1.7,  spx: 0.85, dmg: 4, r: 18, from: 8,  w: 0.5, split: 2, name: '분열 곰팡이' },
      shield: { hpx: 5.5,  spx: 0.62, dmg: 5, r: 21, from: 12, w: 0.45, name: '굳은 더께' },
    },
  },
  economy: { scorePerHP: 0.3 },
  weapon: { dmg: 4, fireRate: 1.5, fireRateMax: 7, projSpeed: 500, projR: 8 },
  boss: { every: 10, hpMult: 17, dmg: 18, reward: 90 },
  up: {
    damage: { base: 18, ratio: 1.18, add: 3, name: '데미지', icon: '⚔️', unit: '발당' }, // max 없음(무한)
    fireRate: { base: 24, ratio: 1.2, add: 0.18, name: '연사속도', icon: '🔥', unit: '/초' }, // 상한 fireRateMax
    multiShot: { base: 90, ratio: 1.9, add: 1, max: 6, name: '다중샷', icon: '✳️', unit: '타겟' },
    pierce: { base: 70, ratio: 1.75, add: 1, max: 6, name: '관통', icon: '➶', unit: '관통' },
    crit: { base: 60, ratio: 1.4, add: 0.06, max: 0.7, name: '치명타', icon: '💥', unit: '확률' },
    chain:   { base: 80,  ratio: 1.65, add: 1, max: 4, unlock: 60,  name: '냉기 전이', icon: '🔗', unit: '연쇄' },
    frostAura: { base: 110, ratio: 1.7, add: 1, max: 6, unlock: 90,  name: '냉기 오라', icon: '❄️', unit: 'Lv' },
    sideTurret: { base: 150, ratio: 1.9, add: 1, max: 4, unlock: 120, name: '보조 포탑', icon: '🛰️', unit: '문' },
    wall: { base: 90, ratio: 1.7, add: 2, max: 6, unlock: 70, name: '칸막이 설치권', icon: '🧱', unit: '회' }, // 터치로 벽 설치(횟수제)
    homing:  { base: 150, ratio: 1.7, add: 1, max: 4, unlock: 160, name: '유도 눈송이', icon: '❇️', unit: 'Lv' },
    bomb:    { base: 180, ratio: 1.8, add: 1, max: 5, unlock: 200, name: '서리 폭탄', icon: '💣', unit: 'Lv' },
    orbital: { base: 200, ratio: 1.75, add: 1, max: 5, unlock: 240, name: '얼음 위성', icon: '💫', unit: '개' },
    laser:   { base: 240, ratio: 1.8, add: 1, max: 5, unlock: 290, name: '관통 레이저', icon: '⚡', unit: 'Lv' },
    projspd: { base: 40, ratio: 1.45, add: 0.14, max: 8, name: '발사체 속도', icon: '🚀', unit: 'x' }, // 빨리 내려오는 몹 대응
    regen: { base: 100, ratio: 1.7, add: 0.5, name: '신선도 회복', icon: '❤️', unit: '/초' },
    maxHp: { base: 80, ratio: 1.6, add: 25, name: '단열 강화', icon: '🧊', unit: '최대' },
    boost: { base: 120, ratio: 1.65, add: 0.16, name: '코인 부스트', icon: '🪙', unit: '+' },
  },
};
const UP_ORDER = ['damage', 'fireRate', 'projspd', 'multiShot', 'pierce', 'crit', 'chain', 'wall', 'homing', 'orbital', 'laser', 'bomb', 'frostAura', 'sideTurret', 'regen', 'maxHp', 'boost'];

// 난이도 (하/중/상) — 적 HP·속도·물량·침투피해·코인·어픽스 확률 배수
const DIFF = {
  easy:   { key: 'easy', name: '하', sub: '느긋하게', hp: 0.8, spd: 0.9, count: 0.85, dmg: 0.7, coin: 1.2, affix: 0.5, color: '#5ef0b0' },
  normal: { key: 'normal', name: '중', sub: '적당히', hp: 1.0, spd: 1.0, count: 1.0, dmg: 1.0, coin: 1.0, affix: 1.0, color: '#ffe04a' },
  hard:   { key: 'hard', name: '상', sub: '살벌하게', hp: 1.5, spd: 1.18, count: 1.2, dmg: 1.45, coin: 0.85, affix: 1.7, color: '#ff4d6a' },
};

// 몬스터 속성(어픽스) — 처치 난도·다양성↑ (웨이브·난이도 따라 부여 확률↑)
const AFFIX = {
  armor:  { icon: '🛡', ring: '#9fb2d6', name: '갑옷', w: 1.0 },   // 받는 피해 45%
  swift:  { icon: '💨', ring: '#73cbff', name: '쾌속', w: 1.0 },   // 이동 1.45배
  tough:  { icon: '💪', ring: '#ff9f43', name: '비대', w: 0.9 },   // HP 1.7배
  shield: { icon: '🔰', ring: '#bdffe4', name: '보호막', w: 0.8 }, // 첫 피격 1회 무효
  regen:  { icon: '💚', ring: '#5ef0b0', name: '재생', w: 0.7 },   // 초당 HP 회복
};

// ── 스페셜 스킬(로그라이크) — 등급: 일반/레어/유니크 + 트랩(쓰레기). 보스 처치 시 3택, 수치 랜덤 ──
const rnd = (a, b) => a + Math.random() * (b - a);
const RARITY = { common: { w: 60, label: '일반', col: '#9fb2d6' }, rare: { w: 26, label: '레어', col: '#73cbff' }, unique: { w: 10, label: '유니크', col: '#ffe04a' }, junk: { w: 4, label: '트랩', col: '#7d6aa6' } };
const SPECIALS = [
  // 일반
  { id: 'power', r: 'common', icon: '⚡', name: '고출력 회로', max: 99, roll: () => Math.round(rnd(12, 22)), desc: (v) => `데미지 +${v}%` },
  { id: 'overload', r: 'common', icon: '🔥', name: '과부하', max: 99, roll: () => Math.round(rnd(12, 22)), desc: (v) => `연사속도 +${v}%` },
  { id: 'gold', r: 'common', icon: '🪙', name: '황금 회로', max: 99, roll: () => Math.round(rnd(18, 35)), desc: (v) => `코인 +${v}%` },
  { id: 'bigshot', r: 'common', icon: '🔵', name: '대구경탄', max: 99, roll: () => Math.round(rnd(14, 26)), desc: (v) => `발사체 크기·피해 +${v}%` },
  { id: 'thorn', r: 'common', icon: '🌵', name: '서리 가시', max: 99, roll: () => Math.round(rnd(6, 14)), desc: (v) => `근처 적 초당 ${v} 피해` },
  // 레어
  { id: 'critdmg', r: 'rare', icon: '💥', name: '치명 강화', max: 99, roll: () => Math.round(rnd(40, 75)), desc: (v) => `치명타 피해 +${v}%` },
  { id: 'pierceUp', r: 'rare', icon: '➶', name: '관통 코어', max: 6, roll: () => 1, desc: (v) => `관통 +${v}` },
  { id: 'fire', r: 'rare', icon: '🔥', name: '화염탄', max: 99, roll: () => Math.round(rnd(22, 40)), desc: (v) => `명중 시 화상(초당 ${v}%, 3초)` },
  { id: 'frost', r: 'rare', icon: '❄️', name: '빙결탄', max: 60, roll: () => Math.round(rnd(14, 26)), desc: (v) => `명중 시 ${v}% 둔화` },
  { id: 'vamp', r: 'rare', icon: '🩸', name: '흡혈 코어', max: 40, roll: () => Math.round(rnd(8, 15)), desc: (v) => `처치 시 ${v}% 확률 신선도+1` },
  // 유니크 (강력·희귀)
  { id: 'double', r: 'unique', icon: '➿', name: '더블샷', max: 3, roll: () => 1, desc: (v) => `발사마다 +${v}발 부채꼴` },
  { id: 'volley', r: 'unique', icon: '✳️', name: '일제 사격', max: 3, roll: () => 1, desc: (v) => `동시 타겟 +${v}` },
  { id: 'exec', r: 'unique', icon: '☠️', name: '처형 칼날', max: 25, roll: () => Math.round(rnd(8, 15)), desc: (v) => `체력 ${v}% 이하 즉사` },
  { id: 'splitp', r: 'unique', icon: '💠', name: '분열탄', max: 2, roll: () => 1, desc: (v) => `명중 시 파편 ${v}개` },
  // 트랩(쓰레기) — 그럴듯하지만 함정. 승부욕·리스크 다양화
  { id: 'glass', r: 'junk', icon: '🩹', name: '유리 대포', max: 1, roll: () => 60, desc: () => '데미지 +60%, 단 최대 신선도 −30', trap: true },
  { id: 'rush', r: 'junk', icon: '🌀', name: '폭주 회로', max: 1, roll: () => 40, desc: () => '연사 +40%, 단 코인 획득 −25%', trap: true },
  { id: 'gamble', r: 'junk', icon: '🎲', name: '도박수', max: 1, roll: () => 1, desc: () => '50%: 데미지 +80% / 50%: 꽝(+5%)', trap: true },
];
const SP_BY = Object.fromEntries(SPECIALS.map((s) => [s.id, s]));
const SP = (id) => (D.spec[id] ? D.spec[id].val : 0);

let D = null;
let savedRun = null; // 나갔다 들어와도 이어서 하기

export function gameDefense() {
  const ui = gameUI();
  const resume = (savedRun && !savedRun.over)
    ? `<button class="gx-btn-go" style="margin-bottom:10px;background:linear-gradient(145deg,#ffe04a,#ff9f43);color:#3a2400" onclick="UI.defResume()">▶ 이어서 하기 — WAVE ${savedRun.wave} · 난이도 ${DIFF[savedRun.diffKey].name}</button>` : '';
  ui.openSheet(`
    <div class="gx gx-def">
      <div class="gx-bar">
        <b class="gx-title">🧊 냉장고 지키기</b>
        <span><button class="gx-full" onclick="UI.gameFull()">⛶</button><button class="gx-x" onclick="UI.closeSheet()">✕</button></span>
      </div>
      <div class="gx-stage"><canvas id="def-c"></canvas>
        <div class="gx-start" id="def-start">
          <div class="gx-start-in">
            <div style="font-size:2.4rem">🧊🛡️</div>
            <b>냉장고가 알아서 쏩니다</b>
            <p>강화 안 하면 못 버텨요. 보스를 잡으면 <b>스페셜 스킬</b>로 무한 성장!</p>
            ${resume}
            <div class="diff-row">
              ${Object.values(DIFF).map((d) => `<button class="diff-btn" style="--dc:${d.color}" onclick="UI.defStart('${d.key}')"><b>${d.name}</b><small>${d.sub}</small></button>`).join('')}
            </div>
            <p class="diff-hint">난이도 선택 · 게임 중 ⏩ 2·3배속 · 나가도 이어서 가능</p>
          </div>
        </div>
      </div>
      <div class="gx-shopbar">
        <button class="gx-speed" id="def-speed" onclick="UI.defSpeed()">⏩ 1배속</button>
        <button class="gx-adcoin" onclick="UI.defAdSkill()">📺 스페셜</button>
        <button class="gx-wall" id="def-wall" style="display:none" onclick="UI.defWallMode()">🧱 벽 설치</button>
        <span class="gx-diff" id="def-difflbl"></span>
      </div>
      <div class="gx-shop" id="def-shop"></div>
    </div>`);
  const canvas = document.getElementById('def-c');
  const wrap = canvas.parentElement;
  const cssW = clamp(wrap.clientWidth || 340, 280, 460);
  const cssH = clamp(Math.round((window.innerHeight || 720) * 0.5), 300, 540); // 폰 화면에 맞춤
  const { ctx } = setupCanvas(canvas, cssW, cssH);

  D = {
    ctx, canvas, W: cssW, H: cssH, diff: DIFF.normal, speed: 1, spec: {},
    enemies: [], shots: [], coinsFly: [], parts: new Particles(320), fx: new Floaters(), shake: new Shake(),
    lv: { damage: 0, fireRate: 0, projspd: 0, multiShot: 0, pierce: 0, crit: 0, chain: 0, wall: 0, homing: 0, orbital: 0, laser: 0, bomb: 0, sideTurret: 0, frostAura: 0, regen: 0, maxHp: 0, boost: 0 },
    walls: [], wallUsed: 0, placingWall: false,
    coins: 0, score: 0, kills: 0, bossesKilled: 0,
    wave: 0, toSpawn: 0, spawnGap: 1, since: 0,
    hp: 100, maxHp: 100,
    fireCd: 0, sideCd: 0, homingCd: 0, laserCd: 0, bombCd: 0, orbAng: 0, beams: [], rings: [], chains: [],
    aimAng: -Math.PI / 2, muzzle: 0,
    banner: '', bannerT: 0, hitStop: 0, vign: 0, flash: 0, bossIntro: 0, coinDisp: 0, upText: '', upT: 0, upPulse: 0, fridge: { blink: 1 },
    last: 0, raf: 0, running: false, over: false, shopT: 0,
  };
  // 칸막이 설치: 설치 모드일 때 전장 터치 → 그 위치에 벽
  canvas.addEventListener('pointerdown', (e) => {
    if (!D || !D.placingWall) return;
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left), y = clamp(e.clientY - r.top, 90, D.H - 70);
    placeWall(x, y);
  });
}
const wallAvail = () => (D ? D.lv.wall * BALANCE.up.wall.add - D.wallUsed : 0);
function placeWall(x, y) {
  if (wallAvail() <= 0) { D.placingWall = false; return; }
  const w = Math.min(140, D.W * 0.42), hp = 60 + D.wave * 14;
  D.walls.push({ x: clamp(x, w / 2, D.W - w / 2), y, w, hp, maxhp: hp });
  D.wallUsed += 1; D.placingWall = false;
  chord([523, 440, 392]); buzz(18); D.parts.burst(x, y, '#73cbff', 14, { spread: 1, life: 0.5 });
  updateWallBtn();
}
function updateWallBtn() {
  const b = document.getElementById('def-wall'); if (!b) return;
  const n = wallAvail();
  b.textContent = D.placingWall ? '🧱 터치해 설치!' : `🧱 벽 설치 (${n})`;
  b.style.display = (D.lv.wall > 0) ? '' : 'none';
  b.classList.toggle('arming', D.placingWall);
}
export function defWallMode() {
  if (!D || !D.running) return;
  if (wallAvail() <= 0) { toastNo(); return; }
  D.placingWall = !D.placingWall; updateWallBtn();
}
function toastNo() { beep(200, 0.1, 'square', 0.08); }

function snapshotRun() {
  if (!D || D.over || D.wave < 1) { savedRun = null; return; }
  savedRun = {
    diffKey: D.diff.key, speed: D.speed, lv: { ...D.lv }, spec: JSON.parse(JSON.stringify(D.spec)),
    coins: D.coins, score: D.score, kills: D.kills, bossesKilled: D.bossesKilled, hp: D.hp, maxHp: D.maxHp, wave: D.wave, revived: D.revived,
  };
}
export function defResume() {
  if (!savedRun || !D) return;
  const sv = savedRun; savedRun = null;
  document.getElementById('def-start')?.remove();
  D.diff = DIFF[sv.diffKey] || DIFF.normal; D.speed = sv.speed || 1; D.spec = sv.spec || {};
  Object.assign(D.lv, sv.lv);
  D.coins = sv.coins; D.score = sv.score; D.kills = sv.kills; D.bossesKilled = sv.bossesKilled || 0;
  D.maxHp = sv.maxHp; D.hp = sv.hp; D.revived = sv.revived; D.wave = sv.wave - 1;
  const lbl = document.getElementById('def-difflbl'); if (lbl) lbl.textContent = `난이도 ${D.diff.name}`;
  const sb = document.getElementById('def-speed'); if (sb) sb.textContent = `⏩ ${D.speed}배속`;
  beep(660, 0.05); nextWave(); D.running = true; D.last = performance.now(); renderShop(); D.raf = requestAnimationFrame(loop);
}
export function defStart(diffKey) {
  savedRun = null;
  if (!D) return;
  D.diff = DIFF[diffKey] || DIFF.normal;
  document.getElementById('def-start')?.remove();
  const lbl = document.getElementById('def-difflbl'); if (lbl) lbl.textContent = `난이도 ${D.diff.name}`;
  beep(660, 0.05);
  nextWave();
  D.running = true; D.last = performance.now();
  renderShop();
  D.raf = requestAnimationFrame(loop);
}
export function defSpeed() {
  if (!D) return;
  D.speed = D.speed >= 3 ? 1 : D.speed + 1;
  const b = document.getElementById('def-speed'); if (b) b.textContent = `⏩ ${D.speed}배속`;
  beep(700 + D.speed * 80, 0.04);
}

/* ── 능력치 ── */
const cost = (k) => Math.floor(BALANCE.up[k].base * Math.pow(BALANCE.up[k].ratio, D.lv[k]));
const maxed = (k) => BALANCE.up[k].max != null && D.lv[k] >= BALANCE.up[k].max;
const locked = (k) => BALANCE.up[k].unlock != null && D.score < BALANCE.up[k].unlock && D.lv[k] === 0;
const stat = {
  dmg: () => (BALANCE.weapon.dmg + D.lv.damage * BALANCE.up.damage.add) * (1 + (SP('power') + SP('bigshot') + SP('glass') + SP('gamble')) / 100),
  rate: () => Math.min(BALANCE.weapon.fireRateMax, (BALANCE.weapon.fireRate + D.lv.fireRate * BALANCE.up.fireRate.add) * (1 + (SP('overload') + SP('rush')) / 100)),
  multi: () => 1 + D.lv.multiShot + SP('volley'),
  pierce: () => D.lv.pierce + SP('pierceUp'),
  crit: () => Math.min(0.85, D.lv.crit * BALANCE.up.crit.add),
  critMult: () => 2 + SP('critdmg') / 100,
  boost: () => Math.max(0.2, 1 + D.lv.boost * BALANCE.up.boost.add + SP('gold') / 100 - (D.spec.rush ? 0.25 : 0)),
  projR: () => BALANCE.weapon.projR * (1 + SP('bigshot') / 220),
  projSpeed: () => BALANCE.weapon.projSpeed * (1 + D.lv.projspd * BALANCE.up.projspd.add),
};

function fridgePos() { return { x: D.W / 2, y: D.H - 30 }; }

const waveHP = (w) => BALANCE.enemy.baseHP * Math.pow(BALANCE.enemy.hpGrow, w - 1) * D.diff.hp;
const waveSpd = (w) => Math.min(BALANCE.enemy.speedCap, BALANCE.enemy.speedBase * Math.pow(BALANCE.enemy.speedGrow, w - 1)) * D.diff.spd;

function nextWave() {
  D.wave += 1;
  const boss = D.wave % BALANCE.boss.every === 0;
  const e = BALANCE.enemy;
  D.toSpawn = boss ? 1 : Math.min(e.countCap, Math.round((e.countBase + D.wave * e.countGrow) * D.diff.count));
  D.spawnGap = clamp(1.2 - D.wave * 0.012, 0.45, 1.2); // 완만하게만 빨라짐
  D.banner = boss ? `⚠ 보스 — 곰팡이대왕` : `WAVE ${D.wave}`;
  D.bannerT = 1.7;
  D.bossWave = boss;
  if (boss) { D.bossIntro = 1.2; D.shake.add(6, 0.4); chord([196, 233, 294, 196], 0.18, 'sawtooth'); }
  else chord([392, 523, 659]);
}

function spawnOne() {
  const w = D.wave;
  if (D.bossWave) {
    const hp = waveHP(w) * BALANCE.boss.hpMult;
    D.enemies.push(mkEnemy('boss', hp, 40, waveSpd(w) * 0.5, BALANCE.boss.dmg, { boss: true }));
    return;
  }
  // 등장 가능한 타입을 가중치로 선택 (웨이브가 오를수록 종류 다양↑)
  const pool = Object.entries(BALANCE.enemy.types).filter(([, t]) => w >= t.from);
  let total = pool.reduce((s, [, t]) => s + t.w, 0), r = Math.random() * total, key = 'grunt', t = pool[0][1];
  for (const [k, tt] of pool) { r -= tt.w; if (r <= 0) { key = k; t = tt; break; } }
  const n = t.group || 1; // 세균 떼는 한 번에 여러 마리
  const dmg = Math.max(1, Math.round(t.dmg * D.diff.dmg * (1 + w * 0.02))); // 후반 침투 피해↑(긴장)
  for (let i = 0; i < n; i++) {
    D.enemies.push(mkEnemy(key, waveHP(w) * t.hpx, t.r, waveSpd(w) * t.spx, dmg, { split: t.split, affix: rollAffix(w) }));
  }
}
// 어픽스 부여 — 웨이브·난이도에 따라 확률↑ (미니/그룹 제외)
function rollAffix(w) {
  if (w < 4) return null;
  const chance = clamp((w - 3) * 0.018, 0, 0.42) * D.diff.affix;
  if (Math.random() > chance) return null;
  const pool = Object.entries(AFFIX); let tot = pool.reduce((s, [, a]) => s + a.w, 0), r = Math.random() * tot;
  for (const [k, a] of pool) { r -= a.w; if (r <= 0) return k; }
  return 'armor';
}
function mkEnemy(key, hp, r, spd, dmg, opt = {}) {
  const af = opt.affix || null;
  const e = {
    key, hp, maxhp: hp, r, spd, dmg, boss: !!opt.boss, split: opt.split || 0, mini: !!opt.mini, affix: af,
    armorMul: af === 'armor' ? 0.55 : 1, shield: af === 'shield' ? 1 : 0, regen: af === 'regen' ? hp * 0.04 : 0,
    burn: 0, burnDps: 0, slowT: 0, slowMul: 1,
    x: 22 + Math.random() * (D.W - 44), y: -r - 6,
    ph: Math.random() * 6.28, blinkS: { blink: 1 }, flash: 0, squash: 0, age: 0, sporeT: 0, minionT: 1.6,
  };
  if (af === 'swift') e.spd *= 1.45;
  if (af === 'tough') { e.hp *= 1.7; e.maxhp *= 1.7; e.r *= 1.12; }
  return e;
}

/* ── 발사 (발사체 속도·형태가 업그레이드/속성에 따라 변함) ── */
function projKind() {
  if (SP('fire')) return 'fire';
  if (SP('frost')) return 'frost';
  if (stat.pierce() >= 3) return 'arrow';
  if (D.lv.chain) return 'spark';
  if (D.lv.damage >= 12) return 'heavy';
  return 'basic';
}
function fireFrom(x, y, targets) {
  const extra = SP('double'), pr = stat.projR(), spd = stat.projSpeed(), kind = projKind();
  for (const tg of targets) {
    const base = Math.atan2(tg.y - y, tg.x - x);
    D.aimAng = base;
    const shots = 1 + extra;
    for (let s = 0; s < shots; s++) {
      const off = shots > 1 ? (s - (shots - 1) / 2) * 0.13 : 0;
      const ang = base + off, isCrit = Math.random() < stat.crit();
      D.shots.push({
        x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, ang,
        dmg: stat.dmg() * (isCrit ? stat.critMult() : 1), crit: isCrit, pierce: stat.pierce(), hit: new Set(), trail: [], r: pr, kind,
      });
    }
  }
  D.muzzle = 0.08;
  beep(680 + Math.random() * 80, 0.04, 'square', 0.07);
}
function pickTargets(n) {
  // 가장 진격한(아래쪽) 적 N
  return [...D.enemies].sort((a, b) => b.y - a.y).slice(0, n);
}

function hitEnemy(en, dmg, opt) {
  const sec = opt && (opt.chained || opt.frag); // 2차타(체인·파편)는 원소/분열 재적용 안 함
  if (en.shield) { en.shield = 0; en.flash = 0.12; D.parts.burst(en.x, en.y, '#bdffe4', 7, { spread: 0.6, life: 0.3 }); beep(520, 0.05); return; }
  en.hp -= dmg * (en.armorMul || 1); en.flash = 0.1; en.squash = 0.22;
  D.parts.burst(en.x, en.y, '#fff', 4, { spread: 0.5, life: 0.25 });
  if (!sec) {
    if (SP('fire')) { en.burnDps = Math.max(en.burnDps, stat.dmg() * SP('fire') / 100); en.burn = Math.max(en.burn, 3); }
    if (SP('frost')) { en.slowMul = 1 - Math.min(0.6, SP('frost') / 100); en.slowT = 1.5; }
    if (SP('splitp') && en.hp > 0) {
      const others = D.enemies.filter((o) => o !== en);
      for (let i = 0; i < SP('splitp'); i++) {
        const o = others[Math.floor(Math.random() * others.length)];
        const ang = o ? Math.atan2(o.y - en.y, o.x - en.x) : Math.random() * 6.28;
        D.shots.push({ x: en.x, y: en.y, vx: Math.cos(ang) * 360, vy: Math.sin(ang) * 360, dmg: stat.dmg() * 0.4, crit: false, pierce: 0, hit: new Set([en]), trail: [], r: 4, frag: true });
      }
    }
  }
  if (SP('exec') && !en.boss && en.hp > 0 && en.hp <= en.maxhp * SP('exec') / 100) { en.hp = 0; D.parts.burst(en.x, en.y, '#ff4d6a', 10, { life: 0.4 }); }
  if (en.boss) { D.hitStop = Math.max(D.hitStop, 0.04); D.shake.add(3, 0.12); }
  // 냉기 전이(체인) — 가까운 다른 적으로 튄다 (한 번만, 무한 연쇄 방지)
  if (D.lv.chain && !(opt && opt.chained)) {
    let from = en, left = D.lv.chain;
    const seen = new Set([en]);
    while (left-- > 0) {
      let best = null, bd = 90 * 90;
      for (const o of D.enemies) { if (seen.has(o)) continue; const d = (o.x - from.x) ** 2 + (o.y - from.y) ** 2; if (d < bd) { bd = d; best = o; } }
      if (!best) break;
      D.chains.push({ x1: from.x, y1: from.y, x2: best.x, y2: best.y, t: 0.18 });
      hitEnemy(best, dmg * 0.5, { chained: true });
      seen.add(best); from = best;
    }
  }
  if (en.hp <= 0) killEnemy(en);
}
const PART_COLOR = { grunt: '#a172d4', swarm: '#ff5d9e', runner: '#2fcaa6', tank: '#e0a64b', split: '#2fcaa6', shield: '#9fb2d6', mini: '#2fcaa6', boss: '#cf86ff' };
function killEnemy(en) {
  const idx = D.enemies.indexOf(en); if (idx < 0) return;
  D.enemies.splice(idx, 1); D.kills += 1;
  D.parts.burst(en.x, en.y, PART_COLOR[en.key] || '#cf86ff', en.boss ? 30 : 12, { up: 30, life: 0.5 });
  const gain = Math.max(1, Math.floor(en.maxhp * BALANCE.economy.scorePerHP * stat.boost())) + (en.boss ? BALANCE.boss.reward : 0);
  D.score += gain;
  D.coinsFly.push({ x: en.x, y: en.y, t: 0, val: gain });
  D.fx.add(en.x, en.y, `+${gain}`, { color: '#ffe04a', size: en.boss ? 24 : 16, font: 'Jua' });
  // 분열 곰팡이 → 작은 새끼 2마리
  if (en.split && !en.mini && D.enemies.length < 40) {
    for (let i = 0; i < en.split; i++) {
      const m = mkEnemy('mini', en.maxhp * 0.28, en.r * 0.55, en.spd * 1.3, Math.max(1, Math.round(en.dmg * 0.5)), { mini: true });
      m.x = en.x + (i ? 14 : -14); m.y = en.y; D.enemies.push(m);
    }
  }
  if (SP('vamp') && Math.random() < SP('vamp') / 100) { D.hp = Math.min(D.maxHp, D.hp + 1); D.fx.add(en.x, en.y - 8, '+1', { color: '#ff5d9e', size: 12 }); }
  if (en.boss) { chord([523, 659, 784, 1047]); D.shake.add(12, 0.5); D.hitStop = 0.18; D.flash = 0.5; D.parts.burst(en.x, en.y, '#cf86ff', 40, { up: 60, life: 0.8, spread: 1.4 }); D.hp = Math.min(D.maxHp, D.hp + 12); D.bossesKilled += 1; D.pendingDraft = true; }
  else beep(900 + Math.random() * 120, 0.05, 'triangle', 0.08);
  buzz(en.boss ? [18, 30, 18] : 5);
}

function loop(now) {
  if (!D || !D.running) return;
  let dt = Math.min(0.034, (now - D.last) / 1000); D.last = now;
  if (!D.canvas.isConnected) { D.running = false; snapshotRun(); return; } // 시트 닫힘 → 이어하기 저장
  // 배속(1·2·3) — 한 프레임에 update를 여러 번 (렌더는 1회)
  const steps = D.speed;
  for (let s = 0; s < steps; s++) {
    if (D.hitStop > 0) { D.hitStop -= dt; } else { update(dt); }
    if (D.over || D.pendingDraft) break;
  }
  render(dt);
  D.shopT -= dt; if (D.shopT <= 0) { renderShop(); D.shopT = 0.25; }
  if (D.over) { offerRevive(); return; }
  if (D.pendingDraft) { D.pendingDraft = false; bossDraft(); return; } // 보스 처치 → 스킬 3택
  D.raf = requestAnimationFrame(loop);
}

/* ── 인게임 광고(스테이지 오버레이 — 캔버스 유지) → 아이템/보상 ── */
function stageAd(label, onReward) {
  D.running = false; cancelAnimationFrame(D.raf); clearInterval(D._adTimer);
  D._adReward = onReward;
  const stage = D.canvas.parentElement;
  const ov = document.createElement('div'); ov.className = 'draft-overlay'; ov.id = 'def-ad';
  ov.innerHTML = `<div class="draft-in">
    <div class="draft-title">📺 광고</div><p>${label}</p>
    <div class="adx-stage" style="margin:8px 0 10px"><div class="adx-slime">🧊</div><b>냉비서 프리미엄이 곧 나와요</b></div>
    <div class="ad-progress"><i id="def-adbar"></i></div>
    <button class="gx-btn-go" id="def-adbtn" disabled>광고 시청 중… 15초</button>
    <button class="qz-skip" onclick="UI.defAdSkip()">건너뛰기 (보상 없음)</button></div>`;
  stage.appendChild(ov);
  const bar = ov.querySelector('#def-adbar'); if (bar) { bar.style.transitionDuration = '15s'; requestAnimationFrame(() => { bar.style.width = '100%'; }); }
  let t = 15;
  D._adTimer = setInterval(() => {
    const b = document.getElementById('def-adbtn'); if (!b) { clearInterval(D._adTimer); return; }
    t--; if (t > 0) { b.textContent = `광고 시청 중… ${t}초`; return; }
    clearInterval(D._adTimer); b.disabled = false; b.textContent = '✅ 보상 받기'; b.onclick = () => UI_defAdDone();
  }, 1000);
}
function UI_defAdDone() {
  const cb = D._adReward; D._adReward = null;
  document.getElementById('def-ad')?.remove();
  if (cb) cb();
  // 보상 콜백이 새 오버레이(유니크 드래프트)를 열었으면 재개하지 않음 (defPick이 재개)
  if (!D.draft && !document.getElementById('def-rev')) { D.running = true; D.last = performance.now(); D.raf = requestAnimationFrame(loop); }
}
export function defAdSkip() {
  clearInterval(D._adTimer); D._adReward = null;
  // 부활 광고를 건너뛰면 게임 종료
  const wasRevive = D._reviveAd; D._reviveAd = false;
  document.getElementById('def-ad')?.remove();
  if (wasRevive && D.hp <= 0) { endGame(); return; }
  D.running = true; D.last = performance.now(); D.raf = requestAnimationFrame(loop);
}
export function defAdDone() { UI_defAdDone(); }

function offerRevive() {
  if (D.revived) { endGame(); return; } // 부활은 1회
  D.running = false; cancelAnimationFrame(D.raf);
  const stage = D.canvas.parentElement;
  const ov = document.createElement('div'); ov.className = 'draft-overlay'; ov.id = 'def-rev';
  ov.innerHTML = `<div class="draft-in">
    <div class="draft-title" style="color:#ff4d6a">냉장고 위기!</div>
    <p>광고 한 번이면 <b>신선도 60% 회복</b>하고 이어서 버틸 수 있어요</p>
    <button class="gx-btn-go" onclick="UI.defRevive()">📺 광고 보고 부활</button>
    <button class="qz-skip" onclick="UI.defGiveUp()">여기서 끝내기 (결과 보기)</button></div>`;
  stage.appendChild(ov);
  chord([196, 165, 131], 0.2, 'sawtooth');
}
export function defRevive() {
  document.getElementById('def-rev')?.remove();
  D._reviveAd = true;
  stageAd('광고 보고 부활 — 신선도 60% 회복', () => {
    D.revived = true; D.over = false; D.hp = Math.round(D.maxHp * 0.6);
    D.enemies = []; D.shots = []; D.flash = 0.7; D.shake.add(8, 0.4);
    D.fx.add(D.W / 2, D.H / 2, '부활!', { color: '#5ef0b0', size: 26 });
  });
}
export function defGiveUp() { document.getElementById('def-rev')?.remove(); endGame(); }
export function defAdSkill() {
  if (!D || !D.running) return;
  stageAd('광고 보고 스페셜 스킬 3택', () => bossDraft()); // 광고 → 스킬 드래프트(코인 대신 스킬)
}

// 등급 가중 추첨 (해당 등급 후보 中)
function pickByRarity(bag) {
  const tot = bag.reduce((s, sp) => s + RARITY[sp.r].w, 0);
  let r = Math.random() * tot;
  for (const sp of bag) { r -= RARITY[sp.r].w; if (r <= 0) return sp; }
  return bag[0];
}
function makeDraftCardData(s) {
  let val = s.roll();
  if (s.id === 'gamble') val = Math.random() < 0.5 ? 80 : 5; // 도박수 즉시 판정
  return { id: s.id, r: s.r, icon: s.icon, name: s.name, val, desc: s.desc, trap: s.trap };
}
/* ── 보스 처치 → 스페셜 스킬 3택 + 광고로 유니크 1택 (캔버스 오버레이) ── */
function bossDraft(forceUnique) {
  D.running = false; cancelAnimationFrame(D.raf);
  let bag = SPECIALS.filter((s) => !D.spec[s.id] || D.spec[s.id].lv < (s.max || 99));
  if (forceUnique) bag = bag.filter((s) => s.r === 'unique');
  const picks = [];
  const n = forceUnique ? 1 : 3;
  for (let i = 0; i < n && bag.length; i++) { const s = pickByRarity(bag); bag = bag.filter((x) => x !== s); picks.push(makeDraftCardData(s)); }
  D.draft = picks;
  chord([659, 880, 1175], 0.16); buzz([20, 40, 20]);
  const stage = D.canvas.parentElement;
  const ov = document.createElement('div'); ov.className = 'draft-overlay'; ov.id = 'def-draft';
  ov.innerHTML = `
    <div class="draft-in">
      <div class="draft-title">${forceUnique ? '✨ 유니크 스킬!' : '⭐ 보스 격파!'}</div>
      <p>${forceUnique ? '강력한 유니크 한 장' : '스페셜 스킬 <b>3택</b> — 등급·수치 랜덤'}</p>
      <div class="draft-row">
        ${D.draft.map((s, i) => {
          const cur = D.spec[s.id] ? D.spec[s.id].val : 0; const rr = RARITY[s.r];
          return `<button class="draft-card r-${s.r}" style="--rc:${rr.col}" onclick="UI.defPick(${i})">
            <span class="draft-ico">${s.icon}</span>
            <div class="grow"><div class="draft-name"><b>${s.name}</b><span class="draft-rar" style="color:${rr.col}">${s.trap ? '⚠ 트랩' : rr.label}</span></div>
              <small>${s.desc(s.val)}</small></div>
            <span class="draft-cur ${cur ? '' : 'new'}">${cur ? `Lv${(D.spec[s.id].lv) + 1}` : 'NEW'}</span>
          </button>`;
        }).join('')}
      </div>
      ${forceUnique ? '' : '<button class="draft-ad" onclick="UI.defDraftAd()">📺 광고 보고 유니크 스킬 받기</button>'}
    </div>`;
  stage.appendChild(ov);
}
export function defDraftAd() {
  document.getElementById('def-draft')?.remove(); D.draft = null;
  stageAd('광고 보고 유니크 스킬 1장', () => bossDraft(true));
}
export function defPick(i) {
  if (!D || !D.draft) return;
  const s = D.draft[i]; if (!s) return;
  if (D.spec[s.id]) { D.spec[s.id].lv += 1; D.spec[s.id].val += s.val; }
  else D.spec[s.id] = { lv: 1, val: s.val };
  D.draft = null;
  document.getElementById('def-draft')?.remove();
  D.flash = 0.7; D.upText = `${s.name}!`; D.upT = 1.0;
  chord([523, 698, 880, 1047]); buzz(24);
  D.running = true; D.last = performance.now(); D.raf = requestAnimationFrame(loop);
}

function update(dt) {
  const f = fridgePos();
  D.bannerT -= dt; D.muzzle -= dt; D.vign *= 0.92; D.flash *= 0.86; if (D.bossIntro > 0) D.bossIntro -= dt; if (D.upT > 0) D.upT -= dt; if (D.upPulse > 0) D.upPulse = Math.max(0, D.upPulse - dt * 1.8);
  D.coinDisp += (D.coins - D.coinDisp) * Math.min(1, dt * 9); // 코인 카운트업 롤링
  D.maxHp = Math.max(20, 100 + D.lv.maxHp * BALANCE.up.maxHp.add - (D.spec.glass ? 30 : 0));
  if (D.hp > D.maxHp) D.hp = D.maxHp;
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
  // ── 창의 스킬 ──
  // 유도 눈송이 (호밍) — 랜덤 적 추적
  if (D.lv.homing) {
    D.homingCd -= dt;
    if (D.homingCd <= 0 && D.enemies.length) {
      D.homingCd = Math.max(0.5, 1.4 - D.lv.homing * 0.25);
      const n = D.lv.homing >= 3 ? 2 : 1;
      for (let k = 0; k < n; k++) {
        const tg = D.enemies[Math.floor(Math.random() * D.enemies.length)];
        D.shots.push({ x: f.x, y: f.y - 24, vx: (Math.random() - 0.5) * 120, vy: -260, dmg: stat.dmg() * 1.1, crit: false, pierce: 0, hit: new Set(), trail: [], homing: tg });
      }
    }
  }
  // 관통 레이저 — 주기적으로 가장 진격한 적의 세로 라인을 관통
  if (D.lv.laser) {
    D.laserCd -= dt;
    if (D.laserCd <= 0 && D.enemies.length) {
      D.laserCd = Math.max(1.5, 3.4 - D.lv.laser * 0.4);
      const tg = pickTargets(1)[0]; const bx = tg.x, bw = 16 + D.lv.laser * 4;
      const dmg = stat.dmg() * (2.5 + D.lv.laser);
      for (const en of [...D.enemies]) if (Math.abs(en.x - bx) < bw + en.r) hitEnemy(en, dmg);
      D.beams.push({ x: bx, w: bw, t: 0.28 }); D.shake.add(4, 0.18); beep(120, 0.18, 'sawtooth', 0.1);
    }
  }
  // 서리 폭탄 — 주기적으로 가장 붐비는 곳에 AOE
  if (D.lv.bomb) {
    D.bombCd -= dt;
    if (D.bombCd <= 0 && D.enemies.length) {
      D.bombCd = Math.max(1.8, 4 - D.lv.bomb * 0.4);
      // 가장 붐비는 적 주변(간단: 가장 진격한 적 기준)
      const cx = pickTargets(1)[0].x, cy = pickTargets(1)[0].y, rad = 56 + D.lv.bomb * 12;
      const dmg = stat.dmg() * (1.8 + D.lv.bomb * 0.4);
      for (const en of [...D.enemies]) if (Math.hypot(en.x - cx, en.y - cy) < rad + en.r) hitEnemy(en, dmg);
      D.rings.push({ x: cx, y: cy, r: 8, max: rad, t: 0.5 }); D.shake.add(6, 0.22); chord([300, 220, 160], 0.14, 'sawtooth');
    }
  }
  // 얼음 위성 (오비탈) — 냉장고 주위를 도는 큐브, 접촉 데미지
  if (D.lv.orbital) { D.orbAng += dt * 2.4; updateOrbitals(f, dt); }

  // 냉기 오라
  const auraR = D.lv.frostAura ? 60 + D.lv.frostAura * 22 : 0;
  const slow = D.lv.frostAura ? 1 - Math.min(0.6, D.lv.frostAura * 0.12) : 1;

  // 적 이동
  for (let i = D.enemies.length - 1; i >= 0; i--) {
    const en = D.enemies[i];
    en.ph += dt * 3; en.age += dt; if (en.flash > 0) en.flash -= dt; if (en.squash > 0) en.squash = Math.max(0, en.squash - dt * 1.5);
    blinkTick(en.blinkS, dt);
    // 곰팡이·중장갑·보스는 포자 잔상 (가독성 위해 드물게)
    if ((en.boss || en.key === 'tank' || en.key === 'split') && (en.sporeT -= dt) <= 0) { en.sporeT = 0.25; D.parts.burst(en.x + (Math.random() - 0.5) * en.r, en.y, en.boss ? '#cf86ff' : 'rgba(47,202,166,.7)', 1, { spread: 0.3, life: 0.6, grav: -10 }); }
    // 원소 효과: 화상 DoT + 빙결 둔화, 어픽스 재생, 서리 가시
    if (en.burn > 0) { en.burn -= dt; en.hp -= en.burnDps * dt; if ((en.sporeT2 = (en.sporeT2 || 0) - dt) <= 0) { en.sporeT2 = 0.12; D.parts.burst(en.x, en.y - en.r * 0.3, '#ff8a3d', 1, { life: 0.4, grav: -20 }); } if (en.hp <= 0) { killEnemy(en); continue; } }
    if (en.regen && en.hp > 0) en.hp = Math.min(en.maxhp, en.hp + en.regen * dt);
    if (SP('thorn') && Math.hypot(en.x - f.x, en.y - f.y) < 90) { en.hp -= SP('thorn') * dt; if (en.hp <= 0) { killEnemy(en); continue; } }
    let sp = en.spd;
    if (en.slowT > 0) { en.slowT -= dt; sp *= en.slowMul; }
    if (auraR && Math.hypot(en.x - f.x, en.y - f.y) < auraR) sp *= slow;
    // 칸막이: 벽 윗선에서 막히고 벽 HP를 깎음
    let blocked = false;
    for (const wl of D.walls) {
      if (en.y + en.r >= wl.y - 4 && en.y < wl.y && Math.abs(en.x - wl.x) < wl.w / 2 + en.r) {
        en.y = wl.y - en.r - 4; blocked = true; wl.hp -= (en.dmg * 4 + 6) * dt;
        if ((en._wt = (en._wt || 0) - dt) <= 0) { en._wt = 0.4; D.parts.burst(en.x, wl.y, '#73cbff', 2, { life: 0.3 }); }
        break;
      }
    }
    if (!blocked) { en.y += sp * dt; en.x += Math.sin(en.ph) * 6 * dt; }
    if (en.boss) { en.minionT -= dt; if (en.minionT <= 0) { en.minionT = 2.4; if (D.enemies.length < 22) { const sw = BALANCE.enemy.types.swarm; const m = mkEnemy('swarm', en.maxhp * 0.03 + 4, sw.r, waveSpd(D.wave) * sw.spx, Math.max(1, Math.round(sw.dmg * D.diff.dmg)), {}); m.x = en.x + (Math.random() - 0.5) * 40; m.y = en.y + 20; D.enemies.push(m); } } }
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
    if (s.homing) { // 유도: 목표로 속도 방향을 점진적으로 꺾는다
      if (D.enemies.indexOf(s.homing) < 0) s.homing = D.enemies[0] || null;
      if (s.homing) {
        const ang = Math.atan2(s.homing.y - s.y, s.homing.x - s.x), sp = 320;
        s.vx += (Math.cos(ang) * sp - s.vx) * Math.min(1, dt * 6);
        s.vy += (Math.sin(ang) * sp - s.vy) * Math.min(1, dt * 6);
      }
    }
    s.trail.push(s.x, s.y); if (s.trail.length > 8) s.trail.splice(0, 2); // 모션 트레일
    s.x += s.vx * dt; s.y += s.vy * dt;
    if (s.x < -20 || s.x > D.W + 20 || s.y < -20 || s.y > D.H + 20) { D.shots.splice(i, 1); continue; }
    for (const en of D.enemies) {
      if (s.hit.has(en)) continue;
      if ((s.x - en.x) ** 2 + (s.y - en.y) ** 2 <= (en.r + (s.r || BALANCE.weapon.projR)) ** 2) {
        s.hit.add(en); hitEnemy(en, s.dmg, { frag: s.frag });
        if (s.hit.size > s.pierce) { D.shots.splice(i, 1); break; }
      }
    }
  }
  // 코인 흡수
  for (let i = D.coinsFly.length - 1; i >= 0; i--) {
    const c = D.coinsFly[i]; c.t += dt * 2.2;
    if (c.t >= 1) { D.coins += c.val; D.coinsFly.splice(i, 1); }
  }
  // 칸막이 파괴
  for (let i = D.walls.length - 1; i >= 0; i--) { if (D.walls[i].hp <= 0) { const wl = D.walls[i]; D.parts.burst(wl.x, wl.y, '#73cbff', 16, { spread: 1.2, life: 0.5 }); D.walls.splice(i, 1); D.shake.add(4, 0.18); } }
  // 스킬 이펙트 수명
  for (let i = D.beams.length - 1; i >= 0; i--) if ((D.beams[i].t -= dt) <= 0) D.beams.splice(i, 1);
  for (let i = D.rings.length - 1; i >= 0; i--) { const rg = D.rings[i]; rg.t -= dt; rg.r += (rg.max - rg.r) * Math.min(1, dt * 8); if (rg.t <= 0) D.rings.splice(i, 1); }
  for (let i = D.chains.length - 1; i >= 0; i--) if ((D.chains[i].t -= dt) <= 0) D.chains.splice(i, 1);
  D.parts.update(dt); D.fx.update(dt);
}

// 얼음 위성 — 냉장고 둘레를 도는 큐브, 접촉 시 데미지(개체별 쿨다운)
function updateOrbitals(f, dt) {
  const n = D.lv.orbital, rad = 64, cr = 12, dmg = stat.dmg() * 0.9;
  D.orbPos = [];
  for (let i = 0; i < n; i++) {
    const a = D.orbAng + (i * 2 * Math.PI) / n;
    const x = f.x + Math.cos(a) * rad, y = (f.y - 24) + Math.sin(a) * rad * 0.7;
    D.orbPos.push({ x, y });
    for (const en of D.enemies) {
      if ((x - en.x) ** 2 + (y - en.y) ** 2 <= (cr + en.r) ** 2) {
        en.orbCd = (en.orbCd || 0) - dt;
        if (en.orbCd <= 0) { en.orbCd = 0.35; hitEnemy(en, dmg); }
      }
    }
  }
}

function render(dt) {
  const c = D.ctx, W = D.W, H = D.H, f = fridgePos();
  c.save();
  D.shake.apply(c, dt);
  // 배경 — 시안 톤(딥 퍼플 냉장고 내부) 그라데이션
  const bg = c.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#23123b'); bg.addColorStop(0.55, '#160b22'); bg.addColorStop(1, '#0c1830');
  c.fillStyle = bg; c.fillRect(-30, -30, W + 60, H + 60);
  // 상단 냉기 안개 (적 스폰 구역)
  const mist = c.createLinearGradient(0, 0, 0, 70);
  mist.addColorStop(0, 'rgba(115,203,255,0.14)'); mist.addColorStop(1, 'rgba(115,203,255,0)');
  c.fillStyle = mist; c.fillRect(0, 0, W, 70);
  // 유리 선반(가로) + 레인(세로) 성에
  c.globalAlpha = 0.07; c.fillStyle = '#73cbff';
  for (let i = 1; i < 5; i++) c.fillRect(i * W / 5 - 1, 0, 2, H);
  for (let yy = 100; yy < H - 70; yy += 90) c.fillRect(10, yy, W - 20, 2);
  c.globalAlpha = 1;
  // 냉기 오라
  if (D.lv.frostAura) {
    const auraR = 60 + D.lv.frostAura * 22;
    const ag = c.createRadialGradient(f.x, f.y, auraR * 0.3, f.x, f.y, auraR);
    ag.addColorStop(0, 'rgba(115,203,255,0.05)'); ag.addColorStop(1, 'rgba(115,203,255,0.18)');
    c.fillStyle = ag; c.beginPath(); c.arc(f.x, f.y, auraR, 0, 6.28); c.fill();
  }
  // 관통 레이저 빔
  for (const bm of D.beams) {
    const a = clamp(bm.t / 0.28, 0, 1);
    const lg = c.createLinearGradient(bm.x - bm.w, 0, bm.x + bm.w, 0);
    lg.addColorStop(0, 'rgba(115,203,255,0)'); lg.addColorStop(0.5, `rgba(189,255,228,${0.85 * a})`); lg.addColorStop(1, 'rgba(115,203,255,0)');
    c.fillStyle = lg; c.fillRect(bm.x - bm.w, 0, bm.w * 2, f.y);
    c.fillStyle = `rgba(255,255,255,${a})`; c.fillRect(bm.x - 2, 0, 4, f.y);
  }
  // 서리 폭탄 링
  for (const rg of D.rings) {
    c.globalAlpha = clamp(rg.t / 0.5, 0, 1); c.strokeStyle = '#73cbff'; c.lineWidth = 4;
    c.beginPath(); c.arc(rg.x, rg.y, rg.r, 0, 6.28); c.stroke(); c.globalAlpha = 1;
  }
  // 적 — 픽셀 슬라임 스프라이트 (등장 스케일인 + 호흡 + 피격 화이트 + 깜빡임)
  for (const en of D.enemies) {
    const pop = en.age < 0.32 ? ease.outBack(clamp(en.age / 0.32, 0, 1)) : 1;
    const breath = Math.sin(en.ph) * 0.05;
    const spr = enemySprite(en.key, en.blinkS.blink < 0.4 ? 'blink' : '');
    const th = en.r * 2 * pop;
    const cv = en.flash > 0 && spr.white ? spr.white : spr.base;
    // 어픽스 링 + 화상 글로우
    if (en.affix) { const a = AFFIX[en.affix]; c.save(); c.globalAlpha = 0.5 + Math.sin(en.ph * 1.5) * 0.2; c.strokeStyle = a.ring; c.lineWidth = 2.5; c.beginPath(); c.arc(en.x, en.y, en.r + 4, 0, 6.28); c.stroke(); c.restore(); }
    const glow = en.burn > 0 ? 'rgba(255,138,61,0.9)' : (en.boss ? 'rgba(207,134,255,0.8)' : (en.affix ? AFFIX[en.affix].ring : ''));
    drawSprite(c, cv, en.x, en.y, th, { sx: (1 + breath + en.squash), sy: (1 - breath - en.squash * 0.8) * pop, glow, glowR: en.affix || en.boss || en.burn > 0 ? 14 : 0 });
    if (en.affix) { c.font = '10px serif'; c.textAlign = 'center'; c.fillText(AFFIX[en.affix].icon, en.x, en.y - en.r - 6); }
    if (en.boss || en.maxhp > BALANCE.enemy.baseHP * 3) {
      const w = en.r * 1.8, hpx = en.x - w / 2, hpy = en.y - en.r - 12;
      c.fillStyle = 'rgba(0,0,0,0.4)'; rr(c, hpx, hpy, w, 5, 2.5); c.fill();
      c.fillStyle = en.boss ? '#ff4d6a' : '#9bffe6'; rr(c, hpx, hpy, w * clamp(en.hp / en.maxhp, 0, 1), 5, 2.5); c.fill();
    }
  }
  // 발사체 — 속성/티어별 형태(불꽃·얼음·스파크·중탄)
  const PK = { fire: ['#ffd24a', '#ff7a3d'], frost: ['#e8faff', '#73cbff'], spark: ['#ffffff', '#bdffe4'], heavy: ['#fff0b0', '#ffb24d'], arrow: ['#d2adf0', '#a172d4'], basic: ['#bdffe4', '#5ef0b0'] };
  for (const s of D.shots) {
    const [core, glow] = s.crit ? ['#fff', '#ffb24d'] : (PK[s.kind] || PK.basic);
    const rr0 = (s.r || BALANCE.weapon.projR) * (s.crit ? 1.3 : 1);
    // 트레일
    c.strokeStyle = glow; c.globalAlpha = 0.3; c.lineWidth = rr0 * 1.2; c.lineCap = 'round';
    if (s.trail.length >= 4) { c.beginPath(); c.moveTo(s.trail[0], s.trail[1]); for (let k = 2; k < s.trail.length; k += 2) c.lineTo(s.trail[k], s.trail[k + 1]); c.lineTo(s.x, s.y); c.stroke(); }
    c.globalAlpha = 1; c.shadowColor = glow; c.shadowBlur = 10;
    c.save(); c.translate(s.x, s.y); c.rotate((s.ang || 0) + Math.PI / 2); c.fillStyle = core;
    if (s.kind === 'frost') { // 얼음 마름모
      c.beginPath(); c.moveTo(0, -rr0 * 1.4); c.lineTo(rr0, 0); c.lineTo(0, rr0 * 1.4); c.lineTo(-rr0, 0); c.closePath(); c.fill();
    } else if (s.kind === 'fire') { // 불꽃 물방울
      c.beginPath(); c.moveTo(0, -rr0 * 1.6); c.quadraticCurveTo(rr0 * 1.1, 0, 0, rr0); c.quadraticCurveTo(-rr0 * 1.1, 0, 0, -rr0 * 1.6); c.fill();
    } else if (s.kind === 'spark') { // 별/스파크
      c.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr2 = i % 2 ? rr0 * 0.5 : rr0 * 1.3; c[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr2, Math.sin(a) * rr2); } c.closePath(); c.fill();
    } else if (s.kind === 'arrow') { // 관통 화살
      c.beginPath(); c.moveTo(0, -rr0 * 1.9); c.lineTo(rr0 * 0.8, rr0 * 0.6); c.lineTo(0, rr0 * 0.1); c.lineTo(-rr0 * 0.8, rr0 * 0.6); c.closePath(); c.fill();
    } else { // 기본/중탄 — 원 (중탄은 큼직)
      c.beginPath(); c.arc(0, 0, rr0 * (s.kind === 'heavy' ? 1.25 : 1), 0, 6.28); c.fill();
    }
    c.restore(); c.shadowBlur = 0;
  }
  // 칸막이(얼음 벽) — HP 비율로 투명도
  for (const wl of D.walls) {
    const a = clamp(wl.hp / wl.maxhp, 0.25, 1);
    c.save(); c.globalAlpha = a; c.fillStyle = '#bfe7ff'; c.shadowColor = '#73cbff'; c.shadowBlur = 10;
    rr(c, wl.x - wl.w / 2, wl.y - 6, wl.w, 12, 5); c.fill(); c.shadowBlur = 0;
    c.globalAlpha = 1; c.fillStyle = '#73cbff'; rr(c, wl.x - wl.w / 2, wl.y - 6, wl.w * a, 3, 1.5); c.fill();
    c.restore();
  }
  // 설치 모드 안내
  if (D.placingWall) { c.fillStyle = 'rgba(115,203,255,0.12)'; c.fillRect(0, 90, W, H - 160); c.fillStyle = '#bdffe4'; c.font = "10px 'Press Start 2P', Jua, monospace"; c.textAlign = 'center'; c.fillText('터치해서 벽 설치', W / 2, H / 2); }
  drawFridge(c, f);
  // 냉기 전이(체인) 라인
  for (const ch of D.chains) {
    c.globalAlpha = clamp(ch.t / 0.18, 0, 1); c.strokeStyle = '#bdffe4'; c.lineWidth = 2.5; c.shadowColor = '#5ef0b0'; c.shadowBlur = 8;
    c.beginPath(); c.moveTo(ch.x1, ch.y1); c.lineTo(ch.x2, ch.y2); c.stroke(); c.shadowBlur = 0; c.globalAlpha = 1;
  }
  // 얼음 위성 — 픽셀 눈송이
  if (D.lv.orbital && D.orbPos) {
    const snow = itemSprite('snow').base;
    for (const o of D.orbPos) drawSprite(c, snow, o.x, o.y, 22, { glow: 'rgba(115,203,255,0.8)', glowR: 8 });
  }
  D.parts.draw(c);
  // 코인 흡수 모션 — 픽셀 코인이 HUD로 빨려 들어감
  const coin = itemSprite('coin').base;
  for (const cn of D.coinsFly) {
    const tx = 42, ty = 26, t = ease.inQuad(cn.t);
    drawSprite(c, coin, cn.x + (tx - cn.x) * t, cn.y + (ty - cn.y) * t, 16);
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
  // 보스 등장 암전
  if (D.bossIntro > 0) { c.fillStyle = `rgba(8,4,16,${clamp(D.bossIntro * 0.5, 0, 0.5)})`; c.fillRect(0, 0, W, H); }
  // 업그레이드/파워업 화면 번쩍
  if (D.flash > 0.02) { c.fillStyle = `rgba(94,240,176,${clamp(D.flash * 0.4, 0, 0.4)})`; c.fillRect(0, 0, W, H); }
  // UPGRADE! 텍스트 (시안)
  if (D.upT > 0) {
    const k = clamp((1 - D.upT) / 0.25, 0, 1), sc = ease.outBack(k);
    c.save(); c.translate(W / 2, H * 0.46); c.scale(sc, sc); c.globalAlpha = clamp(D.upT * 1.6, 0, 1); c.textAlign = 'center';
    c.fillStyle = '#5ef0b0'; c.shadowColor = '#5ef0b0'; c.shadowBlur = 16;
    c.font = "20px 'Press Start 2P', Jua, monospace"; c.fillText('UPGRADE!', 0, 0);
    c.shadowBlur = 0; c.fillStyle = '#bdffe4'; c.font = "800 14px Jua, sans-serif"; c.fillText(D.upText, 0, 26);
    c.restore(); c.globalAlpha = 1;
  }
  // 위험! (신선도 낮을 때 냉장고 위 점멸)
  if (D.hp <= D.maxHp * 0.3 && Math.sin(performance.now() / 150) > 0) {
    c.textAlign = 'center'; c.fillStyle = '#ff4d6a'; c.font = "12px 'Press Start 2P', Jua, monospace";
    c.shadowColor = '#ff4d6a'; c.shadowBlur = 10; c.fillText('! 위험 !', f.x, f.y - 52); c.shadowBlur = 0;
  }
  // 웨이브 배너 (슬라이드+스케일 인)
  if (D.bannerT > 0) {
    const k = clamp((1.7 - D.bannerT) / 0.3, 0, 1), sc = ease.outBack(k);
    const boss = D.banner.includes('보스');
    c.save(); c.translate(W / 2, H / 2 - 10); c.scale(sc, sc); c.globalAlpha = clamp(D.bannerT * 1.4, 0, 1);
    c.fillStyle = boss ? '#ff4d6a' : '#5ef0b0';
    c.font = "900 30px Jua, sans-serif"; c.textAlign = 'center';
    c.shadowColor = boss ? '#ff4d6a' : '#5ef0b0'; c.shadowBlur = 18;
    c.fillText(D.banner, 0, 0); c.shadowBlur = 0; c.globalAlpha = 1; c.restore();
  }
  c.restore();
}

function drawFridge(c, f) {
  const low = D.hp <= D.maxHp * 0.3;
  const tier = Math.min(3, Math.floor(D.lv.damage / 4));
  const tierCol = ['#9fb2d6', '#73cbff', '#5ef0b0', '#ffe04a'][tier];
  // 포신(들) — 무기 시각 진화: 데미지 티어=길이/색, 다중샷=포신 개수
  const muzzles = Math.min(5, stat.multi());
  for (let m = 0; m < muzzles; m++) {
    const off = (m - (muzzles - 1) / 2) * 0.18; // 부채꼴
    c.save(); c.translate(f.x, f.y - 24); c.rotate(D.aimAng + Math.PI / 2 + off);
    const bw = 8 + tier * 2, bl = 22 + tier * 4;
    c.fillStyle = tierCol; c.shadowColor = tierCol; c.shadowBlur = tier >= 2 ? 8 : 0;
    rr(c, -bw / 2, -bl, bw, bl, bw / 2); c.fill(); c.shadowBlur = 0;
    if (D.muzzle > 0) { c.globalAlpha = clamp(D.muzzle / 0.08, 0, 1); c.fillStyle = 'rgba(255,240,150,0.95)'; c.beginPath(); c.arc(0, -bl, 7, 0, 6.28); c.fill(); c.globalAlpha = 1; }
    c.restore();
  }
  // 보조 포탑 — 좌/우에 물리적으로 등장 (해금/레벨 가시화)
  for (let t = 0; t < (D.lv.sideTurret || 0); t++) {
    const sx = t % 2 === 0 ? 22 : D.W - 22, sy = D.H - 40 - Math.floor(t / 2) * 22;
    c.save(); c.translate(sx, sy);
    c.fillStyle = '#5a6f9c'; rr(c, -9, -6, 18, 14, 4); c.fill();
    c.fillStyle = tierCol; c.rotate(D.aimAng + Math.PI / 2); rr(c, -3, -16, 6, 16, 3); c.fill();
    c.restore();
  }
  // 냉장고 바디 — 시안 픽셀 스프라이트(내장 카와이 얼굴) + 성에 글로우 / 위험 경고 / 강화 펄스
  const ps = 1 + (D.upPulse || 0) * 0.4;
  drawSprite(c, fridgeSprite().base, f.x, f.y + 6, 80, { sx: ps, sy: ps, glow: D.upPulse > 0.05 ? 'rgba(94,240,176,0.9)' : (low ? 'rgba(255,77,106,0.8)' : 'rgba(115,203,255,0.6)'), glowR: low || D.upPulse > 0.05 ? 18 : 14 });
}

function drawHud(c, W, H) {
  // 코인 (점수=통화) — 아케이드 픽셀 폰트 + 카운트업
  c.font = '16px serif'; c.textAlign = 'left'; c.textBaseline = 'middle';
  c.fillText('🪙', 12, 26);
  c.fillStyle = '#ffe04a'; c.shadowColor = 'rgba(255,224,74,.5)'; c.shadowBlur = 8;
  c.font = "14px 'Press Start 2P', Jua, monospace";
  c.fillText(`${Math.round(D.coinDisp)}`, 34, 27); c.shadowBlur = 0;
  // DPS 칩 (시안) — 우상단
  const dps = Math.round(stat.dmg() * stat.rate() * stat.multi() * (1 + stat.pierce() * 0.4) * (1 + D.lv.sideTurret * 0.5));
  c.textAlign = 'right'; c.font = "9px 'Press Start 2P', Jua, monospace";
  c.fillStyle = '#5ef0b0'; c.fillText(`DPS ${dps}`, W - 12, 22);
  // 웨이브 (좌중)
  c.fillStyle = '#9fb2d6'; c.font = "8px 'Press Start 2P', Jua, monospace"; c.textAlign = 'left';
  c.fillText(`WAVE ${D.wave}`, 12, 48); c.fillStyle = '#7d6aa6'; c.fillText(`${D.kills} KILL`, 96, 48);
  // 신선도 바 (좌상단, 코인 아래)
  const bw = 120, bx = 12, by = 34;
  c.fillStyle = 'rgba(255,255,255,0.14)'; rr(c, bx, by, bw, 8, 4); c.fill();
  const hpRatio = clamp(D.hp / D.maxHp, 0, 1);
  c.fillStyle = hpRatio > 0.5 ? '#5ef0b0' : hpRatio > 0.25 ? '#ffe04a' : '#ff4d6a';
  rr(c, bx, by, bw * hpRatio, 8, 4); c.fill();
  // 보스 등장 시 상단 전체 HP바 + PHASE (시안)
  const boss = D.enemies.find((e) => e.boss);
  if (boss) {
    const r = clamp(boss.hp / boss.maxhp, 0, 1), phase = r > 0.66 ? 1 : r > 0.33 ? 2 : 3;
    c.textAlign = 'left'; c.fillStyle = '#cf86ff'; c.font = "9px 'Press Start 2P', Jua, monospace";
    c.fillText('곰팡이대왕', 12, 64);
    c.textAlign = 'right'; c.fillStyle = '#ff4d6a'; c.fillText(`PHASE ${phase}`, W - 12, 64);
    c.fillStyle = 'rgba(0,0,0,0.45)'; rr(c, 12, 70, W - 24, 9, 4); c.fill();
    c.fillStyle = '#ff4d6a'; rr(c, 12, 70, (W - 24) * r, 9, 4); c.fill();
  }
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
  // 변화 없으면 다시 그리지 않음(탭 유실 방지) + 위임 클릭(innerHTML 교체에도 유지)
  if (!el._bound) { el._bound = true; el.addEventListener('click', (e) => { const b = e.target.closest('[data-k]'); if (b && !b.classList.contains('locked') && !b.classList.contains('maxed')) defBuy(b.dataset.k); }); }
  updateWallBtn();
  const sig = UP_ORDER.map((k) => locked(k) ? 'L' : maxed(k) ? 'M' : (D.coins >= cost(k) ? '1' : '0') + D.lv[k]).join(',');
  if (sig === D.shopSig) return;
  D.shopSig = sig;
  el.innerHTML = UP_ORDER.map((k) => {
    const u = BALANCE.up[k];
    if (locked(k)) return `<button class="up-card locked"><span class="up-ico">${u.icon}</span><b>${u.name}</b><small>🔒 ${u.unlock}점</small></button>`;
    if (maxed(k)) return `<button class="up-card maxed"><span class="up-ico">${u.icon}</span><b>${u.name}</b><small>MAX</small></button>`;
    const cst = cost(k); const can = D.coins >= cst;
    return `<button class="up-card ${can ? 'can' : 'cant'}" data-k="${k}">
      <span class="up-ico">${u.icon}</span><b>${u.name}</b>
      <span class="up-lv">Lv.${D.lv[k]}</span>
      <small class="up-cost">🪙 ${cst}</small></button>`;
  }).join('');
}
export function defBuy(k) {
  if (!D || locked(k) || maxed(k)) return;
  const cst = cost(k);
  if (D.coins < cst) { beep(200, 0.1, 'square', 0.08); return; }
  D.coins -= cst; D.lv[k] += 1;
  if (k === 'maxHp') D.hp += BALANCE.up.maxHp.add;
  chord([523, 698, 880]); buzz(16); D.shake.add(3, 0.12); D.flash = 0.6; // 파워업 모먼트(화면 번쩍)
  D.upText = `${BALANCE.up[k].name} Lv.${D.lv[k]}`; D.upT = 1.0;
  // 업그레이드 모션: 냉장고 펄스 + 강화 입자 분출 + 링
  const f = fridgePos(); D.upPulse = 0.35;
  D.parts.burst(f.x, f.y - 10, '#5ef0b0', 16, { up: 60, life: 0.6, spread: 1.2 });
  D.rings.push({ x: f.x, y: f.y - 10, r: 6, max: 70, t: 0.45 });
  D.fx.add(f.x, f.y - 50, `${BALANCE.up[k].icon} Lv.${D.lv[k]}`, { color: '#bdffe4', size: 16 });
  renderShop();
}

function endGame() {
  savedRun = null;
  const s = D; D = null; cancelAnimationFrame(s.raf);
  beep(160, 0.3, 'square', 0.12);
  const specs = Object.keys(s.spec).length;
  finishGame('defense', '🧊 냉장고 지키기', s.score, `${s.score.toLocaleString()}점`,
    'UI.gameDefense()', { extra: `난이도 ${s.diff.name} · ${s.wave}웨이브 · ${s.kills}처치 · 보스 ${s.bossesKilled} · 스킬 ${specs}종` });
}
