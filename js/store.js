// 상태 저장소 — localStorage 영속화 + 변경 이벤트 버스 (동기화 모듈이 구독)
const KEY = 'naengbiseo.v1';

export const MODES = {
  none:      { label: '기본',     emoji: '🍚', desc: '있는 재료로 만들 수 있는 요리부터' },
  fitness:   { label: '운동',     emoji: '💪', desc: '단백질 위주로 추천 · 매크로 표시' },
  frugal:    { label: '자린고비', emoji: '🪙', desc: '임박 재료 소진 · 추가 지출 0원 우선' },
  maternity: { label: '산모',     emoji: '🤰', desc: '주의 재료 자동 제외 · 순한 요리 우선' },
};

const DEFAULT = () => ({
  meta: { updatedAt: 0, createdAt: Date.now() },
  settings: { mode: 'none', coupangId: '', aiKey: '', aiModel: 'claude-opus-4-8', spaceCode: '', firebaseConfig: '' },
  pantry: [],     // {id, name, emoji, qtyType, unit, qty, level, location, expiresAt, price}
  leftovers: [],  // {id, name, location, expiresAt, createdAt, status}
  shopping: [],   // {id, name, reason, done}
  ledger: { saved: 0, wasted: 0, cooked: 0, leftoverEaten: 0, leftoverWasted: 0 },
  onboarded: false,
});

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT();
    return { ...DEFAULT(), ...JSON.parse(raw) };
  } catch {
    return DEFAULT();
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
  for (const k of ['meta', 'settings', 'pantry', 'leftovers', 'shopping', 'ledger', 'onboarded']) {
    if (remote[k] !== undefined) S[k] = remote[k];
  }
  S.settings.aiKey = keepKey;
  S.settings.firebaseConfig = keepFb;
  S.settings.spaceCode = keepCode;
  save({ fromSync: true });
}

// 동기화 송신용: 민감 정보 제거본
export function exportForSync() {
  const clone = JSON.parse(JSON.stringify(S));
  clone.settings.aiKey = '';
  clone.settings.firebaseConfig = '';
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
