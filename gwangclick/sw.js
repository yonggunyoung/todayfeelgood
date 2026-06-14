// ⚡ 광클대전 — 앱 셸 오프라인 캐시 (단독 앱, 의존성 없음)
const C = 'gwangclick-v1';
const ASSETS = ['./', './index.html', './toss.js', './manifest.webmanifest', './icon.svg'];

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
