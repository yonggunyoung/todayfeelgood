// 토스 인앱 광고 2.0 (보상형/전면) — 통합 광고 SDK를, 바닐라 냉비서(js/toss.js)가 쓸 수 있게
//   전역 브리지(window.__tossRewardedAd)로 노출한다.
//   문서: developers-apps-in-toss.toss.im → 인앱 광고(IntegratedAd) — loadFullScreenAd / showFullScreenAd.
//   정책 준수: 보상은 'userEarnedReward'(완주) 때만. 한 번 호출 = 광고 한 번만(중복 노출 금지).
import { loadFullScreenAd, showFullScreenAd } from '@apps-in-toss/web-framework';

// TODO(실수익 전환): 사업자등록 + 콘솔 "보상형 광고그룹" 생성 후, 발급된 adGroupId로 교체.
//   개발/검수 단계에서는 반드시 토스 공식 "테스트 광고 ID"를 써야 함(실제 ID로 테스트 시 정책 위반).
const REWARD_AD_GROUP = 'ait-ad-test-rewarded-id';

declare global {
  interface Window {
    __tossRewardedAd?: () => Promise<boolean | null>;
  }
}

// 지원 여부: isSupported()가 있으면 그 결과를, 없으면 "지원함"으로 가정(fail-open).
//   실제 미지원이면 load/show가 오류로 떨어져 null을 돌려주고, 호출측(js/main.js)은
//   토스 환경에선 하우스 카운트다운을 띄우지 않으므로 가짜 광고가 보일 일이 없다.
function supported(): boolean {
  try {
    const fn = (showFullScreenAd as { isSupported?: () => boolean }).isSupported;
    if (typeof fn === 'function') return !!fn();
    return true;
  } catch { return true; }
}

// 보상형 광고 1회.
//   완주(userEarnedReward)=true / 중도이탈=false / 미지원·노필·오류·타임아웃=null
//   ※ load → (loaded) → show 를 "딱 한 번"만 수행. 중복 show를 막아 "닫아도 또 뜸"을 차단한다.
window.__tossRewardedAd = () => new Promise<boolean | null>((resolve) => {
  if (!supported()) { resolve(null); return; }
  let earned = false;
  let settled = false;
  let shown = false;
  const finish = (v: boolean | null) => { if (!settled) { settled = true; resolve(v); } };

  const show = () => {
    if (shown || settled) return;            // 이미 노출했거나 이미 끝났으면 재노출 금지
    shown = true;
    try {
      showFullScreenAd({
        options: { adGroupId: REWARD_AD_GROUP },
        onEvent: (e: { type: string }) => {
          if (e.type === 'userEarnedReward') earned = true;             // 완주 → 보상 자격
          else if (e.type === 'dismissed' || e.type === 'closed') finish(earned); // 닫힘 → 결과 확정
          else if (e.type === 'failedToShow') finish(null);             // 노출 실패 → 폴백
        },
        onError: () => finish(null),
      });
    } catch { finish(null); }
  };

  try {
    loadFullScreenAd({
      options: { adGroupId: REWARD_AD_GROUP },
      onEvent: (e: { type: string }) => { if (e.type === 'loaded') show(); }, // 로드 완료 시 1회 노출
      onError: () => finish(null),
    });
  } catch { finish(null); }

  // 로드 지연/무응답(노필 등) 대비 — 8초 내 노출 못 하면 폴백(null). 이미 노출됐으면 무시.
  setTimeout(() => { if (!shown) finish(null); }, 8000);
});

export {};
