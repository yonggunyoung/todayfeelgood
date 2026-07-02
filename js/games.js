// 미니게임 2종 — 짧고(20~60초), 콤보·주간기록으로 승부욕을 긁고, 광고(2배 보상)로 수익화한다.
//  A. 프레시 캐치(원터치): 움직이는 마커를 신선 존 안에서 멈추기 — 콤보·생명 3개
//  B. 외쳐! 재료(음성인식): 재료 이모지를 보고 이름을 빨리 외치기 — 시간 기록
// 포인트는 일 5판까지(points.EARN.game), 광고 완주 시 그 판 보상 2배.
import { S } from './store.js';
import { ING } from './data/ingredients.js';
import { canListen, startListen, stopListen, isListening } from './voice.js';
import { earn, bonus, canEarn, earnedToday, EARN, gameBest, recordScore, spend } from './points.js';

let ui = null; // {openSheet, closeSheet, toast, playAd, onPoints, submitScore}
export function initGames(ctx) { ui = ctx; }
export const gameUI = () => ui; // 외부 게임 모듈이 시트/토스트/광고 코어를 공유

/* ── 효과음 — 에셋 없이 WebAudio 합성 (무음 실패는 조용히 무시) ── */
let ac = null;
export function beep(freq = 880, dur = 0.08, type = 'sine', vol = 0.18) {
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    o.connect(g).connect(ac.destination);
    o.start(); o.stop(ac.currentTime + dur);
  } catch { /* ignore */ }
}
// 코드 진행(상승) — 콤보·승리 같은 보상 순간
export function chord(freqs, dur = 0.12, type = 'triangle') {
  freqs.forEach((f, i) => setTimeout(() => beep(f, dur, type, 0.14), i * 55));
}
export const buzz = (ms) => navigator.vibrate?.(ms);

/* ── 게임 카탈로그 (허브가 이걸로 그려진다) ── */
export const GAMES = [
  { id: 'defense', emoji: '🧊', name: '냉장고 지키기', tag: '디펜스',
    desc: '상한 음식·세균이 냉장고로! 탭으로 막아내는 웨이브 디펜스', open: 'UI.gameDefense()' },
  { id: 'puzzle', emoji: '🍎', name: '재료 매치', tag: '퍼즐',
    desc: '같은 재료 3개 이상 맞춰 터뜨리기 — 연쇄 콤보', open: 'UI.gamePuzzle()' },
  { id: 'fresh', emoji: '🥬', name: '프레시 캐치', tag: '순발력',
    desc: '신선 존에서 탭! 원터치 타이밍 — 콤보로 점수 폭발', open: 'UI.gameFresh()' },
  { id: 'quiz', emoji: '🧠', name: '냉장고 상식 퀴즈', tag: '음성/탭',
    desc: '신기한 음식 상식 — 음성이나 탭으로 정답', open: 'UI.gameQuiz()' },
  { id: 'gomoku', emoji: '⚫', name: '냉장고 오목', tag: '두뇌',
    desc: '슬라임 알로 AI와 5목 대결 — 광고로 한 수 무르기', open: 'UI.gameGomoku()' },
  { id: 'voice', emoji: '🎤', name: '외쳐! 재료', tag: '음성', needVoice: true,
    desc: '재료 이름을 빨리 외치기 — 8문제 스피드런', open: 'UI.gameVoice()' },
  { id: 'gclash', emoji: '⚡', name: '광클대전', tag: '진영전',
    desc: '오늘의 떡밥에 내 편 골라 60초 광클 — 전국 게이지를 내 편으로!', open: 'UI.gameGwangclick()' },
];

