// 오늘 기분 — 앱 라우터 + 홈/결과 + 온보딩 + 설정. 로직(store/recommend) 불변.
import { MOODS, moodById } from './data/moods.js';
import { recommendSong } from './recommend.js';
import { store, recordMood, todayKey } from './store.js';
import { mascotSVG } from './mascot.js';
import { openShareCard } from './share.js';
import { weatherHTML, collectionHTML } from './views.js';
import { openQuiz } from './quiz.js';
import { loadCatalog } from './catalog.js';

let state = store.load();
const $ = (s, r = document) => r.querySelector(s);
const view = () => document.getElementById('view');
const WD = ['일', '월', '화', '수', '목', '금', '토'];
const ONB_KEY = 'oneulgibun:onboarded';
const sel = () => { const t = state.days[todayKey()]; return t ? t.mood : null; };
function svgEl(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; }

const TABS = [
  ['home', '홈', '<path d="M4 11l8-7 8 7M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9"/>'],
  ['weather', '날씨', '<circle cx="8" cy="9" r="3.2"/><path d="M11 16h6a3 3 0 0 0 0-6 4.5 4.5 0 0 0-8.6-1"/>'],
  ['collection', '컬렉션', '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>'],
  ['more', '더보기', '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>'],
];

function renderTabs(active) {
  const bar = document.getElementById('tabbar');
  bar.innerHTML = '';
  for (const [id, label, path] of TABS) {
    const b = document.createElement('button');
    b.className = 'tab' + (id === active ? ' is-on' : '');
    b.type = 'button'; b.setAttribute('aria-label', label);
    if (id === active) b.setAttribute('aria-current', 'page');
    b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg><span>${label}</span>`;
    b.addEventListener('click', () => { location.hash = '#/' + id; });
    bar.appendChild(b);
  }
}

// ── 홈 ──
function renderHome() {
  const m = sel(), key = todayKey();
  const d = new Date(`${key}T00:00:00`);
  const v = view();
  v.innerHTML = `<div class="v v-home" data-mood="${m || 'happy'}">
    <div class="halo"></div>
    <div class="bar">
      <div class="bar__date">${d.getMonth() + 1}월 ${d.getDate()}일 <b>${WD[d.getDay()]}요일</b></div>
      <div class="streak" ${state.streak > 0 ? '' : 'hidden'}>
        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3c2 3 4 4.5 4 8a4 4 0 1 1-8 0c0-1.5.6-2.6 1.4-3.6.3 1.2 1 1.8 1.8 1.8C12 9 11 6.5 12 3Z" fill="var(--coral)"/></svg>
        <span>${state.streak}</span>일째
      </div>
    </div>
    <div class="head">
      <h1 class="title">${m ? '구름이가 마음에 들었나 봐요' : '오늘 구름이는<br>어떤 날씨일까요?'}</h1>
      <p class="sub">${m ? '내일의 날씨도 들으러 와요' : '기분을 톡 누르면 오늘의 노래가 와요'}</p>
    </div>
    <div class="hero"><div class="hero__m" id="hero" aria-hidden="true">${mascotSVG(m || 'happy', false)}</div></div>
    <div class="picker" id="moodPicker" role="group" aria-label="오늘의 기분 선택"></div>
    <div class="card gauge">
      <div class="gauge__top"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="5" fill="var(--happy)"/><g stroke="var(--happy)" stroke-width="1.6" stroke-linecap="round"><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></g></svg><span class="gauge__lab">지금 전국은 대체로 맑음</span></div>
      <p class="gauge__sub">행복한 사람이 제일 많아요</p>
      <div class="gauge__bar" aria-hidden="true"><i class="s-happy" style="flex:58"></i><i class="s-flutter" style="flex:16"></i><i class="s-calm" style="flex:14"></i><i class="s-blue" style="flex:8"></i><i class="s-angry" style="flex:4"></i></div>
    </div>
    <div class="card result" id="result" role="status" aria-live="polite" hidden></div>
  </div>`;

  // 피커
  const picker = $('#moodPicker', v);
  for (const mo of MOODS) {
    const b = document.createElement('button');
    b.className = 'mood' + (m === mo.id ? ' is-on' : '');
    b.type = 'button'; b.setAttribute('data-mood', mo.id);
    b.setAttribute('aria-label', `${mo.ko} 선택`); b.setAttribute('aria-pressed', m === mo.id ? 'true' : 'false');
    b.innerHTML = `<div class="mood__chip"><span>${mascotSVG(mo.id, true)}</span></div><div class="mood__label">${mo.ko}</div>`;
    b.addEventListener('click', () => pick(mo.id));
    picker.appendChild(b);
  }
  if (m) renderResult(m, key);
}

function pick(moodId) {
  state = recordMood(state, moodId);
  store.save(state);
  renderHome();
}

function ytEmbed(id) {
  const box = document.createElement('div'); box.className = 'ytlite';
  box.setAttribute('role', 'button'); box.tabIndex = 0; box.setAttribute('aria-label', '유튜브에서 재생');
  box.innerHTML = `<img class="ytlite__thumb" src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="" loading="lazy"><span class="ytlite__btn"><svg width="30" height="30" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></span>`;
  const go = () => { box.classList.add('on'); box.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen title="유튜브 재생"></iframe>`; };
  box.addEventListener('click', go);
  box.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
  return box;
}

