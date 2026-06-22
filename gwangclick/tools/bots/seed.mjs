// ⚡ 광클대전 — 봇 시드(심기/성장). 실제 플레이어 문서와 동일 형태로 Firestore에 기록.
//
// 사용:
//   node seed.mjs --dry                 # 네트워크/계정 없이 무엇을 쓸지 미리보기(검증용)
//   node seed.mjs                        # 오늘 날짜로 실제 시드(서비스 계정 필요)
//   node seed.mjs --date 2026-06-22 --at 2026-06-22T21:00:00
//
// 인증: 환경변수 GOOGLE_APPLICATION_CREDENTIALS=경로/service-account.json (또는 ./service-account.json)
// 비용: 1회 실행당 (참전 수)개 점수문서 + 집계 1 + 원장 1 쓰기. cron은 2~3시간 간격 권장(README).
// 멱등/증분: 원장(gc_bots_state/{date})에 누적 봇 기여를 기록 → 매 실행은 '목표-원장' 만큼만 증감(이중가산 0).
//   동시 실제 증가분과 increment로 안전 합성. purge.mjs로 원장만큼 정확히 회수 가능.
import { buildRoster, diffAgg, summarize, emptyAgg } from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
const date = args.date || ymd(new Date());
const now = args.at ? Date.parse(args.at) : Date.now();
const roster = buildRoster(date, now);

if (args.dry) {
  console.log(`[DRY] date=${date} at=${new Date(now).toISOString()}`);
  console.log(summarize(roster));
  console.log(`would upsert ${roster.players.length} score docs + 1 battle + 1 ledger (gc_bots_state/${date})`);
  process.exit(0);
}

const admin = await loadAdmin();
const db = admin.firestore();
const FV = admin.firestore.FieldValue;

// 1) 원장 읽기 → 증분 계산
const ledgerRef = db.doc("gc_bots_state/" + date);
const prevSnap = await ledgerRef.get();
const prev = prevSnap.exists ? (prevSnap.data().agg || emptyAgg()) : emptyAgg();
const delta = diffAgg(roster.agg, prev);

// 2) 집계 문서에 증분만 반영(실제 증가분과 안전 합성)
await db.doc("gc_battles/" + date).set(aggToIncrement(FV, delta), { merge: true });

// 3) 개별 봇 점수문서 upsert(실제 플레이어와 동일 필드 + 회수용 bot:true 태그)
let written = 0;
for (const chunk of batches(roster.players, 400)) {
  const wb = db.batch();
  for (const p of chunk) {
    wb.set(db.doc(`gc_scores/${date}__${p.uid}`), {
      date, uid: p.uid, nick: p.nick, side: p.side, taps: p.taps,
      region: p.region, country: p.country, badge: p.badge, comment: p.comment,
      ts: Date.now(), bot: true,
    }, { merge: true });
  }
  await wb.commit(); written += chunk.length;
}

// 4) 원장 갱신(절대값 저장)
await ledgerRef.set({ agg: roster.agg, players: roster.players.length, updatedAt: Date.now() });

console.log(`[SEED] date=${date} players=${written} aShare=${summarize(roster).aShare} (delta a=${delta.a} b=${delta.b})`);

// ── helpers ──
function aggToIncrement(FV, d) {
  const u = { updatedAt: Date.now() };
  for (const k of ["a", "b", "na", "nb"]) if (d[k]) u[k] = FV.increment(d[k]);
  for (const fld of ["regions", "countries"]) {
    const m = {};
    for (const key of Object.keys(d[fld] || {})) {
      const v = d[fld][key], o = {};
      if (v.a) o.a = FV.increment(v.a);
      if (v.b) o.b = FV.increment(v.b);
      if (Object.keys(o).length) m[key] = o;
    }
    if (Object.keys(m).length) u[fld] = m;
  }
  return u;
}
function* batches(arr, n) { for (let i = 0; i < arr.length; i += n) yield arr.slice(i, i + n); }
function parseArgs(a) { const o = {}; for (let i = 0; i < a.length; i++) { if (a[i] === "--dry") o.dry = true; else if (a[i].startsWith("--")) o[a[i].slice(2)] = a[++i]; } return o; }
function ymd(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
async function loadAdmin() {
  const admin = (await import("firebase-admin")).default;
  if (!admin.apps.length) {
    const fs = await import("node:fs");
    const path = process.env.GOOGLE_APPLICATION_CREDENTIALS || "./service-account.json";
    if (!fs.existsSync(path)) { console.error(`서비스 계정 JSON 없음: ${path} (README 참고). --dry 로 먼저 확인 가능.`); process.exit(1); }
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(fs.readFileSync(path, "utf8"))) });
  }
  return admin;
}
