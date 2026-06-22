// ⚡ 광클대전 — 토스 미니앱(앱인토스) 어댑터. 의존성 0 · 토스 밖(웹/파일)에서는 안전 폴백.
//
// [실제 SDK 정합 — 공식 예제로 검증함]
//   · 광고는 "로드 → 표시" 2단계: loadAppsInTossAdMob({adGroupId,onEvent}) → showAppsInTossAdMob()
//     (미리 로드 안 하면 '광고 미노출'이 잦음 — 커뮤니티 다수 사례. so 로드 후 'loaded'에 표시.)
//   · 식별자는 adUnitId가 아니라 **adGroupId** (보상형/전면형을 콘솔 그룹ID로 구분).
//   · onEvent type: loaded·requested·impression·show·dismissed·failedToShow·userEarnedReward.
//   · load() 는 cleanup 함수를 반환 → 끝나면 호출해 정리.
//   · 환경감지: getOperationalEnvironment() → 'toss' | 'sandbox'.
//   출처: github.com/toss/apps-in-toss-examples (with-rewarded-ad), 앱인토스 개발자센터 광고 레퍼런스.
//
// [방어적 설계 — 원칙1: 불신을 기본값으로]
//   web-framework(정적웹)와 Granite(RN)에서 전역/함수명이 다를 수 있어, 알려진 이름들을 순서대로 탐색하고
//   show 호출 시그니처도 3가지(opts / adGroupId,opts / 무인자)를 폴백한다. 어느 쪽이든 동작·미존재시 null.
(function () {
  function rawSdk() {
    return window.AppsInToss || window.appsInToss || window.tossMiniApp || null;
  }
  // 함수가 들어있을 수 있는 후보 객체들(전역·SDK·GoogleAdMob 네임스페이스)
  function holders() {
    var s = rawSdk();
    return [window.GoogleAdMob, s && s.GoogleAdMob, s, window.AppsInToss, window.appsInToss, window];
  }
  // 후보 객체들에서 names 중 첫 함수를 찾아 바인딩해 반환(없으면 null)
  function fn(names) {
    var hs = holders();
    for (var i = 0; i < hs.length; i++) {
      var h = hs[i]; if (!h) continue;
      for (var j = 0; j < names.length; j++) {
        try { if (typeof h[names[j]] === 'function') return h[names[j]].bind(h); } catch (e) {}
      }
    }
    return null;
  }
  function envOf() {
    var f = fn(['getOperationalEnvironment']);
    try { return f ? f() : null; } catch (e) { return null; }
  }

  var LOAD = ['loadAppsInTossAdMob', 'loadAdMobRewardedAd', 'loadFullScreenAd', 'loadRewardedAd'];
  var SHOW = ['showAppsInTossAdMob', 'showAdMobRewardedAd', 'showFullScreenAd', 'showRewardedAd'];

  // show 호출 — 시그니처 차이를 폴백으로 흡수
  function callShow(showFn, adGroupId, opts) {
    try { return showFn(opts); } catch (e) {}
    try { return showFn(adGroupId, opts); } catch (e) {}
    try { return showFn(); } catch (e) {}
  }

  window.Toss = {
    // 토스(또는 샌드박스) 안에서 실행 중인가
    inToss: function () {
      var e = envOf();
      if (e) return e === 'toss' || e === 'sandbox';
      return !!rawSdk();
    },

    // 환경 문자열 그대로(없으면 null) — 디버깅/분기용
    env: function () { return envOf(); },

    // 햅틱 — 토스 네이티브 우선, 밖에선 navigator.vibrate
    haptic: function (ms) {
      var f = fn(['haptic', 'generateHapticFeedback', 'hapticFeedback']);
      try { if (f) { f({ type: 'tap' }); return; } } catch (e) {}
      if (navigator.vibrate) try { navigator.vibrate(ms); } catch (e) {}
    },

    // 보상형 광고: 로드→표시. 반환 Promise<true 완주 | false 중도이탈 | null 토스아님/광고없음>
    rewardedAd: function (adGroupId) {
      return new Promise(function (res) {
        if (!this.inToss() || !adGroupId) { res(null); return; }
        var loadFn = fn(LOAD), showFn = fn(SHOW);
        if (!loadFn && !showFn) { res(null); return; }

        var settled = false, rewarded = false, shown = false, cleanup = null, to = null;
        function finish(v) {
          if (settled) return; settled = true;
          if (to) clearTimeout(to);
          try { if (typeof cleanup === 'function') cleanup(); } catch (e) {}
          res(v);
        }
        function show() {
          if (shown || !showFn) return; shown = true;
          callShow(showFn, adGroupId, opts);
        }
        function onEvent(e) {
          var type = e && (e.type || e.name || e);
          if (type === 'userEarnedReward') { rewarded = true; finish(true); }
          else if (type === 'dismissed' || type === 'closed') { finish(rewarded); }
          else if (type === 'failedToShow' || type === 'error' || type === 'failed') { finish(rewarded ? true : null); }
          else if (type === 'loaded') { show(); }
        }
        // 콜백형 SDK도 함께 지원(onRewarded/onDismiss/onError)
        var opts = {
          adGroupId: adGroupId, onEvent: onEvent,
          onRewarded: function () { rewarded = true; finish(true); },
          onDismiss: function () { finish(rewarded); },
          onError: function () { finish(rewarded ? true : null); },
        };

        // 안전장치: 20초 내 아무 결과 없으면 null로 종료(무한대기 방지 — 계약적 경계)
        to = setTimeout(function () { finish(rewarded ? true : null); }, 20000);

        try {
          if (loadFn) {
            cleanup = loadFn(opts);
            // 'loaded' 이벤트를 못 받는 SDK 대비: 1.2초 뒤에도 미표시면 직접 show
            setTimeout(show, 1200);
          } else {
            show(); // load 없는 SDK: 곧장 표시
          }
        } catch (e) { finish(null); }
      }.bind(this));
    },
  };
})();
