// 사용 계측 (GA4 = Firebase Analytics) — "무엇이 실제로 쓰이나 / 얼마나 돌아오나"를 데이터로 본다.
// config.js의 FIREBASE_CONFIG.measurementId(G-XXXX)가 채워지면 켜지고, 없으면 '조용히 no-op'(동작 변화 0).
// 활성화: Firebase 콘솔 → Analytics 사용 설정(GA4 연결) → 프로젝트 설정 → 웹앱 구성의 measurementId 를 config.js 에 붙여넣기.
import { FIREBASE_CONFIG } from './config.js';

let analytics = null, logEventFn = null, started = false;
const buf = []; // init 완료 전 이벤트 버퍼

const enabled = () => !!(FIREBASE_CONFIG && FIREBASE_CONFIG.measurementId);

export async function initAnalytics() {
  if (started || !enabled()) return;
  started = true;
  try {
    const [appM, aM] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js'),
    ]);
    if (!(await aM.isSupported().catch(() => false))) return; // 미지원 환경(쿠키 차단 등)이면 조용히 패스
    // sync.js가 만든 기본 앱이 있으면 재사용, 없으면 충돌 안 나게 별도 이름으로 생성
    const apps = appM.getApps();
    const app = apps.length ? apps[0] : appM.initializeApp(FIREBASE_CONFIG, 'nb-analytics');
    analytics = aM.getAnalytics(app);
    logEventFn = aM.logEvent;
    for (const [n, p] of buf) logEventFn(analytics, n, p);
    buf.length = 0;
  } catch { /* 분석 실패는 앱 흐름을 막지 않는다 */ }
}

export function track(name, params = {}) {
  if (!enabled()) return;
  if (logEventFn && analytics) { try { logEventFn(analytics, name, params); } catch { /* noop */ } }
  else if (buf.length < 50) buf.push([name, params]); // 아직 init 전 → 버퍼링
}

export function trackScreen(screen) {
  track('screen_view', { firebase_screen: screen, screen_name: screen });
}