// 공통 난이도 (하/중/상) — 게임마다 속도·시간·물량에 반영
let gameDiff = 'normal';
export const DIFF_MUL = { easy: 0.82, normal: 1, hard: 1.32 };
export const getDiff = () => gameDiff;
export const diffMul = () => DIFF_MUL[gameDiff];
export function setGameDiff(d) { gameDiff = d; }
const DIFF_LBL = { easy: '하', normal: '중', hard: '상' };
// 게임 화면 내부 난이도 칩 — 변경 시 해당 게임을 재시작(외부 허브 난이도 조절 대체)
export function gameDiffRow(replayKey) {
  return `<div class="g-diffbar g-diffbar-in"><span>난이도</span>${['easy', 'normal', 'hard'].map((d) => `<button class="g-diffchip ${gameDiff === d ? 'on' : ''}" onclick="UI.gameSetDiff('${d}','${replayKey}')">${DIFF_LBL[d]}</button>`).join('')}<small>높을수록 점수·난도↑</small></div>`;
}

/* ── 게임 허브 ── */
export function openGames() {
  const left = EARN.game.cap - earnedToday('game');
  const cards = GAMES.map((g) => {
    const locked = g.needVoice && !canListen;
    const b = gameBest(g.id);
    return `<div class="g-card2 ${locked ? 'g-off' : ''}" ${locked ? '' : `onclick="${g.open}"`}>
      <div class="g-ico2">${g.emoji}</div>
      <div class="grow">
        <div class="g-titlerow"><b>${g.name}</b><span class="g-tag">${g.tag}</span></div>
        <p class="g-desc">${locked ? '안드로이드 크롬에서 즐길 수 있어요 (아이폰 사파리 음성 미지원)' : g.desc}</p>
        <small class="g-best">🏆 ${b.all} · 이번 주 ${b.week}</small>
      </div>
      <span class="g-go">${locked ? '🔒' : '▶'}</span>
    </div>`;
  }).join('');
  ui.openSheet(`
    <div class="g-hubhead">
      <h2 style="margin:0">🎮 짬시간 게임</h2>
      <button class="btn btn-sm btn-tint" onclick="UI.openRanks()">🏆 랭킹</button>
    </div>
    <p class="sub">끓는 동안 한 판 — 점수가 포인트로 (오늘 보상 ${left}판 남음 · 광고 보면 2배)</p>
    <p class="hint" style="text-align:center;margin:0 0 6px">난이도는 각 게임 화면에서 조절할 수 있어요</p>
    <div class="g-grid">${cards}</div>
    <p class="hint" style="text-align:center;margin-top:10px">주간 기록은 월요일마다 리셋 — 이번 주 왕좌를 지키세요 👑<br>가족을 초대해 랭킹 대결로 <b>설거지 당번</b>을 정해보세요 🍽️</p>
    <div class="btn-row"><button class="btn btn-block" onclick="UI.closeSheet()">닫기</button></div>`);
}

/* ── 공통: 판 종료 → 점수/기록/포인트/광고 2배/랭킹 제출 ── */
const PTS_DIV = { fresh: 25, voice: 10, defense: 70, puzzle: 90, quiz: 14 }; // 점수→포인트 환산 (수익성 보정)
export function finishGame(game, title, score, scoreLabel, replayFn, { extra = '' } = {}) {
  stopListen();
  const rec = recordScore(game, score);
  ui.submitScore?.(game, Math.max(rec.all, score)); // 가족·전체 랭킹에 최고기록 제출
  let earned = 0;
  if (score > 0 && canEarn('game')) {
    const p = Math.min(15, Math.max(1, Math.floor(score / (PTS_DIV[game] || 30))));
    const r = earn('game', p);
    if (r.ok) earned = r.p;
  }
  const b = gameBest(game);
  ui.onPoints?.();
  if (rec.newAll || rec.newWeek) { chord([523, 659, 784, 1047]); buzz([20, 40, 20]); }
  ui.openSheet(`
    <h2>${title}</h2>
    <div class="card flat" style="text-align:center;padding:22px 16px">
      <div class="g-score">${scoreLabel}</div>
      ${extra ? `<p class="hint" style="margin:4px 0 0">${extra}</p>` : ''}
      ${rec.newAll ? '<div class="g-newbest">🏆 역대 최고 기록!</div>' : rec.newWeek ? '<div class="g-newbest">👑 이번 주 신기록!</div>' : `<p class="hint" style="margin:6px 0 0">최고 ${b.all} · 이번 주 ${b.week}</p>`}
      ${earned ? `<div class="g-earn">🅿 +${earned}P 적립</div>` : `<p class="hint" style="margin:8px 0 0">오늘 보상 판수를 다 썼어요 — 기록 도전은 무제한!</p>`}
    </div>
    <div class="btn-row" style="flex-direction:column">
      ${earned ? `<button class="btn btn-accent btn-block" onclick="UI.gameDouble(${earned})">📺 광고 끝까지 보고 2배 받기 (+${earned}P)</button>` : ''}
      <button class="btn btn-primary btn-block" onclick="${replayFn}">🔁 한 판 더</button>
      <button class="btn btn-block" onclick="UI.openGames()">다른 게임</button>
      <button class="btn btn-block" onclick="UI.closeSheet()">끝내기</button>
    </div>`);
}
export function gameDouble(p) {
  ui.playAd({
    reward: `포인트 2배 (+${p}P)`,
    note: '광고를 끝까지 보면 이번 판 보상이 2배가 돼요',
    onComplete: (btn) => {
      bonus(p, '미니게임 광고 2배');
      ui.onPoints?.();
      btn.className = 'btn btn-block btn-primary';
      btn.textContent = `✅ +${p}P 추가 적립!`;
      btn.disabled = false;
      btn.onclick = () => ui.closeSheet();
      buzz(30);
    },
  });
}

