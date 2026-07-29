// 앱인토스 광고 브리지 — SDK를 정식 import 해서 window.__TOSS_ADS__ 로 노출한다.
//
// 왜 이 파일이 필요한가:
//   냉비서 본체(../js)는 빌드 없는 정적 PWA라 `import '@apps-in-toss/web-framework'` 를 할 수 없다.
//   토스 빌드(Vite)만 SDK를 번들할 수 있으므로, 여기서 감싸 브리지로 넘긴다.
//   → 본체 js/toss.js 는 이 브리지만 호출하고, 웹에서는 브리지가 없어 자동 폴백된다.
//
// [시그니처는 SDK 2.10.8 소스에서 확인한 실제 형태]
//   GoogleAdMob.loadAppsInTossAdMob({ options:{ adGroupId }, onEvent, onError }) → cleanup()
//   GoogleAdMob.showAppsInTossAdMob({ options:{ adGroupId }, onEvent, onError })
//   TossAds.initialize({ callbacks }) · TossAds.attachBanner(adGroupId, target, opts) → { destroy }
//   각 함수에 .isSupported() 가 붙어 있어 호출 전에 반드시 확인한다.
//
// [견고성] named import 대신 **네임스페이스 import + 런타임 탐색**을 쓴다.
//   SDK 버전에 따라 어떤 심볼은 존재하지 않을 수 있는데, named import 는 그 경우 *빌드가 깨진다*
//   (실측: 2.10.8 타입엔 TossAds 가 있으나 일부 설치본 런타임엔 없음). 네임스페이스는 안전하다.
import * as AIT from '@apps-in-toss/web-framework';

// SDK 네임스페이스 또는 전역에서 심볼 찾기(둘 다 없으면 null → 호출측이 폴백)
function pick<T = any>(name: string): T | null {
  const ns: any = AIT as any;
  const w: any = typeof window !== 'undefined' ? window : {};
  return ns?.[name] ?? w?.[name] ?? w?.AppsInToss?.[name] ?? null;
}

type Rewarded = (adGroupId: string) => Promise<boolean | null>;
type AttachBanner = (adGroupId: string, target: string | HTMLElement, opts?: any) => { destroy: () => void } | null;

declare global {
  interface Window {
    __TOSS_ADS__?: { inToss: true; rewarded: Rewarded; attachBanner: AttachBanner };
  }
}

function supported(fn: any): boolean {
  try { return typeof fn === 'function' && (typeof fn.isSupported !== 'function' || fn.isSupported() === true); }
  catch { return false; }
}

// 보상형: 로드 → 'loaded' 수신 시 표시 → userEarnedReward 로 보상 확정.
// (미리 로드하지 않고 곧장 show 하면 '광고 미노출'이 잦다 — 공식 예제도 로드 후 표시 패턴)
const rewarded: Rewarded = (adGroupId) =>
  new Promise((resolve) => {
    const GoogleAdMob: any = pick('GoogleAdMob');
    if (!adGroupId || !supported(GoogleAdMob?.loadAppsInTossAdMob) || !supported(GoogleAdMob?.showAppsInTossAdMob)) {
      resolve(null);
      return;
    }
    let settled = false;
    let earned = false;
    let shown = false;
    let cleanup: (() => void) | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const finish = (v: boolean | null) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      try { cleanup?.(); } catch { /* 정리 실패는 무시 */ }
      resolve(v);
    };

    const show = () => {
      if (shown) return;
      shown = true;
      try {
        GoogleAdMob.showAppsInTossAdMob({
          options: { adGroupId },
          onEvent: (e: any) => {
            const t = e?.type;
            if (t === 'userEarnedReward') earned = true;
            else if (t === 'dismissed' || t === 'closed') finish(earned);
            else if (t === 'failedToShow') finish(earned ? true : null);
          },
          onError: () => finish(earned ? true : null),
        });
      } catch { finish(null); }
    };

    try {
      cleanup = GoogleAdMob.loadAppsInTossAdMob({
        options: { adGroupId },
        onEvent: (e: any) => {
          const t = e?.type;
          if (t === 'loaded') show();
          else if (t === 'userEarnedReward') earned = true;
          else if (t === 'dismissed' || t === 'closed') finish(earned);
        },
        onError: () => finish(null), // 광고 없음(no fill) 등 → 호출측이 하우스 광고로 폴백
      });
    } catch {
      finish(null);
      return;
    }
    // 안전장치: 20초 안에 아무 결과도 없으면 종료(무한 대기 방지)
    timer = setTimeout(() => finish(earned ? true : null), 20000);
  });

let bannerReady = false;
const attachBanner: AttachBanner = (adGroupId, target, opts) => {
  const TossAds: any = pick('TossAds');
  if (!adGroupId || !target || !supported(TossAds?.attachBanner)) return null;
  try {
    if (!bannerReady && supported(TossAds?.initialize)) {
      TossAds.initialize({ callbacks: { onInitializationFailed: () => { bannerReady = false; } } });
      bannerReady = true;
    }
    // variant 'card' = 카드형 배너, theme 'auto' = 앱 테마 따라감
    return TossAds.attachBanner(adGroupId, target, { theme: 'auto', variant: 'card', ...(opts || {}) }) || null;
  } catch {
    return null;
  }
};

/** 앱 부팅 "전에" 호출 — 본체(js/toss.js)가 window.__TOSS_ADS__ 를 찾을 수 있게 한다. */
export function installTossAds() {
  window.__TOSS_ADS__ = { inToss: true, rewarded, attachBanner };
}
