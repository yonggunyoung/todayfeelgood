// 냉비서 서비스워커 — 앱 셸 캐시 (오프라인에서도 냉장고 확인 가능) + 만료 임박 푸시 알림(FCM)
// ── 푸시(FCM): 백그라운드 메시지 수신 → 알림 표시. 스크립트 로드 실패해도 아래 캐시 SW는 정상 동작 ──
try {
  importScripts(
    'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js'
  );
  firebase.initializeApp({
    apiKey: 'AIzaSyB-y7AXH7xBScwycGywRztpRohxZ87-qDI',
    authDomain: 'icebi-308e0.firebaseapp.com',
    projectId: 'icebi-308e0',
    messagingSenderId: '63517169912',
    appId: '1:63517169912:web:c1ac9ec44c27c34f58c30d',
  });
  firebase.messaging().onBackgroundMessage((payload) => {
    const d = (payload && payload.data) || {};
    self.registration.showNotification(d.title || '냉비서', {
      body: d.body || '', icon: './icon.svg', badge: './icon.svg',
      tag: 'nb-expiry', renotify: true, data: { url: d.url || './' },
    });
  });
} catch (e) { /* 푸시 스크립트 로드 실패 — 캐시 기능엔 영향 없음 */ }

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => {
    for (const c of cs) { if ('focus' in c) return c.focus(); }
    if (self.clients.openWindow) return self.clients.openWindow(url);
  }));
});

const CACHE = 'naengbiseo-v72';
const SHELL = [
  './', './index.html', './arcade.html', './js/arcade.js', './css/styles.css', './manifest.webmanifest', './icon.svg',
  './js/main.js', './js/store.js', './js/engine.js', './js/units.js', './js/ai.js', './js/sync.js', './js/voice.js', './js/config.js', './js/analytics.js', './js/push.js',
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