/* ── 인게임 광고(스테이지 오버레이, 시트 유지) → 이어하기/아이템 (전 게임 공용) ──
   토스 안: 실제 보상형 광고(전면). 시작 전에 "중간에 나가면 보상 없음"을 고지하고 선택권을 준다.
           가짜 카운트다운("냉비서 프리미엄이 곧…")은 토스에서 절대 뜨지 않는다.
   웹:     하우스 15초 카운트다운(기존 그대로 — AdFit 교체 자리). */
const AD_ALT_COST = 40; // 광고 대신 포인트로 받기 비용 (한 판 보상 상한 15P보다 크게 — 광고가 기본, 포인트는 선택지)
function adAltBtnHtml() {
  const bal = S.points?.bal || 0;
  return bal >= AD_ALT_COST ? `<button class="gx-adcoin" id="tad-pay">🅿 ${AD_ALT_COST}P로 광고 없이 받기 (보유 ${bal}P)</button>` : '';
}
export function inStageAd(stageEl, label, onReward, onSkip) {
  if (!stageEl) { onSkip && onSkip(); return; }
  if (typeof window !== 'undefined' && window.__TOSS__) {
    const ov = document.createElement('div'); ov.className = 'draft-overlay';
    ov.innerHTML = `<div class="draft-in"><div class="draft-title">📺 광고 보기</div><p>${label}</p>
      <p class="hint" style="margin:6px 0 10px">광고는 전체 화면으로 재생되고 <b>닫기 버튼이 없거나 늦게 나타날 수 있어요.</b><br><b>중간에 나가면 보상을 받을 수 없어요.</b> 시작 전인 지금만 취소할 수 있어요.</p>
      <button class="gx-btn-go" id="tad-go">광고 보고 받기</button>
      ${adAltBtnHtml()}
      <button class="qz-skip" id="tad-no">안 볼래요 (보상 없음)</button></div>`;
    stageEl.appendChild(ov);
    let done = false;
    const fin = (reward, msg) => {
      if (done) return; done = true; ov.remove();
      if (msg) ui.toast(msg);
      (reward ? onReward : onSkip) && (reward ? onReward() : onSkip());
    };
    ov.querySelector('#tad-no').onclick = () => fin(false);
    const pay = ov.querySelector('#tad-pay');
    if (pay) pay.onclick = () => { if (spend(AD_ALT_COST, '광고 대신 포인트')) { ui.onPoints?.(); fin(true, `🅿 ${AD_ALT_COST}P 사용 — 보상이 적용됐어요`); } else fin(false, '포인트가 부족해요'); };
    ov.querySelector('#tad-go').onclick = () => {
      const b = ov.querySelector('#tad-go'); b.disabled = true; b.textContent = '광고 불러오는 중…';
      const fn = window.__tossRewardedAd;
      (typeof fn === 'function' ? fn() : Promise.resolve(null)).then((r) => {
        if (r === true) fin(true, '✅ 광고 시청 완료 — 보상이 적용됐어요');
        else if (r === false) fin(false, '광고를 중간에 나가 보상을 받지 못했어요');
        else fin(false, '지금은 광고를 불러오지 못했어요 — 잠시 후 다시 시도해 주세요');
      });
    };
    return;
  }
  const ov = document.createElement('div'); ov.className = 'draft-overlay';
  ov.innerHTML = `<div class="draft-in"><div class="draft-title">📺 광고</div><p>${label}</p>
    <div class="adx-stage" style="margin:6px 0 10px"><div class="adx-slime">🧊</div><b>냉비서 프리미엄이 곧</b></div>
    <div class="ad-progress"><i class="ad-bar"></i></div>
    <button class="gx-btn-go ad-ok" disabled>광고 시청 중… 15초</button>
    ${adAltBtnHtml()}
    <button class="qz-skip ad-skip">건너뛰기 (보상 없음)</button></div>`;
  stageEl.appendChild(ov);
  const bar = ov.querySelector('.ad-bar'); if (bar) { bar.style.transitionDuration = '15s'; requestAnimationFrame(() => { bar.style.width = '100%'; }); }
  const okb = ov.querySelector('.ad-ok'); let t = 15, done = false;
  const fin = (reward) => { if (done) return; done = true; clearInterval(iv); ov.remove(); (reward ? onReward : onSkip) && (reward ? onReward() : onSkip()); };
  const payw = ov.querySelector('#tad-pay');
  if (payw) payw.onclick = () => { if (spend(AD_ALT_COST, '광고 대신 포인트')) { ui.onPoints?.(); ui.toast(`🅿 ${AD_ALT_COST}P 사용 — 보상이 적용됐어요`); fin(true); } };
  const iv = setInterval(() => { if (!ov.isConnected) { clearInterval(iv); return; } t--; if (t > 0) { okb.textContent = `광고 시청 중… ${t}초`; return; } clearInterval(iv); okb.disabled = false; okb.textContent = '✅ 보상 받기'; okb.onclick = () => fin(true); }, 1000);
  ov.querySelector('.ad-skip').onclick = () => fin(false);
}