function renderResult(moodId, key) {
  const result = document.getElementById('result');
  const mo = moodById(moodId), song = recommendSong(moodId, { dateKey: key, catalog: loadCatalog() });
  result.hidden = false; result.dataset.mood = moodId; result.innerHTML = '';

  const head = document.createElement('div'); head.className = 'result__head';
  head.innerHTML = `<div class="lab">오늘 구름이가 읽은 마음</div><div class="result__mood">${mo ? mo.ko : moodId}</div>`;
  result.appendChild(head);

  const addReasons = () => {
    if (mo && mo.reasons) {
      const w = document.createElement('div'); w.className = 'reasons';
      w.innerHTML = '<div class="why">구름이가 고른 이유</div>' + mo.reasons.map((r) => `<span class="chip">${r}</span>`).join('');
      result.appendChild(w);
    }
  };
  let listenUrl = '';

  if (song.source === 'none') {
    const p = document.createElement('p'); p.className = 'gauge__sub'; p.style.textAlign = 'center';
    p.textContent = '오늘은 구름이도 조용히 쉬는 날'; result.appendChild(p);
  } else if (song.youtubeId) {
    const lab = document.createElement('div'); lab.className = 'song__lab';
    lab.style.cssText = 'text-align:center;margin-bottom:10px;color:var(--cmi)';
    lab.textContent = '구름이가 골라준 한 곡'; result.appendChild(lab);
    result.appendChild(ytEmbed(song.youtubeId));
    const line = document.createElement('div'); line.className = 'song-line';
    line.innerHTML = '<span class="song-line__t"></span><span class="song-line__a"></span>';
    $('.song-line__t', line).textContent = song.title; $('.song-line__a', line).textContent = song.artist;
    result.appendChild(line); addReasons();
  } else {
    listenUrl = song.url || '';
    const a = document.createElement('a'); a.className = 'song'; a.href = listenUrl; a.target = '_blank'; a.rel = 'noopener';
    a.setAttribute('aria-label', `${song.title} ${song.artist} 유튜브 뮤직에서 듣기`);
    a.innerHTML = `<div class="song__art"><svg width="26" height="26" viewBox="0 0 24 24" fill="var(--coral)" aria-hidden="true"><path d="M9 18V5l10-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/></svg></div><div class="song__meta"><div class="song__lab">구름이가 골라준 한 곡</div><div class="song__title"></div><div class="song__artist"></div></div><div class="song__play"><svg width="18" height="18" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></div>`;
    $('.song__title', a).textContent = song.title; $('.song__artist', a).textContent = song.artist;
    result.appendChild(a); addReasons();
  }

  if (listenUrl) {
    const listen = document.createElement('button'); listen.type = 'button'; listen.className = 'btn btn--primary';
    listen.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>YouTube Music에서 듣기';
    listen.addEventListener('click', () => window.open(listenUrl, '_blank', 'noopener'));
    result.appendChild(listen);
  }
  const share = document.createElement('button'); share.type = 'button'; share.dataset.act = 'share';
  share.className = 'btn ' + (listenUrl ? 'btn--ghost' : 'btn--primary');
  share.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M12 15V3M8 7l4-4 4 4"/></svg>오늘 기분 카드 공유하기';
  share.addEventListener('click', () => openShareCard(moodId, key));
  result.appendChild(share);
}

