// 🧊 냉장고 지키기 — 자동공격 인크리멘탈 타워디펜스.
// 플레이어는 적을 직접 탭하지 않는다: 냉장고가 자동 발사 → 점수=코인으로 무기/방어수단 강화.
// 슬라임 렌더러 + 파티클·셰이크·히트스톱·코인흡수 손맛. 모든 밸런스는 BALANCE 한 곳.
import { gameUI, beep, chord, buzz, finishGame } from './games.js';
import { blinkTick, Particles, Shake, Floaters, ease, clamp, setupCanvas } from './slime.js';
import { enemySprite, fridgeSprite, itemSprite, drawSprite } from './pixel.js';

// ── 밸런스: 100+ 웨이브용 완만한 곡선. 초반은 아주 너그럽게(잘 안 죽음), 후반은 업그레이드로 따라잡기. ──
const BALANCE = {
  enemy: {
    baseHP: 10, hpGrow: 1.145, speedBase: 16, speedGrow: 1.015, speedCap: 48,
    countBase: 4, countGrow: 1.28, countCap: 40,
    // dmg=냉장고에 닿을 때 깎는 신선도 (작게 — 누적 실수만 위험). from=등장 시작 웨이브.
    // elem=속성(상극 시스템): mold곰팡이 / bug벌레 / frozen냉동 / waste음식물 / bone뼈
    types: {
      grunt:  { hpx: 1.0,  spx: 1.0,  dmg: 3, r: 18, from: 1,  w: 1.0,  elem: 'mold',   name: '곰팡이빵' },
      swarm:  { hpx: 0.4,  spx: 1.7,  dmg: 2, r: 12, from: 3,  w: 0.9, group: 3, elem: 'bug', name: '세균 떼' },
      runner: { hpx: 0.7,  spx: 2.2,  dmg: 4, r: 14, from: 6,  w: 0.7,  elem: 'frozen', name: '살얼음 날치' },
      tank:   { hpx: 3.4,  spx: 0.5,  dmg: 6, r: 24, from: 5,  w: 0.55, elem: 'waste',  name: '상한 배달' },
      split:  { hpx: 1.7,  spx: 0.85, dmg: 4, r: 18, from: 8,  w: 0.5, split: 2, elem: 'mold', name: '분열 곰팡이' },
      shield: { hpx: 5.5,  spx: 0.62, dmg: 5, r: 21, from: 12, w: 0.45, elem: 'bone',   name: '굳은 더께' },
      // 맷집 강한 신종 — 웨이브가 오를수록 합류해 난이도↑
      frost:  { hpx: 6.5,  spx: 0.42, dmg: 7, r: 26, from: 16, w: 0.4,  elem: 'frozen', name: '살얼음 골렘' },
      bone:   { hpx: 8.5,  spx: 0.5,  dmg: 8, r: 25, from: 22, w: 0.36, elem: 'bone',   name: '뼈다귀 무리' },
      brute:  { hpx: 13,   spx: 0.36, dmg: 11, r: 30, from: 30, w: 0.3, elem: 'waste',  name: '거대 폐기물' },
    },
  },
  economy: { scorePerHP: 0.17 },
  weapon: { dmg: 4, fireRate: 1.5, fireRateMax: 7, projSpeed: 600, projR: 8 },
  // boss=10웨이브 대형보스, mid=5웨이브 중간보스(스킬은 짧은 광고로 획득)
  boss: { every: 10, hpMult: 19, dmg: 18, reward: 70, midEvery: 5, midHpMult: 6.5, midDmg: 10, midReward: 35 },
  up: {
    damage: { base: 24, ratio: 1.20, add: 3, name: '데미지', icon: '⚔️', unit: '발당' }, // max 없음(무한)
    fireRate: { base: 32, ratio: 1.22, add: 0.18, name: '연사속도', icon: '🔥', unit: '/초' }, // 상한 fireRateMax
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
    projspd: { base: 40, ratio: 1.45, add: 0.12, max: 6, name: '발사체 속도', icon: '🚀', unit: 'x' }, // 발사체 속도 상한(이펙트 과부하 방지)
    regen: { base: 100, ratio: 1.75, add: 0.5, max: 5, name: '신선도 회복', icon: '❤️', unit: '/초' }, // 재생 레벨 제한
    maxHp: { base: 80, ratio: 1.6, add: 25, name: '단열 강화', icon: '🧊', unit: '최대' },
    boost: { base: 130, ratio: 1.75, add: 0.1, max: 6, name: '코인 부스트', icon: '🪙', unit: '+' }, // 코인 부스트 상승률↓·레벨 제한
  },
};
const UP_ORDER = ['damage', 'fireRate', 'projspd', 'multiShot', 'pierce', 'crit', 'chain', 'wall', 'homing', 'orbital', 'laser', 'bomb', 'frostAura', 'sideTurret', 'regen', 'maxHp', 'boost'];

// 플레이 영역 고정 — 화면이 커져도(특히 PC 넓은 창) 이 크기로 제한해 난이도가 기기별로 달라지지 않게 한다.
// 모바일 기준 세로 칼럼. 큰 화면에선 .gx-stage(flex, justify/align center)가 자동으로 가운데 정렬한다.
const PLAY = { W: 440, H: 820 };

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
  enrage: { icon: '😡', ring: '#ff7a3d', name: '격노', w: 0.8 },   // HP 35% 이하면 이동 1.6배 (스킬: 막판 가속)
};

// 적 속성(원소) — 표현 다양화 + 상극 시스템
const ELEM = {
  mold:   { icon: '🦠', name: '곰팡이', col: '#7bd64a' },
  bug:    { icon: '🐛', name: '벌레',   col: '#ff5d9e' },
  frozen: { icon: '❄️', name: '냉동',   col: '#73cbff' },
  waste:  { icon: '🗑️', name: '음식물', col: '#caa24b' },
  bone:   { icon: '🦴', name: '뼈',     col: '#e8e2d0' },
};
// 플레이어 공격 속성(스왑) — beats에 든 적 속성에 상극 ×1.7 (불리해도 페널티는 없음)
const ATK = {
  blunt: { icon: '🔨', name: '물리', col: '#ffd24a', beats: ['bone'] },
  fire:  { icon: '🔥', name: '화염', col: '#ff7a3d', beats: ['mold', 'frozen'] },
  frost: { icon: '❄️', name: '냉기', col: '#73cbff', beats: ['bug', 'waste'] },
};
const ATK_ORDER = ['blunt', 'fire', 'frost'];
const COUNTER_MUL = 2.2; // 상극 데미지 강화
const counters = (en, atk) => { const a = atk || D.atkElem; return !!(en.elem && a && ATK[a] && ATK[a].beats.includes(en.elem)); };
// 크기별 받는 피해 격차 — 작을수록 더 받고(>1), 클수록(맷집형) 덜 받음(<1)
const SIZE_BASE = 18;
const sizeDmgMul = (en) => (en.boss ? 1 : clamp(Math.pow(SIZE_BASE / en.r, 0.85), 0.55, 1.6));

// ── 스페셜 스킬(로그라이크) — 등급 C/B/A/S. 드래프트 3택: A급 1개 보장 + S급 확률 등장. 수치 랜덤 ──
const rnd = (a, b) => a + Math.random() * (b - a);
const RARITY = {
  common: { grade: 'C', label: 'C', col: '#9fb2d6' },
  rare:   { grade: 'B', label: 'B', col: '#73cbff' },
  unique: { grade: 'A', label: 'A', col: '#ffe04a' },
  mythic: { grade: 'S', label: 'S', col: '#ff8adf' },
  junk:   { grade: 'C', label: '⚠', col: '#7d6aa6' },
};
const SPECIALS = [
  // C급 (일반)
  { id: 'power', r: 'common', icon: '⚡', name: '고출력 회로', max: 99, roll: () => Math.round(rnd(8, 14)), desc: (v) => `데미지 +${v}%` },
  { id: 'overload', r: 'common', icon: '🔥', name: '과부하', max: 99, roll: () => Math.round(rnd(8, 14)), desc: (v) => `연사속도 +${v}%` },
  { id: 'gold', r: 'common', icon: '🪙', name: '황금 회로', max: 99, roll: () => Math.round(rnd(12, 24)), desc: (v) => `코인 +${v}%` },
  { id: 'bigshot', r: 'common', icon: '🔵', name: '대구경탄', max: 99, roll: () => Math.round(rnd(10, 17)), desc: (v) => `발사체 크기·피해 +${v}%` },
  { id: 'thorn', r: 'common', icon: '🌵', name: '서리 가시', max: 99, roll: () => Math.round(rnd(6, 14)), desc: (v) => `근처 적 초당 ${v} 피해` },
  // B급 (희귀)
  { id: 'critdmg', r: 'rare', icon: '💥', name: '치명 강화', max: 99, roll: () => Math.round(rnd(40, 75)), desc: (v) => `치명타 피해 +${v}%` },
  { id: 'pierceUp', r: 'rare', icon: '➶', name: '관통 코어', max: 6, roll: () => 1, desc: (v) => `관통 +${v}` },
  { id: 'fire', r: 'rare', icon: '🔥', name: '화염탄', max: 99, roll: () => Math.round(rnd(22, 40)), desc: (v) => `명중 시 화상(초당 ${v}%, 3초)` },
  { id: 'frost', r: 'rare', icon: '❄️', name: '빙결탄', max: 60, roll: () => Math.round(rnd(14, 26)), desc: (v) => `명중 시 ${v}% 둔화` },
  { id: 'vamp', r: 'rare', icon: '🩸', name: '흡혈 코어', max: 40, roll: () => Math.round(rnd(8, 15)), desc: (v) => `처치 시 ${v}% 확률 신선도+1` },
  { id: 'splash', r: 'rare', icon: '💥', name: '폭발탄', max: 99, roll: () => Math.round(rnd(18, 30)), desc: (v) => `명중 시 주변 적에게 ${v}% 광역 피해` },
  // A급 (고급) — 드래프트마다 최소 1개 보장
  { id: 'double', r: 'unique', icon: '➿', name: '더블샷', max: 3, roll: () => 1, desc: (v) => `발사마다 +${v}발 부채꼴` },
  { id: 'volley', r: 'unique', icon: '✳️', name: '일제 사격', max: 3, roll: () => 1, desc: (v) => `동시 타겟 +${v}` },
  { id: 'exec', r: 'unique', icon: '☠️', name: '처형 칼날', max: 25, roll: () => Math.round(rnd(8, 15)), desc: (v) => `체력 ${v}% 이하 즉사` },
  { id: 'splitp', r: 'unique', icon: '💠', name: '분열탄', max: 2, roll: () => 1, desc: (v) => `명중 시 파편 ${v}개` },
  // 트랩 — 그럴듯하지만 함정. 승부욕·리스크
  { id: 'glass', r: 'junk', icon: '🩹', name: '유리 대포', max: 1, roll: () => 60, desc: () => '데미지 +60%, 단 최대 신선도 −30', trap: true },
  { id: 'rush', r: 'junk', icon: '🌀', name: '폭주 회로', max: 1, roll: () => 40, desc: () => '연사 +40%, 단 코인 획득 −25%', trap: true },
  { id: 'gamble', r: 'junk', icon: '🎲', name: '도박수', max: 1, roll: () => 1, desc: () => '50%: 데미지 +80% / 50%: 꽝(+5%)', trap: true },
  // S급 (전설) — 강력하지만 너프됨. 보스 구간부터, A급 보장과 별개로 30% 확률 등장
  { id: 'overdrive', r: 'mythic', icon: '🌟', name: '광폭 코어', max: 99, roll: () => Math.round(rnd(11, 18)), desc: (v) => `데미지 +${v}% · 연사 +${Math.round(v * 0.5)}%` },
  { id: 'fortress', r: 'mythic', icon: '🏰', name: '철벽 단열', max: 99, roll: () => Math.round(rnd(45, 75)), desc: (v) => `최대 신선도 +${v} · 초당 회복↑` },
  { id: 'annihilate', r: 'mythic', icon: '💀', name: '말살 칼날', max: 45, roll: () => Math.round(rnd(14, 22)), desc: (v) => `체력 ${v}% 이하 즉사(보스 제외)` },
];
const SP_BY = Object.fromEntries(SPECIALS.map((s) => [s.id, s]));
const SP = (id) => (D.spec[id] ? D.spec[id].val : 0);

