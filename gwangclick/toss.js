// ⚡ 광클대전 — 토스 미니앱 어댑터 (선택, 의존성 없음).
// 토스 WebView SDK가 주입된 환경이면 그 기능을 쓰고, 토스 밖(웹/파일실행)에서는 안전한 폴백.
// 입점 후 토스 콘솔에서 발급한 광고 단위 ID를 ADS에 채우면 보상형 광고가 활성화된다.
// SDK 전역명·함수는 입점 시점 공식 문서(developers-apps-in-toss.toss.im)로 최종 확인할 것.
(function () {
  function sdk() {
    return window.AppsInToss || window.appsInToss || window.tossMiniApp || null;
  }
  window.Toss = {
    // 토스 앱 안에서 실행 중인가
    inToss: function () { return !!sdk(); },

    // 햅틱 — 토스 안: 네이티브 진동 / 밖: navigator.vibrate
    haptic: function (ms) {
      var t = sdk();
      try { if (t && t.haptic) { t.haptic({ type: 'tap' }); return; } } catch (e) {}
      if (navigator.vibrate) navigator.vibrate(ms);
    },

    // 보상형 광고 (예: '한 판 더 보상' 같은 수익화에 사용 — v1은 미사용, 입점 후 연결)
    // 반환: true(완주) | false(중도이탈) | null(토스 아님/광고없음)
    rewardedAd: function (adUnitId) {
      return new Promise(function (res) {
        var t = sdk();
        if (!t || !adUnitId || !t.showFullScreenAd) { res(null); return; }
        try {
          t.showFullScreenAd({
            adUnitId: adUnitId,
            onEvent: function (e) {
              if (e && e.type === 'userEarnedReward') res(true);
              else if (e && (e.type === 'dismissed' || e.type === 'closed')) res(false);
            },
            onError: function () { res(null); },
          });
        } catch (e) { res(null); }
      });
    },
  };
})();