// ── 더보기/설정 ──
function renderMore() {
  const v = view();
  v.innerHTML = `<div class="v">
    <h1 class="vtitle">더보기</h1>
    <div class="set-list" id="setList"></div>
    <p class="set-ver">오늘 기분 · v0.1 · 구름이의 일기예보</p>
  </div>`;
  const list = $('#setList', v);
  const item = (icon, title, desc, fn, href) => {
    const el = document.createElement(href ? 'a' : 'button');
    if (href) { el.href = href; if (href.startsWith('./')) el.target = '_self'; } else el.type = 'button';
    el.className = 'set-item';
    el.innerHTML = `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icon}</svg><span>${title}${desc ? `<small>${desc}</small>` : ''}</span><svg class="arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>`;
    if (fn) el.addEventListener('click', fn);
    list.appendChild(el);
  };
  item('<path d="M12 3v12M8 11l4 4 4-4M5 21h14"/>', '내 데이터 내보내기', '기록은 내 것 · JSON으로 저장', exportData);
  item('<path d="M9 18V5l10-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>', '음악 성향 테스트', '5문항이면 끝 · 나의 구름이 타입', openQuiz);
  item('<path d="M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9zM12 8v4M12 16h.01"/>', '마음이 많이 힘들 땐', '자살예방상담 1393 (24시간)', null, 'tel:1393');
  item('<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 9h6M9 13h6M9 17h3"/>', '개인정보처리방침', '내 기분은 내 폰에 · 익명 집계', null, './privacy.html');
  item('<circle cx="12" cy="12" r="3.2"/><path d="M12 4v2M12 18v2M4 12h2M18 12h2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M17.7 6.3l-1.4 1.4M7.7 16.3l-1.4 1.4"/>', '음악 관리 (관리자)', '곡 카탈로그 · 유튜브 임베드 관리', null, './admin.html');
  item('<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>', '데이터 초기화', '모든 기록 삭제', resetData);
}
function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'oneul-gibun-data.json'; a.click();
}
function resetData() {
  if (!confirm('모든 기분 기록을 삭제할까요? 되돌릴 수 없어요.')) return;
  try { localStorage.removeItem('oneulgibun:state'); } catch (e) {}
  state = store.load(); toast('기록을 초기화했어요'); router();
}
function toast(msg) {
  const t = document.createElement('div'); t.textContent = msg;
  t.style.cssText = 'position:fixed;left:50%;bottom:88px;transform:translateX(-50%);background:var(--ink);color:#fff;padding:11px 18px;border-radius:999px;font-size:13px;font-weight:600;z-index:80;box-shadow:var(--sh-lg)';
  document.body.appendChild(t); setTimeout(() => t.remove(), 1900);
}

// ── 온보딩 ──
const STEPS = [
  ['happy', '안녕, 나는 구름이', '네 기분이 곧 내 날씨가 돼.<br>하루 한 번 톡 누르면, 딱 맞는 노래를 골라줄게.'],
  ['flutter', '오늘의 하늘, 같이 만들어요', '내 한 톨이 모여 전국 기분 날씨가 돼요.<br>기분 카드로 오늘을 자랑할 수도 있어요.'],
  ['calm', '기록은 네 폰에만', '개인 기록은 이 기기에만 저장돼요.<br>전국 통계는 익명으로만 모아요.'],
];
function showOnboarding() {
  let i = 0;
  const ov = document.createElement('div'); ov.className = 'onb';
  const paint = () => {
    const [mood, t, d] = STEPS[i];
    ov.innerHTML = `<div class="onb__m">${mascotSVG(mood, false)}</div>
      <div class="onb__t">${t}</div><div class="onb__d">${d}</div>
      <div class="onb__dots">${STEPS.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>
      <button class="btn btn--primary onb__btn" type="button">${i === STEPS.length - 1 ? '구름이랑 시작하기' : '다음'}</button>`;
    $('.onb__btn', ov).addEventListener('click', () => {
      if (i === STEPS.length - 1) { try { localStorage.setItem(ONB_KEY, '1'); } catch (e) {} ov.remove(); }
      else { i++; paint(); }
    });
  };
  paint(); document.body.appendChild(ov);
}

// ── 라우터 ──
function router() {
  const route = (location.hash.replace('#/', '') || 'home');
  const r = ['home', 'weather', 'collection', 'more'].includes(route) ? route : 'home';
  if (r === 'home') renderHome();
  else if (r === 'weather') view().innerHTML = weatherHTML();
  else if (r === 'collection') view().innerHTML = collectionHTML(state);
  else if (r === 'more') renderMore();
  renderTabs(r);
  view().scrollTop = 0;
}
window.addEventListener('hashchange', router);

// ── 서비스워커 ──
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));

// 첫 실행 온보딩
let onboarded = '1'; try { onboarded = localStorage.getItem(ONB_KEY); } catch (e) {}
if (!onboarded) showOnboarding();
router();
