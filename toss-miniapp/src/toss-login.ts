// 토스 로그인 어댑터.
//
// 토스 WebView 안에서는 구글 OAuth 팝업이 막히므로, 토스 버전은 appLogin() 을 쓴다.
// 흐름:
//   1) appLogin() 호출 → 토스 로그인/약관동의 UI → { authorizationCode, referrer } 반환
//   2) authorizationCode 를 "서버"로 보내 토스 세션/토큰으로 교환 (클라에서 직접 교환 불가)
//   3) 서버가 발급한 세션을 기존 Firebase 동기화 사용자와 매핑
//
// 검증된 API (toss/apps-in-toss-examples 기준):
//   import { appLogin } from '@apps-in-toss/web-framework';
//   const { authorizationCode, referrer } = await appLogin();
import { appLogin } from '@apps-in-toss/web-framework';

export interface TossLoginResult {
  authorizationCode: string;
  referrer: string;
}

// 냉비서 백엔드 베이스 (루트 js/config.js 의 AI_FN 과 동일).
// 여기에 토스 코드 교환 엔드포인트(/tosslogin)를 추가할 예정.
// TODO(verify): 서버에 `/tosslogin` 엔드포인트가 아직 없음 — Firebase Cloud Function 으로 추가 필요.
//   (functions/ 에서 authorizationCode 를 토스 토큰으로 교환하고 세션/커스텀토큰을 돌려주도록 구현)
const AI_FN = 'https://asia-northeast3-icebi-308e0.cloudfunctions.net/ai';

// 토스 로그인 실행 → authorization code 획득.
export async function tossLogin(): Promise<TossLoginResult> {
  const { authorizationCode, referrer } = await appLogin();

  // --- 서버 교환 (구현 예정) -------------------------------------------------
  // authorizationCode 단독으로는 인증이 끝난 게 아니다. 반드시 서버에서 교환해야 한다.
  // 아래는 교환 호출 예시 — 서버(/tosslogin)가 준비되면 주석 해제.
  //
  // const res = await fetch(`${AI_FN}/tosslogin`, {
  //   method: 'POST',
  //   headers: { 'content-type': 'application/json' },
  //   body: JSON.stringify({ authorizationCode, referrer }),
  // });
  // if (!res.ok) throw new Error(`toss login exchange failed: ${res.status}`);
  // const { firebaseCustomToken } = await res.json();
  // → 이 커스텀 토큰으로 Firebase signInWithCustomToken 하면 기존 동기화와 연결됨.
  //   (TODO(verify): 서버가 반환할 토큰 형태/필드명은 서버 구현에 맞춰 확정)
  void AI_FN; // 위 예시가 주석인 동안 미사용 경고 방지

  return { authorizationCode, referrer };
}
