// ⚡ 광클대전 — "편 갈라 60초 광클" 진영전.
//  · 오늘의 떡밥(민초/부먹/양념…)에 편을 고르면 그게 내 정체성 → 군집 경쟁심리 점화
//  · 60초 동안 미친듯이 탭 → 콤보(×3)로 한 탭의 무게가 커지고, 전국 흐름 게이지가 내 편으로 기운다
//  · 결과는 칭호·기여·예상 등수가 박힌 '자랑 카드' → 스샷/공유로 밈 확산 + 친구 소환(바이럴 루프)
// 전국 흐름은 같은 날 모두 같은 떡밥(data/battles)으로 동기화. 백엔드 없이도 살아있게 시뮬레이션하고,
// 토스/파이어베이스가 붙으면 실제 누적(bumpBattle/readBattle)으로 베이스라인이 진짜가 된다.
import { gameUI, beep, chord, buzz } from './games.js';
import { S, save, today, addDays } from './store.js';
import { earn, canEarn, recordScore, gameBest } from './points.js';
import { battleOfDay, dailyBias, comboMult, titleForTaps, rankEstimate, comma } from './data/battles.js';
import { readBattle, bumpBattle } from './sync.js';

const DURATION = 60;            // 한 판 길이(초)
let B = null;                   // 진행 중인 판 상태
let lastResult = null;          // 공유용 직전 결과

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const mdLabel = (d) => { const p = String(d).split('-'); return `${+p[1]}월 ${+p[2]}일`; };
const fstate = () => (S.faction || (S.faction = { picks: {}, streak: 0, lastDay: '' }));

/* ── 진입: 오늘의 대전 인트로 ───────────────────────────── */
export function gameFaction() {
  cleanup();
  const date = today();
  const bt = battleOfDay(date);
  const F = fstate();
  const base = clamp(50 + dailyBias(date, bt), 12, 88);
  const picked = F.picks[bt.id];
  const ui = gameUI();
  const streakHtml = F.streak > 1
    ? `<div class="fb-streak">🔥 ${F.streak}일 연속 참전 중 — 오늘도 출석!</div>` : '';
  ui.openSheet(`
    <div class="fb-wrap">
      <div class="g-hubhead"><h2 style="margin:0">⚡ 광클대전</h2>
        <button class="btn btn-sm" onclick="UI.openGames()">← 게임</button></div>
      <p class="sub" style="text-align:center;margin:2px 0 12px">오늘의 대전 · ${mdLabel(date)} · 전국 동시 진행</p>
      <div class="fb-q">${bt.q}</div>
      <div class="fb-vs">
        <div class="fb-team ${picked === 'a' ? 'on' : ''}" style="--c:${bt.a.color}">
          <span class="fb-emo">${bt.a.emoji}</span><b>${bt.a.name}</b><small>${bt.a.slogan}</small></div>
        <div class="fb-vsmark">VS</div>
        <div class="fb-team ${picked === 'b' ? 'on' : ''}" style="--c:${bt.b.color}">
          <span class="fb-emo">${bt.b.emoji}</span><b>${bt.b.name}</b><small>${bt.b.slogan}</small></div>
      </div>
      <div class="fb-gauge intro" style="background:${bt.b.color}"><i style="width:${base}%;background:${bt.a.color}"></i></div>
      <div class="fb-glabels">
        <span style="color:${bt.a.color}">${bt.a.emoji} ${base.toFixed(1)}%</span>
        <span class="fb-livetag">전국 흐름 ●LIVE</span>
        <span style="color:${bt.b.color}">${(100 - base).toFixed(1)}% ${bt.b.emoji}</span></div>
      ${streakHtml}
      <div class="fb-pick">
        <button class="fb-pickbtn" style="background:${bt.a.color}" onclick="UI.factionGo('a')">${bt.a.emoji} ${withEuro(bt.a.name)} 참전</button>
        <button class="fb-pickbtn" style="background:${bt.b.color}" onclick="UI.factionGo('b')">${bt.b.emoji} ${withEuro(bt.b.name)} 참전</button>
      </div>
      <p class="hint" style="text-align:center;margin-top:11px">60초 동안 미친듯이 탭 → 내 편 흐름을 끌어와라.<br>콤보를 이어가면 한 탭이 <b>×3</b>까지 불어난다 ⚡</p>
    </div>`);
  // 실제 누적이 있으면(파이어베이스 연결 시) 게이지 진짜로 보정 — 없으면 조용히 무시
  readBattle(date).then((r) => {
    if (!r || (r.a + r.b) < 200) return;
    const real = clamp(100 * r.a / (r.a + r.b), 8, 92);
    const fill = document.querySelector('.fb-gauge.intro i');
    if (fill) fill.style.width = real.toFixed(1) + '%';
  }).catch(() => {});
}

