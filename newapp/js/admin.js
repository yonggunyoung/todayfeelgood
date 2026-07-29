// 오늘 기분 — 음악 관리(관리자) 로직. admin.html에서 분리(인라인 스크립트 제거 → CSP script-src 'self').
import { loadCatalog, saveCatalog, resetCatalog, parseYouTubeId, SEED, MOOD_KEYS } from './catalog.js';
import { MOODS } from './data/moods.js';

const KO = Object.fromEntries(MOODS.map((m) => [m.id, m.ko]));
const COL = { happy: '#FFC95C', flutter: '#FF9A8B', calm: '#9CC3A6', blue: '#8AA0C9', angry: '#E2725B' };
let cat = structuredClone(loadCatalog());
for (const m of MOOD_KEYS) if (!Array.isArray(cat[m])) cat[m] = [];
const $ = (s) => document.querySelector(s);
const toast = (t) => { const e = $('#toast'); e.textContent = t; e.classList.add('on'); setTimeout(() => e.classList.remove('on'), 1700); };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function render() {
  const root = $('#moods'); root.innerHTML = '';
  for (const m of MOOD_KEYS) {
    const sec = document.createElement('div'); sec.className = 'mood';
    const songs = cat[m].map((s, i) => {
      const ytId = s.youtubeId ? parseYouTubeId(s.youtubeId) : '';
      const tag = ytId ? `<span class="tag ${s.source === 'suno' ? 'suno' : 'yt'}">${s.source === 'suno' ? 'Suno' : 'YouTube'} ▶</span>` : '<span class="tag">검색링크</span>';
      return `<div class="song"><div class="meta"><b>${esc(s.title)}</b> · ${esc(s.artist || '')} ${tag}<small>${ytId ? 'youtu.be/' + ytId : (s.url || '검색')}</small></div><button class="rm" data-m="${m}" data-i="${i}" title="삭제">×</button></div>`;
    }).join('') || '<div class="song" style="color:var(--faint)">아직 곡이 없어요</div>';
    sec.innerHTML = `<div class="mood__h"><span class="dot" style="background:${COL[m]}"></span>${KO[m]} <span style="color:var(--faint);font-weight:600;font-size:13px">(${cat[m].length})</span></div>
      ${songs}
      <div class="add">
        <input placeholder="제목" data-f="title" data-m="${m}">
        <input placeholder="아티스트" data-f="artist" data-m="${m}">
        <input class="full" placeholder="YouTube URL 또는 영상 ID (선택 — 있으면 인앱 재생)" data-f="yt" data-m="${m}">
        <select data-f="source" data-m="${m}"><option value="artist">가수곡</option><option value="suno">내 Suno 곡</option></select>
        <button class="b b-gho" data-add="${m}">+ 추가</button>
      </div>
      <div class="hint">Suno 곡: 유튜브에 업로드한 뒤 그 URL을 넣으면 됩니다. 재생목록(플리)은 영상별로 추가하세요.</div>`;
    root.appendChild(sec);
  }
  root.querySelectorAll('.rm').forEach((b) => b.onclick = () => { cat[b.dataset.m].splice(+b.dataset.i, 1); render(); });
  root.querySelectorAll('[data-add]').forEach((b) => b.onclick = () => addSong(b.dataset.add, b.parentElement));
}
function addSong(m, form) {
  const get = (f) => form.querySelector(`[data-f="${f}"]`);
  const title = get('title').value.trim(); if (!title) { toast('제목을 입력하세요'); return; }
  const artist = get('artist').value.trim();
  const ytRaw = get('yt').value.trim();
  const source = get('source').value;
  const song = { title, artist, source };
  const id = parseYouTubeId(ytRaw);
  if (ytRaw && !id) { toast('YouTube URL/ID를 인식 못 했어요'); return; }
  if (id) { song.youtubeId = id; song.url = 'https://www.youtube.com/watch?v=' + id; }
  else { song.url = 'https://music.youtube.com/search?q=' + encodeURIComponent(`${artist} ${title}`); }
  cat[m].push(song); render(); toast('추가됨 (저장 잊지 마세요)');
}

$('#save').onclick = () => { saveCatalog(cat) ? toast('이 기기에 저장됐어요') : toast('저장 실패'); };
$('#reset').onclick = () => { if (confirm('시드(기본 곡)로 되돌릴까요? 이 기기 저장이 삭제됩니다.')) { resetCatalog(); cat = structuredClone(SEED); for (const m of MOOD_KEYS) if (!Array.isArray(cat[m])) cat[m] = []; render(); toast('시드로 초기화'); } };
$('#expJson').onclick = () => { dl('oneul-catalog.json', JSON.stringify(cat, null, 2)); };
$('#impJson').onclick = () => $('#file').click();
$('#file').onchange = (e) => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { const c = JSON.parse(r.result); cat = {}; for (const m of MOOD_KEYS) cat[m] = Array.isArray(c[m]) ? c[m] : []; render(); toast('가져왔어요'); } catch (x) { toast('JSON 파싱 실패'); } }; r.readAsText(f); };
$('#expCode').onclick = () => {
  const body = MOOD_KEYS.map((m) => `  ${m}: [\n` + cat[m].map((s) => '    ' + JSON.stringify(s)).join(',\n') + (cat[m].length ? '\n' : '') + '  ],').join('\n');
  $('#codeOut').value = `// 오늘 기분 — 음악 카탈로그 (관리자 내보내기). YouTube 임베드 우선, 없으면 검색 링크.\nexport const SONGS = {\n${body}\n};\n`;
  $('#codeDlg').showModal();
};
$('#copyCode').onclick = async () => { try { await navigator.clipboard.writeText($('#codeOut').value); toast('복사됨'); } catch (e) { $('#codeOut').select(); document.execCommand('copy'); toast('복사됨'); } };
$('#closeDlg').onclick = () => $('#codeDlg').close();
function dl(name, text) { const b = new Blob([text], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; a.click(); }
render();
