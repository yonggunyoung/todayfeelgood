// 냉장고 상식 퀴즈 — 신기한 음식·보관 상식을 음성이나 탭으로 맞힌다.
// 틀리면: [광고 보고 정답 설명] 또는 [스킵]. 맞히면 보너스 + 재미있는 사실.
import { gameUI, beep, chord, buzz, finishGame } from './games.js';
import { canListen, startListen, stopListen, isListening } from './voice.js';

// {q, opts[4], a(정답 인덱스), fact, accept[](음성 인식 키워드)}
const POOL = [
  { q: '냉장고에 넣으면 오히려 맛·식감이 나빠지는 것은?', opts: ['감자', '우유', '계란', '버터'], a: 0,
    fact: '감자는 냉장 보관 시 전분이 당으로 바뀌어 단맛이 돌고 식감이 변해요. 서늘한 실온이 정답!', accept: ['감자'] },
  { q: '꿀이 수백 년이 지나도 잘 상하지 않는 이유는?', opts: ['수분이 거의 없어서', '설탕이라서', '차가워서', '공기가 없어서'], a: 0,
    fact: '꿀은 수분이 매우 적고 약산성이라 세균이 살기 어려워요. 고대 무덤의 꿀도 먹을 수 있었대요!', accept: ['수분', '물'] },
  { q: '달걀이 신선한지 물에 넣어보면?', opts: ['가라앉으면 신선', '뜨면 신선', '옆으로 서면 신선', '거품이 나면 신선'], a: 0,
    fact: '오래될수록 내부 공기주머니가 커져 둥둥 떠요. 가라앉아 눕는 달걀이 가장 신선!', accept: ['가라앉', '바닥', '아래'] },
  { q: '감자 옆에 같이 두면 싹을 늦춰주는 과일은?', opts: ['사과', '바나나', '포도', '귤'], a: 0,
    fact: '사과가 내뿜는 에틸렌이 감자 싹을 억제해요. 반대로 양파와는 같이 두면 안 돼요!', accept: ['사과'] },
  { q: '토마토를 가장 맛있게 보관하는 곳은?', opts: ['실온', '냉장실', '냉동실', '물속'], a: 0,
    fact: '토마토는 냉장하면 단맛과 향이 떨어져요. 꼭지를 아래로 두고 실온 보관이 정답!', accept: ['실온', '상온', '바깥'] },
  { q: '고기를 안전하고 빠르게 해동하려면?', opts: ['찬물에 담근다', '뜨거운 물', '실온에 오래', '햇빛'], a: 0,
    fact: '뜨거운 물·실온은 겉만 익거나 세균이 번식해요. 밀봉해 찬물에 담그면 빠르고 안전!', accept: ['찬물', '차가운', '냉수'] },
  { q: '갓 지은 밥을 가장 맛있게 보관하려면?', opts: ['바로 한 김 식혀 냉동', '냉장실에 천천히', '실온 보관', '물을 부어'], a: 0,
    fact: '냉장은 밥이 푸석해지는 노화가 가장 빨라요. 따뜻할 때 소분해 냉동이 최고!', accept: ['냉동', '얼린'] },
  { q: '양파 썰 때 눈물을 줄이는 방법은?', opts: ['썰기 전 냉장', '뜨겁게 데운다', '설탕을 뿌린다', '말려서'], a: 0,
    fact: '차가우면 눈물 유발 성분이 덜 날아가요. 15분 냉장 후 썰면 한결 편해요!', accept: ['냉장', '차갑', '냉동'] },
  { q: '바나나를 더 오래 두려면?', opts: ['꼭지를 랩으로 감싼다', '비닐봉지 밀봉', '냉장실에', '물에 담근다'], a: 0,
    fact: '꼭지에서 나오는 숙성가스를 랩으로 막으면 며칠 더 가요. 냉장하면 껍질이 까매져요!', accept: ['꼭지', '랩'] },
  { q: '라면 면발을 더 쫄깃하게 하려면?', opts: ['끓는 물에 면 먼저', '찬물부터', '설탕 추가', '뚜껑 꼭 닫기'], a: 0,
    fact: '충분히 끓는 물에 면을 먼저 넣어야 표면이 빨리 익어 쫄깃해요!', accept: ['끓는', '면 먼저', '면먼저'] },
  { q: '깎은 사과의 갈변을 막는 것은?', opts: ['옅은 소금물', '뜨거운 물', '식용유', '밀가루'], a: 0,
    fact: '소금물(또는 설탕물)에 잠깐 담그면 산화를 늦춰 갈변을 막아요!', accept: ['소금물', '소금'] },
  { q: '우유 거품을 풍성하게 내려면?', opts: ['차가운 우유로', '뜨겁게 끓여', '물을 섞어', '오래 둔 우유'], a: 0,
    fact: '차가운 우유가 거품이 더 곱고 오래가요. 카페라테 거품의 비밀!', accept: ['차가운', '찬', '냉장'] },
  { q: '버섯을 보관할 때 좋은 것은?', opts: ['종이봉투', '비닐 밀봉', '물에 담가', '냉동만'], a: 0,
    fact: '버섯은 습기에 약해요. 종이봉투가 수분을 적당히 흡수해 더 오래가요!', accept: ['종이'] },
  { q: '빵을 가장 오래 신선하게 두는 곳은?', opts: ['냉동실', '냉장실', '실온 봉지', '전자레인지 안'], a: 0,
    fact: '냉장은 빵 노화를 오히려 빠르게 해요. 냉동 후 그때그때 데우면 갓 구운 맛!', accept: ['냉동', '얼'] },
];

