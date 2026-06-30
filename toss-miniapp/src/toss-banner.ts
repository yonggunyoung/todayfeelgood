// 토스 인앱 광고 — 배너(WebView). 바닐라 냉비서가 쓸 수 있게 window.__tossBanner 전역으로 노출.
//   문서: developers-apps-in-toss.toss.im → 인앱 광고 / 배너 광고(WebView) — TossAds.initialize / attachBanner.
//   요구: 토스앱 5.241.0+ (isSupported()로 자동 판별). 미지원이면 supported()=false →
//        호출측(js/main.js)이 배너 영역 자체를 만들지 않는다(빈 96px 공백 방지).
//   정책: SDK 표준 컴포넌트 그대로 사용(색/문구/크기 변형 금지), 클릭 보상 유도 금지, 겹침·은닉 금지,
//        주기적 자동 새로고침 금지(부착은 1회만 — 갱신은 SDK가 알아서 함).
import * as AIT from '@apps-in-toss/web-framework';

// 설치된 SDK 버전에 TossAds(배너 API)가 없을 수도 있으므로 네임스페이스에서 안전하게 꺼낸다.
//   (없으면 supported()=false 로 떨어져 배너를 만들지 않음 — 빌드/런타임 안전)
const TossAds: any = (AIT as any).TossAds;

// 실제 배너 광고그룹(메인_배너, 문구 강조) — 콘솔 발급 라이브 ID.
//   ※ 테스트 ID는 '출시 번들 금지' 정책이라 라이브 ID로 교체 완료.
//   ※ 이 ID는 비밀이 아님(앱 번들에 실리는 클라이언트 식별자) — 공개 저장소 커밋 OK.
const BANNER_AD_GROUP = 'ait.v2.live.bd0104ba0ca24dec';

declare global {
  interface Window {
    __tossBanner?: {
      supported: () => boolean;
      mount: (el: HTMLElement) => void;
      unmount: () => void;
    };
  }
}

function bannerSupported(): boolean {
  try {
    const fn = TossAds?.attachBanner?.isSupported;
    // isSupported가 있으면 그 결과를 따른다. 없거나(구버전/미주입) 오류면 false → 배너 영역 안 만듦.
    return typeof fn === 'function' ? !!fn() : false;
  } catch { return false; }
}

let initialized = false;
let initializing = false;
let pendingEl: HTMLElement | null = null;
let attached: { destroy: () => void } | null = null;

function doAttach(el: HTMLElement): void {
  if (!el || attached) return;
  try {
    attached = TossAds.attachBanner(BANNER_AD_GROUP, el, {
      theme: 'auto',          // 시스템 다크모드 자동 전환
      tone: 'blackAndWhite',
      variant: 'expanded',    // 전체 너비
      callbacks: {
        onAdFailedToRender: () => { /* 렌더 실패 — 고정 높이 영역만 유지 */ },
        onNoFill: () => { /* 채울 광고 없음 */ },
      },
    });
  } catch { /* noop */ }
}

function ensureInit(): void {
  if (initialized || initializing) return;
  if (!bannerSupported()) return;
  initializing = true;
  try {
    // 권장: 앱 최상위에서 1회만 초기화. 완료는 콜백으로 통지됨.
    TossAds.initialize({
      callbacks: {
        onInitialized: () => {
          initialized = true; initializing = false;
          if (pendingEl) { doAttach(pendingEl); pendingEl = null; }
        },
        onInitializationFailed: () => { initializing = false; },
      },
    });
  } catch { initializing = false; }
}

window.__tossBanner = {
  supported: bannerSupported,
  mount(el: HTMLElement) {
    if (!bannerSupported()) return;
    if (initialized) doAttach(el);
    else { pendingEl = el; ensureInit(); } // 초기화 끝나면 자동 부착
  },
  unmount() {
    try { attached?.destroy(); } catch { /* noop */ }
    attached = null;
  },
};

// 진입 시 초기화 준비(권장 패턴).
ensureInit();

export {};
