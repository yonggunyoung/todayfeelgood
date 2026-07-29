// 앱인토스 어댑터 — 같은 코드가 토스 안/밖에서 모두 돈다 (개별 운영 시 자동 폴백)
//
// [중요] 광고 API는 SDK를 번들해야 쓸 수 있다(정적 PWA엔 번들러가 없음).
//   그래서 토스 빌드(toss-miniapp/src/toss-ads.ts)가 SDK를 정식 import 해
//   window.__TOSS_ADS__ 브리지를 '앱 부팅 전에' 주입한다. 여기서는 그 브리지만 호출한다.
//   → 웹(브라우저)에서는 브리지가 없으므로 전부 null 반환 → 호출측이 하우스 광고로 폴백.
//
// [실제 SDK 시그니처 — @apps-in-toss/web-framework 2.10.8 소스에서 확인]
//   · 보상형: GoogleAdMob.loadAppsInTossAdMob({ options:{ adGroupId }, onEvent, onError }) → cleanup
//             이어서 GoogleAdMob.showAppsInTossAdMob({ options:{ adGroupId }, ... })
//             ※ 식별자는 adUnitId가 아니라 **options.adGroupId** (중첩!). 각 함수에 isSupported()가 있다.
//   · 배너  : TossAds.initialize({callbacks}) → TossAds.attachBanner(adGroupId, target, opts) → { destroy }
import { TOSS } from './config.js';

// 토스 빌드가 주입한 광고 브리지(없으면 웹 환경)
function bridge() {
  return (typeof window !== 'undefined' && window.__TOSS_ADS__) || null;
}
export const inToss = () => !!bridge();

/* 보상형 광고 — 토스 안: 실제 SDK / 밖: null 반환(하우스 광고 폴백은 호출측 playAd가 담당)
   반환: true(보상 지급 조건 충족) | false(중도 이탈) | null(토스 아님·광고 없음 → 폴백) */
export function tossRewardedAd() {
  const b = bridge();
  if (!b || !TOSS.rewardAdId) return Promise.resolve(null);
  try {
    return Promise.resolve(b.rewarded(TOSS.rewardAdId)).catch(() => null);
  } catch {
    return Promise.resolve(null);
  }
}

/* 배너 광고 — 토스 안에서만. target(요소/셀렉터)에 배너를 붙이고 { destroy } 반환(없으면 null).
   토스 밖에서는 아무것도 하지 않는다(웹은 자체 광고 정책을 따름). */
export function tossAttachBanner(target, opts) {
  const b = bridge();
  if (!b || !TOSS.bannerAdId || !target || !b.attachBanner) return null;
  try {
    return b.attachBanner(TOSS.bannerAdId, target, opts || {}) || null;
  } catch {
    return null;
  }
}

/* 토스포인트 지급 (프로모션) — 토스 안에서만 의미 있음. 밖에서는 앱 내 포인트만 적립.
   비즈월렛 예산이 소진되면 실패를 반환 → 조용히 무시 (앱 내 포인트는 이미 적립됨) */
export async function tossGivePoints(reason) {
  const b = bridge();
  if (!b || !TOSS.promotionId || !b.givePoints) return false;
  try {
    return await b.givePoints(TOSS.promotionId, reason);
  } catch {
    return false;
  }
}
