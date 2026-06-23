// 오늘 기분 — 음악 성향 테스트 (바이럴 유입구). 5문항 → 구름이 타입 → 결과 카드.
import { mascotSVG, mascotSVGStandalone } from './mascot.js';
import { SONGS } from './data/songs.js';
import { openDialog } from './a11y.js';

const Q = [
  ['지금 듣고 싶은 분위기는?', [['밝고 신나는', 'happy'], ['설레는 감성', 'flutter'], ['잔잔한', 'calm'], ['센치한', 'blue'], ['강렬한', 'angry']]],
  ['노래를 들을 때 나는?', [['크게 따라 부른다', 'happy'], ['가사에 푹 빠진다', 'flutter'], ['배경처럼 흘려둔다', 'calm'], ['혼자 곱씹는다', 'blue'], ['볼륨을 키운다', 'angry']]],
  ['밤 늦게 손이 가는 건?', [['신나는 댄스', 'happy'], ['감성 R&B', 'flutter'], ['잔잔한 어쿠스틱', 'calm'], ['먹먹한 발라드', 'blue'], ['록·힙합', 'angry']]],
  ['플레이리스트 제목을 짓는다면?', [['오늘도 기분 UP', 'happy'], ['두근두근', 'flutter'], ['한 박자 쉬어가기', 'calm'], ['비 오는 날', 'blue'], ['다 쏟아내기', 'angry']]],
  ['음악은 나에게?', [['에너지 충전', 'happy'], ['설렘', 'flutter'], ['편안한 휴식', 'calm'], ['따뜻한 위로', 'blue'], ['감정의 분출구', 'angry']]],
];
const TYPES = {
  happy: { name: '햇살 구름이', desc: '어디서든 텐션을 끌어올리는 타입!<br>밝고 신나는 곡이 제일 잘 어울려요.' },
  flutter: { name: '노을 구름이', desc: '감성에 폭 빠지는 타입.<br>설렘 가득한 곡이 딱이에요.' },
  calm: { name: '산들 구름이', desc: '잔잔하게 흐르는 타입.<br>한 박자 쉬어가는 곡과 잘 맞아요.' },
  blue: { name: '빗방울 구름이', desc: '마음을 가만히 곱씹는 타입.<br>위로가 되는 곡이 어울려요.' },
  angry: { name: '번개 구름이', desc: '에너지를 시원하게 분출하는 타입.<br>강렬한 곡으로 뻥 뚫어요.' },
};
const TASTE_KEY = 'oneulgibun:taste';
// 저장된 음악 성향 타입(없으면 '') — 설정 화면 등에서 활용.
export const tasteName = (id) => (TYPES[id] || {}).name || '';
export function loadTaste() { try { return localStorage.getItem(TASTE_KEY) || ''; } catch (e) { return ''; } }
const X_ICON = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

export function openQuiz(opts = {}) {
  let i = 0; const score = {}; let dlg = null;
  const ov = document.createElement('div'); ov.className = 'quiz';
  document.body.appendChild(ov);
  const close = () => { if (dlg) dlg.release(); ov.remove(); if (opts.onClose) opts.onClose(); };

  function paintQ() {
    const [q, opts] = Q[i];
    ov.removeAttribute('data-mood');
    ov.innerHTML = `<div class="quiz__bar"><button class="quiz__x" type="button" aria-label="닫기">${X_ICON}</button><div class="quiz__prog"><i style="width:${(i / Q.length) * 100}%"></i></div><span class="quiz__step">${i + 1}/${Q.length}</span></div>
      <div class="quiz__m">${mascotSVG('calm', false)}</div>
      <h2 class="quiz__q">${q}</h2><div class="quiz__opts"></div>`;
    ov.querySelector('.quiz__x').addEventListener('click', close);
    const wrap = ov.querySelector('.quiz__opts');
    opts.forEach(([text, type]) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'quiz__opt'; b.textContent = text;
      b.addEventListener('click', () => { score[type] = (score[type] || 0) + 1; i++; i < Q.length ? paintQ() : paintResult(); });
      wrap.appendChild(b);
    });
    ov.scrollTop = 0; if (dlg) dlg.refocus();
  }

  function paintResult() {
    let type = 'happy', best = -1;
    for (const k of Object.keys(TYPES)) if ((score[k] || 0) > best) { best = score[k] || 0; type = k; }
    const t = TYPES[type];
    try { localStorage.setItem(TASTE_KEY, type); } catch (e) { /* 저장 실패 무시 */ }
    const recs = (SONGS[type] || []).slice(0, 4).map((s) => {
      const t = s.title.length > 14 ? s.title.slice(0, 13) + '…' : s.title;
      return `<span class="chip">${t}</span>`;
    }).join('');
    ov.dataset.mood = type;
    ov.innerHTML = `<div class="quiz__bar"><button class="quiz__x" type="button" aria-label="닫기">${X_ICON}</button><div class="quiz__prog"><i style="width:100%"></i></div><span class="quiz__step">결과</span></div>
      <div class="quiz__m" style="width:170px;height:170px">${mascotSVG(type, false)}</div>
      <p style="text-align:center;color:var(--ink-soft);font-size:13px;font-weight:600;margin:0">나의 음악 성향은</p>
      <h2 class="quiz__rt">${t.name}</h2>
      <p class="quiz__rd">${t.desc}</p>
      <div class="reasons" style="justify-content:center"><div class="why" style="text-align:center">구름이의 추천 플리</div>${recs}</div>
      <button class="btn btn--primary" type="button" id="qShare"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M12 15V3M8 7l4-4 4 4"/></svg>결과 카드 공유하기</button>
      <button class="btn btn--ghost" type="button" id="qStart">오늘 기분 기록하러 가기</button>`;
    ov.querySelector('.quiz__x').addEventListener('click', close);
    ov.querySelector('#qStart').addEventListener('click', () => { close(); location.hash = '#/home'; });
    ov.querySelector('#qShare').addEventListener('click', () => shareType(type, t));
    ov.scrollTop = 0; if (dlg) dlg.refocus();
  }
  paintQ();
  dlg = openDialog(ov, { label: '음악 성향 테스트', initialFocus: () => ov.querySelector('.quiz__opt') });
}

