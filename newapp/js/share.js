// 오늘 기분 — 공유 카드 생성 (Canvas 1080×1920). D6/공유 플로우.
// 기분+노래+전국날씨를 한 장으로 → 미리보기 모달 → Web Share / 저장.
// 카드 색은 고정 라이트 팔레트(L) — 앱이 다크여도 공유 이미지는 일관된 밝은 종이.
import { mascotSVGStandalone } from './mascot.js';
import { moodById } from './data/moods.js';
import { recommendSong } from './recommend.js';
import { openDialog } from './a11y.js';
import { NATION_SUNNY } from './data/nation.js';
import { weeklyPlaylist } from './views.js';
import { loadCatalog } from './catalog.js';
import { loadTaste } from './quiz.js';

const WD = ['일', '월', '화', '수', '목', '금', '토'];
// 공유 카드는 앱 테마와 무관하게 항상 '밝은 종이' 톤 — 다크 모드여도 일관·인쇄 가능한 공유 이미지.
const L = {
  paper: '#FBF6EE', ink: '#2A2520', soft: '#6B6258', faint: '#8A8278', coral: '#FF6F50', line: '#EAE0CE',
  mood: { happy: '#FFC95C', flutter: '#FF9A8B', calm: '#9CC3A6', blue: '#8AA0C9', angry: '#E2725B' },
  tint: { happy: '#FFF1D4', flutter: '#FFE4DE', calm: '#E3EFE6', blue: '#E2E8F2', angry: '#F7DDD6' },
  ink2: { happy: '#B07A12', flutter: '#C45A48', calm: '#4F7B5C', blue: '#48597F', angry: '#A33D29' },
};
const clip = (s, n) => (s && s.length > n ? s.slice(0, n - 1) + '…' : s);
function hexA(h, a) { h = (h || '#FF6F50').replace('#', ''); if (h.length === 3) h = h.split('').map((c) => c + c).join(''); const n = parseInt(h, 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }
function svgToImage(svg) { return new Promise((res, rej) => { const img = new Image(); const u = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })); img.onload = () => { URL.revokeObjectURL(u); res(img); }; img.onerror = rej; img.src = u; }); }
function rrect(x, X, Y, W, H, R) { x.beginPath(); x.moveTo(X + R, Y); x.arcTo(X + W, Y, X + W, Y + H, R); x.arcTo(X + W, Y + H, X, Y + H, R); x.arcTo(X, Y + H, X, Y, R); x.arcTo(X, Y, X + W, Y, R); x.closePath(); }
function note(x, cx, cy, col) { x.fillStyle = col; x.beginPath(); x.ellipse(cx - 14, cy + 20, 17, 13, 0, 0, 7); x.fill(); x.beginPath(); x.ellipse(cx + 28, cy + 14, 17, 13, 0, 0, 7); x.fill(); x.fillRect(cx - 1, cy - 26, 6, 46); x.fillRect(cx + 41, cy - 32, 6, 46); x.beginPath(); x.moveTo(cx - 1, cy - 26); x.lineTo(cx + 47, cy - 32); x.lineTo(cx + 47, cy - 14); x.lineTo(cx - 1, cy - 8); x.fill(); }
function sun(x, cx, cy, col) { x.save(); x.strokeStyle = col; x.fillStyle = col; x.lineWidth = 4; x.lineCap = 'round'; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; x.beginPath(); x.moveTo(cx + Math.cos(a) * 22, cy + Math.sin(a) * 22); x.lineTo(cx + Math.cos(a) * 30, cy + Math.sin(a) * 30); x.stroke(); } x.beginPath(); x.arc(cx, cy, 15, 0, 7); x.fill(); x.restore(); }

export async function openShareCard(moodId, dateKey) {
  try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (e) { /* 폰트 폴백 */ }
  const canvas = await buildCard(moodId, dateKey);
  showModal(canvas);
}

