// 상태 저장소 — localStorage 영속화 + 변경 이벤트 버스 (동기화 모듈이 구독)
const KEY = 'naengbiseo.v1';

const DEFAULT = () => ({
  meta: { updatedAt: 0, createdAt: Date.now() },
  settings: {
    mode: 'none', coupangId: '', aiKey: '', aiModel: 'claude-opus-4-8',
    aiMode: 'byok', aiEndpoint: '', // byok=내 키(베타) | server=운영자 서버 경유(유료화)
    ytKey: '', // 유튜브 검색용 Data API 키 (선택 · 이 기기에만)
    adminPin: '', // 관리자 잠금 PIN (이 기기에만 — 동기화 제외)
    spaceCode: '', firebaseConfig: '',
    customModes: [], // {key, label, emoji, desc, protein, expiring, zeroExtra, prefTags:[], exclude:[]}
  },
  pantry: [],     // {id, name, emoji, photo?, qtyType, unit, qty, level, location, expiresAt, price}
  leftovers: [],  // {id, name, location, expiresAt, createdAt, status}
  shopping: [],   // {id, name, reason, done}
  myRecipes: [],  // 내가 만든/유튜브에서 저장한 레시피 (RECIPES와 동일 구조 + yt, photo, mine)
  favs: [],       // 즐겨찾기 레시피 id
  ledger: { saved: 0, wasted: 0, cooked: 0, leftoverEaten: 0, leftoverWasted: 0 },
  plan: '',       // ''=무료 | 'premium' — 결제 웹훅/운영자가 기록, 프리미엄이면 앱 내 광고 미노출
  points: { bal: 0, total: 0, day: '', got: {}, hist: [] }, // 냉비서 포인트 — 절약 행동 보상 (무상 적립만)
  games: { best: {}, week: '', weekBest: {}, day: '', earned: 0 }, // 미니게임 기록 — 주간 리셋 승부욕
  adFreeUntil: 0,    // 포인트샵 "광고 없는 하루" 교환 시각
  planTrialUntil: 0, // 포인트샵 "프리미엄 맛보기" 만료 시각
  onboarded: false,
  tutorialDone: false, // 첫 사용자 가이드 완료 여부
});

function load() {
  const d = DEFAULT();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return d;
    const p = JSON.parse(raw);
    return {
      ...d, ...p,
      settings: { ...d.settings, ...(p.settings || {}) },
      ledger: { ...d.ledger, ...(p.ledger || {}) },
      points: { ...d.points, ...(p.points || {}) },
      games: { ...d.games, ...(p.games || {}) },
      myRecipes: p.myRecipes || [],
      favs: p.favs || [],
    };
  } catch {
    return d;
  }
}

export const S = typeof localStorage !== 'undefined' ? load() : DEFAULT();

const listeners = [];
export const bus = {
  on(fn) { listeners.push(fn); },
  emit(evt) { for (const fn of listeners) fn(evt); },
};

export function save(opts = {}) {
  S.meta.updatedAt = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* 용량 초과 등 — 무시 */ }
  if (!opts.silent) bus.emit({ type: 'saved', fromSync: !!opts.fromSync });
}

// 동기화 수신: 원격 상태로 교체 (보안상 기기 로컬 전용 값은 보존)
export function replaceState(remote) {
  const keepKey = S.settings.aiKey;
  const keepFb = S.settings.firebaseConfig;
  const keepCode = S.settings.spaceCode;
  const keepPin = S.settings.adminPin;
  for (const k of ['meta', 'settings', 'pantry', 'leftovers', 'shopping', 'myRecipes', 'favs', 'ledger',
    'plan', 'points', 'games', 'adFreeUntil', 'planTrialUntil', 'onboarded', 'tutorialDone']) {
    if (remote[k] !== undefined) S[k] = remote[k];
  }
  S.settings.aiKey = keepKey;
  S.settings.firebaseConfig = keepFb;
  S.settings.spaceCode = keepCode;
  S.settings.adminPin = keepPin;
  save({ fromSync: true });
}

// 동기화 송신용: 민감 정보 제거본
export function exportForSync() {
  const clone = JSON.parse(JSON.stringify(S));
  clone.settings.aiKey = '';
  clone.settings.firebaseConfig = '';
  clone.settings.adminPin = '';
  clone.settings.ytKey = '';
  return clone;
}

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

export const today = () => new Date().toISOString().slice(0, 10);

export function addDays(n, from) {
  const d = from ? new Date(from) : new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function daysLeft(dateStr) {
  if (!dateStr) return 999;
  const ms = new Date(dateStr + 'T23:59:59') - new Date();
  return Math.ceil(ms / 86400000);
}

export const won = (n) => '₩' + Math.round(n).toLocaleString('ko-KR');