/* ══ A. 프레시 캐치 — 원터치 타이밍 ══ */
const FRESH_POOL = ING.filter((i) => ['채소', '과일', '수산', '육류', '유제품'].includes(i.cat));
let fg = null; // {pos, dir, speed, zc, zw, combo, score, lives, raf, last}

export function gameFresh() {
  fg = { pos: 0.5, dir: 1, speed: 0.55 * diffMul(), zc: 0.5, zw: 0.34 / Math.max(1, diffMul() * 0.9), combo: 1, score: 0, lives: 3, item: pickItem(), last: 0, revived: false };
  ui.openSheet(`
    <div class="g-stage" id="gf-stage">
      <div class="g-hud">
        <span id="gf-lives">❤❤❤</span>
        <b id="gf-score">0</b>
        <span id="gf-combo" class="g-combo"></span>
      </div>
      <div class="g-itembox"><span id="gf-emoji">${fg.item.emoji}</span><b id="gf-name">${fg.item.name}</b></div>
      ${gameDiffRow('gameFresh')}
      <p class="hint" style="text-align:center;margin:4px 0 10px">초록 <b>신선 존</b>에서 탭! 가운데면 PERFECT</p>
      <div class="g-track"><div class="g-zone" id="gf-zone"><i></i></div><div class="g-marker" id="gf-marker"></div></div>
      <div class="g-pop" id="gf-pop"></div>
      <button class="btn btn-primary btn-block" style="margin-top:14px" id="gf-tap">잡기!</button>
      <p class="hint" style="text-align:center;margin-top:8px">화면 아무 데나 탭해도 돼요</p>
    </div>`);
  const stage = document.getElementById('gf-stage');
  placeZone();
  stage.addEventListener('pointerdown', freshTap, { passive: true });
  fg.last = performance.now();
  fg.raf = requestAnimationFrame(freshLoop);
}
const pickItem = () => FRESH_POOL[Math.floor(Math.random() * FRESH_POOL.length)];
function placeZone() {
  const z = document.getElementById('gf-zone');
  if (!z) return;
  z.style.left = (fg.zc - fg.zw / 2) * 100 + '%';
  z.style.width = fg.zw * 100 + '%';
}
function freshLoop(now) {
  const m = document.getElementById('gf-marker');
  if (!fg || !m || !m.isConnected) { fg = null; return; } // 시트가 닫히면 루프 종료
  const dt = Math.min(0.032, (now - fg.last) / 1000);
  fg.last = now;
  if (fg.freeze > 0) { fg.freeze -= dt; } // 탭 직후 잠깐 멈춰 '맞았는데 빗나감' 방지
  else {
    fg.pos += fg.dir * fg.speed * dt;
    if (fg.pos >= 1) { fg.pos = 1; fg.dir = -1; }
    if (fg.pos <= 0) { fg.pos = 0; fg.dir = 1; }
    m.style.left = fg.pos * 100 + '%';
  }
  fg.raf = requestAnimationFrame(freshLoop);
}
function freshTap() {
  if (!fg || fg.freeze > 0) return; // 멈춤 동안 중복 탭 무시
  fg.freeze = 0.2; // 판정 후 잠깐 정지(시각=판정 일치)
  const dist = Math.abs(fg.pos - fg.zc);
  const half = fg.zw / 2;
  const pop = document.getElementById('gf-pop');
  document.getElementById('gf-stage')?.classList.add('g-flash');
  setTimeout(() => document.getElementById('gf-stage')?.classList.remove('g-flash'), 150);
  if (dist <= half * 0.5) {
    fg.score += 10 * fg.combo;
    fg.combo = Math.min(5, fg.combo + 1);
    pop.textContent = `PERFECT ×${fg.combo - 1 > 1 ? fg.combo - 1 : 1}!`;
    pop.className = 'g-pop on perfect';
    beep(1175, 0.09); buzz(12);
  } else if (dist <= half) {
    fg.score += 5;
    fg.combo = 1;
    pop.textContent = 'GOOD';
    pop.className = 'g-pop on';
    beep(880, 0.07); buzz(8);
  } else {
    fg.lives -= 1;
    fg.combo = 1;
    pop.textContent = '시들었다… 💔';
    pop.className = 'g-pop on miss';
    beep(196, 0.18, 'square', 0.12); buzz([40, 40, 40]);
    document.getElementById('gf-stage')?.classList.add('g-shake');
    setTimeout(() => document.getElementById('gf-stage')?.classList.remove('g-shake'), 350);
  }
  setTimeout(() => { document.getElementById('gf-pop')?.classList.remove('on'); }, 520);
  document.getElementById('gf-score').textContent = fg.score;
  document.getElementById('gf-lives').textContent = '❤'.repeat(Math.max(0, fg.lives)) || '💔';
  document.getElementById('gf-combo').textContent = fg.combo > 1 ? `🔥 콤보 ×${fg.combo}` : '';
  if (fg.lives <= 0) { offerFreshRevive(); return; }
  // 다음 라운드 — 더 빠르게, 존은 더 좁게 + 위치 랜덤 (속도 상한 낮춰 '맞았는데 빗나감' 방지)
  fg.speed = Math.min(1.15 * diffMul(), fg.speed * 1.05);
  fg.zw = Math.max(0.15, fg.zw * 0.97);
  fg.zc = 0.18 + Math.random() * 0.64;
  fg.item = pickItem();
  const em = document.getElementById('gf-emoji');
  const nm = document.getElementById('gf-name');
  if (em) { em.textContent = fg.item.emoji; nm.textContent = fg.item.name; }
  placeZone();
}
function offerFreshRevive() {
  cancelAnimationFrame(fg?.raf);
  const stage = document.getElementById('gf-stage');
  if (!stage || fg.revived) { endFresh(); return; }
  const ov = document.createElement('div'); ov.className = 'draft-overlay';
  ov.innerHTML = `<div class="draft-in"><div class="draft-title" style="color:#ff4d6a">아쉬워요!</div>
    <p>광고 한 번이면 <b>생명 +2</b>로 이어서 점수를 더 쌓을 수 있어요</p>
    <button class="gx-btn-go" id="fr-rev">📺 광고 보고 이어하기</button>
    <button class="qz-skip" id="fr-end">결과 보기</button></div>`;
  stage.appendChild(ov);
  ov.querySelector('#fr-rev').onclick = () => {
    ov.remove();
    inStageAd(stage, '광고 보고 생명 +2 이어하기', () => { fg.revived = true; fg.lives = 2; document.getElementById('gf-lives').textContent = '❤❤'; fg.last = performance.now(); fg.raf = requestAnimationFrame(freshLoop); }, () => endFresh());
  };
  ov.querySelector('#fr-end').onclick = () => { ov.remove(); endFresh(); };
}
function endFresh() {
  const score = fg ? fg.score : 0;
  cancelAnimationFrame(fg?.raf);
  fg = null;
  finishGame('fresh', '🥬 프레시 캐치', score, `${score}점`, 'UI.gameFresh()');
}

