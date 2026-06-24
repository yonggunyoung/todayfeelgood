// 오늘 기분 — 앱 셸 오프라인 캐시 (단독 PWA, 의존성 없음).
// 파일 추가 시 ASSETS와 캐시 버전(C)을 같이 올린다.
const C = 'oneulgibun-v17';
const ASSETS = [
  './', './index.html', './privacy.html', './admin.html',
  './css/styles.css',
  './js/theme-init.js',
  './js/app.js', './js/store.js', './js/recommend.js', './js/mascot.js', './js/share.js', './js/views.js', './js/quiz.js', './js/catalog.js', './js/a11y.js', './js/admin.js',
  './js/nation-remote.js', './js/firebase-config.js',
  './js/data/moods.js', './js/data/songs.js', './js/data/nation.js',
  './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png', './apple-touch-icon.png',
];

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
    }).catch(() => {
      // 오프라인 폴백은 '페이지 이동'에만. 폰트/이미지/스크립트 실패에 HTML을 돌려주면
      // 엉뚱한 리소스가 되고 CSP 위반을 부른다 → 그대로 실패시킨다.
      if (e.request.mode === 'navigate') return caches.match('./index.html');
      return Response.error();
    }))
  );
});
