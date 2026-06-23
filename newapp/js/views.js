// 오늘 기분 — 뷰 렌더 (전국 날씨 · 컬렉션). 문자열 HTML 반환.
import { mascotSVG } from './mascot.js';
import { moodById } from './data/moods.js';
import { todayKey } from './store.js';
import { NATION } from './data/nation.js';
import { recommendSong } from './recommend.js';
import { loadCatalog } from './catalog.js';

const box = (px, svg) => `<span style="width:${px};height:${px};display:block">${svg}</span>`;
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// 오늘 기준 최근 n일 날짜 키(오늘이 첫 번째) — 주간 플레이리스트용.
function lastNKeys(n) {
  const [y, m, d] = todayKey().split('-').map(Number);
  const out = [];
  for (let i = 0; i < n; i++) {
    const dt = new Date(y, m - 1, d - i);
    out.push(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`);
  }
  return out;
}

// 전국 기분 날씨 — 분포는 data/nation.js 단일 출처(D13)
export function weatherHTML() {
  const rows = NATION.map(([k, p]) => {
    const m = moodById(k);
    return `<div class="wx-row" data-mood="${k}">${box('30px', mascotSVG(k, true))}<span class="wx-row__name">${m.ko}</span><span class="wx-row__bar"><i style="width:${p}%"></i></span><span class="wx-row__pct">${p}%</span></div>`;
  }).join('');
  return `<div class="v" data-mood="happy">
    <p class="vsub">전국 기분 날씨</p>
    <h1 class="vtitle">지금 전국은<br>대체로 맑음</h1>
    <div class="wx-hero">${box('120px', mascotSVG('happy', false))}</div>
    <div class="card" style="padding:6px 16px">${rows}</div>
    <div class="wx-note">내 「설렘」 한 톨이 전국을 한 뼘 맑게 했어요</div>
    <p class="col-empty-msg">아직 정식 집계 전이라 예시 날씨예요 · 곧 진짜 전국 집계가 열려요</p>
  </div>`;
}

// 컬렉션 — 이번 달 우표 앨범
const DOW = ['일', '월', '화', '수', '목', '금', '토'];
export function collectionHTML(state) {
  const tk = todayKey();
  const [y, mo] = tk.split('-').map(Number);
  const dim = new Date(y, mo, 0).getDate();
  const startDow = new Date(y, mo - 1, 1).getDay();
  let cells = '';
  for (let i = 0; i < startDow; i++) cells += '<div></div>';
  const counts = {};
  for (let d = 1; d <= dim; d++) {
    const key = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const rec = state.days[key];
    const today = key === tk ? ' today' : '';
    if (rec) {
      counts[rec.mood] = (counts[rec.mood] || 0) + 1;
      cells += `<div class="col-cell${today}" data-mood="${rec.mood}">${box('78%', mascotSVG(rec.mood, true))}<span class="col-num">${d}</span></div>`;
    } else {
      cells += `<div class="col-cell empty${today}">${box('78%', mascotSVG('happy', true))}<span class="col-num">${d}</span></div>`;
    }
  }
  const recorded = Object.values(counts).reduce((a, b) => a + b, 0);
  let top = '—', topN = 0;
  for (const [k, n] of Object.entries(counts)) if (n > topN) { topN = n; top = (moodById(k) || {}).ko || '—'; }
  const dowRow = DOW.map((d) => `<div class="col-dow">${d}</div>`).join('');

  // 이번 주 구름이 플리 — 최근 7일 기록한 기분의 추천곡을 모은다(D6/사용자 "활용").
  const cat = loadCatalog();
  const week = lastNKeys(7)
    .map((k) => ({ k, rec: state.days[k] }))
    .filter((x) => x.rec)
    .map((x) => ({ k: x.k, mood: x.rec.mood, song: recommendSong(x.rec.mood, { dateKey: x.k, catalog: cat }) }))
    .filter((x) => x.song && x.song.source !== 'none');
  const playGo = '<svg class="pl-go" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>';
  const plRows = week.map(({ k, mood, song }) => {
    const dd = Number(k.split('-')[2]);
    return `<a class="pl-row" data-mood="${mood}" href="${esc(song.url)}" target="_blank" rel="noopener" aria-label="${esc(song.title)} ${esc(song.artist)} 듣기">${box('30px', mascotSVG(mood, true))}<span class="pl-meta"><b>${esc(song.title)}</b><small>${dd}일 · ${esc(song.artist)}</small></span>${playGo}</a>`;
  }).join('');
  const plSection = `<div class="pl-h"><span>이번 주 구름이 플리</span><small>기분 기록을 보고 구름이가 모았어요</small></div>`
    + (week.length
      ? `<div class="card pl">${plRows}</div>`
      : `<p class="col-empty-msg" style="margin-top:6px">이번 주 기록이 쌓이면 구름이가 플리를 모아줘요</p>`);

  return `<div class="v">
    <p class="vsub">${y}년 ${mo}월</p>
    <h1 class="vtitle">기분 우표 앨범</h1>
    <div class="col-stats">
      <div class="card col-stat"><b style="color:var(--coral)">${recorded}</b><span>기록한 날</span></div>
      <div class="card col-stat"><b style="color:var(--calm)">${top}</b><span>이번 달 최다 기분</span></div>
    </div>
    <div class="col-freeze"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/></svg>연속 보호 프리즈 <b>${Number.isFinite(state.freezes) ? state.freezes : 0}</b>개 · 하루 빠져도 한 번은 지켜줘요</div>
    ${plSection}
    <div class="col-grid">${dowRow}${cells}</div>
    <p class="col-empty-msg">빈 칸은 아직 비어 있어요 · 오늘 한 칸 채워볼까요</p>
  </div>`;
}