/* ══ B. 외쳐! 재료 — 음성 스피드 퀴즈 ══ */
const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const choseong = (s) => [...s].map((ch) => {
  const c = ch.charCodeAt(0) - 0xac00;
  return c >= 0 && c <= 11171 ? CHO[Math.floor(c / 588)] : ch;
}).join('');
// 누구나 또렷이 알고 발음 쉬운 재료만 — 이름을 화면에 보여주고 외치는 게임(애매함 제거)
const VOICE_WORDS = [
  ['사과', '🍎'], ['바나나', '🍌'], ['당근', '🥕'], ['토마토', '🍅'], ['우유', '🥛'],
  ['계란', '🥚', ['달걀']], ['감자', '🥔'], ['양파', '🧅'], ['옥수수', '🌽'], ['딸기', '🍓'],
  ['포도', '🍇'], ['레몬', '🍋'], ['가지', '🍆'], ['고구마', '🍠'], ['수박', '🍉'],
  ['치즈', '🧀'], ['식빵', '🍞', ['빵']], ['생선', '🐟', ['물고기']], ['새우', '🦐'], ['버섯', '🍄'],
  ['브로콜리', '🥦'], ['오이', '🥒'], ['귤', '🍊', ['감귤']], ['호박', '🎃'],
];
const VOICE_POOL = VOICE_WORDS.map(([name, emoji, aliases]) => ({ name, emoji, aliases: aliases || [] }));
let vg = null; // {list, idx, t0, passes, iv, hintTimer}

