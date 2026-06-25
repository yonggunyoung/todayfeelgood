// 전국 기분 집계 설정. 두 값이 모두 채워지면 실집계 ON, 비어 있으면 예시 분포로 폴백.
// 값 위치: Firebase 콘솔 → 프로젝트 설정 → 내 앱(웹) → SDK 설정/구성의 firebaseConfig.
//   · projectId : 예 'oneul-gibun'
//   · apiKey    : 예 'AIzaSy...'  (웹 API 키는 공개값 — 보안은 Firestore 규칙으로 건다)
// Firestore를 '프로덕션 모드'로 만들고 아래 규칙을 적용하세요(README "전국 집계" 참고):
//   match /nation/{day} { allow read: if true;
//     allow write: if request.resource.data.keys().hasOnly(['happy','flutter','calm','blue','angry']); }
export const FIREBASE = {
  projectId: 'myfeel-94cba',
  apiKey: 'AIzaSyATcpCzqIQkyP9lFYvy5SvI4pvAydINtVg',
};
// 실집계가 의미를 가지려면 최소 표본 수(이 미만이면 예시 분포 유지 — 콜드스타트 노이즈 방지).
export const MIN_SAMPLES = 20;
