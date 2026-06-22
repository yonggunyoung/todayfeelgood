// ⚡ 광클대전 — 앱인토스 부트스트랩(작음).
// Phase A(광고 없이 출시): 게임은 복사된 정적 파일로 자체 동작 → 여기서 할 일 거의 없음.
//
// Phase B(보상형 광고 켤 때): 아래처럼 web-framework SDK를 import해 전역으로 노출하면,
//   기존 toss.js 어댑터(window.AppsInToss / GoogleAdMob / getOperationalEnvironment 탐색)가 그대로 동작한다.
//
//   import { GoogleAdMob, getOperationalEnvironment } from '@apps-in-toss/web-framework';
//   (window as any).GoogleAdMob = GoogleAdMob;
//   (window as any).getOperationalEnvironment = getOperationalEnvironment;
//   // 그리고 콘솔에서 만든 보상형 '광고 그룹ID'를 index.html의 AD.tossAdGroupId 에 입력 + AD.enabled=true
export {};
