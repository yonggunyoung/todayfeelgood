// 선택적 기기 간 동기화 — Firebase Firestore (사용자 본인 프로젝트)
// 같은 "동기화 코드"를 입력한 기기끼리 냉장고를 공유한다 (앱↔웹앱 연동, 가족 공유).
// 설정이 없으면 로컬 모드로 동작하며 앱의 모든 기능은 그대로 쓸 수 있다.
import { S, save, bus, replaceState, exportForSync } from './store.js';

export const sync = { status: 'off', error: '' }; // off | connecting | on | error

let docRef = null;
let setDocFn = null;
let pushTimer = null;
let applyingRemote = false;
let authObj = null; // 서버 경유 AI가 사용자 식별 토큰을 얻는 데도 쓰인다

// 서버 경유 AI 호출용 ID 토큰 (기기 연동이 연결돼 있어야 발급됨)
export async function getIdToken() {
  try { return authObj?.currentUser ? await authObj.currentUser.getIdToken() : null; }
  catch { return null; }
}

export async function initSync(onStatus) {
  const cfgRaw = (S.settings.firebaseConfig || '').trim();
  const code = (S.settings.spaceCode || '').trim();
  if (!cfgRaw || !code) { sync.status = 'off'; onStatus?.(); return; }

  sync.status = 'connecting'; onStatus?.();
  try {
    const cfg = JSON.parse(cfgRaw);
    const [{ initializeApp }, { getAuth, signInAnonymously }, fs] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'),
    ]);
    const app = initializeApp(cfg);
    authObj = getAuth(app);
    await signInAnonymously(authObj);
    const db = fs.getFirestore(app);
    docRef = fs.doc(db, 'spaces', code);
    setDocFn = fs.setDoc;

    fs.onSnapshot(docRef, (snap) => {
      const remote = snap.data();
      if (!remote || !remote.state) return;
      if ((remote.state.meta?.updatedAt || 0) > S.meta.updatedAt) {
        applyingRemote = true;
        replaceState(remote.state);
        applyingRemote = false;
      }
    });

    sync.status = 'on'; sync.error = '';
  } catch (e) {
    sync.status = 'error';
    sync.error = e.message || String(e);
    docRef = null;
  }
  onStatus?.();
}

// 로컬 변경 → 1.5초 디바운스 후 원격 반영
bus.on((evt) => {
  if (evt.type !== 'saved' || evt.fromSync || applyingRemote || !docRef || !setDocFn) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(async () => {
    try {
      await setDocFn(docRef, { state: exportForSync(), pushedAt: Date.now() });
      sync.status = 'on'; sync.error = '';
    } catch (e) {
      sync.status = 'error'; sync.error = e.message || String(e);
    }
  }, 1500);
});

// 가족 공유용 코드 생성 도우미
export function makeSpaceCode() {
  const words = ['사과', '양파', '두부', '계란', '대파', '버섯', '감자', '당근'];
  const w = words[Math.floor(Math.random() * words.length)];
  return `${w}-${Math.random().toString(36).slice(2, 6)}`;
}