async function buildCard(moodId, dateKey) {
  const W = 1080, H = 1920, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  const paper = L.paper, ink = L.ink, soft = L.soft, faint = L.faint, coral = L.coral;
  const mood = L.mood[moodId] || coral, tint = L.tint[moodId] || '#FFE4DE', mink = L.ink2[moodId] || ink;
  const mo = moodById(moodId), song = recommendSong(moodId, { dateKey, catalog: loadCatalog(), taste: loadTaste() });
  const d = new Date(`${dateKey}T00:00:00`);

  x.fillStyle = paper; x.fillRect(0, 0, W, H);
  const m = 52, cw = W - 2 * m, ch = H - 2 * m, R = 72;
  x.fillStyle = '#FFFDF8'; rrect(x, m, m, cw, ch, R); x.fill();
  // 천공 (종이색 점)
  x.fillStyle = paper;
  const dots = (x0, y0, x1, y1, n) => { for (let i = 0; i <= n; i++) { const t = i / n; x.beginPath(); x.arc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, 15, 0, 7); x.fill(); } };
  dots(m, m, m + cw, m, 16); dots(m, m + ch, m + cw, m + ch, 16); dots(m, m, m, m + ch, 28); dots(m + cw, m, m + cw, m + ch, 28);

  x.textAlign = 'center';
  x.fillStyle = ink; x.font = '700 48px Cafe24Ssurround, Pretendard';
  x.fillText(dateKey.replace(/-/g, ' · '), W / 2, 200);
  x.fillStyle = soft; x.font = '600 30px Pretendard'; x.fillText(WD[d.getDay()] + '요일', W / 2, 248);

  x.fillStyle = hexA(mood, 0.22); x.beginPath(); x.arc(W / 2, 480, 235, 0, 7); x.fill();
  const img = await svgToImage(mascotSVGStandalone(moodId, 440, false));
  x.drawImage(img, W / 2 - 220, 300, 440, 440);

  x.fillStyle = soft; x.font = '600 34px Pretendard'; x.fillText('오늘 구름이가 읽은 마음', W / 2, 850);
  x.fillStyle = mood; x.font = '700 150px Cafe24Ssurround, Pretendard'; x.fillText(mo ? mo.ko : moodId, W / 2, 1000);

  if (song.source !== 'none') {
    const chw = 840, chh = 156, chx = W / 2 - chw / 2, chy = 1060;
    x.fillStyle = tint; rrect(x, chx, chy, chw, chh, 30); x.fill();
    note(x, chx + 72, chy + chh / 2 - 6, mink);
    x.textAlign = 'left';
    x.fillStyle = ink; x.font = '700 46px Cafe24Ssurround, Pretendard'; x.fillText(clip(song.title, 15), chx + 156, chy + 72);
    x.fillStyle = soft; x.font = '500 34px Pretendard'; x.fillText(clip(song.artist, 20), chx + 156, chy + 118);
    x.textAlign = 'center';
  }

  sun(x, W / 2 - 168, 1320, coral);
  x.fillStyle = ink; x.font = '700 42px Pretendard'; x.textAlign = 'left'; x.fillText(`오늘 전국 맑음 ${NATION_SUNNY}%`, W / 2 - 130, 1332); x.textAlign = 'center';

  x.fillStyle = faint; x.font = '700 36px Cafe24Ssurround, Pretendard'; x.fillText('오늘 기분 · 구름이의 일기예보', W / 2, 1800);
  return c;
}

function showModal(canvas, opts = {}) {
  const label = opts.alt || '오늘 기분 카드';
  const ov = document.createElement('div'); ov.className = 'sheet';
  const box = document.createElement('div'); box.className = 'sheet__box';
  const img = new Image(); img.className = 'sheet__img'; img.alt = label; img.src = canvas.toDataURL('image/png');
  const row = document.createElement('div'); row.className = 'sheet__row';
  const sh = document.createElement('button'); sh.type = 'button'; sh.className = 'btn btn--primary'; sh.style.marginTop = '0'; sh.textContent = '공유 · 저장';
  sh.addEventListener('click', () => exportCard(canvas, opts));
  const close = document.createElement('button'); close.type = 'button'; close.className = 'btn btn--ghost'; close.style.marginTop = '0'; close.textContent = '닫기';
  row.append(sh, close); box.append(img, row); ov.append(box); document.body.append(ov);
  const dlg = openDialog(ov, { label, onClose: dismiss, initialFocus: () => sh });
  function dismiss() { dlg.release(); ov.remove(); }
  close.addEventListener('click', dismiss);
  ov.addEventListener('click', (e) => { if (e.target === ov) dismiss(); });
}

