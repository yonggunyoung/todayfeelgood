// 만료 임박 푸시 알림 (FCM 웹) — 앱이 닫혀 있어도 "곧 상해요" 리마인드 → 재방문 유도(리텐션 핵심).
// 흐름: 클라가 알림권한+FCM토큰 발급 → 서버(/pushtoken)에 저장 → 매일 스케줄 함수가 임박재료 있는 사용자에게 발송.
// FIREBASE_CONFIG.fcmVapidKey 가 없으면 조용히 비활성(앱 동작 영향 0).
import { FIREBASE_CONFIG, AI_FN } from './config.js';
import { ensureAuthed, getFirebaseApp, getIdToken } from './sync.js';

export const pushSupported = () =>
  typeof Notification !== 'undefined' && 'serviceWorker' in navigator && !!FIREBASE_CONFIG.fcmVapidKey && !!AI_FN;
export const pushPermission = () => (typeof Notification !== 'undefined' ? Notification.permission : 'unsupported');
export const pushOn = () => { try { return localStorage.getItem('nb_push_on') === '1' && pushPermission() === 'granted'; } catch { return false; } };

// 알림 켜기 — 권한 요청 + FCM 토큰 발급 + 서버 저장. 반환 {ok, reason?}
export async function enablePush(spaceCode = '') {
  if (!pushSupported()) return { ok: false, reason: 'unsupported' };
  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return { ok: false, reason: perm === 'denied' ? 'denied' : 'dismissed' };
    if (!(await ensureAuthed())) return { ok: false, reason: 'auth' };
    const [appM, mM] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js'),
    ]);
    if (!(await mM.isSupported().catch(() => false))) return { ok: false, reason: 'unsupported' };
    const app = getFirebaseApp() || appM.getApps()[0] || appM.initializeApp(FIREBASE_CONFIG);
    const reg = await navigator.serviceWorker.ready;
    const token = await mM.getToken(mM.getMessaging(app), { vapidKey: FIREBASE_CONFIG.fcmVapidKey, serviceWorkerRegistration: reg });
    if (!token) return { ok: false, reason: 'no-token' };
    const idt = await getIdToken();
    if (!idt) return { ok: false, reason: 'auth' };
    const res = await fetch(`${AI_FN}/pushtoken`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${idt}` },
      body: JSON.stringify({ token, code: (spaceCode || '').trim() }),
    });
    if (!res.ok) return { ok: false, reason: 'server' };
    try { localStorage.setItem('nb_push_on', '1'); } catch { /* noop */ }
    return { ok: true };
  } catch (e) { return { ok: false, reason: e.message || 'error' }; }
}
