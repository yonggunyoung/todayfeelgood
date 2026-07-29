// 첫 페인트 전에 다크/라이트 테마 적용(FOUC 방지). CSP script-src 'self' 준수(인라인 스크립트 금지).
(function () {
  try {
    var pref = localStorage.getItem('oneulgibun:theme') || 'system';
    var dark = pref === 'dark' || (pref !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    var mc = document.querySelector('meta[name="theme-color"]');
    if (mc) mc.setAttribute('content', dark ? '#1C1922' : '#FBF6EE');
  } catch (e) { /* localStorage/matchMedia 불가 → 라이트 기본 */ }
})();
