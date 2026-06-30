// 토스 로그인 브리지 — appLogin()으로 인가코드를 받아 서버(/tosslogin)에서 Firebase 커스텀토큰으로
//   교환하고, 바닐라 냉비서(js/sync.js)가 쓸 수 있게 window.__tossLogin 으로 노출한다.
//   문서: developers-apps-in-toss.toss.im/login/develop
//   흐름: appLogin() → { authorizationCode, referrer } → POST /tosslogin → { customToken }
//        → js/sync.js 가 signInWithCustomToken 으로 Firebase 로그인 (userdata/{uid} 동기화)
//   ※ 토큰 교환·사용자 조회는 mTLS 서버간 통신이라 반드시 서버(Cloud Function)에서 처리. 클라는 인가코드만 받음.
import { appLogin } from '@apps-in-toss/web-framework';

// 서버 교환 엔드포인트(Cloud Function, asia-northeast3). functions/index.js 의 exports.tosslogin.
const TOSSLOGIN_URL = 'https://asia-northeast3-icebi-308e0.cloudfunctions.net/tosslogin';

declare global {
  interface Window {
    __tossLogin?: () => Promise<string | null>;
  }
}

// 토스 로그인 1회 → Firebase 커스텀 토큰 문자열 반환. 실패 시 throw, 토큰 없으면 null.
window.__tossLogin = async () => {
  const { authorizationCode, referrer } = await appLogin(); // 토스 로그인/약관동의 UI → 인가코드(1회성·10분)
  const res = await fetch(TOSSLOGIN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ authorizationCode, referrer }),
  });
  if (!res.ok) {
    let msg = `toss login exchange failed: ${res.status}`;
    try { const e = await res.json(); if (e && e.error) msg = e.error; } catch { /* noop */ }
    throw new Error(msg);
  }
  const data = await res.json();
  return (data && data.customToken) || null;
};

export {};
