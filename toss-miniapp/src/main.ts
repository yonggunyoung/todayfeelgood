// 냉비서 토스 미니앱 엔트리.
//
// 역할:
//  (a) 토스 WebView 환경 감지
//  (b) 앱 부팅 "전에" 전역 플래그를 세팅 → 루트 앱이 PWA/서비스워커/FCM을 건너뛰도록 (아래 TODO 참고)
//  (c) (선택) 토스 로그인 어댑터 호출
//  (d) vendor로 복사된 기존 냉비서 앱을 import → 부팅
//
// 중요: js/main.js 는 import 되는 순간 최상위에서 render()/initSync()/initAnalytics() 를 호출하며
//       스스로 부팅한다. 따라서 플래그/로그인은 반드시 그 import "이전"에 처리해야 한다.

declare global {
  interface Window {
    __TOSS__?: boolean;
    // 토스 WebView SDK가 주입할 수 있는 전역 후보 (js/toss.js 의 sdk() 와 동일 후보군)
    AppsInToss?: unknown;
    appsInToss?: unknown;
    tossMiniApp?: unknown;
  }
}

// (a) 토스 WebView 환경 감지.
//   - 주입 전역(window.AppsInToss 등) 또는 UA로 추정.
// TODO(verify): 토스 WebView를 식별하는 공식 방법(전역 이름/UA 토큰)을 최신 문서로 확정.
//   @apps-in-toss/web-framework 가 제공하는 env/플랫폼 판별 API가 있으면 그것을 사용할 것.
function isTossWebView(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window;
  if (w.AppsInToss || w.appsInToss || w.tossMiniApp) return true;
  const ua = navigator.userAgent || '';
  return /toss/i.test(ua);
}

// (b) 부팅 전에 전역 플래그 세팅.
//   냉비서(js/main.js 및 js/push.js)는 아직 이 플래그를 검사하지 않는다.
// TODO(verify): 루트 앱에 분기 추가 필요 — 토스 빌드에서 다음을 끄려면:
//   1) 서비스워커: 이미 토스용 index.html 에서 SW 등록 <script>를 제거했으므로 OK.
//   2) FCM 웹푸시: js/push.js 의 pushSupported() 가 `&& !window.__TOSS__` 를 검사하도록 (선택).
//      (현재는 사용자가 직접 "알림 켜기"를 눌러야만 동작하므로 자동 부작용은 없음.)
//   3) PWA 설치 배너: js/main.js 끝의 beforeinstallprompt/appinstalled/iOS-Safari IIFE 를
//      `if (window.__TOSS__) return;` 으로 가드 (선택).
//   ※ 이 분기들은 루트 앱에 아직 들어있지 않다. 플래그는 그 분기를 위해 미리 세팅하는 것.
window.__TOSS__ = isTossWebView();

async function boot() {
  // (c) (선택) 토스 로그인. 지금은 자동 실행하지 않고, 설정 화면 등에서 호출하도록 노출만 한다.
  //   자동 로그인을 원하면 아래 주석을 해제. (단, appLogin 은 사용자 동의 UI를 띄움)
  // if (window.__TOSS__) {
  //   const { tossLogin } = await import('./toss-login');
  //   try { await tossLogin(); } catch (e) { console.warn('[toss] login skipped', e); }
  // }

  // (d) 기존 냉비서 앱 부팅. import 시점에 자체적으로 화면을 렌더한다.
  //   vendor/ 는 scripts/vendor.mjs 가 루트 앱에서 복사해 둔다(yarn vendor).
  //   Vite가 /vendor 를 정적 자산으로 서빙하므로 절대경로로 import.
  // @ts-expect-error — 바닐라 JS 모듈(타입 선언 없음). vendor(=publicDir) 정적 자산. Vite 미변환·런타임 로드(@vite-ignore).
  await import(/* @vite-ignore */ '/js/main.js');
}

boot().catch((err) => {
  console.error('[naengbiseo-toss] boot failed:', err);
});

export {};