// 진영명 + 으로/로 (받침 판별)
function withEuro(name) {
  const last = name.charCodeAt(name.length - 1) - 0xac00;
  const hasJong = last >= 0 && last <= 11171 && last % 28 !== 0;
  return name + (hasJong ? '으로' : '로');
}

/* ── 참전: 60초 광클 시작 ───────────────────────────── */
export function factionGo(side) {
  cleanup();
  const date = today();
  const bt = battleOfDay(date);
  const me = bt[side];
  const foe = bt[side === 'a' ? 'b' : 'a'];
  const base = clamp(50 + dailyBias(date, bt), 12, 88);
  const F = fstate();
  F.picks[bt.id] = side;
  markPlay(F, date);
  save({ silent: true });

  const now = performance.now();
  B = {
    date, bt, side, me, foe, base,
    tapsF: 0, presses: 0, streak: 0, maxStreak: 0, lastTap: now,
    aShare: base, mean: base, target: base, push: 0, simT: 0, lastFrame: now,
    endsAt: now + DURATION * 1000, raf: 0, tick: 0, ended: false,
  };
  const ui = gameUI();
  ui.openSheet(`
    <div class="fb-stage" id="fb-stage" style="--me:${me.color};--foe:${foe.color}">
      <div class="fb-gauge live" style="background:${bt.b.color}"><i id="fb-fill" style="width:${base}%;background:${bt.a.color}"></i></div>
      <div class="fb-glabels">
        <span style="color:${bt.a.color}">${bt.a.emoji} <b id="fb-pa">${base.toFixed(1)}</b>%</span>
        <span class="fb-time" id="fb-time">${DURATION}</span>
        <span style="color:${bt.b.color}"><b id="fb-pb">${(100 - base).toFixed(1)}</b>% ${bt.b.emoji}</span></div>
      <div class="fb-ticker" id="fb-ticker">전국에서 광클이 시작됐다… ${me.emoji} ${me.name} 가즈아!</div>
      <div class="fb-mid">
        <div class="fb-count"><b id="fb-taps">0</b><span>내 기여</span></div>
        <div class="fb-combo" id="fb-combo">×1.0</div>
      </div>
      <button class="fb-tap" id="fb-tap" style="background:${me.color}">
        <span class="fb-tapemo">${me.emoji}</span><span class="fb-taplabel">TAP!</span></button>
      <div class="fb-pops" id="fb-pops"></div>
      <p class="hint" style="text-align:center;margin-top:8px"><b style="color:${me.color}">${me.name}</b> · 화면 아무 데나 빠르게 탭!</p>
    </div>`);
  const stage = document.getElementById('fb-stage');
  stage.addEventListener('pointerdown', onTap, { passive: true });
  B.tick = setInterval(tickerBeat, 2300);
  B.raf = requestAnimationFrame(frame);
}

function markPlay(F, date) {
  if (F.lastDay === date) return;          // 오늘 이미 카운트됨
  F.streak = (F.lastDay === addDays(-1, date)) ? (F.streak || 0) + 1 : 1;
  F.lastDay = date;
}

/* ── 탭 ── */
function onTap(e) {
  if (!B || B.ended) return;
  const now = performance.now();
  const gap = now - B.lastTap;
  B.lastTap = now;
  B.streak = gap < 300 ? B.streak + 1 : Math.max(0, B.streak - 2); // 끊기면 콤보 깎임
  if (B.streak > B.maxStreak) B.maxStreak = B.streak;
  const mult = comboMult(B.streak);
  B.tapsF += mult;
  B.presses += 1;
  const dir = B.side === 'a' ? 1 : -1;
  B.push += dir * mult * 0.9;        // 순간 흐름 압박
  B.mean += dir * mult * 0.05;       // 평균을 서서히 내 편으로 (흐름 장악)
  B.mean = clamp(B.mean, 12, 88);
  // 소리: 콤보 오를수록 음정 상승, 12콤보마다 폭죽
  const f = 520 + Math.min(900, B.streak * 16);
  if (B.streak > 0 && B.streak % 12 === 0) { chord([f, f * 1.25, f * 1.5], 0.07); buzz(16); }
  else { beep(f, 0.045, 'square', 0.09); buzz(5); }
  popNum(e, mult);
  const t = document.getElementById('fb-taps');
  if (t) t.textContent = comma(Math.floor(B.tapsF));
}

