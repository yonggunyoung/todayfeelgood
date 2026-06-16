/* ⚡ 광클대전 — 백엔드 설정 (1회만 채우면 '실제 전국 대전'이 켜집니다)
 *
 * 냉비서와 같은 Firebase 프로젝트를 그대로 재사용하세요.
 * Firebase 콘솔 → 프로젝트 설정 → 내 앱 → 웹 앱 구성 객체를 아래 GC_FB 에 붙여넣기.
 * (웹 config 값은 공개되어도 안전한 클라이언트 설정입니다 — 보안은 Firestore 규칙이 담당. FIREBASE.md 참고)
 *
 * 콘솔에서 추가로 1회 설정:
 *   1) Authentication → 로그인 방법 → '익명(Anonymous)' 사용 설정 (로그인 없이 전국 집계 참여)
 *   2) Authentication → 설정 → 승인된 도메인에 ddukkit.com 추가
 *   3) Firestore 규칙·색인은 FIREBASE.md 참고 (복사해서 붙여넣기)
 *
 * 비워두면(null) 자동으로 기존 시뮬레이션(폰 단독)으로 폴백 — 앱은 절대 깨지지 않습니다.
 */
window.GC_FB = {
  apiKey: 'AIzaSyB36iphQjRN8md8bfM8ZYXvy4csA1fN54w',
  authDomain: 'gwangclick-6b70c.firebaseapp.com',
  projectId: 'gwangclick-6b70c',
  storageBucket: 'gwangclick-6b70c.firebasestorage.app',
  messagingSenderId: '229627757726',
  appId: '1:229627757726:web:63ea7d5fcad85eb637678f',
};
