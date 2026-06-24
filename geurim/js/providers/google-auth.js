// 그림공장 — Google OAuth (브라우저, Google Identity Services) — Gemini 전용.
// 액세스 토큰은 "메모리에만" 보관하고 영속화하지 않는다(보안). 클라이언트 ID는 공개값이라 설정 저장 안전.
// 동의 여부 힌트(geurim.google.consented)만 localStorage에 둬서 새로고침 후 무UI 재발급을 시도한다.

const SCOPE = 'https://www.googleapis.com/auth/cloud-platform'; // generateContent·Imagen predict 커버
const GIS_SRC = 'https://accounts.google.com/gsi/client';
const CONSENT_KEY = 'geurim.google.consented';

let gisPromise = null;
let tokenClient = null;
let clientIdInUse = '';
let token = null;     // 현재 액세스 토큰(메모리)
let expiresAt = 0;    // ms epoch (만료 60초 전으로 보정)
let pending = null;   // {resolve, reject}

function loadGis() {
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) { resolve(); return; }
    const sc = document.createElement('script');
    sc.src = GIS_SRC; sc.async = true; sc.defer = true;
    sc.onload = () => resolve();
    sc.onerror = () => { gisPromise = null; reject(new Error('Google 로그인 스크립트를 불러오지 못했어요(네트워크/차단 확인).')); };
    document.head.appendChild(sc);
  });
  return gisPromise;
}

async function ensureClient(clientId) {
  if (!clientId) throw new Error('Google OAuth 클라이언트 ID가 설정에 없어요.');
  await loadGis();
  if (tokenClient && clientIdInUse === clientId) return;
  clientIdInUse = clientId;
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: SCOPE,
    callback: (resp) => {
      if (resp && resp.access_token) {
        token = resp.access_token;
        expiresAt = Date.now() + (Number(resp.expires_in || 3600) * 1000) - 60000;
        try { localStorage.setItem(CONSENT_KEY, '1'); } catch { /* ignore */ }
        pending?.resolve(token);
      } else {
        pending?.reject(new Error(resp?.error_description || resp?.error || '토큰을 받지 못했어요.'));
      }
      pending = null;
    },
    error_callback: (err) => {
      pending?.reject(new Error(err?.type === 'popup_closed' ? '로그인 창이 닫혔어요.' : (err?.message || 'Google 로그인 실패.')));
      pending = null;
    },
  });
}

function request(prompt) {
  return new Promise((resolve, reject) => {
    pending = { resolve, reject };
    try { tokenClient.requestAccessToken({ prompt }); }
    catch (e) { pending = null; reject(e); }
  });
}

// 단일 비행(single-flight): 동시에 여러 호출(배치 청크 N개)이 토큰을 요청해도 한 번만 진행.
// (공유 pending 콜백이 덮어써져 한쪽이 영영 대기하는 문제를 방지)
let inflight = null;
function acquire(clientId, prompt) {
  if (inflight) return inflight;
  inflight = ensureClient(clientId).then(() => request(prompt)).finally(() => { inflight = null; });
  return inflight;
}

export function isConsented() { try { return localStorage.getItem(CONSENT_KEY) === '1'; } catch { return false; } }
export function hasValidToken() { return !!token && Date.now() < expiresAt; }
export function expiryMs() { return expiresAt; }

/** 사용자 클릭(제스처)에서 호출 — 필요 시 동의 팝업 표시 */
export async function signInInteractive(clientId) {
  try { return await acquire(clientId, ''); }       // 이미 동의했으면 무UI로 토큰
  catch { return await acquire(clientId, 'consent'); } // 아니면 동의 창
}

/** 호출 직전(배치/보강) — 무UI(silent). 토큰 있으면 그대로, 없으면 조용히 재발급. 실패 시 throw */
export async function getToken(clientId) {
  if (hasValidToken()) return token;
  return acquire(clientId, ''); // silent — 실패하면 호출부가 "다시 로그인" 안내
}

export async function signOut(clientId) {
  try {
    if (token && window.google?.accounts?.oauth2) window.google.accounts.oauth2.revoke(token, () => {});
  } catch { /* ignore */ }
  token = null; expiresAt = 0;
  try { localStorage.removeItem(CONSENT_KEY); } catch { /* ignore */ }
}