function popNum(e, mult) {
  const box = document.getElementById('fb-pops');
  const stage = document.getElementById('fb-stage');
  if (!box || !stage) return;
  if (box.childElementCount > 14) box.firstElementChild?.remove(); // 과부하 방지
  const r = stage.getBoundingClientRect();
  const x = (e.clientX || r.left + r.width / 2) - r.left;
  const y = (e.clientY || r.top + r.height / 2) - r.top;
  const s = document.createElement('span');
  const n = Math.max(1, Math.round(mult));
  s.className = 'fb-pop' + (n >= 3 ? ' x3' : n >= 2 ? ' x2' : '');
  s.textContent = n >= 2 ? `+${n}🔥` : '+1';
  s.style.left = x + 'px';
  s.style.top = y + 'px';
  box.appendChild(s);
  setTimeout(() => s.remove(), 560);
}

/* ── 루프: 흐름 시뮬레이션 + 게이지 갱신 ── */
function frame(now) {
  const fill = document.getElementById('fb-fill');
  if (!B || B.ended || !fill || !fill.isConnected) { cleanup(); return; }
  const dt = Math.min(0.05, (now - B.lastFrame) / 1000);
  B.lastFrame = now;
  const k = dt * 60; // 프레임률 보정 (60fps 기준)

  // 새 목표를 가끔 갱신 (살아있는 출렁임)
  B.simT += dt;
  if (B.simT > 0.9) { B.simT = 0; B.target = clamp(B.mean + (Math.random() * 2 - 1) * 7, 8, 92); }
  B.mean += (B.base - B.mean) * 0.0025 * k;         // 상대편 저항 — base로 서서히 복원(줄다리기)
  B.aShare += (B.target - B.aShare) * 0.05 * k;      // 목표로 이징
  B.aShare += B.push * 0.05 * k;                     // 내 광클 압박
  B.push *= Math.pow(0.86, k);
  B.aShare = clamp(B.aShare, 5, 95);

  // 콤보 자연 감쇠 (손을 멈추면)
  if (now - B.lastTap > 320 && B.streak > 0) B.streak = Math.max(0, B.streak - 0.5 * k);

  fill.style.width = B.aShare.toFixed(2) + '%';
  setText('fb-pa', B.aShare.toFixed(1));
  setText('fb-pb', (100 - B.aShare).toFixed(1));
  setText('fb-time', String(Math.max(0, Math.ceil((B.endsAt - now) / 1000))));
  const combo = document.getElementById('fb-combo');
  if (combo) { combo.textContent = '×' + comboMult(B.streak).toFixed(1); combo.classList.toggle('hot', B.streak > 10); }

  if (now >= B.endsAt) { endBattle(); return; }
  B.raf = requestAnimationFrame(frame);
}
const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

/* ── 전광판(군중 연출) ── */
function tickerBeat() {
  const el = document.getElementById('fb-ticker');
  if (!B || !el || !el.isConnected) { cleanup(); return; }
  const bt = B.bt;
  const lead = B.aShare >= 50 ? bt.a : bt.b;
  const leadShare = Math.max(B.aShare, 100 - B.aShare);
  const pool = [];
  if (Math.abs(B.aShare - 50) < 2.5) pool.push('⚔️ 초접전! 한 끗 차이다');
  else pool.push(`🔥 ${lead.emoji} ${lead.name} 흐름 장악 ${leadShare.toFixed(0)}%`);
  if (B.maxStreak > 14) pool.push(`💥 누군가 ×${comboMult(B.maxStreak).toFixed(1)} 콤보 폭발!`);
  pool.push(...bt.taunts.map((t) => '🗣️ ' + t));
  pool.push('🚀 단톡방에 소문이 퍼지는 중…', '👀 옆 반도 참전했다는데?', '📣 지금 흐름 끌어올 타이밍!');
  el.textContent = pool[Math.floor(Math.random() * pool.length)];
  el.classList.remove('beat'); void el.offsetWidth; el.classList.add('beat'); // 재생 트리거
}

