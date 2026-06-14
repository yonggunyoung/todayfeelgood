// 상용 배포 설정 — 운영자가 이 파일을 1회 채워 커밋하면, 사용자는 "구글로 시작하기"만 누르면 된다.
// (Firebase 웹 구성은 공개되어도 안전한 클라이언트 설정값이다 — 보안은 Firestore 규칙과 서버가 담당)

// ① Firebase 콘솔 → 프로젝트 설정 → 웹 앱 구성 객체를 붙여넣기
//    + Authentication에서 Google 로그인 사용 설정
//    + Authentication → 승인된 도메인에 yonggunyoung.github.io (및 커스텀 도메인) 추가
export const FIREBASE_CONFIG = null;
/* 예시:
export const FIREBASE_CONFIG = {
  apiKey: 'AIza…',
  authDomain: 'naengbiseo.firebaseapp.com',
  projectId: 'naengbiseo',
  storageBucket: 'naengbiseo.appspot.com',
  messagingSenderId: '1234567890',
  appId: '1:1234567890:web:abcdef',
};
*/

// ② AI 게이트웨이 URL — Cloudflare Worker가 Anthropic 키를 보관·주입한다.
//    이 값이 채워지면(그리고 사용자가 본인 키를 안 넣었으면) 서버 AI 모드가 기본 적용된다.
//    ※ 여기엔 엔드포인트 주소만 둔다. 실제 API 키는 절대 이 파일/저장소에 넣지 말 것 (워커 Secret에만).
export const AI_ENDPOINT = 'https://ai2.ddukkit.com';

// ③ 앱인토스 입점 후 채우기 — 콘솔에서 발급받는 값 (비우면 개별 운영 모드로 자동 폴백)
//    rewardAdId: 보상형 광고 단위 / promotionId: 토스포인트 프로모션 (비즈월렛 예산 선충전 필요)
export const TOSS = { rewardAdId: '', promotionId: '' };

// ④ 쿠팡 파트너스 트래킹 ID — 장보기 "쿠팡" 버튼에 제휴 태그로 붙는다.
//    설정에서 개별 ID를 넣으면 그게 우선한다(없으면 이 값 사용). 공정위 고지 문구가 함께 노출된다.
export const COUPANG_TAG = 'AF7276945';
