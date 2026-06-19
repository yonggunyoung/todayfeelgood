// 냉비서 서비스워커 — 앱 셸 캐시 (오프라인에서도 냉장고 확인 가능)
const CACHE = 'naengbiseo-v62';
const SHELL = [
  './', './index.html', './arcade.html', './js/arcade.js', './css/styles.css', './manifest.webmanifest', './icon.svg',
  './js/main.js', './js/store.js', './js/engine.js', './js/units.js', './js/ai.js', './js/sync.js', './js/voice.js', './js/config.js',
  './js/points.js', './js/slime.js', './js/pixel.js', './js/games.js', './js/game-defense.js', './js/game-puzzle.js', './js/game-quiz.js', './js/game-gomoku.js', './js/toss.js',
  './js/data/ingredients.js', './js/data/recipes.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 네트워크 우선, 실패 시 캐시 (외부 API/CDN은 그대로 통과)
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request).then((hit) => hit || caches.match('./index.html')))
  );
});
