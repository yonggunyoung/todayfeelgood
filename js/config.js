// 상용 배포 설정 — 운영자가 이 파일을 1회 채워 커밋하면, 사용자는 "구글로 시작하기"만 누르면 된다.
// (Firebase 웹 구성은 공개되어도 안전한 클라이언트 설정값이다 — 보안은 Firestore 규칙과 서버가 담당)

// ① Firebase 콘솔 → 프로젝트 설정 → 웹 앱 구성 객체를 붙여넣기
//    + Authentication에서 Google 로그인 사용 설정
//    + Authentication → 승인된 도메인에 yonggunyoung.github.io (및 커스텀 도메인) 추가
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyB-y7AXH7xBScwycGywRztpRohxZ87-qDI',
  authDomain: 'icebi-308e0.firebaseapp.com',
  projectId: 'icebi-308e0',
  storageBucket: 'icebi-308e0.firebasestorage.app',
  messagingSenderId: '63517169912',
  appId: '1:63517169912:web:c1ac9ec44c27c34f58c30d',
  // 사용 계측(GA4) — Firebase 콘솔에서 Analytics 사용 설정 후, 웹앱 구성에 나오는 measurementId(G-XXXX)를 붙여넣으면 켜진다.
  // 비어 있으면 계측은 조용히 꺼져 있고 앱 동작엔 영향 없음.
  measurementId: '',
};
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
//    workers.dev 직주소 사용 — 커스텀 도메인(ai2.ddukkit.com)은 존 WAF가 POST를 막아서(403) 우회.
export const AI_ENDPOINT = 'https://ai-gateway.yonggunyoung.workers.dev';

// ②-b AI 역할별 Gemini 사용 스위치 — 아래 AI_FN(서울 Firebase 함수)이 채워지고 검증된 뒤 true로 켠다.
//     false면 전부 Claude로 동작하므로 동작 변화가 없다. 모델 버전은 함수의 GEMINI_MODEL 환경변수가 정한다(여기엔 버전명 안 박음).
export const AI_GEMINI = { scan: true, recipe: true };

// ②-c Gemini 전용 백엔드 — Firebase 함수(서울 리전) URL. Gemini는 Cloudflare에서 지역 차단되므로 구글 리전에서 호출한다.
//     `firebase deploy` 후 출력되는 함수 URL을 붙여넣는다 (예: https://asia-northeast3-PROJECT.cloudfunctions.net/ai). 비우면 Gemini OFF.
export const AI_FN = 'https://asia-northeast3-icebi-308e0.cloudfunctions.net/ai';

// ③ 앱인토스 입점 후 채우기 — 콘솔에서 발급받는 값 (비우면 개별 운영 모드로 자동 폴백)
//    rewardAdId: 보상형 광고 단위 / promotionId: 토스포인트 프로모션 (비즈월렛 예산 선충전 필요)
export const TOSS = { rewardAdId: '', promotionId: '' };

// ④ 쿠팡 파트너스 트래킹 ID — 장보기 "쿠팡" 버튼에 제휴 태그로 붙는다.
//    설정에서 개별 ID를 넣으면 그게 우선한다(없으면 이 값 사용). 공정위 고지 문구가 함께 노출된다.
export const COUPANG_TAG = 'AF7276945';