let Q = null;
const COUNT = 7;

export function gameQuiz() {
  const ui = gameUI();
  if (isListening()) stopListen();
  const list = [...POOL].sort(() => Math.random() - 0.5).slice(0, COUNT);
  Q = { list, idx: 0, score: 0, correct: 0, t0: 0, locked: false };
  render();
}

function render() {
  const ui = gameUI();
  const it = Q.list[Q.idx];
  Q.t0 = performance.now(); Q.locked = false;
  const voiceTip = canListen ? '🎤 정답을 말하거나 탭하세요' : '정답을 탭하세요';
  ui.openSheet(`
    <div class="g-hubhead"><h2 style="margin:0">🧠 냉장고 상식 퀴즈</h2>
      <button class="btn btn-sm" onclick="UI.closeSheet()">✕</button></div>
    <div class="qz-prog"><span style="width:${(Q.idx) / COUNT * 100}%"></span></div>
    <p class="sub" style="text-align:center;margin:6px 0">${Q.idx + 1} / ${COUNT} · ${voiceTip}</p>
    <div class="qz-q">${it.q}</div>
    <div class="qz-opts" id="qz-opts">
      ${it.opts.map((o, i) => `<button class="qz-opt" data-i="${i}" onclick="UI.quizPick(${i})">${o}</button>`).join('')}
    </div>
    <div class="g-heard" id="qz-heard">${canListen ? '듣고 있어요…' : ''}</div>`);
  if (canListen) {
    startListen(heard, (on, why) => { if (why === 'denied') { const h = document.getElementById('qz-heard'); if (h) h.textContent = '(음성 인식 꺼짐 — 탭으로 진행)'; } });
  }
}
function heard(t) {
  if (!Q || Q.locked) return;
  const el = document.getElementById('qz-heard'); if (el) el.textContent = `"${t}"`;
  const bare = t.replace(/\s/g, '');
  const it = Q.list[Q.idx];
  // 음성이 정답 키워드/선택지 텍스트를 포함하면 그 선택지로
  let pick = -1;
  it.opts.forEach((o, i) => { if (bare.includes(o.replace(/\s/g, '').slice(0, 3)) || (it.a === i && it.accept.some((a) => bare.includes(a)))) pick = i; });
  if (pick >= 0) pickAnswer(pick);
}

export function quizPick(i) { pickAnswer(i); }

function pickAnswer(i) {
  if (!Q || Q.locked) return;
  Q.locked = true;
  stopListen();
  const it = Q.list[Q.idx];
  const correct = i === it.a;
  document.querySelectorAll('.qz-opt').forEach((b) => {
    const bi = +b.dataset.i;
    if (bi === it.a) b.classList.add('right');
    else if (bi === i) b.classList.add('wrong');
    b.onclick = null;
  });
  if (correct) {
    const speed = Math.max(0, 50 - Math.round((performance.now() - Q.t0) / 100));
    Q.score += 100 + speed; Q.correct += 1;
    chord([523, 659, 880]); buzz(12);
    setTimeout(() => reveal(true), 650);
  } else {
    beep(180, 0.18, 'square', 0.1); buzz([30, 30]);
    setTimeout(() => reveal(false), 650);
  }
}
function reveal(correct) {
  const ui = gameUI();
  const it = Q.list[Q.idx];
  ui.openSheet(`
    <h2>${correct ? '⭕ 정답!' : '❌ 아쉬워요'}</h2>
    <div class="card flat" style="padding:18px">
      <b>${it.q}</b>
      <p style="margin:8px 0 0;color:var(--green);font-weight:800">정답: ${it.opts[it.a]}</p>
      ${correct ? `<p class="hint" style="margin:8px 0 0">💡 ${it.fact}</p>` : ''}
    </div>
    ${correct ? `<div class="btn-row"><button class="btn btn-primary btn-block" onclick="UI.quizNext()">다음 →</button></div>`
      : `<p class="sub" style="margin-top:12px">정답의 <b>재미있는 이유</b>가 궁금하면 광고를 보고 확인하거나, 그냥 넘어갈 수 있어요</p>
         <div class="btn-row" style="flex-direction:column">
           <button class="btn btn-accent btn-block" onclick="UI.quizReveal()">📺 광고 보고 이유 보기</button>
           <button class="btn btn-block" onclick="UI.quizNext()">스킵하고 다음 →</button>
         </div>`}`);
}
export function quizReveal() {
  const ui = gameUI();
  const it = Q.list[Q.idx];
  ui.playAd({
    note: '광고 후 정답의 이유를 알려드려요',
    onComplete: (btn) => {
      btn.className = 'btn btn-block btn-primary';
      btn.textContent = '✅ 확인 — 다음으로';
      btn.disabled = false;
      btn.onclick = () => {
        ui.openSheet(`<h2>💡 그래서 정답은…</h2>
          <div class="card flat" style="padding:18px"><b>${it.opts[it.a]}</b>
            <p class="hint" style="margin:8px 0 0">${it.fact}</p></div>
          <div class="btn-row"><button class="btn btn-primary btn-block" onclick="UI.quizNext()">다음 →</button></div>`);
      };
    },
  });
}
export function quizNext() {
  if (!Q) return;
  Q.idx += 1;
  if (Q.idx >= Q.list.length) { endQuiz(); return; }
  render();
}
function endQuiz() {
  const s = Q; Q = null; stopListen();
  finishGame('quiz', '🧠 냉장고 상식 퀴즈', s.score, `${s.score}점`,
    'UI.gameQuiz()', { extra: `${COUNT}문제 중 ${s.correct}개 정답` });
}