/* ── 종료 + 보상 + 결과 카드 ── */
function endBattle() {
  if (!B || B.ended) return;
  B.ended = true;
  cancelAnimationFrame(B.raf); clearInterval(B.tick);
  const ui = gameUI();
  const { bt, side, me, foe } = B;
  const contrib = Math.floor(B.tapsF);
  const myShare = side === 'a' ? B.aShare : 100 - B.aShare;
  const maxStreak = B.maxStreak;

  const rec = recordScore('faction', contrib);
  ui.submitScore?.('faction', gameBest('faction').all); // 전국 기여 랭킹(로그인 시)
  let earned = 0;
  if (contrib > 0 && canEarn('game')) {
    const p = Math.min(15, Math.max(1, Math.floor(contrib / 120)));
    const r = earn('game', p);
    if (r.ok) earned = r.p;
  }
  ui.onPoints?.();
  bumpBattle(B.date, side, contrib).catch(() => {}); // 전국 누적에 기여(연결 시)

  const title = titleForTaps(contrib);
  const rank = rankEstimate(contrib);
  const streak = fstate().streak;
  const verdict = myShare >= 53
    ? { t: '우리 편이 전국을 먹었다! 🎉', c: 'win' }
    : myShare <= 47
      ? { t: '오늘은 밀렸다… 내일 설욕 🔥', c: 'lose' }
      : { t: '초접전 무승부 ⚔️', c: 'tie' };
  if (rec.newAll || rec.newWeek) { chord([523, 659, 784, 1047]); buzz([20, 40, 20]); }
  lastResult = { bt, me, contrib, title, rank };
  B = null;

  ui.openSheet(`
    <div class="fb-result">
      <h2 class="fb-verdict ${verdict.c}">${verdict.t}</h2>
      <div class="fb-card" style="--c:${me.color};--foe:${foe.color}">
        <div class="fb-card-top"><span class="fb-card-emo">${me.emoji}</span>
          <div class="grow"><b>${me.name}</b><small>${bt.q}</small></div>
          <span class="fb-card-badge">${title}</span></div>
        <div class="fb-card-stats">
          <div><b>${comma(contrib)}</b><small>내 기여</small></div>
          <div><b>×${comboMult(maxStreak).toFixed(1)}</b><small>최고 콤보</small></div>
          <div><b>${comma(rank)}위</b><small>예상 전국</small></div>
        </div>
        <div class="fb-card-gauge" style="background:${foe.color}"><i style="width:${myShare.toFixed(1)}%;background:${me.color}"></i></div>
        <div class="fb-card-foot"><span>${me.emoji} ${me.name} ${myShare.toFixed(1)}%</span><span class="fb-card-tag">#광클대전 #${bt.tag}</span></div>
      </div>
      ${earned ? `<div class="g-earn" style="text-align:center;margin-top:10px">🅿 +${earned}P 적립</div>`
        : '<p class="hint" style="text-align:center;margin-top:10px">오늘 게임 보상은 다 받았어요 — 기록·랭킹 도전은 무제한!</p>'}
      ${rec.newAll ? '<div class="g-newbest">🏆 역대 최고 기여!</div>' : rec.newWeek ? '<div class="g-newbest">👑 이번 주 신기록!</div>' : ''}
      ${streak > 1 ? `<p class="hint" style="text-align:center">🔥 ${streak}일 연속 참전 중!</p>` : ''}
      <div class="btn-row" style="flex-direction:column;margin-top:6px">
        ${earned ? `<button class="btn btn-accent btn-block" onclick="UI.gameDouble(${earned})">📺 광고 보고 2배 (+${earned}P)</button>` : ''}
        <button class="btn btn-primary btn-block" onclick="UI.factionShare()">📣 결과 자랑 + 친구 소환</button>
        <button class="btn btn-block" onclick="UI.factionGo('${side}')">🔁 한 판 더</button>
        <button class="btn btn-block" onclick="UI.faction()">⚡ 오늘의 대전</button>
        <button class="btn btn-block" onclick="UI.openRanks()">🏆 전국 기여 랭킹</button>
      </div>
    </div>`);
}

/* ── 자랑/소환 (바이럴 루프) ── */
export async function factionShare() {
  const r = lastResult;
  if (!r) return;
  const ui = gameUI();
  const link = location.origin + location.pathname + '?b=1';
  const text = `⚡광클대전⚡ 나는 ${r.me.name}!\n${r.bt.q} → ${r.title}\n내 기여 ${comma(r.contrib)} · 예상 전국 ${comma(r.rank)}위\n너는 어느 편? 참전해라 👉`;
  try {
    if (navigator.share) { await navigator.share({ title: '광클대전', text, url: link }); return; }
  } catch { return; /* 사용자가 취소 */ }
  try {
    await navigator.clipboard.writeText(`${text} ${link}`);
    ui.toast('링크 복사 완료 — 단톡방에 뿌리기 📣');
  } catch {
    ui.toast('스크린샷 해서 자랑해보세요 📸');
  }
}

function cleanup() {
  if (!B) return;
  cancelAnimationFrame(B.raf);
  clearInterval(B.tick);
  B = null;
}
