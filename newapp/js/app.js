// 새 앱 — 스타터 로직 (의존성 없음)
// 1) localStorage 저장 헬퍼  2) PWA 설치 프롬프트  3) 서비스워커 등록
// 필요 없는 데모는 지우고, 여기에 기능을 하나씩 채워나가세요.
'use strict';

// ── 작은 저장 헬퍼 (localStorage) ──────────────────────────
// 키 접두어 'newapp:' 로 다른 앱과 충돌 방지. 앱 이름 바꾸면 여기도 변경.
const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem('newapp:' + key);
      return v == null ? fallback : JSON.parse(v);
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem('newapp:' + key, JSON.stringify(value)); } catch {}
  },
};

// ── 데모: 탭 카운터 (저장 패턴 예시 — 자유롭게 삭제) ─────────
const tapBtn = document.getElementById('tapBtn');
const tapCount = document.getElementById('tapCount');
let taps = store.get('taps', 0);
if (tapCount) tapCount.textContent = taps;
if (tapBtn) tapBtn.addEventListener('click', () => {
  taps += 1;
  store.set('taps', taps);
  tapCount.textContent = taps;
});

// ── PWA 설치 프롬프트 ──────────────────────────────────────
let deferredPrompt = null;
const installBtn = document.getElementById('installBtn');
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (installBtn) installBtn.hidden = false;
});
if (installBtn) installBtn.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installBtn.hidden = true;
});

// ── 서비스워커 등록 (오프라인 앱 셸) ───────────────────────
const swState = document.getElementById('swState');
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(() => { if (swState) swState.textContent = '✓ 오프라인 사용 가능'; })
      .catch(() => { if (swState) swState.textContent = '오프라인 캐시 미지원'; });
  });
} else if (swState) {
  swState.textContent = '오프라인 캐시 미지원 브라우저';
}
