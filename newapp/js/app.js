// 오늘 기분 — 임시 기능 셸 로직(디자인 시안 도착 시 뷰만 교체).
// 데모 탭카운터 제거 → 기분 1탭 → 오늘의 노래 → 카드 흐름으로 연결(증분1, D7).
import { MOODS, moodById } from './data/moods.js';
import { recommendSong } from './recommend.js';
import { store, recordMood, todayKey } from './store.js';

let state = store.load();              // 상태 단일 출처(D6)
const $ = (id) => document.getElementById(id);

function formatDate(key) {
  const d = new Date(`${key}T00:00:00`);
  const wd = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${wd})`;
}

function render() {
  const key = todayKey();
  const dl = $('dateline');
  if (dl) dl.textContent = formatDate(key) + (state.streak ? `  ·  🔥 ${state.streak}일` : '');
  renderPicker(key);
  const today = state.days[key];
  if (today) renderResult(today.mood, key);
  else { const r = $('result'); if (r) r.hidden = true; }
}

function renderPicker(key) {
  const picker = $('moodPicker');
  if (!picker) return;
  const current = state.days[key] && state.days[key].mood;
  picker.innerHTML = '';
  for (const m of MOODS) {
    const b = document.createElement('button');
    b.className = 'mood' + (current === m.id ? ' is-on' : '');
    b.type = 'button';
    b.textContent = m.ko;
    b.style.setProperty('--mood', m.color);
    b.addEventListener('click', () => pick(m.id));
    picker.appendChild(b);
  }
}

function pick(moodId) {
  state = recordMood(state, moodId);   // 입력 불신·단조증가 가드 포함(D4/D5)
  store.save(state);
  render();
}

function renderResult(moodId, key) {
  const result = $('result');
  if (!result) return;
  const m = moodById(moodId);
  const song = recommendSong(moodId, { dateKey: key });   // None-safe(D3)
  result.hidden = false;
  result.innerHTML = '';

  const mood = document.createElement('p');
  mood.className = 'result__mood';
  mood.textContent = `오늘의 나 = ${m ? m.ko : moodId}`;
  if (m) mood.style.color = m.color;
  result.appendChild(mood);

  const label = document.createElement('p');
  label.className = 'result__label';
  result.appendChild(label);

  if (song.source === 'none') {
    label.textContent = song.title;     // 안전 폴백 문구
    return;
  }
  label.textContent = '오늘의 노래';

  // textContent로만 구성(데이터도 불신 — XSS 방지, 원칙1)
  const a = document.createElement('a');
  a.className = 'song';
  a.href = song.url;
  a.target = '_blank';
  a.rel = 'noopener';
  const title = document.createElement('strong'); title.textContent = song.title;
  const artist = document.createElement('span'); artist.textContent = song.artist;
  const play = document.createElement('em'); play.textContent = '▶ 듣기';
  a.append(title, artist, play);
  result.appendChild(a);
}

// ── PWA 설치 프롬프트 ──
let deferredPrompt = null;
const installBtn = $('installBtn');
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); deferredPrompt = e; if (installBtn) installBtn.hidden = false;
});
if (installBtn) installBtn.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null; installBtn.hidden = true;
});

// ── 서비스워커(오프라인 앱 셸) ──
const swState = $('swState');
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(() => { if (swState) swState.textContent = '✓ 오프라인 사용 가능'; })
      .catch(() => { if (swState) swState.textContent = '오프라인 캐시 미지원'; });
  });
} else if (swState) {
  swState.textContent = '오프라인 캐시 미지원 브라우저';
}

render();
