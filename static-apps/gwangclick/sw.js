// ⚡ 광클대전 — 앱 셸 오프라인 캐시 (단독 앱, 의존성 없음)
// Phase 4: gc-globe.js(가벼운 순수 헬퍼)만 프리캐시에 추가. 무거운 vendor/globe.gl.min.js(≈1.8MB)는
//   의도적으로 ASSETS에 넣지 않는다(D7: 설치 경량 유지) — 지구본 첫 진입 시 아래 fetch 핸들러가 캐시 → 이후 오프라인 동작.
const C = 'gwangclick-v18';
const ASSETS = ['./', './index.html', './toss.js', './fb-config.js', './net.js', './gc-util.js', './gc-cosmetics.js', './gc-proposals.js', './i18n.js', './geo.js', './topics.js', './gc-globe.js', './vendor/pretendard/pretendard.css', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(C).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== C).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((resp) => {
      const cp = resp.clone();
      caches.open(C).then((c) => c.put(e.request, cp));
      return resp;
    }).catch(() => caches.match('./index.html')))
  );
});
