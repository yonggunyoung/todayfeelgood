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

// ② functions 배포 후 나온 URL을 넣으면 모든 사용자에게 서버 AI(무료 한도+광고충전+프리미엄)가 기본 적용된다
export const AI_ENDPOINT = '';