// 결과 카드 (Canvas 1080×1350)
function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
function svgToImage(svg) { return new Promise((res, rej) => { const img = new Image(); const u = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })); img.onload = () => { URL.revokeObjectURL(u); res(img); }; img.onerror = rej; img.src = u; }); }
function rrect(x, X, Y, W, H, R) { x.beginPath(); x.moveTo(X + R, Y); x.arcTo(X + W, Y, X + W, Y + H, R); x.arcTo(X + W, Y + H, X, Y + H, R); x.arcTo(X, Y + H, X, Y, R); x.arcTo(X, Y, X + W, Y, R); x.closePath(); }

async function shareType(type, t) {
  try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (e) {}
  const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const paper = cssVar('--paper') || '#FBF6EE', ink = cssVar('--ink') || '#2A2520', soft = cssVar('--ink-soft') || '#6B6258', faint = cssVar('--ink-faint') || '#8A8278';
  const mood = cssVar(`--${type}`), tint = cssVar(`--${type}-t`);
  x.fillStyle = paper; x.fillRect(0, 0, W, H);
  const m = 52; x.fillStyle = '#FFFDF8'; rrect(x, m, m, W - 2 * m, H - 2 * m, 64); x.fill();
  x.fillStyle = paper; const dot = (x0, y0, x1, y1, n) => { for (let k = 0; k <= n; k++) { const tt = k / n; x.beginPath(); x.arc(x0 + (x1 - x0) * tt, y0 + (y1 - y0) * tt, 14, 0, 7); x.fill(); } };
  dot(m, m, W - m, m, 16); dot(m, H - m, W - m, H - m, 16); dot(m, m, m, H - m, 20); dot(W - m, m, W - m, H - m, 20);
  x.textAlign = 'center';
  x.fillStyle = soft; x.font = '600 32px Pretendard'; x.fillText('나의 음악 성향', W / 2, 170);
  x.fillStyle = mood; x.font = '700 96px Cafe24Ssurround, Pretendard'; x.fillText(t.name, W / 2, 280);
  x.fillStyle = hexA(mood, 0.2); x.beginPath(); x.arc(W / 2, 620, 210, 0, 7); x.fill();
  const img = await svgToImage(mascotSVGStandalone(type, 400, false)); x.drawImage(img, W / 2 - 200, 420, 400, 400);
  x.fillStyle = soft; x.font = '500 36px Pretendard';
  t.desc.split('<br>').forEach((line, k) => x.fillText(line, W / 2, 920 + k * 50));
  x.fillStyle = faint; x.font = '700 34px Cafe24Ssurround, Pretendard'; x.fillText('오늘 기분 · 구름이의 일기예보', W / 2, 1250);
  c.toBlob(async (blob) => {
    if (!blob) return; const file = new File([blob], 'gibun-type.png', { type: 'image/png' });
    try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text: `나는 ${t.name}! 내 음악 성향은? #오늘기분 #구름이 #음악성향테스트` }); return; } } catch (e) {}
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'gibun-type.png'; a.click();
  }, 'image/png');
}
function hexA(h, a) { h = (h || '#FF6F50').replace('#', ''); if (h.length === 3) h = h.split('').map((ch) => ch + ch).join(''); const n = parseInt(h, 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }
