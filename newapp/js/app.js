// 오늘 기분 — 디자인 시안 연결. 마스코트 렌더 + 기분 1탭 → 오늘의 노래.
// 로직(store/recommend/가드)은 그대로, 뷰만 시안 구조로.
import { MOODS, moodById } from './data/moods.js';
import { recommendSong } from './recommend.js';
import { store, recordMood, todayKey } from './store.js';
import { mascotSVG } from './mascot.js';

let state = store.load();
const $ = (id) => document.getElementById(id);

const WD = ['일', '월', '화', '수', '목', '금', '토'];
function formatDate(key) {
  const d = new Date(`${key}T00:00:00`);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 <b>${WD[d.getDay()]}요일</b>`;
}

function selectedMood() {
  const t = state.days[todayKey()];
  return t ? t.mood : null;
}

function render() {
  const key = todayKey();
  $('dateline').innerHTML = formatDate(key);
  const sel = selectedMood();

  // streak
  const streak = $('streak');
  if (state.streak > 0) { streak.hidden = false; $('streakN').textContent = state.streak; }
  else streak.hidden = true;

  // hero (선택된 기분 or 기본 happy)
  $('hero').innerHTML = mascotSVG(sel || 'happy', false);
  tintHalo(sel);

  // 타이틀: 선택 후엔 부드럽게 전환
  if (sel) { $('title').textContent = '오늘도 잘 기록했어요'; $('sub').textContent = '내일 또 가볍게 톡 해요.'; }

  renderPicker(sel);
  if (sel) renderResult(sel, key); else $('result').hidden = true;
}

function renderPicker(sel) {
  const picker = $('moodPicker');
  picker.innerHTML = '';
  for (const m of MOODS) {
    const b = document.createElement('button');
    b.className = 'mood' + (sel === m.id ? ' is-on' : '');
    b.type = 'button';
    b.setAttribute('data-mood', m.id);
    const chip = document.createElement('div'); chip.className = 'mood__chip';
    const span = document.createElement('span'); span.innerHTML = mascotSVG(m.id, true);
    chip.appendChild(span);
    const lab = document.createElement('div'); lab.className = 'mood__label'; lab.textContent = m.ko;
    b.append(chip, lab);
    b.addEventListener('click', () => pick(m.id));
    picker.appendChild(b);
  }
}

function pick(moodId) {
  state = recordMood(state, moodId);   // 입력 불신·단조증가 가드(D4/D5)
  store.save(state);
  render();
}

function renderResult(moodId, key) {
  const result = $('result');
  const m = moodById(moodId);
  const song = recommendSong(moodId, { dateKey: key });   // None-safe(D3)
  result.hidden = false;
  result.innerHTML = '';
  result.style.padding = '16px';

  const head = document.createElement('div');
  head.className = 'result__head';
  const lab = document.createElement('div'); lab.className = 'lab'; lab.textContent = '오늘의 나는';
  const name = document.createElement('div'); name.className = 'result__mood';
  name.textContent = m ? m.ko : moodId;
  if (m) name.style.color = m.color;
  head.append(lab, name);
  result.appendChild(head);

  if (song.source === 'none') {
    const p = document.createElement('p'); p.className = 'embed-note'; p.textContent = song.title;
    result.appendChild(p);
  } else {
    const card = document.createElement('div'); card.className = 'song';
    const art = document.createElement('div'); art.className = 'song__art';
    art.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="#FF6F50"><path d="M8 5v14l11-7z"/></svg>';
    const meta = document.createElement('div'); meta.className = 'song__meta';
    const sl = document.createElement('div'); sl.className = 'song__lab'; sl.textContent = '오늘의 노래';
    const st = document.createElement('div'); st.className = 'song__title'; st.textContent = song.title;
    const sa = document.createElement('div'); sa.className = 'song__artist'; sa.textContent = song.artist;
    meta.append(sl, st, sa);
    const play = document.createElement('a'); play.className = 'song__play';
    play.href = song.url; play.target = '_blank'; play.rel = 'noopener';
    play.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z"/></svg>';
    card.append(art, meta, play);
    result.appendChild(card);
    const note = document.createElement('div'); note.className = 'embed-note';
    note.textContent = '▶ YouTube Music · 링크아웃';
    result.appendChild(note);
  }

  const share = document.createElement('button');
  share.className = 'share';
  share.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M12 15V3M8 7l4-4 4 4"/></svg> 기분 카드 공유하기';
  share.addEventListener('click', () => { /* 증분5: 공유 카드 생성 */ });
  result.appendChild(share);
}

function tintHalo(mood) {
  const m = moodById(mood);
  const halo = $('halo');
  if (!m) { halo.style.background = ''; return; }
  halo.style.background = `radial-gradient(circle, ${m.color}59, ${m.color}1f 45%, transparent 70%)`;
}

// ── PWA 설치 ──
let deferredPrompt = null;
const installBtn = $('installBtn');
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; if (installBtn) installBtn.hidden = false; });
if (installBtn) installBtn.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; installBtn.hidden = true;
});

// ── 서비스워커 ──
const swState = $('swState');
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(() => { if (swState) swState.textContent = '✓ 오프라인 사용 가능'; })
      .catch(() => { if (swState) swState.textContent = '오프라인 캐시 미지원'; });
  });
} else if (swState) { swState.textContent = '오프라인 캐시 미지원 브라우저'; }

render();
