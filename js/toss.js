// 앱인토스 어댑터 — 같은 코드가 토스 안/밖에서 모두 돈다 (개별 운영 시 자동 폴백)
//
// 입점 후 할 일 (docs/10):
//  1. 앱인토스 콘솔에서 미니앱 등록 → WebView SDK 스크립트가 주입된 환경에서 앱 URL 구동
//  2. 콘솔에서 보상형 광고 단위·프로모션(토스포인트) 생성 → config.js TOSS에 ID 기입
//  3. 비즈월렛에 포인트 예산 선충전 (지급 실비만 차감, 플랫폼 수수료 없음 — 80% 소진 시 메일 알림)
// SDK 전역 객체·함수명은 입점 시점의 공식 문서(developers-apps-in-toss.toss.im)로 최종 확인할 것.
import { TOSS } from './config.js';

// 토스 WebView SDK가 주입한 전역 탐지 (SDK 버전에 따라 이름이 다를 수 있어 후보를 순회)
function sdk() {
  if (typeof window === 'undefined') return null;
  return window.AppsInToss || window.appsInToss || window.tossMiniApp || null;
}
export const inToss = () => !!sdk();

/* 보상형 광고 — 토스 안: SDK 광고 / 밖: null 반환(하우스 광고 폴백은 호출측 playAd가 담당)
   반환: true(보상 지급 조건 충족) | false(중도 이탈) | null(토스 환경 아님 → 폴백)

   토스 빌드에서는 src/toss-ads.ts 가 통합 광고 SDK(loadFullScreenAd/showFullScreenAd)를
   window.__tossRewardedAd 로 노출한다 → 그게 있으면 그걸 우선 사용(권장 흐름: load→show→load).
   없으면(구버전/주입형) 아래 전역 SDK 폴백, 그것도 없으면 null(웹). */
export function tossRewardedAd() {
  if (typeof window !== 'undefined' && typeof window.__tossRewardedAd === 'function') {
    return window.__tossRewardedAd();
  }
  const t = sdk();
  if (!t || !TOSS.rewardAdId) return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      // 공식 흐름: showFullScreenAd 호출 → onEvent로 userEarnedReward 수신 시 보상 확정
      t.showFullScreenAd({
        adUnitId: TOSS.rewardAdId,
        onEvent: (e) => {
          if (e?.type === 'userEarnedReward') resolve(true);
          else if (e?.type === 'dismissed' || e?.type === 'closed') resolve(false);
        },
        onError: () => resolve(null), // 광고 없음/오류 → 하우스 광고 폴백
      });
    } catch {
      resolve(null);
    }
  });
}

/* 토스포인트 지급 (프로모션) — 토스 안에서만 의미 있음. 밖에서는 앱 내 포인트만 적립.
   비즈월렛 예산이 소진되면 SDK가 실패를 반환 → 조용히 무시 (앱 내 포인트는 이미 적립됨) */
export async function tossGivePoints(reason) {
  const t = sdk();
  if (!t || !TOSS.promotionId) return false;
  try {
    await t.runPromotion?.({ promotionId: TOSS.promotionId, key: reason });
    return true;
  } catch {
    return false;
  }
}