export function gameVoice() {
  if (!canListen) { ui.toast('이 브라우저는 음성인식을 지원하지 않아요'); return; }
  if (isListening()) stopListen(); // 주방 마이크와 분리 — 게임 전용 세션
  const list = [...VOICE_POOL].sort(() => Math.random() - 0.5).slice(0, 8);
  vg = { list, idx: 0, t0: 0, passes: 0, iv: null, hintTimer: null };
  ui.openSheet(`
    <div class="g-stage" id="gv-stage">
      <div class="g-hud"><span id="gv-dots"></span><b id="gv-time">0.0초</b></div>
      <div class="g-itembox big" id="gv-item"><span id="gv-emoji"></span><b id="gv-name" style="display:block;font-size:1.8rem;margin-top:2px">…</b></div>
      <div class="g-hint" id="gv-hint">🎤 이름을 외치세요!</div>
      <div class="g-heard" id="gv-heard">…</div>
      <div class="btn-row">
        <button class="btn btn-block" onclick="UI.gameVoicePass()">패스 (+8초)</button>
      </div>
      <p class="hint" style="text-align:center;margin-top:6px">마이크가 어렵나요? 위 재료를 <b>탭</b>해도 정답 처리돼요</p>
    </div>`);
  document.getElementById('gv-item')?.addEventListener('click', () => { if (vg) voiceAdvance(); }); // 탭 폴백(접근성)
  const ok = startListen(voiceHeard, (on, why) => {
    if (why === 'denied') { ui.toast('마이크 권한을 허용해 주세요'); ui.closeSheet(); }
  });
  if (!ok) { ui.toast('마이크를 켤 수 없어요'); return; }
  vg.t0 = performance.now();
  vg.iv = setInterval(() => {
    const el = document.getElementById('gv-time');
    if (!el || !el.isConnected) { clearVoice(); return; }
    el.textContent = ((performance.now() - vg.t0) / 1000 + vg.passes * 8).toFixed(1) + '초';
  }, 100);
  voiceRound();
}
function clearVoice() {
  if (!vg) return;
  clearInterval(vg.iv);
  clearTimeout(vg.hintTimer);
  stopListen();
  vg = null;
}
function voiceRound() {
  const it = vg.list[vg.idx];
  document.getElementById('gv-emoji').textContent = it.emoji;
  const nm = document.getElementById('gv-name'); if (nm) nm.textContent = it.name + '!'; // 이름을 크게 보여줌(애매함 제거)
  document.getElementById('gv-dots').textContent = '●'.repeat(vg.idx) + '○'.repeat(vg.list.length - vg.idx);
  document.getElementById('gv-hint').textContent = '🎤 이름을 외치세요!';
  clearTimeout(vg.hintTimer);
  vg.hintTimer = setTimeout(() => { // 4초 막히면 초성 힌트 — 좌절 방지
    const h = document.getElementById('gv-hint');
    if (h && vg) h.textContent = `힌트: ${choseong(vg.list[vg.idx].name)}`;
  }, 4000);
}
function voiceHeard(t) {
  if (!vg) return;
  const heard = document.getElementById('gv-heard');
  if (heard) heard.textContent = `"${t}"`;
  const bare = t.replace(/\s/g, '');
  const it = vg.list[vg.idx];
  const names = [it.name, ...(it.aliases || [])];
  const hit = names.some((n) => bare.includes(n)) || (bare.length >= 2 && it.name.includes(bare));
  if (!hit) return;
  voiceAdvance();
}
function voiceAdvance() {
  if (!vg) return;
  beep(1318, 0.09); buzz(12);
  document.getElementById('gv-stage')?.classList.add('g-flash');
  setTimeout(() => document.getElementById('gv-stage')?.classList.remove('g-flash'), 220);
  vg.idx += 1;
  if (vg.idx >= vg.list.length) { endVoice(); return; }
  voiceRound();
}
export function gameVoicePass() {
  if (!vg) return;
  vg.passes += 1;
  beep(330, 0.1, 'square', 0.1);
  vg.idx += 1;
  if (vg.idx >= vg.list.length) { endVoice(); return; }
  voiceRound();
}
function endVoice() {
  const secs = (performance.now() - vg.t0) / 1000 + vg.passes * 8;
  clearVoice();
  const score = Math.max(0, Math.round((60 - secs) * 2)); // 60초 예산 — 빠를수록 고득점
  finishGame('voice', '🎤 외쳐! 재료', score, `${secs.toFixed(1)}초 · ${score}점`, 'UI.gameVoice()');
}

/* ══ C. ⚡광클대전 — 별도 개발된 단독 앱(gwangclick/offline.html, 단일 파일)을 게임 시트에 임베드 ══
   진영전 밈 게임: 오늘의 떡밥에 편 골라 60초 광클. 자체 완결(자기 점수·연출·광고 어댑터 내장)이라
   냉비서 포인트 환산 없이 '보너스 아케이드'로 제공한다. */
export function gameGwangclick() {
  ui.openSheet(`
    <div class="gx gclash-wrap">
      <div class="gx-bar gclash-bar"><b>⚡ 광클대전</b><span class="grow"></span>
        <button class="gclash-x" onclick="UI.closeSheet()">✕ 닫기</button></div>
      <iframe class="gclash-frame" src="./gwangclick/offline.html" title="광클대전"></iframe>
    </div>`);
}
