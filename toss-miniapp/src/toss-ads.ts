// 토스 인앱 광고 2.0 ver2 (보상형) — 통합 광고 SDK를, 바닐라 냉비서(js/toss.js)가 쓸 수 있게
//   전역 브리지(window.__tossRewardedAd)로 노출한다.
//   문서: developers-apps-in-toss.toss.im → 인앱 광고(IntegratedAd) — loadFullScreenAd / showFullScreenAd, adGroupId 기준.
//   정책 준수: 보상은 'userEarnedReward'(완주) 때만 지급. 클릭·dismissed로는 지급하지 않음.
import { loadFullScreenAd, showFullScreenAd } from '@apps-in-toss/web-framework';

// TODO(실수익 전환): 사업자등록 + 콘솔에서 "보상형 광고그룹" 생성 후, 발급된 adGroupId로 교체할 것.
//   개발/검수 단계에서는 반드시 토스 공식 "테스트 광고 ID"를 써야 함(실제 ID로 테스트 시 정책 위반).
const REWARD_AD_GROUP = 'ait-ad-test-rewarded-id';

declare global {
  interface Window {
    __tossRewardedAd?: () => Promise<boolean | null>;
  }
}

// 지원 여부 판단: isSupported()가 있으면 그 결과를 따르고, 없으면 "지원함"으로 가정한다.
//   (토스 번들에서만 이 모듈이 로드되므로 SDK는 존재. isSupported 미제공 SDK 버전에서
//    false로 단정하면 광고가 영영 안 떠버리는 사고가 나므로 fail-open. 실제 미지원이면
//    load/show 호출이 onError로 떨어져 null 반환 → 호출측 하우스 광고로 안전하게 폴백.)
function supported(): boolean {
  try {
    const fn = (showFullScreenAd as { isSupported?: () => boolean }).isSupported;
    if (typeof fn === 'function') return !!fn();
    return true;
  } catch { return true; }
}

let adLoaded = false;
function preload(): void {
  if (!supported()) return;
  try {
    loadFullScreenAd({
      options: { adGroupId: REWARD_AD_GROUP },
      onEvent: (e: { type: string }) => { if (e.type === 'loaded') adLoaded = true; },
      onError: () => { adLoaded = false; },
    });
  } catch { /* noop */ }
}

// 보상형 광고 1회. 완주(userEarnedReward)=true / 중도이탈=false / 미지원·오류=null(→ 호출측 하우스 광고 폴백).
window.__tossRewardedAd = () => new Promise<boolean | null>((resolve) => {
  if (!supported()) { resolve(null); return; }
  let earned = false;
  let done = false;
  const finish = (v: boolean | null) => { if (!done) { done = true; resolve(v); } };
  const show = () => {
    try {
      showFullScreenAd({
        options: { adGroupId: REWARD_AD_GROUP },
        onEvent: (e: { type: string; data?: { unitType: string; unitAmount: number } }) => {
          if (e.type === 'userEarnedReward') earned = true;              // ✅ 완주 → 보상 자격
          else if (e.type === 'dismissed') { adLoaded = false; preload(); finish(earned); } // 닫힘 → 결과 확정 + 다음 광고 미리 로드
          else if (e.type === 'failedToShow') finish(null);
        },
        onError: () => finish(null),
      });
    } catch { finish(null); }
  };
  // load → (loaded) → show 순서 준수. 미리 로드돼 있으면 바로 show.
  if (adLoaded) { show(); return; }
  try {
    loadFullScreenAd({
      options: { adGroupId: REWARD_AD_GROUP },
      onEvent: (e: { type: string }) => { if (e.type === 'loaded') { adLoaded = true; show(); } },
      onError: () => finish(null),
    });
  } catch { finish(null); }
});

// 진입 시 1개 미리 로드(권장 패턴: load → show → load …)
preload();

export {};
