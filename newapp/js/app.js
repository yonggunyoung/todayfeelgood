// 오늘 기분 — 라이브 뷰 연결 (시안 + 팀 평결: 위계·접근성·구름이 보이스).
// 로직(store/recommend/가드)은 불변, 뷰만.
import { MOODS, moodById } from './data/moods.js';
import { recommendSong } from './recommend.js';
import { store, recordMood, todayKey } from './store.js';
import { mascotSVG } from './mascot.js';

let state = store.load();
const $ = (id) => document.getElementById(id);
const WD = ['일', '월', '화', '수', '목', '금', '토'];
const sel = () => { const t = state.days[todayKey()]; return t ? t.mood : null; };

function render() {
  const key = todayKey(), m = sel();
  const d = new Date(`${key}T00:00:00`);
  $('dateline').innerHTML = `${d.getMonth() + 1}월 ${d.getDate()}일 <b>${WD[d.getDay()]}요일</b>`;

  const streak = $('streak');
  if (state.streak > 0) { streak.hidden = false; $('streakN').textContent = state.streak; } else streak.hidden = true;

  $('app').dataset.mood = m || 'happy';
  $('hero').innerHTML = mascotSVG(m || 'happy', false);

  if (m) { $('title').textContent = '구름이가 마음에 들었나 봐요'; $('sub').textContent = '내일의 날씨도 들으러 와요'; }

  renderPicker(m);
  if (m) renderResult(m, key); else $('result').hidden = true;
}

function renderPicker(cur) {
  const picker = $('moodPicker');
  picker.innerHTML = '';
  for (const mo of MOODS) {
    const b = document.createElement('button');
    b.className = 'mood' + (cur === mo.id ? ' is-on' : '');
    b.type = 'button';
    b.setAttribute('data-mood', mo.id);
    b.setAttribute('aria-label', `${mo.ko} 선택`);
    b.setAttribute('aria-pressed', cur === mo.id ? 'true' : 'false');
    const chip = document.createElement('div'); chip.className = 'mood__chip';
    const span = document.createElement('span'); span.innerHTML = mascotSVG(mo.id, true);
    chip.appendChild(span);
    const lab = document.createElement('div'); lab.className = 'mood__label'; lab.textContent = mo.ko;
    b.append(chip, lab);
    b.addEventListener('click', () => pick(mo.id));
    picker.appendChild(b);
  }
}

function pick(moodId) {
  state = recordMood(state, moodId);   // 입력 불신·단조증가 가드(D4/D5)
  store.save(state);
  render();
}

function svgEl(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; }

function renderResult(moodId, key) {
  const result = $('result');
  const mo = moodById(moodId);
  const song = recommendSong(moodId, { dateKey: key });   // None-safe(D3)
  result.hidden = false; result.dataset.mood = moodId; result.innerHTML = '';

  const head = document.createElement('div'); head.className = 'result__head';
  const lab = document.createElement('div'); lab.className = 'lab'; lab.textContent = '오늘 구름이가 읽은 마음';
  const name = document.createElement('div'); name.className = 'result__mood'; name.textContent = mo ? mo.ko : moodId;
  head.append(lab, name); result.appendChild(head);

  if (song.source === 'none') {
    const p = document.createElement('p'); p.className = 'gauge__sub'; p.style.textAlign = 'center';
    p.textContent = '오늘은 구름이도 조용히 쉬는 날';
    result.appendChild(p);
  } else {
    const a = document.createElement('a'); a.className = 'song'; a.href = song.url; a.target = '_blank'; a.rel = 'noopener';
    a.setAttribute('aria-label', `${song.title} ${song.artist} 유튜브 뮤직에서 듣기`);
    const art = document.createElement('div'); art.className = 'song__art'; art.style.background = '#fff';
    art.appendChild(svgEl('<svg width="26" height="26" viewBox="0 0 24 24" fill="var(--coral)" aria-hidden="true"><path d="M9 18V5l10-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/></svg>'));
    const meta = document.createElement('div'); meta.className = 'song__meta';
    const sl = document.createElement('div'); sl.className = 'song__lab'; sl.textContent = '구름이가 골라준 한 곡';
    const st = document.createElement('div'); st.className = 'song__title'; st.textContent = song.title;
    const sa = document.createElement('div'); sa.className = 'song__artist'; sa.textContent = song.artist;
    meta.append(sl, st, sa);
    const play = document.createElement('div'); play.className = 'song__play';
    play.appendChild(svgEl('<svg width="18" height="18" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>'));
    a.append(art, meta, play); result.appendChild(a);

    if (mo && mo.reasons) {
      const wrap = document.createElement('div'); wrap.className = 'reasons';
      const why = document.createElement('div'); why.className = 'why'; why.textContent = '구름이가 고른 이유';
      wrap.appendChild(why);
      mo.reasons.forEach((r) => { const c = document.createElement('span'); c.className = 'chip'; c.textContent = r; wrap.appendChild(c); });
      result.appendChild(wrap);
    }
  }

  const listen = document.createElement('button'); listen.type = 'button'; listen.className = 'btn btn--primary';
  listen.appendChild(svgEl('<svg width="18" height="18" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>'));
  listen.append('YouTube Music에서 듣기');
  if (song.source !== 'none') listen.addEventListener('click', () => window.open(song.url, '_blank', 'noopener'));
  result.appendChild(listen);

  const save = document.createElement('button'); save.type = 'button'; save.className = 'btn btn--ghost';
  save.textContent = '컬렉션에 담기';
  result.appendChild(save);   // 증분: 컬렉션
}

// ── PWA 설치 ──
let deferredPrompt = null;
const installBtn = $('installBtn');
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; if (installBtn) installBtn.hidden = false; });
if (installBtn) installBtn.addEventListener('click', async () => {
  if (!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; installBtn.hidden = true;
});

// ── 서비스워커 ──
const swState = $('swState');
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(() => { if (swState) swState.textContent = '오프라인에서도 열려요'; })
      .catch(() => { if (swState) swState.textContent = '오프라인 캐시 미지원'; });
  });
} else if (swState) { swState.textContent = '오프라인 캐시 미지원 브라우저'; }

render();
