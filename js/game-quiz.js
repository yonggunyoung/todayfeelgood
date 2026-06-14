// 🧠 냉장고 상식 퀴즈 — 검증된 음식·보관 상식. 음성/탭으로 정답.
// 궁금증 설계: 플레이 중엔 '이유'를 감추고, 끝나면 [광고 한 번 → 전 문항 정답·이유 일괄 공개].
import { gameUI, beep, chord, buzz, finishGame } from './games.js';
import { canListen, startListen, stopListen, isListening } from './voice.js';

// {cat, q, opts(첫 항목이 정답), fact, accept[]} — opts는 매 판 셔플되어 표시됨
const POOL = [
  { cat: '보관', q: '냉장고에 넣으면 오히려 맛·식감이 나빠지는 것은?', opts: ['감자', '우유', '계란', '버터'], fact: '감자는 냉장하면 전분이 당으로 바뀌어 단맛이 돌고 식감이 변해요. 서늘한 실온이 정답!', accept: ['감자'] },
  { cat: '신기', q: '꿀이 수백 년 지나도 잘 안 상하는 이유는?', opts: ['수분이 거의 없어서', '설탕이라서', '차가워서', '공기가 없어서'], fact: '꿀은 수분이 매우 적고 약산성이라 세균이 못 살아요. 고대 무덤의 꿀도 먹을 수 있었대요!', accept: ['수분', '물'] },
  { cat: '신선', q: '달걀이 신선한지 물에 넣어 확인하면?', opts: ['가라앉으면 신선', '뜨면 신선', '옆으로 서면 신선', '거품 나면 신선'], fact: '오래될수록 안쪽 공기주머니가 커져 떠요. 가라앉아 눕는 달걀이 가장 신선!', accept: ['가라앉', '바닥', '아래'] },
  { cat: '신기', q: '감자 옆에 두면 싹을 늦춰주는 과일은?', opts: ['사과', '바나나', '포도', '귤'], fact: '사과의 에틸렌이 감자 싹을 억제해요. 단, 양파와는 같이 두면 서로 빨리 상해요!', accept: ['사과'] },
  { cat: '보관', q: '토마토를 가장 맛있게 두는 곳은?', opts: ['실온', '냉장실', '냉동실', '물속'], fact: '토마토는 냉장하면 단맛과 향이 떨어져요. 꼭지를 아래로 실온 보관이 정답!', accept: ['실온', '상온', '바깥'] },
  { cat: '조리', q: '고기를 안전하고 빠르게 해동하려면?', opts: ['밀봉해 찬물에', '뜨거운 물에', '실온에 오래', '햇빛에'], fact: '뜨거운 물·실온은 겉만 익거나 세균이 번식해요. 밀봉해 찬물이 빠르고 안전!', accept: ['찬물', '차가운', '냉수'] },
  { cat: '보관', q: '갓 지은 밥을 가장 맛있게 보관하려면?', opts: ['한 김 식혀 바로 냉동', '냉장실에 천천히', '실온 보관', '물을 부어'], fact: '냉장이 밥 노화(푸석해짐)가 제일 빨라요. 따뜻할 때 소분해 냉동이 최고!', accept: ['냉동', '얼'] },
  { cat: '조리', q: '양파 썰 때 눈물을 줄이려면?', opts: ['썰기 전 냉장', '뜨겁게 데우기', '설탕 뿌리기', '말리기'], fact: '차가우면 눈물 유발 성분이 덜 날아가요. 15분 냉장 후 썰면 편해요!', accept: ['냉장', '차갑', '냉동'] },
  { cat: '보관', q: '바나나를 더 오래 두려면?', opts: ['꼭지를 랩으로 감싸기', '비닐봉지 밀봉', '냉장실에', '물에 담그기'], fact: '꼭지에서 나오는 숙성가스를 랩으로 막으면 며칠 더 가요. 냉장하면 껍질이 까매져요!', accept: ['꼭지', '랩'] },
  { cat: '조리', q: '라면 면발을 더 쫄깃하게 하려면?', opts: ['끓는 물에 면 먼저', '찬물부터', '설탕 추가', '뚜껑 꼭 닫기'], fact: '충분히 끓는 물에 면을 먼저 넣어야 표면이 빨리 익어 쫄깃해요!', accept: ['끓는', '면 먼저', '면먼저'] },
  { cat: '조리', q: '깎은 사과의 갈변을 막는 것은?', opts: ['옅은 소금물', '뜨거운 물', '식용유', '밀가루'], fact: '소금물(또는 설탕물)에 잠깐 담그면 산화를 늦춰 갈변을 막아요!', accept: ['소금물', '소금'] },
  { cat: '신기', q: '우유 거품을 풍성하게 내려면?', opts: ['차가운 우유로', '뜨겁게 끓여', '물을 섞어', '오래 둔 우유'], fact: '차가운 우유가 거품이 더 곱고 오래가요. 카페라테 거품의 비밀!', accept: ['차가운', '찬', '냉장'] },
  { cat: '보관', q: '버섯 보관에 가장 좋은 것은?', opts: ['종이봉투', '비닐 밀봉', '물에 담가', '냉동만'], fact: '버섯은 습기에 약해요. 종이봉투가 수분을 적당히 흡수해 더 오래가요!', accept: ['종이'] },
  { cat: '보관', q: '빵을 가장 오래 신선하게 두는 곳은?', opts: ['냉동실', '냉장실', '실온 봉지', '전자레인지 안'], fact: '냉장은 빵 노화를 오히려 빠르게 해요. 냉동 후 그때그때 데우면 갓 구운 맛!', accept: ['냉동', '얼'] },
  { cat: '미생물', q: '냉동실에 넣은 세균은?', opts: ['죽지 않고 멈춰 있다', '모두 죽는다', '더 빨리 늘어난다', '사라진다'], fact: '냉동은 증식을 멈출 뿐 살균이 아니에요. 해동하면 다시 활동하니 재냉동은 위험!', accept: ['멈', '죽지'] },
  { cat: '보관', q: '냉장고에서 보통 가장 차가운 칸은?', opts: ['안쪽 아래 칸', '문쪽 칸', '맨 위 앞쪽', '채소칸'], fact: '찬 공기는 아래로 내려가요. 문쪽은 여닫을 때 온도 변화가 커서 가장 덜 차가워요!', accept: ['아래', '안쪽', '뒤'] },
  { cat: '보관', q: '온도 변화가 커서 문쪽 칸에 두면 아쉬운 것은?', opts: ['우유·계란', '생수', '탄산음료', '잼'], fact: '우유·계란은 온도에 민감해 안쪽 칸이 좋아요. 문쪽은 음료·소스류가 적당!', accept: ['우유', '계란'] },
  { cat: '미생물', q: '뜨거운 국을 바로 냉장고에 넣으면?', opts: ['주변 음식 온도가 올라간다', '전기를 아낀다', '맛이 좋아진다', '아무 문제 없다'], fact: '큰 덩어리는 내부 온도를 올려 다른 음식을 상하게 해요. 어느 정도 식혀 소분해 넣으세요!', accept: ['올라', '주변'] },
  { cat: '신선', q: '상추를 오래 아삭하게 보관하려면?', opts: ['물기 빼고 키친타월과 밀폐', '물에 담가두기', '그대로 봉지에', '냉동실에'], fact: '물기는 무름의 원인! 물기를 턴 뒤 키친타월로 감싸 밀폐하면 오래가요.', accept: ['키친타월', '물기'] },
  { cat: '신기', q: '꿀이 굳어 결정이 생겼다면?', opts: ['정상 — 중탕하면 풀림', '상한 것', '벌레가 생긴 것', '가짜 꿀'], fact: '결정화는 자연스러운 현상이에요. 따뜻한 물에 중탕하면 다시 맑아져요!', accept: ['정상', '중탕'] },
  { cat: '미생물', q: '감자에 초록색·싹이 보이면?', opts: ['싹과 초록 부분을 도려낸다', '그냥 먹는다', '물에 씻으면 OK', '익히면 안전'], fact: '싹·초록 부분엔 솔라닌 독소가 있어요. 많으면 폐기, 조금이면 깊게 도려내세요.', accept: ['도려', '싹'] },
  { cat: '조리', q: '전자레인지에 넣으면 안 되는 것은?', opts: ['금속 용기', '유리 그릇', '도자기', '전용 플라스틱'], fact: '금속은 불꽃(스파크)을 일으켜요. 전자레인지엔 유리·도자기·전용 용기를!', accept: ['금속', '쇠', '포일', '은박'] },
  { cat: '신기', q: '아보카도를 빨리 익히려면?', opts: ['사과·바나나와 함께 봉지에', '냉장실에', '물에 담가', '햇빛에'], fact: '사과·바나나의 에틸렌이 숙성을 도와요. 봉지에 같이 넣어두면 하루이틀 빨라져요!', accept: ['사과', '바나나', '봉지'] },
  { cat: '미생물', q: '한 번 해동한 고기를 다시 얼리면?', opts: ['세균·품질 위험이 커진다', '맛이 더 좋아진다', '아무 문제 없다', '더 오래 간다'], fact: '해동 중 번식한 세균이 재냉동으로 죽지 않아요. 먹을 만큼만 소분해 얼리세요!', accept: ['위험', '안 좋', '커진'] },
];
const COUNT = 8;
let Q = null;

