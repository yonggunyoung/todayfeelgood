// 계정·동기화 — 일반 사용자는 "구글로 시작하기" 한 번이면 끝.
// 우선순위: 가족 공유 코드(spaces/{code}) > 내 계정(userdata/{uid}) > 로컬 전용.
// FIREBASE_CONFIG(config.js)가 채워지면 전 사용자 활성화, 없으면 관리자 설정의 JSON으로 폴백(베타).
import { S, save, bus, replaceState, exportForSync } from './store.js';
import { FIREBASE_CONFIG } from './config.js';

export const sync = { status: 'off', error: '', user: null }; // user: {uid, anon, name, email, photo}

let app = null;
let auth = null;
let authMod = null;
let fsMod = null;
let docRef = null;
let unsubSnap = null;
let pushTimer = null;
let applyingRemote = false;
let onStatusCb = null;

function cfg() {
  if (FIREBASE_CONFIG) return FIREBASE_CONFIG;
  try { return S.settings.firebaseConfig ? JSON.parse(S.settings.firebaseConfig) : null; }
  catch { return null; }
}
export const syncAvailable = () => !!cfg();

async function ensureFirebase() {
  if (auth) return true;
  const c = cfg();
  if (!c) return false;
  sync.status = 'connecting'; onStatusCb?.();
  const [appM, aM, fM] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'),
    import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'),
  ]);
  app = appM.initializeApp(c);
  auth = aM.getAuth(app);
  authMod = aM; fsMod = fM;
  aM.getRedirectResult(auth).catch(() => { /* 리다이렉트 복귀 아님 */ });
  aM.onAuthStateChanged(auth, (u) => {
    sync.user = u ? {
      uid: u.uid, anon: u.isAnonymous,
      name: u.displayName || '', email: u.email || '', photo: u.photoURL || '',
    } : null;
    attachDoc();
  });
  return true;
}

function targetRef() {
  if (!fsMod || !auth?.currentUser) return null;
  const db = fsMod.getFirestore(app);
  const code = (S.settings.spaceCode || '').trim();
  if (code) return fsMod.doc(db, 'spaces', code);                       // 가족 공유
  if (!auth.currentUser.isAnonymous) return fsMod.doc(db, 'userdata', auth.currentUser.uid); // 내 계정
  return null;
}

function attachDoc() {
  unsubSnap?.(); unsubSnap = null; docRef = null;
  const ref = targetRef();
  if (!ref) {
    sync.status = syncAvailable() ? 'off' : 'off';
    onStatusCb?.();
    return;
  }
  docRef = ref;
  let first = true;
  unsubSnap = fsMod.onSnapshot(ref, (snap) => {
    const remote = snap.data();
    if (first) {
      first = false;
      if (!remote?.state) pushNow(); // 첫 연결: 이 기기 데이터를 클라우드로 올림 (베타 데이터 보존)
    }
    if (remote?.state && (remote.state.meta?.updatedAt || 0) > S.meta.updatedAt) {
      applyingRemote = true;
      replaceState(remote.state);
      applyingRemote = false;
    }
    sync.status = 'on'; sync.error = '';
    onStatusCb?.();
  }, (e) => {
    sync.status = 'error'; sync.error = e.message || String(e);
    onStatusCb?.();
  });
}

async function pushNow() {
  if (!docRef) return;
  try {
    await fsMod.setDoc(docRef, { state: exportForSync(), pushedAt: Date.now() });
    sync.status = 'on'; sync.error = '';
  } catch (e) {
    sync.status = 'error'; sync.error = e.message || String(e);
  }
  onStatusCb?.();
}

// 로컬 변경 → 1.5초 디바운스 후 클라우드 반영
bus.on((evt) => {
  if (evt.type !== 'saved' || evt.fromSync || applyingRemote || !docRef) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(pushNow, 1500);
});

export async function initSync(onStatus) {
  onStatusCb = onStatus;
  if (!(await ensureFirebase())) { sync.status = 'off'; onStatus?.(); return; }
  // 레거시: 가족 코드만 있고 로그인이 없는 기기 → 익명 인증으로 코드 동기화 유지
  if ((S.settings.spaceCode || '').trim() && !auth.currentUser) {
    try { await authMod.signInAnonymously(auth); }
    catch (e) { sync.status = 'error'; sync.error = e.message; }
  }
  onStatus?.();
}