let D = null;
const DEF_SAVE_KEY = 'nb_def_save';
let savedRun = null; // 나갔다 들어와도 이어서 하기 (localStorage 영속 — 앱을 닫았다 와도 보존)
try { savedRun = JSON.parse(localStorage.getItem(DEF_SAVE_KEY) || 'null'); } catch { savedRun = null; }
// 백그라운드 전환/종료 시에도 저장 — 루프가 멈춰도(프리즈) 진행상황이 보존되게 루프 밖에서 보장
document.addEventListener('visibilitychange', () => { if (document.hidden) snapshotRun(); });
window.addEventListener('pagehide', () => snapshotRun());

// 게임이 진행 중인지 (나가기 경고용) — 시작 전 화면/종료 후엔 false
export function defActive() { return !!(D && !D.over && D.wave >= 1); }

export function gameDefense() {
  const ui = gameUI();
  if (!savedRun) { try { savedRun = JSON.parse(localStorage.getItem(DEF_SAVE_KEY) || 'null'); } catch { /* noop */ } } // 저장본 복구(앱 닫았다 와도 이어하기)
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
          <div class="gx-start-in def-opening">
            <div class="op-foes">🦠 🧟 ❄️ 🗑️ 🦴</div>
            <div class="op-hero">🧊🛡️</div>
            <b class="op-title">최후의 신선 보루</b>
            <div class="op-story">
              <p>깊은 밤, 문틈으로 <b>곰팡이 포자</b>가 스며든다.</p>
              <p>상온의 부패균과 음식물 쓰레기, 정체 모를 <b>뼈다귀</b>까지…</p>
              <p>바깥의 오염이 마지막 보루 — <b>당신의 냉장고</b>로 몰려온다.</p>
              <p>다행히 이 냉장고는 스스로 맞서 싸운다. 당신은 그 힘을 <b>키우면</b> 된다.</p>
              <p class="op-warn">⚠ 신선도가 0이 되는 순간, 모든 것이 상한다.</p>
            </div>
            ${resume}
            <div class="diff-row">
              ${Object.values(DIFF).map((d) => `<button class="diff-btn" style="--dc:${d.color}" onclick="UI.defStart('${d.key}')"><b>${d.name}</b><small>${d.sub}</small></button>`).join('')}
            </div>
            <p class="diff-hint">난이도를 고르면 방어 개시 · 게임 중 ⏩ 2·3배속 · 🔨🔥❄️ 속성 상극 · 50웨이브부터 <b>공포·좀비화</b></p>
          </div>
        </div>
      </div>
      <div class="gx-shopbar">
        <button class="gx-speed" id="def-speed" onclick="UI.defSpeed()">⏩ 1배속</button>
        <button class="gx-elem" id="def-elem" onclick="UI.defElem()">🔨 물리</button>
        <button class="gx-adcoin" id="def-special" onclick="UI.defAdSkill()">✨ 비책 (1)</button>
        <button class="gx-wall" id="def-wall" style="display:none" onclick="UI.defWallMode()">🧱 벽 설치</button>
        <span class="gx-diff" id="def-difflbl"></span>
      </div>
      <div class="gx-shop" id="def-shop"></div>
    </div>`);
  const canvas = document.getElementById('def-c');
  const wrap = canvas.parentElement;
  const cw = wrap.clientWidth, ch = wrap.clientHeight;
  const cssW = clamp(Number.isFinite(cw) && cw > 0 ? cw : 340, 280, PLAY.W);
  let cssH = (Number.isFinite(ch) && ch > 240) ? ch : clamp(Math.round((window.innerHeight || 720) - 200), 340, PLAY.H);
  cssH = clamp(cssH, 320, PLAY.H); // 모바일 기준 고정(난이도 일관) — 큰 화면은 가운데 정렬
  const { ctx } = setupCanvas(canvas, cssW, cssH);

  D = {
    ctx, canvas, W: cssW, H: cssH, diff: DIFF.normal, speed: 1, spec: {}, atkElem: 'blunt', turretElem: [], special: { charges: 1 },
    enemies: [], shots: [], coinsFly: [], parts: new Particles(240), fx: new Floaters(48), shake: new Shake(),
    lv: { damage: 0, fireRate: 0, projspd: 0, multiShot: 0, pierce: 0, crit: 0, chain: 0, wall: 0, homing: 0, orbital: 0, laser: 0, bomb: 0, sideTurret: 0, frostAura: 0, regen: 0, maxHp: 0, boost: 0 },
    walls: [], wallUsed: 0, placingWall: false,
    coins: 0, score: 0, kills: 0, bossesKilled: 0, midKilled: 0, revived: false, pendingMidAd: false,
    wave: 0, toSpawn: 0, spawnGap: 1, since: 0,
    hp: 100, maxHp: 100,
    fireCd: 0, sideCd: 0, homingCd: 0, laserCd: 0, bombCd: 0, orbAng: 0, beams: [], rings: [], chains: [],
    powerCut: false, plug: null, powerCd: 0, // 보스전 정전 이벤트
    aimAng: -Math.PI / 2, muzzle: 0,
    banner: '', bannerT: 0, hitStop: 0, vign: 0, flash: 0, bossIntro: 0, coinDisp: 0, upText: '', upT: 0, upPulse: 0, fridge: { blink: 1 },
    last: 0, raf: 0, running: false, over: false, shopT: 0,
  };
  // 전장 터치: ① 벽 설치 모드면 벽 ② 보조 포탑 → 그 포탑 속성 전환 ③ 냉장고 → 공격 속성 전환
  canvas.addEventListener('pointerdown', (e) => {
    if (!D) return;
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    if (D.powerCut && D.plug && Math.hypot(x - D.plug.x, y - D.plug.y) < 44) { restorePower(); return; } // 정전 중엔 콘센트 우선
    if (D.placingWall) { placeWall(x, clamp(y, 90, D.H - 70)); return; }
    if (!D.running) return;
    for (let t = 0; t < (D.lv.sideTurret || 0); t++) {
      const sx = t % 2 === 0 ? 22 : D.W - 22, sy = D.H - 40 - Math.floor(t / 2) * 22;
      if (Math.hypot(x - sx, y - sy) < 28) { cycleTurretElem(t % 2); return; }
    }
    const f = fridgePos();
    if (Math.hypot(x - f.x, y - (f.y - 6)) < 62) { defElem(); return; }
  });
  // 스테이지 크기가 바뀔 때마다(열기·전체화면·회전·키패드) 캔버스를 정확히 맞춰 모든 요소가 보이게
  if (typeof ResizeObserver !== 'undefined') {
    if (defRO) defRO.disconnect();
    defRO = new ResizeObserver(() => resizeDefCanvas());
    defRO.observe(wrap);
  }
  requestAnimationFrame(() => resizeDefCanvas()); // 레이아웃 확정 후 실제 스테이지 크기로 스냅
  // 큰 화면 게임은 처음부터 전체화면으로(지원 시). 미지원(아이폰 등)이면 인앱 최대화로 모두 보임.
  try {
    const gxEl = canvas.closest('.gx');
    if (gxEl && document.fullscreenEnabled && !document.fullscreenElement && gxEl.requestFullscreen) {
      const p = gxEl.requestFullscreen(); if (p && p.catch) p.catch(() => {});
    }
  } catch { /* 전체화면 불가 — 인앱 최대화로 충분 */ }
}
let defRO = null;
// 화면/전체화면 변화에 맞춰 플레이그라운드를 꽉 차게 리사이즈
function resizeDefCanvas() {
  if (!D || !D.canvas || !D.canvas.isConnected) return;
  const wrap = D.canvas.parentElement; if (!wrap) return;
  const cw = wrap.clientWidth, ch = wrap.clientHeight;
  if (!Number.isFinite(cw) || !Number.isFinite(ch) || cw < 200 || ch < 200) return; // 스텁/미측정 시 건너뜀
  const w = clamp(cw, 280, PLAY.W), h = clamp(ch, 320, PLAY.H); // 모바일 기준 고정(난이도 일관) — 큰 화면은 가운데 정렬
  if (Math.abs(w - D.W) < 2 && Math.abs(h - D.H) < 2) return;
  setupCanvas(D.canvas, w, h); D.W = w; D.H = h;
  if (D.horror && D.moldSpots) seedMold();
}
if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('resize', () => resizeDefCanvas());
  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('fullscreenchange', () => setTimeout(resizeDefCanvas, 90));
    document.addEventListener('webkitfullscreenchange', () => setTimeout(resizeDefCanvas, 90));
  }
}
// 보조 포탑 속성 (좌=0, 우=1) — 기본은 본체와 다른 속성으로 분산
function turretElemOf(side) { return D.turretElem[side] || ATK_ORDER[(side + 1) % ATK_ORDER.length]; }
function cycleTurretElem(side) {
  const i = ATK_ORDER.indexOf(turretElemOf(side));
  D.turretElem[side] = ATK_ORDER[(i + 1) % ATK_ORDER.length];
  const a = ATK[D.turretElem[side]];
  beep(500 + i * 80, 0.05, 'triangle', 0.08);
  D.fx.add(side === 0 ? 28 : D.W - 28, D.H - 46, `${a.icon} ${a.name}`, { color: a.col, size: 14, font: 'Jua' });
}
// 보스전 정전 — 냉장고 전원 50% 다운, 콘센트(🔌)를 찾아 탭하면 복구
function startPowerCut() {
  D.powerCut = true; D.powerCd = 999;
  D.plug = { x: 40 + Math.random() * (D.W - 80), y: 84 + Math.random() * Math.max(60, D.H * 0.45), t: 0 };
  D.banner = '⚡ 정전! 콘센트(🔌)를 탭!'; D.bannerT = 1.8;
  D.shake.add(9, 0.45); D.vign = 1; chord([180, 130, 90], 0.2, 'sawtooth'); buzz([40, 30, 40]);
}
function restorePower() {
  D.powerCut = false; D.plug = null; D.powerCd = rnd(13, 19);
  D.flash = 0.6; D.shake.add(4, 0.2); chord([523, 659, 880, 1047]); buzz(20);
  D.fx.add(D.W / 2, D.H * 0.4, '⚡ 전원 복구!', { color: '#ffe04a', size: 18, font: 'Jua' });
}
const wallAvail = () => (D ? D.lv.wall * BALANCE.up.wall.add - D.wallUsed : 0);
function placeWall(x, y) {
  if (wallAvail() <= 0) { D.placingWall = false; return; }
  const w = Math.min(140, D.W * 0.42), hp = 60 + D.wave * 14;
  // 금이 갈 위치를 미리 시드(데미지 비율에 따라 단계적으로 드러남)
  const cracks = [];
  for (let i = 0; i < 6; i++) {
    const sx = (Math.random() - 0.5) * w * 0.8; const pts = [[sx, -6]]; let px = sx, py = -6;
    for (let s = 0; s < 3; s++) { px += (Math.random() - 0.5) * 10; py += 4; pts.push([px, py]); }
    cracks.push({ pts, thr: (i + 0.5) / 6 });
  }
  D.walls.push({ x: clamp(x, w / 2, D.W - w / 2), y, w, hp, maxhp: hp, cracks });
  D.wallUsed += 1; D.placingWall = false;
  chord([523, 440, 392]); buzz(18); D.parts.burst(x, y, '#73cbff', 14, { spread: 1, life: 0.5 });
  updateWallBtn();
}
function updateWallBtn() {
  const b = document.getElementById('def-wall'); if (!b || !D) return;
  const n = wallAvail();
  b.style.display = (D.lv.wall > 0) ? '' : 'none';
  if (D.placingWall) b.textContent = '🧱 터치해 설치!';
  else if (n <= 0) b.textContent = '🧱 충전'; // 설치권 소진 → 충전
  else b.textContent = `🧱 벽 설치 (${n})`;
  b.classList.toggle('arming', D.placingWall);
  b.classList.toggle('adcharge', !D.placingWall && n <= 0);
}
export function defWallMode() {
  if (!D || !D.running) return;
  if (wallAvail() <= 0) { // 설치권 소진 → 잠깐 보고 충전(벽 갱신)
    stageAd('잠깐 보고 칸막이 설치권 충전', () => {
      D.wallUsed = 0; updateWallBtn();
      D.fx.add(D.W / 2, D.H * 0.4, '🧱 설치권 충전!', { color: '#73cbff', size: 18, font: 'Jua' });
      chord([523, 659, 784]);
    });
    return;
  }
  D.placingWall = !D.placingWall; updateWallBtn();
}
function toastNo() { beep(200, 0.1, 'square', 0.08); }

function snapshotRun() {
  if (!D || D.over || D.wave < 1) { savedRun = null; try { localStorage.removeItem(DEF_SAVE_KEY); } catch { /* noop */ } return; }
  savedRun = {
    diffKey: D.diff.key, speed: D.speed, lv: { ...D.lv }, spec: JSON.parse(JSON.stringify(D.spec)),
    coins: D.coins, score: D.score, kills: D.kills, bossesKilled: D.bossesKilled, midKilled: D.midKilled, hp: D.hp, maxHp: D.maxHp, wave: D.wave, revived: D.revived, atkElem: D.atkElem, turretElem: [...(D.turretElem || [])], special: { charges: D.special ? D.special.charges : 1 },
  };
  try { localStorage.setItem(DEF_SAVE_KEY, JSON.stringify(savedRun)); } catch { /* 용량 초과 무시 */ }
}
export function defResume() {
  if (!savedRun || !D) return;
  const sv = savedRun; savedRun = null;
  document.getElementById('def-start')?.remove();
  D.diff = DIFF[sv.diffKey] || DIFF.normal; D.speed = sv.speed || 1; D.spec = sv.spec || {}; D.atkElem = sv.atkElem || 'blunt'; D.turretElem = sv.turretElem || []; D.special = sv.special || { charges: 1 };
  Object.assign(D.lv, sv.lv);
  D.coins = sv.coins; D.score = sv.score; D.kills = sv.kills; D.bossesKilled = sv.bossesKilled || 0; D.midKilled = sv.midKilled || 0;
  D.maxHp = sv.maxHp; D.hp = sv.hp; D.revived = sv.revived; D.wave = sv.wave - 1;
  const lbl = document.getElementById('def-difflbl'); if (lbl) lbl.textContent = `난이도 ${D.diff.name}`; updateElemBtn();
  const sb = document.getElementById('def-speed'); if (sb) sb.textContent = `⏩ ${D.speed}배속`;
  beep(660, 0.05); nextWave(); D.running = true; D.last = performance.now(); renderShop(); D.raf = requestAnimationFrame(loop);
}
export function defStart(diffKey) {
  savedRun = null;
  if (!D) return;
  D.diff = DIFF[diffKey] || DIFF.normal;
  document.getElementById('def-start')?.remove();
  const lbl = document.getElementById('def-difflbl'); if (lbl) lbl.textContent = `난이도 ${D.diff.name}`;
  updateElemBtn();
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
// 공격 속성 스왑 — 적 약점에 맞춰 상극 피해
export function defElem() {
  if (!D || !D.running) return;
  const i = ATK_ORDER.indexOf(D.atkElem);
  D.atkElem = ATK_ORDER[(i + 1) % ATK_ORDER.length];
  updateElemBtn(); beep(540 + i * 90, 0.05, 'triangle', 0.09);
  const a = ATK[D.atkElem]; D.fx.add(D.W / 2, D.H * 0.4, `${a.icon} ${a.name}`, { color: a.col, size: 18, font: 'Jua' });
}
function updateElemBtn() {
  const b = document.getElementById('def-elem'); if (!b || !D) return;
  const a = ATK[D.atkElem]; b.textContent = `${a.icon} ${a.name}`; b.style.setProperty('--ec', a.col);
}

/* ── 능력치 ── */
const cost = (k) => Math.floor(BALANCE.up[k].base * Math.pow(BALANCE.up[k].ratio, D.lv[k]));
const maxed = (k) => BALANCE.up[k].max != null && D.lv[k] >= BALANCE.up[k].max;
const locked = (k) => BALANCE.up[k].unlock != null && D.score < BALANCE.up[k].unlock && D.lv[k] === 0;
const stat = {
  dmg: () => (BALANCE.weapon.dmg + D.lv.damage * BALANCE.up.damage.add) * (1 + (SP('power') + SP('bigshot') + SP('glass') + SP('gamble') + SP('overdrive')) / 100) * (D.powerCut ? 0.5 : 1),
  rate: () => Math.min(BALANCE.weapon.fireRateMax, (BALANCE.weapon.fireRate + D.lv.fireRate * BALANCE.up.fireRate.add) * (1 + (SP('overload') + SP('rush') + SP('overdrive') * 0.5) / 100)),
  multi: () => 1 + D.lv.multiShot + SP('volley'),
  pierce: () => D.lv.pierce + SP('pierceUp'),
  crit: () => Math.min(0.85, D.lv.crit * BALANCE.up.crit.add),
  critMult: () => 2 + SP('critdmg') / 100,
  boost: () => Math.max(0.2, 1 + D.lv.boost * BALANCE.up.boost.add + SP('gold') / 100 - (D.spec.rush ? 0.25 : 0)),
  projR: () => BALANCE.weapon.projR * (1 + SP('bigshot') / 220),
  projSpeed: () => BALANCE.weapon.projSpeed * (1 + D.lv.projspd * BALANCE.up.projspd.add),
};

function fridgePos() { return { x: D.W / 2, y: D.H - 30 }; }

const horrorHp = (w) => (w >= 50 ? 1.2 + (w - 50) * 0.012 : 1); // 공포 구간(50+) 맷집↑
const waveHP = (w) => BALANCE.enemy.baseHP * Math.pow(BALANCE.enemy.hpGrow, w - 1) * D.diff.hp * horrorHp(w);
// 필드가 커지면 침투까지 거리가 늘어 쉬워지므로, 높이에 비례해 속도를 키워 긴장감 유지
const fieldScale = () => clamp((D ? D.H : 520) / 520, 0.85, 1.7);
const waveSpd = (w) => Math.min(BALANCE.enemy.speedCap, BALANCE.enemy.speedBase * Math.pow(BALANCE.enemy.speedGrow, w - 1)) * D.diff.spd * (w >= 50 ? 1.06 : 1) * fieldScale();

// 공포 구간 오염 얼룩(냉장고 오라 밖) 좌표 시드
function seedMold() {
  D.moldSpots = [];
  for (let i = 0; i < 16; i++) D.moldSpots.push({ x: 18 + Math.random() * (D.W - 36), y: 80 + Math.random() * (D.H - 160), r: 24 + Math.random() * 40, ph: Math.random() * 6.28 });
}

function nextWave() {
  D.wave += 1;
  const w = D.wave, B = BALANCE.boss, e = BALANCE.enemy;
  const boss = w % B.every === 0;
  const mid = !boss && w % B.midEvery === 0;
  D.bossWave = boss; D.midWave = mid; D._bossSpawned = false; D._midSpawned = false;
  if (boss || mid) { D.powerCd = 9; D.powerCut = false; D.plug = null; } // 보스전 정전 타이머 준비
  D.horror = w >= 50;
  if (D.horror && !D.moldSpots) seedMold();
  const cnt = Math.min(e.countCap, Math.round((e.countBase + w * e.countGrow) * D.diff.count * (D.horror ? 1.12 : 1)));
  D.toSpawn = boss ? 1 : mid ? Math.min(9, 3 + Math.floor(w / 8)) : cnt; // 중간보스는 본체+호위병
  D.spawnGap = clamp(1.2 - w * 0.012, 0.42, 1.2); // 완만하게만 빨라짐
  D.banner = boss ? '⚠ 보스 — 곰팡이대왕' : mid ? '⚔ 중간보스 출현' : `WAVE ${w}`;
  D.bannerT = mid ? 2.0 : 1.7;
  if (w === 50) { // 공포 분위기 전환 연출
    D.banner = '🧟 오염 확산 — 공포의 시작'; D.bannerT = 2.6; D.bossIntro = 1.4; D.vign = 1;
    D.shake.add(11, 0.8); chord([110, 98, 82, 73], 0.32, 'sawtooth'); buzz([40, 60, 40]);
  } else if (boss) { D.bossIntro = 1.2; D.shake.add(6, 0.4); chord([196, 233, 294, 196], 0.18, 'sawtooth'); }
  else if (mid) { D.bossIntro = 0.7; D.shake.add(4, 0.3); chord([233, 311, 392], 0.16, 'sawtooth'); buzz([20, 30]); }
  else chord([392, 523, 659]);
}

function spawnOne() {
  const w = D.wave, B = BALANCE.boss;
  if (D.bossWave && !D._bossSpawned) {
    D._bossSpawned = true;
    const hp = waveHP(w) * B.hpMult;
    D.enemies.push(mkEnemy('boss', hp, 40, waveSpd(w) * 0.5, B.dmg, { boss: true, elem: 'mold', bossName: '🦠 곰팡이대왕' }));
    return;
  }
  if (D.midWave && !D._midSpawned) {
    D._midSpawned = true;
    const el = ['frozen', 'waste', 'bone', 'bug', 'mold'][Math.floor(w / B.midEvery) % 5];
    const hp = waveHP(w) * B.midHpMult;
    D.enemies.push(mkEnemy('midboss', hp, 30, waveSpd(w) * 0.62, B.midDmg, { midboss: true, elem: el, bossName: `${ELEM[el].icon} ${ELEM[el].name} 장군` }));
    return; // 남은 toSpawn은 일반 호위병으로 채움
  }
  // 등장 가능한 타입을 가중치로 선택 (웨이브↑=종류 다양↑, 공포 구간은 맷집형 가중↑)
  const heavy = { tank: 1, shield: 1, frost: 1, bone: 1, brute: 1 };
  const pool = Object.entries(BALANCE.enemy.types).filter(([, t]) => w >= t.from);
  let total = 0; const wts = pool.map(([k, t]) => { const ww = t.w * (D.horror && heavy[k] ? 1.5 : 1); total += ww; return ww; });
  let r = Math.random() * total, key = pool[0][0], t = pool[0][1];
  for (let i = 0; i < pool.length; i++) { r -= wts[i]; if (r <= 0) { key = pool[i][0]; t = pool[i][1]; break; } }
  const n = t.group || 1; // 세균 떼는 한 번에 여러 마리
  const dmg = Math.max(1, Math.round(t.dmg * D.diff.dmg * (1 + w * 0.04))); // 후반 침투 피해↑(뚫리면 아프게 — 긴장)
  for (let i = 0; i < n; i++) {
    D.enemies.push(mkEnemy(key, waveHP(w) * t.hpx, t.r, waveSpd(w) * t.spx, dmg, { split: t.split, elem: t.elem, affix: rollAffix(w) }));
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
  const typ = BALANCE.enemy.types[key];
  const e = {
    key, hp, maxhp: hp, r, spd, dmg, boss: !!opt.boss, midboss: !!opt.midboss, split: opt.split || 0, mini: !!opt.mini, affix: af,
    elem: opt.elem || (typ && typ.elem) || null, bossName: opt.bossName || '',
    zombie: D.wave >= 50 && !opt.boss, // 공포 구간(50+) 좀비화
    armorMul: af === 'armor' ? 0.55 : 1, shield: af === 'shield' ? 1 : 0, regen: af === 'regen' ? hp * 0.04 : 0,
    // 뒤로 갈수록 방어력↑ — 받는 피해를 줄이는 배수(웨이브8부터, 최대 18% 경감). 과하면 총알스펀지+물량적체로 지루·렉이라 절제.
    warmor: opt.boss || opt.midboss ? 1 : 1 - clamp((D.wave - 8) * 0.004, 0, 0.18),
    burn: 0, burnDps: 0, slowT: 0, slowMul: 1,
    x: 22 + Math.random() * (D.W - 44), y: -r - 6,
    ph: Math.random() * 6.28, blinkS: { blink: 1 }, flash: 0, squash: 0, age: 0, sporeT: 0, sporeZ: 0, minionT: 1.6,
  };
  if (af === 'swift') e.spd *= 1.45;
  if (af === 'tough') { e.hp *= 1.7; e.maxhp *= 1.7; e.r *= 1.12; }
  // 방패 몬스터 — 본체 HP 앞에 깨야 하는 방패 풀(앞면 호로 표시). 깨질 때까지 본체 보호.
  if (key === 'shield') { e.shieldMax = hp * 0.55; e.shieldHp = e.shieldMax; }
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
function fireFrom(x, y, targets, atk) {
  const elem = atk || D.atkElem;
  const extra = SP('double'), pr = stat.projR(), spd = stat.projSpeed(), kind = projKind();
  for (const tg of targets) {
    // 리드 조준: 발사체 도착 시점의 적 위치(주로 아래로 내려옴)를 예측 → 넓은 PC 화면 끝쪽·빠른 적도 명중
    let aimX = tg.x, aimY = tg.y;
    if (spd > 0 && tg.spd) { const tHat = Math.hypot(tg.x - x, tg.y - y) / spd; aimY = tg.y + tg.spd * tHat; }
    const base = Math.atan2(aimY - y, aimX - x);
    D.aimAng = base;
    const shots = 1 + extra;
    for (let s = 0; s < shots; s++) {
      const off = shots > 1 ? (s - (shots - 1) / 2) * 0.13 : 0;
      const ang = base + off, isCrit = Math.random() < stat.crit();
      D.shots.push({
        x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, ang,
        dmg: stat.dmg() * (isCrit ? stat.critMult() : 1), crit: isCrit, pierce: stat.pierce(), hit: new Set(), trail: [], r: pr, kind, atk: elem,
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
  const atk = (opt && opt.atk) || D.atkElem; // 발사 주체(냉장고/포탑)의 공격 속성
  if (en.shield) { en.shield = 0; en.flash = 0.12; D.parts.burst(en.x, en.y, '#bdffe4', 7, { spread: 0.6, life: 0.3 }); beep(520, 0.05); return; } // 보호막 어픽스: 첫 피격 무효
  const ctr = counters(en, atk) ? COUNTER_MUL : 1; // 상극: 약점 속성에 추가 피해
  const eff = dmg * ctr * sizeDmgMul(en) * (en.armorMul || 1) * (en.warmor || 1); // 방어력(어픽스·웨이브) 적용 후 실제 피해
  if (en.shieldHp > 0) { // 방패 몬스터 — 방패가 먼저 받아내고, 깨지기 전엔 본체 보호
    en.shieldHp -= eff; en.flash = 0.1; en.squash = 0.16;
    if (en.shieldHp <= 0) { en.shieldHp = 0; en.flash = 0.18; D.parts.burst(en.x, en.y, '#bdffe4', 11, { spread: 1, life: 0.35 }); beep(440, 0.08, 'square', 0.1); }
    return;
  }
  en.hp -= eff; en.flash = ctr > 1 ? 0.16 : 0.1; en.squash = 0.22;
  if (ctr > 1 && !sec) {
    const t = performance.now(), col = (ATK[atk] || ATK.blunt).col;
    if (!en._ctrT || t - en._ctrT > 380) { en._ctrT = t; D.fx.add(en.x, en.y - en.r - 4, '상극!', { color: col, size: 12, font: 'Jua' }); D.parts.burst(en.x, en.y, col, 5, { spread: 0.8, life: 0.3 }); }
  }
  D.parts.burst(en.x, en.y, '#fff', 4, { spread: 0.5, life: 0.25 });
  if (!sec) {
    if (SP('fire')) { en.burnDps = Math.max(en.burnDps, stat.dmg() * SP('fire') / 100); en.burn = Math.max(en.burn, 3); }
    if (SP('frost')) { en.slowMul = 1 - Math.min(0.6, SP('frost') / 100); en.slowT = 1.5; }
    if (SP('splash') && en.hp > 0) { // 폭발탄 — 명중 지점 주변 광역 피해
      const rad = 44 + SP('splash') * 0.5, fr = SP('splash') / 100;
      for (const o of D.enemies) { if (o === en) continue; if ((o.x - en.x) ** 2 + (o.y - en.y) ** 2 <= rad * rad) hitEnemy(o, dmg * fr, { frag: true, atk }); }
      D.rings.push({ x: en.x, y: en.y, r: 6, max: rad, t: 0.3 });
      D.parts.burst(en.x, en.y, '#ffb24d', 6, { spread: 1, life: 0.3 });
    }
    if (SP('splitp') && en.hp > 0) {
      const others = D.enemies.filter((o) => o !== en);
      for (let i = 0; i < SP('splitp'); i++) {
        const o = others[Math.floor(Math.random() * others.length)];
        const ang = o ? Math.atan2(o.y - en.y, o.x - en.x) : Math.random() * 6.28;
        D.shots.push({ x: en.x, y: en.y, vx: Math.cos(ang) * 360, vy: Math.sin(ang) * 360, dmg: stat.dmg() * 0.4, crit: false, pierce: 0, hit: new Set([en]), trail: [], r: 4, frag: true });
      }
    }
  }
  const execT = Math.max(SP('exec'), SP('annihilate'));
  if (execT && !en.boss && !en.midboss && en.hp > 0 && en.hp <= en.maxhp * execT / 100) { en.hp = 0; D.parts.burst(en.x, en.y, '#ff4d6a', 10, { life: 0.4 }); }
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
const PART_COLOR = { grunt: '#a172d4', swarm: '#ff5d9e', runner: '#73cbff', tank: '#e0a64b', split: '#2fcaa6', shield: '#9fb2d6', frost: '#73cbff', bone: '#e8e2d0', brute: '#aec06a', mini: '#2fcaa6', midboss: '#ffd24a', boss: '#cf86ff' };
function killEnemy(en) {
  const idx = D.enemies.indexOf(en); if (idx < 0) return;
  D.enemies.splice(idx, 1); D.kills += 1;
  D.parts.burst(en.x, en.y, PART_COLOR[en.key] || '#cf86ff', en.boss ? 30 : en.midboss ? 22 : 12, { up: 30, life: 0.5 });
  const gain = Math.max(1, Math.floor(en.maxhp * BALANCE.economy.scorePerHP * stat.boost())) + (en.boss ? BALANCE.boss.reward : en.midboss ? BALANCE.boss.midReward : 0);
  D.score += gain;
  D.coinsFly.push({ x: en.x, y: en.y, t: 0, val: gain });
  // 점수 플로터는 보스/중간보스이거나 화면이 한가할 때만(이펙트 누적 방지)
  if (en.boss || en.midboss || D.fx.f.length < 22) D.fx.add(en.x, en.y, `+${gain}`, { color: '#ffe04a', size: en.boss ? 24 : 16, font: 'Jua' });
  // 분열 곰팡이 → 작은 새끼 2마리(속성 계승)
  if (en.split && !en.mini && D.enemies.length < 40) {
    for (let i = 0; i < en.split; i++) {
      const m = mkEnemy('mini', en.maxhp * 0.28, en.r * 0.55, en.spd * 1.3, Math.max(1, Math.round(en.dmg * 0.5)), { mini: true, elem: en.elem });
      m.x = en.x + (i ? 14 : -14); m.y = en.y; D.enemies.push(m);
    }
  }
  if (SP('vamp') && Math.random() < SP('vamp') / 100) { D.hp = Math.min(D.maxHp, D.hp + 1); D.fx.add(en.x, en.y - 8, '+1', { color: '#ff5d9e', size: 12 }); }
  if (en.boss) { chord([523, 659, 784, 1047]); D.shake.add(12, 0.5); D.hitStop = 0.18; D.flash = 0.5; D.parts.burst(en.x, en.y, '#cf86ff', 40, { up: 60, life: 0.8, spread: 1.4 }); D.hp = Math.min(D.maxHp, D.hp + 12); D.bossesKilled += 1; D.pendingDraft = true; if (D.special) { D.special.charges += 1; updateSpecialBtn(); } D.fx.add(en.x, en.y - 30, '✨ 비책 +1', { color: '#ff8adf', size: 15, font: 'Jua' }); } // 보스 처치 → 비책 기회 +1
  else if (en.midboss) { chord([523, 659, 784], 0.16); D.shake.add(8, 0.45); D.hitStop = 0.12; D.flash = 0.4; D.parts.burst(en.x, en.y, '#ffd24a', 26, { up: 50, life: 0.7, spread: 1.2 }); D.hp = Math.min(D.maxHp, D.hp + 10); D.midKilled = (D.midKilled || 0) + 1; D.fx.add(en.x, en.y - 24, '+회복', { color: '#5ef0b0', size: 14, font: 'Jua' }); } // 중간보스 → 코인·회복만
  else beep(900 + Math.random() * 120, 0.05, 'triangle', 0.08);
  buzz(en.boss || en.midboss ? [18, 30, 18] : 5);
}

function loop(now) {
  if (!D || !D.running) return;
  if (!D.canvas.isConnected) { D.running = false; snapshotRun(); return; } // 시트 닫힘 → 이어하기 저장
  let dt = Math.min(0.034, (now - D.last) / 1000); D.last = now;
  try {
    // 배속(1·2·3) — 한 프레임에 update를 여러 번 (렌더는 1회)
    const steps = D.speed;
    for (let s = 0; s < steps; s++) {
      if (D.hitStop > 0) { D.hitStop -= dt; } else { update(dt); }
      if (D.over || D.pendingDraft || D.pendingMidAd) break;
    }
    render(dt);
    D.shopT -= dt; if (D.shopT <= 0) { renderShop(); D.shopT = 0.25; }
    D._errs = 0;
  } catch (err) {
    // 한 프레임의 예외로 루프가 영구 정지(멈춤)되고 저장도 안 되던 문제 방지:
    // 즉시 저장하고, 꼬인 멈춤값 해제 후 다음 프레임을 계속 시도한다.
    console.error('[defense] frame error', err);
    snapshotRun();
    D.hitStop = 0;
    if ((D._errs = (D._errs || 0) + 1) > 90) { D.running = false; return; } // 계속 오류면 안전 정지(이어하기로 보존됨)
    D.raf = requestAnimationFrame(loop);
    return;
  }
  if (D.over) { offerRevive(); return; }
  if (D.pendingDraft) { D.pendingDraft = false; bossDraft(); return; } // 보스 처치 → 스킬 3택
  if (D.pendingMidAd) { D.pendingMidAd = false; offerMidSkill(); return; } // 중간보스 → 짧은 광고로 스킬
  D.raf = requestAnimationFrame(loop);
}

/* ── 인게임 광고(스테이지 오버레이 — 캔버스 유지) → 아이템/보상 ── */
function stageAd(label, onReward, secs = 15) {
  D.running = false; cancelAnimationFrame(D.raf); clearInterval(D._adTimer);
  D._adReward = onReward;
  const stage = D.canvas.parentElement;
  const ov = document.createElement('div'); ov.className = 'draft-overlay'; ov.id = 'def-ad';
  ov.innerHTML = `<div class="draft-in">
    <div class="draft-title">✨ 잠깐의 응원</div><p>${label}</p>
    <div class="adx-stage" style="margin:8px 0 10px"><div class="adx-slime">🧊</div><b>냉비서와 함께 — 잠시 기다려 주세요</b></div>
    <div class="ad-progress"><i id="def-adbar"></i></div>
    <button class="gx-btn-go" id="def-adbtn" disabled>잠시만요… ${secs}초</button>
    <button class="qz-skip" onclick="UI.defAdSkip()">그냥 닫기</button></div>`;
  stage.appendChild(ov);
  const bar = ov.querySelector('#def-adbar'); if (bar) { bar.style.transitionDuration = secs + 's'; requestAnimationFrame(() => { bar.style.width = '100%'; }); }
  let t = secs;
  D._adTimer = setInterval(() => {
    const b = document.getElementById('def-adbtn'); if (!b) { clearInterval(D._adTimer); return; }
    t--; if (t > 0) { b.textContent = `잠시만요… ${t}초`; return; }
    clearInterval(D._adTimer); b.disabled = false; b.textContent = '🎁 보상 받기'; b.onclick = () => UI_defAdDone();
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
    <p>잠깐의 응원이면 <b>신선도 60% 회복</b>하고 이어서 버틸 수 있어요</p>
    <button class="gx-btn-go" onclick="UI.defRevive()">✨ 도움 받아 부활</button>
    <button class="qz-skip" onclick="UI.defGiveUp()">여기서 끝내기 (결과 보기)</button></div>`;
  stage.appendChild(ov);
  chord([196, 165, 131], 0.2, 'sawtooth');
}
export function defRevive() {
  document.getElementById('def-rev')?.remove();
  D._reviveAd = true;
  stageAd('도움 받아 부활 — 신선도 60% 회복', () => {
    D.revived = true; D.over = false; D.hp = Math.round(D.maxHp * 0.6);
    D.enemies = []; D.shots = []; D.flash = 0.7; D.shake.add(8, 0.4);
    D.fx.add(D.W / 2, D.H / 2, '부활!', { color: '#5ef0b0', size: 26 });
  });
}
export function defGiveUp() { document.getElementById('def-rev')?.remove(); endGame(); }
export function defAdSkill() {
  if (!D || !D.running) return;
  if (!D.special || D.special.charges <= 0) { toastNo(); D.fx.add(D.W / 2, D.H * 0.4, '보스를 잡으면 비책을 또 받아요', { color: '#ffe04a', size: 13, font: 'Jua' }); return; }
  D.special.charges -= 1; updateSpecialBtn();
  stageAd('그대의 노력에 하늘도 감동 — 비책 3택', () => bossDraft('ad'), 12);
}
function updateSpecialBtn() {
  const b = document.getElementById('def-special'); if (!b || !D) return;
  const n = D.special ? D.special.charges : 0;
  b.textContent = n > 0 ? `✨ 비책 (${n})` : '✨ 비책 (보스)';
  b.classList.toggle('arming', n > 0);
  b.style.opacity = n > 0 ? '' : '0.5';
}
// 중간보스 처치 보상은 코인·회복(별도 보상창 없음). 아래 둘은 main.js 임포트 호환용(미사용).
function offerMidSkill() { D.pendingMidAd = false; D.running = true; D.last = performance.now(); D.raf = requestAnimationFrame(loop); }
export function defMidSkill() { document.getElementById('def-mid')?.remove(); if (D) { D.running = true; D.last = performance.now(); D.raf = requestAnimationFrame(loop); } }
export function defMidSkip() { document.getElementById('def-mid')?.remove(); if (D) { D.running = true; D.last = performance.now(); D.raf = requestAnimationFrame(loop); } }

