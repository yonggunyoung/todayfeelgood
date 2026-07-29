// 글꾸미 토스 미니앱 엔트리.
//
// 역할:
//  (a) 토스 WebView 환경 감지
//  (b) 앱 부팅 "전에" window.__TOSS__ 세팅 → 원본 앱이 SW/설치배너/뒤로가기 가드를 건너뛰도록
//  (c) 복사 성공 시 햅틱(있으면) 훅 노출 — 토스 안에서 네이티브 느낌
//  (d) vendor로 복사된 글꾸미 앱을 import → 부팅
//
// 중요: js/main.js 는 import 되는 순간 최상위에서 boot() 를 실행한다.
//       따라서 플래그/훅은 반드시 그 import "이전"에 세팅해야 한다.

declare global {
  interface Window {
    __TOSS__?: boolean;
    __TOSS_HAPTIC__?: () => void;
    // 토스 WebView SDK가 주입할 수 있는 전역 후보 (../js/toss.js 의 sdk() 와 동일 후보군)
    AppsInToss?: any;
    appsInToss?: any;
    tossMiniApp?: any;
    Toss?: any;
  }
}

function sdk(): any {
  if (typeof window === 'undefined') return null;
  return window.AppsInToss || window.appsInToss || window.tossMiniApp || window.Toss || null;
}

// (a) 토스 WebView 환경 감지 — 주입 전역 또는 UA.
// TODO(verify): 공식 판별 API(env/플랫폼)가 있으면 그것으로 교체.
function isTossWebView(): boolean {
  if (typeof window === 'undefined') return false;
  if (sdk()) return true;
  return /toss/i.test(navigator.userAgent || '');
}

// (b) 부팅 전에 플래그 세팅. 원본 js/main.js 가 이 값을 보고:
//     1) 서비스워커 등록 skip  2) 설치 버튼 skip  3) 뒤로가기 히스토리 가드 skip
//     ※ 3)이 특히 중요 — 토스는 자체 뒤로가기/네비게이션을 쓰므로 히스토리를 가로채면 안 된다.
window.__TOSS__ = isTossWebView();

// (c) 복사 완료 햅틱 — 원본 ui.js 가 window.__TOSS_HAPTIC__?.() 를 호출한다(있을 때만).
// TODO(verify): 햅틱 API 이름은 SDK 문서로 확정. 없으면 navigator.vibrate 폴백.
if (window.__TOSS__) {
  window.__TOSS_HAPTIC__ = () => {
    try {
      const t = sdk();
      if (t?.haptic) { t.haptic(10); return; }
      if (t?.generateHapticFeedback) { t.generateHapticFeedback({ type: 'tickWeak' }); return; }
      navigator.vibrate?.(10);
    } catch {
      /* 햅틱은 부가 기능 — 실패해도 복사 흐름에 영향 없음 */
    }
  };
}

async function boot() {
  // (c-2) 광고 브리지 주입 — 앱 import "이전"에. (js/ads.js 가 window.__TOSS_ADS__ 를 찾는다)
  //   SDK를 번들할 수 있는 건 이 빌드뿐이라 여기서 감싼다. 광고 그룹 ID가 없으면 아무것도 뜨지 않는다.
  if (window.__TOSS__) {
    try {
      const { installTossAds } = await import('./toss-ads');
      installTossAds();
    } catch (e) {
      console.warn('[toss] 광고 브리지 주입 실패 — 광고 없이 계속', e);
    }
  }

  // (d) 글꾸미 앱 부팅. import 시점에 자체적으로 화면을 렌더한다.
  //   vendor/ 는 scripts/vendor.mjs 가 ../geulkkumi 에서 복사해 둔다(yarn vendor).
  // @ts-expect-error — 바닐라 JS 모듈(타입 선언 없음). vendor 복사본이라 빌드 시 존재.
  await import('/vendor/js/main.js');
}

boot().catch((err) => {
  console.error('[geulkkumi-toss] boot failed:', err);
});

export {};