function exportCard(canvas, opts = {}) {
  const filename = opts.filename || 'oneul-gibun.png';
  const text = opts.shareText || '오늘 내 기분 날씨, 구름이가 골라준 노래 ☁️ #오늘기분 #구름이';
  canvas.toBlob(async (blob) => {
    if (!blob) return;
    const file = new File([blob], filename, { type: 'image/png' });
    try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text }); return; } } catch (e) { /* 취소/미지원 → 저장 */ }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  }, 'image/png');
}

// ── 이번 주 플리 카드 ──
export async function openWeeklyCard(state) {
  const list = weeklyPlaylist(state).slice(0, 7);
  if (!list.length) return;
  try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (e) { /* 폰트 폴백 */ }
  const canvas = await buildWeeklyCard(list);
  showModal(canvas, { alt: '이번 주 플리 카드', filename: 'oneul-weekly.png', shareText: '이번 주 내 기분 플레이리스트 ☁️ #오늘기분 #구름이' });
}

async function buildWeeklyCard(list) {
  const W = 1080, H = 1920, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const paper = L.paper, ink = L.ink, soft = L.soft, faint = L.faint, coral = L.coral, line = L.line;
  // 최다 기분 = 히어로 마스코트
  const freq = {}; list.forEach((it) => { freq[it.mood] = (freq[it.mood] || 0) + 1; });
  let hero = list[0].mood, best = -1; for (const k in freq) if (freq[k] > best) { best = freq[k]; hero = k; }
  const hmood = L.mood[hero] || coral;

  x.fillStyle = paper; x.fillRect(0, 0, W, H);
  const m = 52, cw = W - 2 * m, ch = H - 2 * m, R = 72;
  x.fillStyle = '#FFFDF8'; rrect(x, m, m, cw, ch, R); x.fill();
  x.fillStyle = paper;
  const dots = (x0, y0, x1, y1, n) => { for (let i = 0; i <= n; i++) { const t = i / n; x.beginPath(); x.arc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, 15, 0, 7); x.fill(); } };
  dots(m, m, m + cw, m, 16); dots(m, m + ch, m + cw, m + ch, 16); dots(m, m, m, m + ch, 28); dots(m + cw, m, m + cw, m + ch, 28);

  // 헤더
  x.textAlign = 'center';
  x.fillStyle = ink; x.font = '700 60px Cafe24Ssurround, Pretendard'; x.fillText('이번 주 나의 플리', W / 2, 188);
  x.fillStyle = soft; x.font = '600 32px Pretendard'; x.fillText('구름이가 기록을 보고 모았어요', W / 2, 240);
  const fmt = (k) => { const p = k.split('-'); return `${Number(p[1])}.${Number(p[2])}`; };
  x.fillStyle = faint; x.font = '700 30px Pretendard'; x.fillText(`${fmt(list[list.length - 1].k)} – ${fmt(list[0].k)}`, W / 2, 288);

  // 히어로 마스코트
  x.fillStyle = hexA(hmood, 0.2); x.beginPath(); x.arc(W / 2, 470, 168, 0, 7); x.fill();
  const himg = await svgToImage(mascotSVGStandalone(hero, 300, false));
  x.drawImage(himg, W / 2 - 150, 320, 300, 300);

  // 곡 목록
  let y = 720; const rowH = Math.min(150, Math.floor((1760 - y) / list.length));
  list.forEach((it) => {
    const mc = L.mood[it.mood] || coral, cy = y + rowH / 2;
    x.fillStyle = mc; x.beginPath(); x.arc(m + 64, cy - 6, 18, 0, 7); x.fill();
    x.textAlign = 'left';
    x.fillStyle = ink; x.font = '700 42px Cafe24Ssurround, Pretendard'; x.fillText(clip(it.song.title, 18), m + 112, cy - 14);
    x.fillStyle = soft; x.font = '500 30px Pretendard'; x.fillText(`${it.day}일 · ${clip(it.song.artist, 24)}`, m + 112, cy + 28);
    x.strokeStyle = line; x.lineWidth = 1.5; x.beginPath(); x.moveTo(m + 36, y + rowH - 4); x.lineTo(W - m - 36, y + rowH - 4); x.stroke();
    y += rowH;
  });

  // 푸터
  x.textAlign = 'center';
  x.fillStyle = faint; x.font = '700 36px Cafe24Ssurround, Pretendard'; x.fillText('오늘 기분 · 구름이의 일기예보', W / 2, 1800);
  return c;
}