/* ── 간편 로그인 (구글) ── */
export async function loginGoogle() {
  if (!(await ensureFirebase())) throw new Error('계정 기능이 아직 준비되지 않았어요 (운영자 설정 대기 중)');
  const provider = new authMod.GoogleAuthProvider();
  try {
    await authMod.signInWithPopup(auth, provider);
  } catch (e) {
    if (['auth/popup-blocked', 'auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(e.code)) {
      await authMod.signInWithRedirect(auth, provider); // 모바일 폴백
    } else {
      throw new Error(e.message || '로그인에 실패했어요');
    }
  }
}
export async function logoutGoogle() {
  if (auth) await authMod.signOut(auth);
}

/* ── 가족 공유 (선택 기능) — 같은 코드 = 같은 냉장고 ── */
export function makeSpaceCode() {
  const words = ['사과', '양파', '두부', '계란', '대파', '버섯', '감자', '당근'];
  const w = words[Math.floor(Math.random() * words.length)];
  return `${w}-${Math.random().toString(36).slice(2, 6)}`;
}
export async function setSpaceCode(code) {
  S.settings.spaceCode = (code || '').trim();
  save({ silent: true });
  if (!(await ensureFirebase())) return;
  if (S.settings.spaceCode && !auth.currentUser) {
    try { await authMod.signInAnonymously(auth); return; } catch { /* attachDoc은 auth 콜백에서 */ }
  }
  attachDoc();
}

// 서버 AI 호출용 사용자 토큰
export async function getIdToken() {
  try { return auth?.currentUser ? await auth.currentUser.getIdToken() : null; }
  catch { return null; }
}

/* ── 게임 랭킹 (leaderboard/{uid}) — 로그인 사용자만 참여 ──
   같은 가족 코드끼리 비교(scope:family) + 전체 랭킹(scope:global). */
export async function submitScore(game, score) {
  if (!score || !(await ensureFirebase())) return;
  const u = auth?.currentUser;
  if (!u || u.isAnonymous) return; // 익명/비로그인은 랭킹 미참여
  try {
    const db = fsMod.getFirestore(app);
    const ref = fsMod.doc(db, 'leaderboard', u.uid);
    const snap = await fsMod.getDoc(ref);
    const cur = snap.exists() ? snap.data() : {};
    const best = { ...(cur.best || {}) };
    if (!(best[game] >= score)) best[game] = score;
    const total = Object.values(best).reduce((a, b) => a + (Number(b) || 0), 0);
    await fsMod.setDoc(ref, {
      name: u.displayName || '익명 셰프', photo: u.photoURL || '',
      code: (S.settings.spaceCode || '').trim(), best, total, ts: Date.now(),
    }, { merge: true });
  } catch { /* 랭킹 실패는 게임 흐름을 막지 않는다 */ }
}

/* ── 광클대전 전국 집계 (선택) — battles/{date}에 진영별 누적 기여를 increment ──
   FIREBASE_CONFIG가 없으면 둘 다 조용히 비활성 → 게임은 클라 시뮬레이션으로 동작.
   읽기/쓰기 모두 게임 흐름을 막지 않도록 실패는 삼킨다. */
export async function readBattle(date) {
  if (!date || !(await ensureFirebase())) return null;
  try {
    const db = fsMod.getFirestore(app);
    const snap = await fsMod.getDoc(fsMod.doc(db, 'battles', date));
    return snap.exists() ? { a: Number(snap.data().a) || 0, b: Number(snap.data().b) || 0 } : { a: 0, b: 0 };
  } catch { return null; }
}
export async function bumpBattle(date, side, amount) {
  const n = Math.round(Number(amount) || 0);
  if (!date || !n || !['a', 'b'].includes(side) || !(await ensureFirebase())) return false;
  try {
    const db = fsMod.getFirestore(app);
    await fsMod.setDoc(fsMod.doc(db, 'battles', date),
      { [side]: fsMod.increment(n), ts: Date.now() }, { merge: true });
    return true;
  } catch { return false; }
}

export async function topScores({ scope = 'global', game = 'defense', max = 30 } = {}) {
  if (!(await ensureFirebase())) return { rows: [], state: 'off' };
  const u = auth?.currentUser;
  if (!u || u.isAnonymous) return { rows: [], state: 'needLogin' };
  try {
    const db = fsMod.getFirestore(app);
    const col = fsMod.collection(db, 'leaderboard');
    let q;
    if (scope === 'family') {
      const code = (S.settings.spaceCode || '').trim();
      if (!code) return { rows: [], state: 'noFamily' };
      q = fsMod.query(col, fsMod.where('code', '==', code), fsMod.limit(50));
    } else {
      q = fsMod.query(col, fsMod.orderBy(`best.${game}`, 'desc'), fsMod.limit(max));
    }
    const snap = await fsMod.getDocs(q);
    let rows = [];
    snap.forEach((d) => {
      const v = d.data();
      rows.push({ uid: d.id, name: v.name || '셰프', photo: v.photo || '', score: (v.best && v.best[game]) || 0, me: d.id === u.uid });
    });
    rows = rows.filter((r) => r.score > 0).sort((a, b) => b.score - a.score).slice(0, max);
    return { rows, state: 'ok' };
  } catch (e) {
    return { rows: [], state: 'error', error: e.message };
  }
}