function shuffle(a) { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [r[i], r[j]] = [r[j], r[i]]; } return r; }

export function gameQuiz() {
  if (isListening()) stopListen();
  const list = shuffle(POOL).slice(0, COUNT).map((q) => {
    const correct = q.opts[0];
    const disp = shuffle(q.opts);
    return { ...q, disp, aIdx: disp.indexOf(correct), correctText: correct };
  });
  Q = { list, idx: 0, score: 0, correct: 0, t0: 0, locked: false, results: [] };
  render();
}

function render() {
  const ui = gameUI();
  const it = Q.list[Q.idx];
  Q.t0 = performance.now(); Q.locked = false;
  const voiceTip = canListen ? '🎤 정답을 말하거나 탭' : '정답을 탭하세요';
  ui.openSheet(`
    <div class="gx gx-quiz">
      <div class="gx-bar"><b class="gx-title">🧠 냉장고 상식</b><button class="gx-x" onclick="UI.closeSheet()">✕</button></div>
      <div class="qz-prog"><span style="width:${Q.idx / COUNT * 100}%"></span></div>
      <div class="qz-meta"><span class="qz-cat">${it.cat}</span><span>${Q.idx + 1} / ${COUNT} · ${voiceTip}</span></div>
      <div class="qz-q">${it.q}</div>
      <div class="qz-opts" id="qz-opts">
        ${it.disp.map((o, i) => `<button class="qz-opt" data-i="${i}" onclick="UI.quizPick(${i})">${o}</button>`).join('')}
      </div>
      <div class="qz-heard" id="qz-heard">${canListen ? '듣고 있어요…' : ''}</div>
    </div>`);
  if (canListen) startListen(heard, (on, why) => { if (why === 'denied') { const h = document.getElementById('qz-heard'); if (h) h.textContent = '(음성 꺼짐 — 탭으로)'; } });
}
function heard(t) {
  if (!Q || Q.locked) return;
  const el = document.getElementById('qz-heard'); if (el) el.textContent = `"${t}"`;
  const bare = t.replace(/\s/g, '');
  const it = Q.list[Q.idx];
  let pick = -1;
  it.disp.forEach((o, i) => { if (bare.includes(o.replace(/\s/g, '').slice(0, 3))) pick = i; });
  if (pick < 0 && it.accept.some((a) => bare.includes(a))) pick = it.aIdx;
  if (pick >= 0) pickAnswer(pick);
}
export function quizPick(i) { pickAnswer(i); }