function makeDraftCardData(s) {
  let val = s.roll();
  if (s.id === 'gamble') val = Math.random() < 0.5 ? 80 : 5; // 도박수 즉시 판정
  return { id: s.id, r: s.r, icon: s.icon, name: s.name, val, desc: s.desc, trap: s.trap };
}
// 드래프트 3택 — 비책(ad)만 A급 1개 보장 + S 30%(보스 구간부터). 무료 보스 드래프트는 B·C만(약)
function buildDraft(opts) {
  const o = opts || {};
  const avail = SPECIALS.filter((s) => !D.spec[s.id] || D.spec[s.id].lv < (s.max || 99));
  const grade = (s) => RARITY[s.r].grade;
  const pool = (g) => avail.filter((s) => !s.trap && grade(s) === g);
  const traps = avail.filter((s) => s.trap);
  const picks = [];
  const take = (arr) => (arr.length ? arr.splice(Math.floor(Math.random() * arr.length), 1)[0] : null);
  if (o.allowAS) {
    const Spool = D.wave >= 10 ? pool('S') : [];
    if (Spool.length && Math.random() < (o.sChance || 0)) { const s = take(Spool); if (s) picks.push(s); } // S 30%
    if (o.guaranteeA) { const s = take(pool('A')); if (s) picks.push(s); } // A급 1개 보장(비책 한정)
  }
  const rest = [...pool('B'), ...pool('B'), ...pool('C'), ...pool('C')];
  if (o.allowAS) rest.push(...pool('A'));
  if (Math.random() < 0.2 && traps.length) rest.push(traps[Math.floor(Math.random() * traps.length)]);
  while (picks.length < 3 && rest.length) { const s = take(rest); if (s && !picks.includes(s)) picks.push(s); }
  if (picks.length < 3) { const left = avail.filter((s) => !picks.includes(s)); while (picks.length < 3 && left.length) picks.push(take(left)); }
  for (let i = picks.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [picks[i], picks[j]] = [picks[j], picks[i]]; }
  return picks.slice(0, 3).map(makeDraftCardData);
}
/* ── 스킬 3택 — 보스 처치=무료(B·C 위주), 비책(ad)=강(A 보장·S 30%). 캔버스 오버레이 ── */
function bossDraft(mode) {
  D.running = false; cancelAnimationFrame(D.raf);
  const ad = mode === 'ad';
  D.draft = buildDraft(ad ? { sChance: 0.30, guaranteeA: true, allowAS: true } : {});
  if (!D.draft.length) { D.draft = null; D.running = true; D.last = performance.now(); D.raf = requestAnimationFrame(loop); return; } // 모든 스킬 만렙 → 드래프트 생략(소프트락 방지)
  chord([659, 880, 1175], 0.16); buzz([20, 40, 20]);
  const stage = D.canvas.parentElement;
  const ov = document.createElement('div'); ov.className = 'draft-overlay'; ov.id = 'def-draft';
  const charges = D.special ? D.special.charges : 0;
  ov.innerHTML = `
    <div class="draft-in">
      <div class="draft-title">${ad ? '✨ 하늘의 비책' : '⭐ 보스 격파!'}</div>
      <p>${ad ? '그대의 노력에 하늘도 감동 — <b>A급 보장 · S 등장</b>' : '스페셜 스킬 <b>3택</b> (더 강한 비책은 ✨)'}</p>
      <div class="draft-row">
        ${D.draft.map((s, i) => {
          const cur = D.spec[s.id] ? D.spec[s.id].val : 0; const rr = RARITY[s.r];
          return `<button class="draft-card r-${s.r}" style="--rc:${rr.col}" onclick="UI.defPick(${i})">
            <span class="draft-ico">${s.icon}</span>
            <div class="grow"><div class="draft-name"><b>${s.name}</b><span class="draft-rar" style="color:${rr.col}">${s.trap ? '⚠' : rr.label + '급'}</span></div>
              <small>${s.desc(s.val)}</small></div>
            <span class="draft-cur ${cur ? '' : 'new'}">${cur ? `Lv${(D.spec[s.id].lv) + 1}` : 'NEW'}</span>
          </button>`;
        }).join('')}
      </div>
      ${(!ad && charges > 0) ? `<button class="draft-ad" onclick="UI.defDraftAd()">✨ 비책 더 받기 (${charges})</button>` : ''}
    </div>`;
  stage.appendChild(ov);
}
export function defDraftAd() {
  if (!D || !D.special || D.special.charges <= 0) return;
  D.special.charges -= 1; updateSpecialBtn();
  document.getElementById('def-draft')?.remove(); D.draft = null;
  stageAd('하늘의 비책 — 3택', () => bossDraft('ad'), 12);
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
  D.maxHp = Math.max(20, 100 + D.lv.maxHp * BALANCE.up.maxHp.add + SP('fortress') - (D.spec.glass ? 30 : 0));
  if (D.hp > D.maxHp) D.hp = D.maxHp;
  const regenPS = D.lv.regen * BALANCE.up.regen.add + (D.spec.fortress ? 2 : 0);
  if (regenPS) D.hp = Math.min(D.maxHp, D.hp + regenPS * dt);
  // 공포 구간 떠다니는 포자(분위기) — 파티클 풀은 상한 320이라 메모리 안전
  if (D.horror && (D._ambT = (D._ambT || 0) - dt) <= 0) { D._ambT = 0.55; D.parts.burst(Math.random() * D.W, D.H * 0.92, 'rgba(122,160,60,0.5)', 1, { up: 36, life: 2.0, grav: -8, spread: 0.3 }); }

  // 스폰
  // 동시 생존 적 상한 — 후반 물량 적체로 인한 렉/지루함 방지(상한 차면 잠시 스폰 멈춤)
  if (D.toSpawn > 0 && D.enemies.length < 46) { D.since += dt; if (D.since >= D.spawnGap) { D.since = 0; spawnOne(); D.toSpawn -= 1; } }
  else if (D.toSpawn <= 0 && D.enemies.length === 0) nextWave();

  // 보스전 정전 이벤트 — 보스/중간보스가 있을 때 간헐 발생, 콘센트 탭 전까지 전원 50%
  const bossPresent = D.enemies.some((e) => e.boss || e.midboss);
  if (bossPresent) { if (!D.powerCut) { D.powerCd -= dt; if (D.powerCd <= 0) startPowerCut(); } }
  else if (D.powerCut || D.plug) { D.powerCut = false; D.plug = null; } // 보스 없으면 자동 복구
  if (D.plug) D.plug.t += dt;

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
      fireFrom(20, D.H - 40, tg, turretElemOf(0)); if (D.lv.sideTurret >= 2) fireFrom(D.W - 20, D.H - 40, tg, turretElemOf(1));
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
    // 좀비화(50+): 초록 오염 점액 흘림
    if (en.zombie && (en.sporeZ -= dt) <= 0) { en.sporeZ = 0.5; D.parts.burst(en.x + (Math.random() - 0.5) * en.r * 0.8, en.y + en.r * 0.3, 'rgba(122,160,60,0.7)', 1, { spread: 0.2, life: 0.7, grav: 30 }); }
    // 원소 효과: 화상 DoT + 빙결 둔화, 어픽스 재생, 서리 가시
    if (en.burn > 0) { en.burn -= dt; en.hp -= en.burnDps * dt; if ((en.sporeT2 = (en.sporeT2 || 0) - dt) <= 0) { en.sporeT2 = 0.12; D.parts.burst(en.x, en.y - en.r * 0.3, '#ff8a3d', 1, { life: 0.4, grav: -20 }); } if (en.hp <= 0) { killEnemy(en); continue; } }
    if (en.regen && en.hp > 0) en.hp = Math.min(en.maxhp, en.hp + en.regen * dt);
    if (SP('thorn') && Math.hypot(en.x - f.x, en.y - f.y) < 90) { en.hp -= SP('thorn') * dt; if (en.hp <= 0) { killEnemy(en); continue; } }
    let sp = en.spd;
    if (en.slowT > 0) { en.slowT -= dt; sp *= en.slowMul; }
    if (en.affix === 'enrage' && en.hp < en.maxhp * 0.35) sp *= 1.6; // 격노: 막판 가속
    if (auraR && Math.hypot(en.x - f.x, en.y - f.y) < auraR) sp *= slow;
    // 칸막이: 벽 윗선에서 막히고 벽 HP를 깎음 (보스급은 돌파 강화 + 금가기 모션·사운드)
    let blocked = false;
    for (const wl of D.walls) {
      if (en.y + en.r >= wl.y - 4 && en.y < wl.y && Math.abs(en.x - wl.x) < wl.w / 2 + en.r) {
        en.y = wl.y - en.r - 4; blocked = true;
        const heavy = en.boss || en.midboss;
        const mul = en.boss ? 16 : en.midboss ? 8 : 1; // 보스급은 벽을 빠르게 부숨
        wl.hp -= (en.dmg * 4 + 6) * dt * mul;
        if ((en._wt = (en._wt || 0) - dt) <= 0) { // 얼음 금가기 파편 + 사운드
          en._wt = heavy ? 0.16 : 0.4;
          D.parts.burst(en.x, wl.y, heavy ? '#ffd24a' : '#cfefff', heavy ? 6 : 2, { spread: heavy ? 1 : 0.5, life: 0.35 });
          if (heavy) { D.shake.add(3, 0.12); beep(150, 0.07, 'sawtooth', 0.14); buzz(12); } else beep(720, 0.03, 'square', 0.05);
        }
        break;
      }
    }
    if (!blocked) { en.y += sp * dt; en.x += Math.sin(en.ph) * 6 * dt; }
    // 보스·중간보스는 잡몹(세균 떼)을 소환해 압박
    if ((en.boss || en.midboss) && D.enemies.length < 24) {
      en.minionT -= dt;
      if (en.minionT <= 0) {
        en.minionT = en.boss ? 2.4 : 3.6;
        const sw = BALANCE.enemy.types.swarm;
        const m = mkEnemy('swarm', en.maxhp * 0.03 + 4, sw.r, waveSpd(D.wave) * sw.spx, Math.max(1, Math.round(sw.dmg * D.diff.dmg)), {});
        m.x = en.x + (Math.random() - 0.5) * 40; m.y = en.y + 20; D.enemies.push(m);
      }
    }
    if (en.y >= f.y - 8) { // 냉장고 도달
      if (en.boss || en.midboss) { // 보스급은 사라지지 않고 죽을 때까지 큰 지속 피해
        en.y = f.y - 8; en.gnaw = true;
        const dps = en.dmg * (en.boss ? 2.4 : 1.7);
        D.hp -= dps * dt; D.vign = Math.max(D.vign, 0.85);
        if ((en._gnawT = (en._gnawT || 0) - dt) <= 0) {
          en._gnawT = 0.5; D.shake.add(en.boss ? 7 : 5, 0.2); beep(150, 0.13, 'sawtooth', 0.13); buzz(28);
          D.fx.add(f.x, f.y - 40, `-${Math.round(dps * 0.5)}`, { color: '#ff4d6a', size: 16 });
          D.parts.burst(f.x + (Math.random() - 0.5) * 30, f.y - 16, '#ff4d6a', 4, { life: 0.4 });
        }
        if (D.hp <= 0) { D.hp = 0; D.over = true; }
      } else { // 일반 적은 1회 피해 후 소멸
        D.enemies.splice(i, 1); D.hp -= en.dmg; D.vign = 1; D.shake.add(7, 0.3);
        beep(130, 0.2, 'square', 0.13); buzz([40, 30, 50]);
        D.fx.add(f.x, f.y - 40, `-${en.dmg}`, { color: '#ff4d6a', size: 18 });
        if (D.hp <= 0) { D.hp = 0; D.over = true; }
      }
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
    s.trail.push(s.x, s.y); if (s.trail.length > 6) s.trail.splice(0, 2); // 모션 트레일(짧게 — 이펙트 부하↓)
    s.x += s.vx * dt; s.y += s.vy * dt;
    if (s.x < -20 || s.x > D.W + 20 || s.y < -20 || s.y > D.H + 20) { D.shots.splice(i, 1); continue; }
    for (const en of D.enemies) {
      if (s.hit.has(en)) continue;
      if ((s.x - en.x) ** 2 + (s.y - en.y) ** 2 <= (en.r + (s.r || BALANCE.weapon.projR)) ** 2) {
        s.hit.add(en); hitEnemy(en, s.dmg, { frag: s.frag, atk: s.atk });
        if (s.hit.size > s.pierce) { D.shots.splice(i, 1); break; }
      }
    }
  }
  // 발사체 상한 — 후반 이펙트 누적으로 느려지지 않게(가장 오래된 것부터 제거)
  if (D.shots.length > 170) D.shots.splice(0, D.shots.length - 170);
  // 코인 흡수
  for (let i = D.coinsFly.length - 1; i >= 0; i--) {
    const c = D.coinsFly[i]; c.t += dt * 2.2;
    if (c.t >= 1) { D.coins += c.val; D.coinsFly.splice(i, 1); }
  }
  // 코인 연출 상한 — 넘치면 즉시 적립 후 제거(점수 손실 없이 메모리만 정리)
  while (D.coinsFly.length > 90) { D.coins += D.coinsFly.shift().val; }
  // 칸막이 파괴 — 산산조각 + 유리 깨지는 사운드
  for (let i = D.walls.length - 1; i >= 0; i--) {
    if (D.walls[i].hp <= 0) {
      const wl = D.walls[i];
      D.parts.burst(wl.x, wl.y, '#bfe7ff', 22, { spread: 1.4, life: 0.6 });
      D.parts.burst(wl.x, wl.y, '#73cbff', 10, { spread: 1.1, life: 0.45, up: 20 });
      D.walls.splice(i, 1); D.shake.add(6, 0.24);
      chord([1175, 880, 1568], 0.1, 'triangle'); beep(120, 0.12, 'sawtooth', 0.13); buzz([18, 30]);
    }
  }
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
  // 배경 — 평소 시안 퍼플 / 공포 구간(50+)은 사독한 녹·적 톤으로 전환
  const bg = c.createLinearGradient(0, 0, 0, H);
  if (D.horror) { bg.addColorStop(0, '#0e1a10'); bg.addColorStop(0.55, '#0a120c'); bg.addColorStop(1, '#1a0a0c'); }
  else { bg.addColorStop(0, '#23123b'); bg.addColorStop(0.55, '#160b22'); bg.addColorStop(1, '#0c1830'); }
  c.fillStyle = bg; c.fillRect(-30, -30, W + 60, H + 60);
  // 공포 구간: 냉장고 오라 밖 곰팡이 오염 얼룩 + 보호 경계선
  if (D.horror && D.moldSpots) {
    const safe = Math.max(D.lv.frostAura ? 60 + D.lv.frostAura * 22 : 0, 88), now = performance.now();
    for (const m of D.moldSpots) {
      if (Math.hypot(m.x - f.x, m.y - f.y) < safe) continue; // 오라 안쪽은 깨끗
      const pul = 0.5 + Math.sin(now / 700 + m.ph) * 0.16;
      const gg = c.createRadialGradient(m.x, m.y, 2, m.x, m.y, m.r);
      gg.addColorStop(0, `rgba(122,160,60,${0.30 * pul})`); gg.addColorStop(0.7, `rgba(70,110,40,${0.16 * pul})`); gg.addColorStop(1, 'rgba(70,110,40,0)');
      c.fillStyle = gg; c.beginPath(); c.arc(m.x, m.y, m.r, 0, 6.28); c.fill();
    }
    c.save(); c.globalAlpha = 0.5 + Math.sin(now / 360) * 0.12; c.strokeStyle = 'rgba(120,210,255,0.5)'; c.setLineDash([6, 6]); c.lineWidth = 1.5;
    c.beginPath(); c.arc(f.x, f.y, safe, 0, 6.28); c.stroke(); c.setLineDash([]); c.restore();
  }
  // 상단 냉기 안개 (적 스폰 구역) — 공포 구간은 초록 포자 안개
  const mistCol = D.horror ? '122,160,60' : '115,203,255';
  const mist = c.createLinearGradient(0, 0, 0, 70);
  mist.addColorStop(0, `rgba(${mistCol},0.14)`); mist.addColorStop(1, `rgba(${mistCol},0)`);
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
    const expr = en.blinkS.blink < 0.4 ? 'blink' : (en.zombie && !en.boss ? 'dull' : ''); // 좀비는 흐릿한 눈
    const spr = enemySprite(en.key, expr);
    const th = en.r * 2 * pop;
    const cv = en.flash > 0 && spr.white ? spr.white : spr.base;
    // 어픽스 링
    if (en.affix) { const a = AFFIX[en.affix]; c.save(); c.globalAlpha = 0.5 + Math.sin(en.ph * 1.5) * 0.2; c.strokeStyle = a.ring; c.lineWidth = 2.5; c.beginPath(); c.arc(en.x, en.y, en.r + 4, 0, 6.28); c.stroke(); c.restore(); }
    // 방패 몬스터 — 앞면(냉장고 쪽) 호로 방패 표시, 잔량에 따라 두께
    if (en.shieldHp > 0) { c.save(); c.globalAlpha = 0.55 + 0.25 * (en.shieldHp / en.shieldMax); c.strokeStyle = '#bdffe4'; c.lineWidth = 3.5; c.beginPath(); c.arc(en.x, en.y, en.r + 6, 0.18 * Math.PI, 0.82 * Math.PI); c.stroke(); c.restore(); }
    // 글로우: 화상>보스>어픽스 (일반/좀비/속성에는 그림자 글로우 미사용 — 다수 적 렌더 비용↓·버벅임 개선)
    const glow = en.burn > 0 ? 'rgba(255,138,61,0.9)'
      : en.boss ? 'rgba(207,134,255,0.8)'
        : en.affix ? AFFIX[en.affix].ring : '';
    drawSprite(c, cv, en.x, en.y, th, { sx: (1 + breath + en.squash), sy: (1 - breath - en.squash * 0.8) * pop, glow, glowR: glow ? 13 : 0 });
    // 좀비화: 사독한 초록 오염 오버레이
    if (en.zombie) { c.save(); c.globalAlpha = 0.26; c.fillStyle = '#7aa03c'; c.beginPath(); c.arc(en.x, en.y, en.r * 0.92 * (1 + breath), 0, 6.28); c.fill(); c.restore(); }
    // 속성 배지(우하단) + 어픽스 아이콘(상단)
    c.textAlign = 'center';
    if (en.elem) { c.font = '10px serif'; c.fillText(ELEM[en.elem].icon, en.x + en.r * 0.7, en.y + en.r * 0.72); }
    if (en.affix) { c.font = '10px serif'; c.fillText(AFFIX[en.affix].icon, en.x, en.y - en.r - 6); }
    if (en.boss || en.midboss || en.maxhp > BALANCE.enemy.baseHP * 3) {
      const w = en.r * 1.8, hpx = en.x - w / 2, hpy = en.y - en.r - 12;
      c.fillStyle = 'rgba(0,0,0,0.4)'; rr(c, hpx, hpy, w, 5, 2.5); c.fill();
      c.fillStyle = (en.boss || en.midboss) ? '#ff4d6a' : '#9bffe6'; rr(c, hpx, hpy, w * clamp(en.hp / en.maxhp, 0, 1), 5, 2.5); c.fill();
    }
  }
  // 발사체 — 속성/티어별 형태(불꽃·얼음·스파크·중탄)
  const PK = { fire: ['#ffd24a', '#ff7a3d'], frost: ['#e8faff', '#73cbff'], spark: ['#ffffff', '#bdffe4'], heavy: ['#fff0b0', '#ffb24d'], arrow: ['#d2adf0', '#a172d4'], basic: ['#bdffe4', '#5ef0b0'] };
  const ATKC = { blunt: ['#fff0b0', '#ffd24a'], fire: ['#ffd24a', '#ff7a3d'], frost: ['#e8faff', '#73cbff'] };
  const drawTrails = D.shots.length < 80; // 발사체가 많으면 트레일 생략(이펙트 과부하 방지)
  for (const s of D.shots) {
    const [core, glow] = s.crit ? ['#fff', '#ffb24d'] : (ATKC[s.atk] || PK[s.kind] || PK.basic);
    const rr0 = (s.r || BALANCE.weapon.projR) * (s.crit ? 1.3 : 1);
    // 트레일
    if (drawTrails && s.trail.length >= 4) { c.strokeStyle = glow; c.globalAlpha = 0.3; c.lineWidth = rr0 * 1.2; c.lineCap = 'round'; c.beginPath(); c.moveTo(s.trail[0], s.trail[1]); for (let k = 2; k < s.trail.length; k += 2) c.lineTo(s.trail[k], s.trail[k + 1]); c.lineTo(s.x, s.y); c.stroke(); }
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
  // 칸막이(얼음 벽) — HP 비율로 투명도 + 피해 누적 시 금이 가는 모션
  for (const wl of D.walls) {
    const ratio = clamp(wl.hp / wl.maxhp, 0, 1), a = clamp(ratio, 0.25, 1), dmg = 1 - ratio;
    c.save(); c.globalAlpha = a; c.fillStyle = '#bfe7ff'; c.shadowColor = '#73cbff'; c.shadowBlur = 10;
    rr(c, wl.x - wl.w / 2, wl.y - 6, wl.w, 12, 5); c.fill(); c.shadowBlur = 0;
    c.globalAlpha = 1; c.fillStyle = '#73cbff'; rr(c, wl.x - wl.w / 2, wl.y - 6, wl.w * a, 3, 1.5); c.fill();
    // 금(crack) — 피해 비율을 넘긴 균열부터 단계적으로 표시
    if (wl.cracks && dmg > 0.05) {
      c.globalAlpha = clamp(0.45 + dmg * 0.55, 0, 1); c.strokeStyle = 'rgba(20,11,34,0.85)'; c.lineWidth = 1.3; c.lineCap = 'round';
      const xlo = wl.x - wl.w / 2 + 2, xhi = wl.x + wl.w / 2 - 2;
      for (const cr of wl.cracks) {
        if (cr.thr > dmg) continue;
        c.beginPath();
        c.moveTo(clamp(wl.x + cr.pts[0][0], xlo, xhi), wl.y + cr.pts[0][1]);
        for (let k = 1; k < cr.pts.length; k++) c.lineTo(clamp(wl.x + cr.pts[k][0], xlo, xhi), wl.y + cr.pts[k][1]);
        c.stroke();
      }
    }
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
  // 정전 — 화면 어두워지고 점멸하는 콘센트(🔌)를 탭하면 복구
  if (D.powerCut) {
    c.save(); c.globalAlpha = 0.2 + Math.abs(Math.sin(performance.now() / 110)) * 0.16; c.fillStyle = '#05030a'; c.fillRect(0, 0, W, H); c.restore();
    c.fillStyle = '#ffe04a'; c.textAlign = 'center'; c.font = "10px 'Press Start 2P', Jua, monospace";
    c.fillText('⚡ 전원 50% — 콘센트를 꽂아요', W / 2, 96);
    if (D.plug) {
      const p = D.plug, k = 0.55 + Math.sin(p.t * 8) * 0.4;
      c.save(); c.globalAlpha = clamp(k, 0, 1); c.strokeStyle = '#ffe04a'; c.lineWidth = 3; c.shadowColor = '#ffe04a'; c.shadowBlur = 14;
      c.beginPath(); c.arc(p.x, p.y, 22 + Math.sin(p.t * 6) * 5, 0, 6.28); c.stroke(); c.shadowBlur = 0;
      c.globalAlpha = 1; c.font = '28px serif'; c.textBaseline = 'middle'; c.fillText('🔌', p.x, p.y); c.textBaseline = 'alphabetic'; c.restore();
    }
  }
  drawHud(c, W, H);
  // 위험 비네트 — 적을 가리지 않게 가장자리 위주로 은은하게(데미지 시 과한 번쩍임 완화)
  if (D.hp <= D.maxHp * 0.3 || D.vign > 0.04) {
    const pulse = D.hp <= D.maxHp * 0.3 ? 0.16 + Math.sin(performance.now() / 200) * 0.07 : D.vign * 0.32;
    const vg = c.createRadialGradient(W / 2, H / 2, H * 0.46, W / 2, H / 2, H * 0.74);
    vg.addColorStop(0, 'rgba(255,77,106,0)'); vg.addColorStop(1, `rgba(255,77,106,${clamp(pulse, 0, 0.34)})`);
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
    const boss = D.banner.includes('보스') || D.banner.includes('공포');
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
  // 보조 포탑 — 좌/우에 물리적으로 등장 + 각자의 속성 배지(터치로 전환)
  for (let t = 0; t < (D.lv.sideTurret || 0); t++) {
    const sx = t % 2 === 0 ? 22 : D.W - 22, sy = D.H - 40 - Math.floor(t / 2) * 22;
    const ta = ATK[turretElemOf(t % 2)] || ATK.blunt;
    c.save(); c.translate(sx, sy);
    c.fillStyle = '#5a6f9c'; rr(c, -9, -6, 18, 14, 4); c.fill();
    c.save(); c.rotate(D.aimAng + Math.PI / 2); c.fillStyle = ta.col; rr(c, -3, -16, 6, 16, 3); c.fill(); c.restore();
    c.font = '11px serif'; c.textAlign = 'center'; c.fillText(ta.icon, 0, -14);
    c.restore();
  }
  // 냉장고 바디 — 시안 픽셀 스프라이트(내장 카와이 얼굴) + 성에 글로우 / 위험 경고 / 강화 펄스
  const ps = 1 + (D.upPulse || 0) * 0.4;
  drawSprite(c, fridgeSprite().base, f.x, f.y + 6, 80, { sx: ps, sy: ps, glow: D.upPulse > 0.05 ? 'rgba(94,240,176,0.9)' : (low ? 'rgba(255,77,106,0.8)' : 'rgba(115,203,255,0.6)'), glowR: low || D.upPulse > 0.05 ? 18 : 14 });
  // 공격 속성 배지 — 냉장고에 아이콘만 작게(터치하면 전환). 은은한 링으로 탭 가능 암시.
  const ae = ATK[D.atkElem] || ATK.blunt;
  const pulse = 0.5 + Math.sin(performance.now() / 600) * 0.18;
  c.save(); c.textAlign = 'center'; c.textBaseline = 'middle';
  c.globalAlpha = 0.85; c.fillStyle = 'rgba(10,6,18,0.5)';
  c.beginPath(); c.arc(f.x, f.y - 30, 13, 0, 6.28); c.fill();
  c.globalAlpha = pulse; c.strokeStyle = ae.col; c.lineWidth = 1.6;
  c.beginPath(); c.arc(f.x, f.y - 30, 13, 0, 6.28); c.stroke();
  c.globalAlpha = 1; c.font = '14px serif'; c.fillText(ae.icon, f.x, f.y - 29);
  c.textBaseline = 'alphabetic'; c.restore();
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
  // 보스/중간보스 상단 전체 HP바 + 이름·약점 속성
  const boss = D.enemies.find((e) => e.boss) || D.enemies.find((e) => e.midboss);
  if (boss) {
    const r = clamp(boss.hp / boss.maxhp, 0, 1), phase = r > 0.66 ? 1 : r > 0.33 ? 2 : 3;
    const nm = boss.bossName || (boss.boss ? '🦠 곰팡이대왕' : '중간보스');
    c.textAlign = 'left'; c.fillStyle = boss.boss ? '#cf86ff' : '#ffd24a'; c.font = "9px 'Press Start 2P', Jua, monospace";
    c.fillText(nm, 12, 64);
    c.textAlign = 'right'; c.fillStyle = '#ff4d6a'; c.fillText(boss.boss ? `PHASE ${phase}` : '중간보스', W - 12, 64);
    c.fillStyle = 'rgba(0,0,0,0.45)'; rr(c, 12, 70, W - 24, 9, 4); c.fill();
    c.fillStyle = boss.boss ? '#ff4d6a' : '#ffae3d'; rr(c, 12, 70, (W - 24) * r, 9, 4); c.fill();
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
  updateWallBtn(); updateSpecialBtn();
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
  savedRun = null; try { localStorage.removeItem(DEF_SAVE_KEY); } catch { /* noop */ }
  const s = D; D = null; cancelAnimationFrame(s.raf);
  beep(160, 0.3, 'square', 0.12);
  const specs = Object.keys(s.spec).length;
  finishGame('defense', '🧊 냉장고 지키기', s.score, `${s.score.toLocaleString()}점`,
    'UI.gameDefense()', { extra: `난이도 ${s.diff.name} · ${s.wave}웨이브 · ${s.kills}처치 · 보스 ${s.bossesKilled}·중간 ${s.midKilled || 0} · 스킬 ${specs}종` });
}
