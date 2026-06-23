/* 글꾸미 — 서비스워커: 앱 셸 오프라인 캐시(빌드 없는 정적 PWA, 의존성 0).
 * 동일 출처 자산은 cache-first, 그 외(폰트 CDN 등)는 런타임 캐시. */
const C = "geulkkumi-v3";
const ASSETS = [
  "./", "./index.html", "./manifest.webmanifest", "./icon.svg", "./mascot.svg", "./og.svg", "./og.png",
  "./css/styles.css",
  "./js/main.js", "./js/ui.js", "./js/store.js", "./js/png.js",
  "./js/engine/unicode-fonts.js", "./js/engine/decorate.js", "./js/engine/hangul.js", "./js/engine/ascii-art.js",
  "./js/data/ramps.js", "./js/data/symbols.js", "./js/data/kaomoji.js", "./js/data/templates.js",
  "./js/views/fonts.js", "./js/views/photo.js", "./js/views/draw.js", "./js/views/library.js", "./js/views/saved.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(C).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== C).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  // 내비게이션(공유 타깃 ?text= 포함)은 셸을 먼저 — 쿼리스트링 캐시 미스/느린망 대비.
  if (e.request.mode === "navigate") {
    e.respondWith(caches.match("./index.html").then((h) => h || fetch(e.request)));
    return;
  }
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((resp) => {
      const cp = resp.clone();
      caches.open(C).then((c) => c.put(e.request, cp)).catch(() => {});
      return resp;
    }).catch(() => caches.match("./index.html")))
  );
});
