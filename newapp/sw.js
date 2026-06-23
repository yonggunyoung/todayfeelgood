// 오늘 기분 — 앱 셸 오프라인 캐시 (단독 PWA, 의존성 없음).
// 파일 추가 시 ASSETS와 캐시 버전(C)을 같이 올린다.
const C = 'oneulgibun-v7';
const ASSETS = [
  './', './index.html', './privacy.html',
  './css/styles.css',
  './js/app.js', './js/store.js', './js/recommend.js', './js/mascot.js', './js/share.js', './js/views.js', './js/quiz.js',
  './js/data/moods.js', './js/data/songs.js',
  './manifest.webmanifest', './icon.svg',
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
    }).catch(() => caches.match('./index.html')))
  );
});