function pickAnswer(i) {
  if (!Q || Q.locked) return;
  Q.locked = true; stopListen();
  const it = Q.list[Q.idx];
  const correct = i === it.aIdx;
  Q.results[Q.idx] = correct;
  document.querySelectorAll('.qz-opt').forEach((b) => {
    const bi = +b.dataset.i;
    if (bi === it.aIdx) b.classList.add('right');
    else if (bi === i) b.classList.add('wrong');
    b.onclick = null;
  });
  if (correct) { const speed = Math.max(0, 50 - Math.round((performance.now() - Q.t0) / 100)); Q.score += 100 + speed; Q.correct += 1; chord([523, 659, 880]); buzz(12); }
  else { beep(180, 0.18, 'square', 0.1); buzz([30, 30]); }
  // 이유는 감춘다 → 궁금증. 정답 위치만 잠깐 보여주고 다음.
  setTimeout(() => { if (Q.idx + 1 >= Q.list.length) endQuiz(); else { Q.idx += 1; render(); } }, 800);
}

function endQuiz() {
  const ui = gameUI();
  const grade = Q.correct >= 7 ? '🏆 척척박사' : Q.correct >= 5 ? '👍 제법인데요' : Q.correct >= 3 ? '🙂 한 끗 부족' : '🌱 새내기';
  ui.openSheet(`
    <div class="gx gx-quiz">
      <div class="gx-bar"><b class="gx-title">🧠 결과</b><button class="gx-x" onclick="UI.openGames()">←</button></div>
      <div style="text-align:center;padding:14px 8px">
        <div style="font-size:2.6rem">${grade.split(' ')[0]}</div>
        <b style="color:#5ef0b0;font-size:1.2rem;display:block;margin-top:6px">${grade.split(' ').slice(1).join(' ')}</b>
        <p style="color:#cdbde8;margin:8px 0 0">${COUNT}문제 중 <b style="color:#fff">${Q.correct}개</b> 정답 · ${Q.score.toLocaleString()}점</p>
      </div>
      <div class="qz-curious">
        <div style="font-size:1.6rem">🤔</div>
        <b>왜 그게 정답일까?</b>
        <p>${COUNT}문제의 <b>정답과 신기한 이유</b>를 광고 한 번 보고 한꺼번에 확인하세요.</p>
        <button class="gx-btn-go" onclick="UI.quizRevealAll()">📺 광고 보고 정답·이유 모아보기</button>
        <button class="qz-skip" onclick="UI.quizFinish()">괜찮아요, 점수만 받을게요</button>
      </div>
    </div>`);
}
export function quizRevealAll() {
  const ui = gameUI();
  ui.playAd({
    reward: '전 문항 정답·이유 공개',
    note: '광고 후 전 문항 정답·이유를 한 번에 보여드려요',
    onComplete: (btn) => {
      btn.className = 'btn btn-block btn-primary'; btn.textContent = '✅ 정답·이유 공개!'; btn.disabled = false;
      btn.onclick = () => showAnswerSheet();
      setTimeout(showAnswerSheet, 500);
    },
  });
}
function showAnswerSheet() {
  const ui = gameUI();
  const rows = Q.list.map((it, i) => `
    <div class="qz-ans ${Q.results[i] ? 'ok' : 'no'}">
      <div class="qz-ans-h"><span>${Q.results[i] ? '✅' : '❌'}</span><b>${it.q}</b></div>
      <div class="qz-ans-a">정답: <b>${it.correctText}</b></div>
      <p class="qz-ans-f">💡 ${it.fact}</p>
    </div>`).join('');
  ui.openSheet(`
    <div class="gx gx-quiz">
      <div class="gx-bar"><b class="gx-title">💡 정답·이유 모아보기</b><button class="gx-x" onclick="UI.quizFinish()">✕</button></div>
      <div class="qz-anslist">${rows}</div>
      <button class="gx-btn-go" style="margin:6px 12px 12px;width:calc(100% - 24px)" onclick="UI.quizFinish()">완료 — 점수 받기</button>
    </div>`);
}
export function quizFinish() {
  const s = Q; Q = null; stopListen();
  finishGame('quiz', '🧠 냉장고 상식 퀴즈', s.score, `${s.score.toLocaleString()}점`,
    'UI.gameQuiz()', { extra: `${COUNT}문제 중 ${s.correct}개 정답` });
}
// (하위호환) 기존 핸들러 이름 유지
export function quizNext() { quizFinish(); }
export function quizReveal() { quizRevealAll(); }
