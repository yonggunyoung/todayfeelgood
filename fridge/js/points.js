// 냉비서 포인트 — 절약 "행동"을 보상하는 앱 내 화폐. 절약 장부(아낀 돈)를 대체하지 않고 나란히 간다.
// 원칙: 무상 적립만 (현금 충전·현금 환급 없음 → 선불전자지급수단 규제 비대상),
//       일일 상한으로 어뷰징 차단, 교환은 내부 보상(원가≈0)부터 — 외부 교환(기프티콘·토스포인트)은 P1/P2.
import { S, save } from './store.js';
import { tossGivePoints } from './toss.js';

export const EARN = {
  daily:    { p: 5,  cap: 1,  label: '오늘의 출석',     emoji: '📅' },
  cook:     { p: 10, cap: 3,  label: '요리 완료',       emoji: '🍳' },
  rescue:   { p: 20, cap: 3,  label: '임박 재료 구출',  emoji: '🚑' },
  leftover: { p: 15, cap: 3,  label: '잔반 해결',       emoji: '🥡' },
  ad:       { p: 3,  cap: 3,  label: '광고 시청 보너스', emoji: '📺' },
  game:     { p: 0,  cap: 5,  label: '미니게임',        emoji: '🎮' }, // p는 점수 기반 가변, cap은 보상 판수
};

const today = () => new Date().toISOString().slice(0, 10);
function bucket() {
  if (S.points.day !== today()) { S.points.day = today(); S.points.got = {}; }
  return S.points.got;
}

export function earnedToday(kind) { return bucket()[kind] || 0; }
export function canEarn(kind) { return earnedToday(kind) < (EARN[kind]?.cap ?? 0); }

/* 적립 — 반환 {ok, p}. UI(토스트)는 호출측 담당. 토스 환경이면 토스포인트 프로모션도 미러링 시도 */
export function earn(kind, customP) {
  const rule = EARN[kind];
  if (!rule || !canEarn(kind)) return { ok: false, p: 0 };
  const p = Math.max(1, Math.round(customP ?? rule.p));
  bucket()[kind] = earnedToday(kind) + 1;
  S.points.bal += p;
  S.points.total += p;
  S.points.hist.unshift({ t: Date.now(), p, n: rule.label });
  S.points.hist = S.points.hist.slice(0, 40);
  save({ silent: true });
  tossGivePoints(kind); // 토스 밖에서는 조용히 false
  return { ok: true, p };
}

/* 광고 2배 등 캡 외 보너스 — 반드시 광고 완주 등 비용이 회수되는 경로에서만 호출할 것 */
export function bonus(p, label) {
  S.points.bal += p;
  S.points.total += p;
  S.points.hist.unshift({ t: Date.now(), p, n: label });
  S.points.hist = S.points.hist.slice(0, 40);
  save({ silent: true });
}

export function spend(p, label) {
  if (S.points.bal < p) return false;
  S.points.bal -= p;
  S.points.hist.unshift({ t: Date.now(), p: -p, n: label });
  S.points.hist = S.points.hist.slice(0, 40);
  save({ silent: true });
  return true;
}

export function refund(p, label) {
  S.points.bal += p;
  S.points.hist.unshift({ t: Date.now(), p, n: `${label} (환불)` });
  save({ silent: true });
}

/* ── AI 사용 한도 (클라이언트 집계) ──
   게이트웨이(워커)엔 서버 한도가 없으므로 한도는 앱에서 센다. 월 무료 FREE_AI회 + 충전권(광고·포인트),
   프리미엄/맛보기는 무제한. localStorage 기반이라 강제력은 약하지만(어뷰징은 Anthropic 월 한도·CF 레이트리밋으로 차단),
   일반 사용자에겐 자연스러운 무료→충전→구독 동선을 만든다. */
export const FREE_AI = 5; // 매달 무료 AI 횟수 (영수증 스캔·유튜브 정리 합산)
export const aiUnlimited = () => S.plan === 'premium' || (S.planTrialUntil || 0) > Date.now();
function aiRoll() {
  if (!S.aiUse) S.aiUse = { month: '', used: 0, credits: 0 };
  const m = today().slice(0, 7); // YYYY-MM
  if (S.aiUse.month !== m) { S.aiUse.month = m; S.aiUse.used = 0; save({ silent: true }); }
}
export function aiLeft() {
  aiRoll();
  if (aiUnlimited()) return { unlimited: true, freeLeft: Infinity, credits: 0, total: Infinity };
  const freeLeft = Math.max(0, FREE_AI - (S.aiUse.used || 0));
  const credits = S.aiUse.credits || 0;
  return { unlimited: false, freeLeft, credits, total: freeLeft + credits };
}
export function aiConsume() {
  if (aiUnlimited()) return true;
  aiRoll();
  const freeLeft = Math.max(0, FREE_AI - (S.aiUse.used || 0));
  if (freeLeft > 0) S.aiUse.used = (S.aiUse.used || 0) + 1;
  else if ((S.aiUse.credits || 0) > 0) S.aiUse.credits -= 1;
  else return false;
  save({ silent: true });
  return true;
}
export function aiGrant(n = 1) {
  aiRoll();
  S.aiUse.credits = (S.aiUse.credits || 0) + n;
  save({ silent: true });
}

/* 포인트샵 카탈로그 — 내부 보상(원가≈0) 중심. 외부 교환은 잠금 상태로 미리 보여줘 목표를 만든다 */
export const SHOP = [
  { id: 'ai1',     p: 100,  emoji: '🤖', name: 'AI 1회권',          desc: '영수증 스캔·유튜브 정리 +1회', kind: 'aicredit' },
  { id: 'adfree',  p: 300,  emoji: '🧘', name: '광고 없는 하루',     desc: '24시간 배너 광고 미노출',     kind: 'local' },
  { id: 'trial',   p: 1000, emoji: '⭐', name: '프리미엄 맛보기 1일', desc: '광고 없음 + 응원 배지 24시간', kind: 'local' },
  { id: 'gift',    p: 5000, emoji: '🎁', name: '기프티콘 교환',      desc: '커피 쿠폰 등 — 준비 중',       kind: 'locked' },
  { id: 'tossp',   p: 0,    emoji: '🔵', name: '토스포인트 전환',    desc: '앱인토스 출시 시 제공',        kind: 'locked' },
];

export const adFreeNow = () =>
  S.plan === 'premium' || (S.adFreeUntil || 0) > Date.now() || (S.planTrialUntil || 0) > Date.now();

/* 미니게임 기록 — 역대 최고 + 주간 최고(월요일 리셋, "이번 주 기록 갱신" 승부욕) */
function weekKey() {
  const d = new Date();
  const day = (d.getDay() + 6) % 7; // 월=0
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}
export function gameBest(game) {
  if (S.games.week !== weekKey()) { S.games.week = weekKey(); S.games.weekBest = {}; }
  return { all: S.games.best[game] || 0, week: S.games.weekBest[game] || 0 };
}
export function recordScore(game, score) {
  const b = gameBest(game);
  const newAll = score > b.all;
  const newWeek = score > b.week;
  if (newAll) S.games.best[game] = score;
  if (newWeek) S.games.weekBest[game] = score;
  save({ silent: true });
  return { newAll, newWeek };
}
