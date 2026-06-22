// ⚡ 광클대전 — 봇 제거(회수). 원장만큼 집계에서 정확히 빼고, 봇 점수문서 전부 삭제.
//
// 사용:
//   node purge.mjs --date 2026-06-22      # 특정 날짜 봇 제거
//   node purge.mjs --all                  # 원장(gc_bots_state/*)에 있는 모든 날짜 제거
//   node purge.mjs --all --dry            # 무엇을 지울지 미리보기
//
// 실데이터 무손상: 집계는 'increment(−원장)'으로 봇 기여분만 차감(동시 실제 증가분 보존).
//   봇 점수문서는 bot==true 태그로만 삭제 → 실제 플레이어 문서는 손대지 않음.
import { negAgg, emptyAgg } from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
if (!args.all && !args.date) { console.error("필수: --date YYYY-MM-DD 또는 --all"); process.exit(1); }

const admin = await loadAdmin(args.dry);
const db = admin ? admin.firestore() : null;
const FV = admin ? admin.firestore.FieldValue : null;

const dates = args.all ? await listLedgerDates() : [args.date];
for (const date of dates) await purgeDate(date);
console.log(`[PURGE] done (${dates.length} date(s))${args.dry ? " [DRY]" : ""}`);

async function purgeDate(date) {
  if (!db) { console.log(`[DRY] ${date}: (서비스 계정 없음 — 카운트 생략) 집계 차감 + 봇 점수문서 삭제 + 원장 삭제 예정`); return; }
  const ledgerRef = db.doc("gc_bots_state/" + date);
  const snap = ledgerRef ? await ledgerRef.get() : null;
  const agg = snap && snap.exists ? (snap.data().agg || emptyAgg()) : emptyAgg();
  // 삭제 대상 카운트
  const q = db.collection("gc_scores").where("date", "==", date).where("bot", "==", true);
  const docs = await q.get();
  if (args.dry) { console.log(`[DRY] ${date}: 집계 차감 a=${-agg.a} b=${-agg.b}, 봇 점수문서 ${docs.size}개 삭제, 원장 삭제`); return; }
  // 1) 집계에서 봇 기여분 차감
  await db.doc("gc_battles/" + date).set(aggToIncrement(FV, negAgg(agg)), { merge: true });
  // 2) 봇 점수문서 일괄 삭제
  let del = 0;
  for (const chunk of chunks(docs.docs, 400)) { const wb = db.batch(); chunk.forEach((d) => wb.delete(d.ref)); await wb.commit(); del += chunk.length; }
  // 3) 원장 삭제
  if (ledgerRef) await ledgerRef.delete();
  console.log(`[PURGE] ${date}: scores deleted=${del}, agg reverted (a=${-agg.a}, b=${-agg.b})`);
}

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
async function listLedgerDates() {
  const snap = await db.collection("gc_bots_state").get();
  return snap.docs.map((d) => d.id);
}
function* chunks(arr, n) { for (let i = 0; i < arr.length; i += n) yield arr.slice(i, i + n); }
function parseArgs(a) { const o = {}; for (let i = 0; i < a.length; i++) { if (a[i] === "--dry") o.dry = true; else if (a[i] === "--all") o.all = true; else if (a[i].startsWith("--")) o[a[i].slice(2)] = a[++i]; } return o; }
async function loadAdmin(dry) {
  if (dry && !process.env.FORCE_ADMIN) {
    // dry 모드에서 계정 없이도 카운트 미리보기 위해 admin 시도하되 실패하면 null
    try { return await initAdmin(); } catch (e) { console.error("(dry) admin 미초기화 — 삭제 카운트는 실행 시 표시됨:", e.message); return null; }
  }
  return await initAdmin();
}
async function initAdmin() {
  const admin = (await import("firebase-admin")).default;
  if (!admin.apps.length) {
    const fs = await import("node:fs");
    const path = process.env.GOOGLE_APPLICATION_CREDENTIALS || "./service-account.json";
    if (!fs.existsSync(path)) throw new Error(`서비스 계정 JSON 없음: ${path}`);
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(fs.readFileSync(path, "utf8"))) });
  }
  return admin;
}
