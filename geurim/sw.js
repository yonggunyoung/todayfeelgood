/* 그림공장 — 서비스워커: 앱 셸 오프라인 캐시 (빌드 없는 정적 PWA, 의존성 0).
 * 동일 출처 자산만 캐시. API 호출(OpenAI/Gemini/프록시)은 절대 캐시하지 않는다. */
const C = 'geurim-v1';
const ASSETS = [
  './', './index.html', './manifest.webmanifest', './icon.svg',
  './css/styles.css',
  './js/app.js', './js/store.js', './js/db.js', './js/batch.js',
  './js/prompt.js', './js/styles-data.js', './js/zip.js', './js/gallery.js',
  './js/providers/index.js', './js/providers/openai.js', './js/providers/gemini.js', './js/providers/net.js', './js/providers/google-auth.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(C).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== C).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // 외부 API/프록시 호출은 캐시 우회 (네트워크 직행)
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (e.request.mode === 'navigate') {
    e.respondWith(caches.match('./index.html').then((h) => h || fetch(e.request)));
    return;
  }
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((resp) => {
      const cp = resp.clone();
      caches.open(C).then((c) => c.put(e.request, cp)).catch(() => {});
      return resp;
    }).catch(() => caches.match('./index.html'))),
  );
});
