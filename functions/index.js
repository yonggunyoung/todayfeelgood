// 냉비서 — 서버 경유 AI 프록시 (Firebase Functions v2)
// 사용자는 API 키를 모른다. 운영자 키(시크릿) 1개로 호출하고, 사용자별 월 한도를 집계한다.
// 배포 가이드: docs/07-server-ai-deploy.md
const { onRequest } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();
let statsCache = { t: 0, data: {} }; // /recipestats 워밍 인스턴스 메모리 캐시(60초)

// Claude 경로(/scan 등)는 현재 CF 워커가 담당하므로 이 함수에선 미사용 → ANTHROPIC 시크릿 불필요(배포 시 GEMINI 키만 요구).
const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

// 모델·한도는 환경변수로 교체 가능 (비용 최적화 실험용)
const SCAN_MODEL = process.env.SCAN_MODEL || 'claude-haiku-4-5';
const RECIPE_MODEL = process.env.RECIPE_MODEL || 'claude-sonnet-4-6';
const FREE_QUOTA = Number(process.env.FREE_QUOTA || 5); // 월 무료 횟수 (스캔 기준 5회 — 광고 시청으로 충전)
const PREMIUM_QUOTA = Number(process.env.PREMIUM_QUOTA || 200); // 프리미엄 남용 방지 상한
const REWARD_DAILY_CAP = Number(process.env.REWARD_DAILY_CAP || 3); // 광고 충전 일일 상한
const REDEEM_DAILY_CAP = Number(process.env.REDEEM_DAILY_CAP || 2); // 포인트샵 AI 1회권 교환 일일 상한
// ── Gemini(서울 리전에서 호출) — Cloudflare는 Gemini 지역 차단(User location not supported)이라 이 함수가 대신 호출 ──
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest'; // 모델 버전은 환경변수로(코드에 안 박음)
const GEMINI_DAILY_CAP = Number(process.env.GEMINI_DAILY_CAP || 300);   // 전역 일일 상한(비용 폭주 하드 실링) — 인증 없이도 비용 상한
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '';                // 쉼표구분 허용 출처(비우면 전체 허용)

/* ── 구독 상태 — 결제 성공 시 users/{uid}에 plan:'premium' 기록 (G2 결제 연동 또는 수동 부여) ── */
function isPremium(u) {
  if (!u || u.plan !== 'premium') return false;
  const until = u.premiumUntil;
  if (!until) return true; // 만료일 없으면 영구(수동 부여)
  const ms = until.toMillis ? until.toMillis() : new Date(until).getTime();
  return ms > Date.now();
}

/* ── 한도 집계 (무료 + 광고 보너스 / 프리미엄은 상한만) ── */
const usageRef = (uid) => db.collection('ai_usage').doc(`${uid}_${new Date().toISOString().slice(0, 7)}`);

async function consumeQuota(uid, type, cost = 1) {
  const ref = usageRef(uid);
  const userRef = db.collection('users').doc(uid);
  await db.runTransaction(async (tx) => {
    const [snap, uSnap] = await Promise.all([tx.get(ref), tx.get(userRef)]);
    const d = snap.exists ? snap.data() : {};
    const premium = isPremium(uSnap.exists ? uSnap.data() : null);
    const count = d.count || 0;
    const allowed = premium ? PREMIUM_QUOTA : FREE_QUOTA + (d.bonus || 0);
    if (count + cost > allowed) {
      const err = new Error(premium
        ? `이번 달 사용량이 비정상 사용 방지 상한(${PREMIUM_QUOTA}회)에 도달했어요. 문의 주시면 풀어드릴게요!`
        : cost > 1
          ? `영상 정리는 크레딧 ${cost}개가 필요해요. 광고 ${cost}번 보면 충전돼요!`
          : '이번 달 무료 AI를 모두 사용했어요. 광고를 보면 1회씩 충전돼요!');
      err.code = 429;
      throw err;
    }
    tx.set(ref, {
      count: count + cost,
      [`by_${type}`]: admin.firestore.FieldValue.increment(1),
      premium,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  });
}

// 보상형 광고 시청 → +1회 충전 (일일 상한으로 어뷰징 방지) — 프리미엄은 광고가 필요 없다
async function grantReward(uid) {
  const ref = usageRef(uid);
  const uSnap = await db.collection('users').doc(uid).get();
  if (isPremium(uSnap.exists ? uSnap.data() : null)) {
    const err = new Error('프리미엄은 광고 없이 무제한이에요 🎉 충전이 필요 없습니다.');
    err.code = 409;
    throw err;
  }
  const today = new Date().toISOString().slice(0, 10);
  let bonus = 0;
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const d = snap.exists ? snap.data() : {};
    const todayCount = d.rewardDay === today ? (d.rewardToday || 0) : 0;
    if (todayCount >= REWARD_DAILY_CAP) {
      const err = new Error(`오늘 광고 충전 한도(${REWARD_DAILY_CAP}회)를 모두 썼어요. 내일 다시 충전돼요!`);
      err.code = 429;
      throw err;
    }
    bonus = (d.bonus || 0) + 1;
    tx.set(ref, {
      bonus, rewardDay: today, rewardToday: todayCount + 1,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  });
  return { bonus };
}

// 포인트샵 교환: 무료 한도에 +1 (구조는 광고 보상과 동일, 상한만 별도)
async function redeemCredit(uid) {
  const ref = usageRef(uid);
  const today = new Date().toISOString().slice(0, 10);
  let bonus = 0;
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const d = snap.exists ? snap.data() : {};
    const todayCount = d.redeemDay === today ? (d.redeemToday || 0) : 0;
    if (todayCount >= REDEEM_DAILY_CAP) {
      const err = new Error(`오늘 포인트 교환 한도(${REDEEM_DAILY_CAP}회)를 모두 썼어요. 내일 또 교환할 수 있어요!`);
      err.code = 429;
      throw err;
    }
    bonus = (d.bonus || 0) + 1;
    tx.set(ref, {
      bonus, redeemDay: today, redeemToday: todayCount + 1,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  });
  return { bonus };
}

/* ── 레시피 커뮤니티 평점 집계 (Phase B) ──
   votes는 recipeVotes/{rid__uid}, 합계는 meta/recipeStats({stats:{rid:{s,c}}}) 단일 문서.
   집계는 서버(admin)만 계산·기록 → 클라이언트가 평균을 조작할 수 없다(규칙 변경 불필요). */
async function rateRecipe(uid, rid, v) {
  const voteRef = db.collection('recipeVotes').doc(`${rid}__${uid}`);
  const statsRef = db.collection('meta').doc('recipeStats');
  let out = { rid, avg: 0, count: 0, my: v };
  await db.runTransaction(async (tx) => {
    const [vSnap, sSnap] = await Promise.all([tx.get(voteRef), tx.get(statsRef)]);
    const old = vSnap.exists ? (vSnap.data().v || 0) : 0;
    const stats = (sSnap.exists && sSnap.data().stats) || {};
    const cur = stats[rid] || { s: 0, c: 0 };
    let s = cur.s || 0, c = cur.c || 0;
    if (v === 0) { // 평가 해제
      if (old) { s -= old; c -= 1; }
      tx.delete(voteRef);
    } else {
      s += v - old;
      if (!old) c += 1;
      tx.set(voteRef, { v, ts: admin.firestore.FieldValue.serverTimestamp() });
    }
    s = Math.max(0, s); c = Math.max(0, c);
    stats[rid] = { s, c };
    tx.set(statsRef, { stats, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    out = { rid, avg: c ? Math.round((s / c) * 10) / 10 : 0, count: c, my: v };
  });
  return out;
}

/* ── Anthropic 호출 ──────────────────────── */
async function anthropic(body, apiKey) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    const err = new Error(detail.error?.message || `AI 호출 실패 (${res.status})`);
    err.code = res.status === 429 || res.status === 529 ? 503 : 502;
    throw err;
  }
  return res.json();
}

/* ── 영수증/식재료 사진 스캔 ─────────────── */
const SCAN_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' }, qty: { type: 'number' }, unit: { type: 'string' },
        },
        required: ['name', 'qty'],
        additionalProperties: false,
      },
    },
  },
  required: ['items'],
  additionalProperties: false,
};

const SCAN_PROMPT = `이 사진은 한국 마트/온라인몰 영수증이거나 장 봐온 식재료를 펼쳐 놓은 사진입니다.
식품(요리 재료)만 추출하세요. 휴지·세제 등 비식품과 봉투값·할인·합계 줄은 제외합니다.
상품명은 일반 재료명으로 정규화하세요: "서울우유1L" → "우유", "CJ 햇반 210g×3" → "즉석밥"(qty 3), "1+1" 표기는 수량 2.
수량을 알 수 없으면 1로 두세요. JSON으로만 답하세요.`;

async function handleScan(image, apiKey) {
  const msg = await anthropic({
    model: SCAN_MODEL,
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
        { type: 'text', text: SCAN_PROMPT },
      ],
    }],
    output_config: { format: { type: 'json_schema', schema: SCAN_SCHEMA } },
  }, apiKey);
  if (msg.stop_reason === 'refusal') throw Object.assign(new Error('이미지를 분석할 수 없습니다.'), { code: 422 });
  const text = (msg.content.find((b) => b.type === 'text') || {}).text || '{}';
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed.items) || !parsed.items.length) {
    throw Object.assign(new Error('사진에서 식재료를 찾지 못했습니다.'), { code: 422 });
  }
  return { items: parsed.items };
}

/* ── 유튜브 빠른 레시피 ──────────────────── */
const YT_PROMPT = (url) => `유튜브 요리 영상에서 레시피를 정리하는 작업입니다.
영상: ${url}

1) web_fetch로 위 영상 페이지를 열어 제목과 설명란을 읽으세요. 설명란에 재료·만드는 법이 있으면 그것을 우선 사용합니다.
2) 부족하면 web_search로 "영상 제목 + 레시피"를 검색해 보완하세요.
3) 재료명은 한국 마트의 일반 명칭으로 정규화하세요. 간장·소금·설탕·식용유·참기름·고춧가루 같은 기본 양념은 seasoning을 true로 표시하세요.
4) 분량은 1인분 기준으로 환산하고(예: 4인분 영상이면 ÷4), 단위를 명확히 쓰세요.
5) steps는 실제 조리 순서대로 5~9개, 각 단계에 핵심 수치(불 세기·시간·계량)를 포함하세요.
6) tips에는 영상에서 강조한 키포인트·실패 방지 요령 최대 3개 (없으면 빈 배열).
7) tags는 다음 중에서만: 반찬, 고단백, 운동, 자취, 초간단, 국물, 집밥, 도시락, 다이어트, 순한맛, 매콤, 아침

마지막 응답은 설명 없이 JSON 하나만:
{"ok":true,"title":"요리명","time":15,"kcal":400,"protein":20,"tags":["국물"],"ingredients":[{"name":"두부","amount":0.5,"unit":"모","seasoning":false}],"steps":["..."],"tips":["..."]}
레시피를 찾지 못하면 {"ok":false,"reason":"이유"} 만 출력하세요.`;

async function handleYtRecipe(url, apiKey) {
  const tools = [
    { type: 'web_fetch_20260209', name: 'web_fetch' },
    { type: 'web_search_20260209', name: 'web_search' },
  ];
  let messages = [{ role: 'user', content: YT_PROMPT(url) }];
  let msg = null;
  for (let i = 0; i < 4; i++) {
    msg = await anthropic({ model: RECIPE_MODEL, max_tokens: 4096, tools, messages }, apiKey);
    if (msg.stop_reason === 'pause_turn') {
      messages = [...messages, { role: 'assistant', content: msg.content }];
      continue;
    }
    break;
  }
  if (!msg || msg.stop_reason === 'refusal') throw Object.assign(new Error('이 영상은 분석할 수 없어요.'), { code: 422 });
  const text = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  const start = text.lastIndexOf('{"ok"');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw Object.assign(new Error('레시피를 정리하지 못했어요.'), { code: 422 });
  const data = JSON.parse(text.slice(start, end + 1));
  if (!data.ok) throw Object.assign(new Error(data.reason || '이 영상에서 레시피를 찾지 못했어요.'), { code: 422 });
  if (!Array.isArray(data.ingredients) || !data.ingredients.length) {
    throw Object.assign(new Error('재료를 찾지 못했어요.'), { code: 422 });
  }
  return data;
}

/* ── Gemini 호출 (서울 리전에서 → 지역 차단 회피) ─────── */
async function gemini(body, model, apiKey) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const err = new Error(data.error?.message || `Gemini 호출 실패 (${res.status})`);
    err.code = res.status === 429 ? 503 : 502;
    throw err;
  }
  const cand = Array.isArray(data.candidates) ? data.candidates[0] : null;
  if (!cand) {
    if (data.promptFeedback?.blockReason) throw Object.assign(new Error('분석할 수 없는 콘텐츠예요.'), { code: 422 });
    throw Object.assign(new Error('AI 응답이 비었어요.'), { code: 502 });
  }
  return (cand.content?.parts || []).map((p) => p.text || '').join('');
}

const SCAN_PROMPT_G = `${SCAN_PROMPT}
각 품목에 confidence(0~1)도 매기세요(또렷하면 0.9 이상, 흐리거나 추측이면 0.6 이하).
출력은 설명 없이 JSON 하나만: {"items":[{"name":"우유","qty":1,"unit":"개","confidence":0.96}]}`;

async function handleScanGemini(image, apiKey, model) {
  const text = await gemini({
    contents: [{ parts: [
      { inlineData: { mimeType: 'image/jpeg', data: image } },
      { text: SCAN_PROMPT_G },
    ] }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0 },
  }, model, apiKey);
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = null; }
  if (!parsed || !Array.isArray(parsed.items) || !parsed.items.length) {
    throw Object.assign(new Error('사진에서 식재료를 찾지 못했습니다.'), { code: 422 });
  }
  return { items: parsed.items };
}

const YT_PROMPT_G = `이 유튜브 요리 영상을 보고 레시피를 정리하세요.
재료명은 한국 마트 일반 명칭으로 정규화하고(간장·소금·설탕·식용유·참기름·고춧가루 등 기본 양념은 seasoning=true), 분량은 1인분 기준으로 환산, steps는 5~9개에 핵심 수치(불 세기·시간·계량) 포함, tips 최대 3개(없으면 빈 배열), tags는 [반찬,고단백,운동,자취,초간단,국물,집밥,도시락,다이어트,순한맛,매콤,아침] 중에서만.
설명 없이 JSON 하나만: {"ok":true,"title":"요리명","time":15,"kcal":400,"protein":20,"tags":["국물"],"ingredients":[{"name":"두부","amount":0.5,"unit":"모","seasoning":false}],"steps":["..."],"tips":["..."]}
레시피를 못 찾으면 {"ok":false,"reason":"이유"} 만.`;

const ytParse = (t) => { try { return JSON.parse(t); } catch { return null; } };

// 유튜브 제목·설명란을 결정론적으로 수집 — 영상 이해(비싸고 잘 실패)에 안 휘둘리게.
//   oEmbed(제목, API키 불필요) + watch 페이지의 ytInitialPlayerResponse.shortDescription.
//   ※ 데이터센터 IP엔 동의/봇 페이지가 올 수 있어 설명란 수집은 best-effort. 실패하면 영상 폴백.
async function fetchYtMeta(url) {
  let title = '', description = '';
  const id = (String(url).match(/(?:v=|youtu\.be\/|shorts\/|embed\/|live\/)([\w-]{11})/) || [])[1];
  try {
    const o = await fetch('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent(url), { headers: { 'accept-language': 'ko' } });
    if (o.ok) { const j = await o.json(); title = j.title || ''; }
  } catch { /* noop */ }
  if (id) {
    try {
      const r = await fetch('https://www.youtube.com/watch?v=' + id, {
        headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'accept-language': 'ko-KR,ko;q=0.9' },
      });
      const html = await r.text();
      const dm = html.match(/"shortDescription":"((?:\\.|[^"\\])*)"/);
      if (dm) { const p = ytParse('"' + dm[1] + '"'); if (typeof p === 'string') description = p; }
      if (!title) { const tm = html.match(/<meta name="title" content="([^"]*)"/); if (tm) title = tm[1]; }
    } catch { /* noop */ }
  }
  return { title: String(title).slice(0, 300), description: String(description || '').slice(0, 6000) };
}

const YT_PROMPT_TEXT = (title, desc) => `아래는 유튜브 요리 영상의 제목과 설명란이에요. 이걸 바탕으로 레시피를 정리하세요.
제목: ${title || '(없음)'}
설명란:
${desc || '(설명란 비어있음)'}

${YT_PROMPT_G}`;

async function handleYtRecipeGemini(url, apiKey, model) {
  // 1) 제목·설명란 수집(결정론적·저비용)
  const meta = await fetchYtMeta(url).catch(() => ({ title: '', description: '' }));
  const hasDesc = (meta.description || '').replace(/\s/g, '').length > 40;

  // 2) 1차: 설명란 텍스트로 정리 — 가장 싸고(토큰 수백) 한국 요리 채널 성공률 높음.
  if (hasDesc || meta.title) {
    try {
      const t = await gemini({
        contents: [{ parts: [{ text: YT_PROMPT_TEXT(meta.title, meta.description) }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }, model, apiKey);
      const d = ytParse(t);
      if (d && d.ok && Array.isArray(d.ingredients) && d.ingredients.length) return d;
    } catch { /* 영상 폴백으로 */ }
  }

  // 3) 2차(폴백): 영상 이해 — 설명란이 부족하거나 1차 실패 시에만(비용 큼).
  let text;
  try {
    text = await gemini({
      contents: [{ parts: [{ fileData: { fileUri: url } }, { text: YT_PROMPT_G + (meta.title ? `\n(참고 제목: ${meta.title})` : '') }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }, model, apiKey);
  } catch {
    throw Object.assign(new Error('이 영상은 분석하지 못했어요. 설명란에 레시피가 없는 영상일 수 있어요 — 다른 영상으로 시도하거나 직접 입력해 주세요.'), { code: 422 });
  }
  const data = ytParse(text);
  if (!data) throw Object.assign(new Error('레시피 정리 결과를 읽지 못했어요.'), { code: 422 });
  if (!data.ok) throw Object.assign(new Error(data.reason || '이 영상에서 레시피를 찾지 못했어요.'), { code: 422 });
  if (!Array.isArray(data.ingredients) || !data.ingredients.length) throw Object.assign(new Error('재료를 찾지 못했어요.'), { code: 422 });
  return data;
}

/* 전역 일일 상한 — 인증 없는 Gemini 경로의 비용 폭주를 막는 하드 실링 (사용자별 아님, 전체 합산) */
async function geminiGlobalCap() {
  const ref = db.collection('ai_global').doc(new Date().toISOString().slice(0, 10));
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const count = (snap.exists ? snap.data().count : 0) || 0;
    if (count >= GEMINI_DAILY_CAP) {
      const err = new Error('오늘 AI 사용량이 많아 잠시 제한됐어요. 내일 다시 시도해 주세요!');
      err.code = 429;
      throw err;
    }
    tx.set(ref, { count: count + 1, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  });
}

/* ── HTTP 엔드포인트 ─────────────────────── */
// Gemini 경로(/gscan, /gytrecipe)는 GEMINI_API_KEY만 쓴다. Claude 경로(/scan 등)는 현재 CF 워커가 담당하므로
// 이 함수에선 미사용 — ANTHROPIC_API_KEY를 secrets에 넣지 않아 운영자 시크릿 설정을 최소화한다.
exports.ai = onRequest(
  { region: 'asia-northeast3', secrets: [GEMINI_API_KEY], cors: true, timeoutSeconds: 120, memory: '256MiB' },
  async (req, res) => {
    try {
      if (req.method !== 'POST') { res.status(405).json({ error: 'POST만 허용됩니다' }); return; }

      // ── 레시피 커뮤니티 평점 집계 읽기 — 공개(인증 불필요). 60초 메모리 캐시로 읽기 폭주 완화 ──
      if (req.path.replace(/\/+$/, '').endsWith('/recipestats')) {
        if (Date.now() - statsCache.t < 60000) { res.json({ stats: statsCache.data }); return; }
        const snap = await db.collection('meta').doc('recipeStats').get();
        statsCache = { t: Date.now(), data: (snap.exists && snap.data().stats) || {} };
        res.json({ stats: statsCache.data });
        return;
      }

      // ── 의견/이탈사유 수집 — 공개(비로그인도 가능). 길이 제한으로 스팸 완화. 운영자는 Firestore 'feedback'에서 읽음 ──
      if (req.path.replace(/\/+$/, '').endsWith('/feedback')) {
        const b = req.body || {};
        const reason = String(b.reason || '').slice(0, 40);
        const text = String(b.text || '').slice(0, 500);
        if (!reason && !text) { res.status(400).json({ error: '내용이 필요합니다' }); return; }
        await db.collection('feedback').add({
          reason, text, churn: !!b.churn,
          opens: Number(b.opens) || 0, cooked: Number(b.cooked) || 0, pantry: Number(b.pantry) || 0,
          origin: req.get('origin') || '', ua: (req.get('user-agent') || '').slice(0, 200),
          ts: admin.firestore.FieldValue.serverTimestamp(),
        });
        res.json({ ok: true });
        return;
      }

      // ── Gemini 경로 (/gscan, /gytrecipe) — Cloudflare 지역차단 회피용. 익명 허용 + 전역 일일 상한으로 비용 차단 ──
      const gp = req.path.replace(/\/+$/, '');
      if (gp.endsWith('/gscan') || gp.endsWith('/gytrecipe')) {
        const origin = req.get('origin') || '';
        if (ALLOWED_ORIGIN && origin && !ALLOWED_ORIGIN.split(',').map((s) => s.trim()).includes(origin)) {
          res.status(403).json({ error: '허용되지 않은 출처' }); return;
        }
        const gkey = GEMINI_API_KEY.value();
        if (!gkey) { res.status(501).json({ error: 'GEMINI_API_KEY 시크릿이 설정되지 않았어요' }); return; }
        await geminiGlobalCap();
        if (gp.endsWith('/gscan')) {
          const { image } = req.body || {};
          if (!image || typeof image !== 'string' || image.length > 4_000_000) { res.status(400).json({ error: '이미지가 없거나 너무 큽니다' }); return; }
          res.json(await handleScanGemini(image, gkey, GEMINI_MODEL)); return;
        }
        const { url } = req.body || {};
        if (!url || !/youtu/.test(String(url))) { res.status(400).json({ error: '유튜브 링크가 필요합니다' }); return; }
        res.json(await handleYtRecipeGemini(url, gkey, GEMINI_MODEL)); return;
      }

      // Firebase 익명 로그인 토큰 검증 → 사용자 식별 (한도 집계 기준)
      const authHeader = req.get('authorization') || '';
      const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
      if (!idToken) { res.status(401).json({ error: '로그인이 필요해요. 앱 설정에서 기기 연동을 먼저 연결해 주세요.' }); return; }
      let uid;
      try { uid = (await admin.auth().verifyIdToken(idToken)).uid; }
      catch { res.status(401).json({ error: '로그인이 만료됐어요. 앱을 새로고침해 주세요.' }); return; }

      const path = req.path.replace(/\/+$/, '');
      const apiKey = process.env.ANTHROPIC_API_KEY || ''; // 미사용 경로 — 시크릿 대신 환경변수(없으면 빈값)

      if (path.endsWith('/scan')) {
        const { image } = req.body || {};
        if (!image || typeof image !== 'string' || image.length > 4_000_000) {
          res.status(400).json({ error: '이미지가 없거나 너무 큽니다' }); return;
        }
        await consumeQuota(uid, 'scan');
        res.json(await handleScan(image, apiKey));
        return;
      }

      if (path.endsWith('/ytrecipe')) {
        const { url } = req.body || {};
        if (!url || !/youtu/.test(String(url))) { res.status(400).json({ error: '유튜브 링크가 필요합니다' }); return; }
        // 영상 정리는 원가가 높아(웹 도구 호출 포함) 크레딧 2개 차감 — 광고 1회=1크레딧과 자동 균형
        await consumeQuota(uid, 'ytrecipe', Number(process.env.YT_COST || 2));
        res.json(await handleYtRecipe(url, apiKey));
        return;
      }

      if (path.endsWith('/reward')) {
        res.json(await grantReward(uid));
        return;
      }

      // 포인트샵 "AI 1회권" 교환 — 포인트 차감은 클라이언트, 서버는 일일 상한으로 남용만 차단
      // (직접 호출해도 하루 REDEEM_DAILY_CAP회가 끝 — 광고 보상과 같은 노출 수준)
      if (path.endsWith('/redeem')) {
        res.json(await redeemCredit(uid));
        return;
      }

      // 레시피 커뮤니티 평점 — 로그인(익명 포함) 1인 1표. 서버가 집계 계산 → 평균 조작 불가
      if (path.endsWith('/rate')) {
        const { rid, v } = req.body || {};
        if (!rid || typeof rid !== 'string' || rid.length > 80) { res.status(400).json({ error: 'rid가 필요합니다' }); return; }
        const val = Math.round(Number(v) || 0);
        if (val < 0 || val > 5) { res.status(400).json({ error: '별점은 0~5입니다' }); return; }
        res.json(await rateRecipe(uid, rid, val));
        return;
      }

      // 만료 임박 푸시 — FCM 토큰 등록(스케줄 함수가 이걸로 발송). token→{uid,code} 매핑 저장.
      if (path.endsWith('/pushtoken')) {
        const { token, code } = req.body || {};
        if (!token || typeof token !== 'string' || token.length > 4096) { res.status(400).json({ error: '토큰이 필요합니다' }); return; }
        await db.collection('pushTokens').doc(token).set(
          { uid, code: (code || '').trim(), updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        res.json({ ok: true });
        return;
      }

      // 인앱 유튜브 검색 — 운영자 YT_API_KEY로 전 사용자에게 제공 (AI 한도 미차감, 무료 기능)
      if (path.endsWith('/ytsearch')) {
        const q = String((req.body || {}).q || '').trim().slice(0, 60);
        if (!q) { res.status(400).json({ error: '검색어가 필요합니다' }); return; }
        const ytKey = process.env.YT_API_KEY;
        if (!ytKey) { res.status(501).json({ error: '서버에 유튜브 검색 키가 아직 설정되지 않았어요' }); return; }
        const r = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=8&regionCode=KR&relevanceLanguage=ko&videoEmbeddable=true&q=${encodeURIComponent(q + ' 레시피')}&key=${encodeURIComponent(ytKey)}`);
        const j = await r.json();
        if (!r.ok) { res.status(502).json({ error: j.error?.message || '유튜브 검색 실패' }); return; }
        res.json({
          items: (j.items || []).filter((x) => x.id?.videoId).map((x) => ({
            id: x.id.videoId, title: x.snippet?.title || '', channel: x.snippet?.channelTitle || '',
          })),
        });
        return;
      }

      res.status(404).json({ error: '알 수 없는 경로입니다 (/scan, /ytrecipe, /reward, /redeem, /ytsearch, /rate, /recipestats)' });
    } catch (e) {
      res.status(e.code && e.code >= 400 && e.code < 600 ? e.code : 500).json({ error: e.message || '서버 오류' });
    }
  }
);

/* ── 만료 임박 푸시 (매일 1회) ──
   pushTokens 의 각 토큰 → 해당 사용자의 동기화 냉장고(state.pantry)를 보고
   오늘/내일 상하는 재료가 있으면 FCM 발송. "앱이 닫혀 있어도 돌아올 이유"를 만든다. */
exports.expiryPush = onSchedule(
  { schedule: '0 9 * * *', timeZone: 'Asia/Seoul', region: 'asia-northeast3', memory: '256MiB' },
  async () => {
    const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10); // KST 기준 오늘
    const dayDiff = (s) => (!s ? 999 : Math.round((new Date(s + 'T00:00:00Z') - new Date(today + 'T00:00:00Z')) / 86400000));
    const snap = await db.collection('pushTokens').get();
    let sent = 0;
    for (const doc of snap.docs) {
      const { uid, code } = doc.data() || {};
      try {
        const ref = (code ? db.collection('spaces').doc(code) : db.collection('userdata').doc(uid));
        if (!uid && !code) { await doc.ref.delete().catch(() => {}); continue; }
        const s = await ref.get();
        const pantry = (s.exists && s.data().state && s.data().state.pantry) || [];
        const exp = pantry.filter((p) => { const d = dayDiff(p.expiresAt); return d >= 0 && d <= 1; });
        if (!exp.length) continue;
        const names = exp.slice(0, 2).map((p) => p.name).filter(Boolean).join(', ');
        const body = exp.length > 2
          ? `${names} 외 ${exp.length - 2}개가 곧 상해요 — 오늘 뭐 해먹지? 🍳`
          : `${names}${exp.length > 1 ? ' 외' : ''} 곧 상해요 — 오늘 메뉴 추천받기 🍳`;
        await admin.messaging().send({
          token: doc.id,
          data: { title: '❄️ 냉장고가 부르네요', body, url: '/' },
          webpush: { headers: { Urgency: 'normal' }, fcmOptions: { link: '/' } },
        });
        sent += 1;
      } catch (e) {
        const code2 = e && e.errorInfo ? e.errorInfo.code : e && e.code;
        if (code2 === 'messaging/registration-token-not-registered' || code2 === 'messaging/invalid-registration-token' || code2 === 'messaging/invalid-argument') {
          await doc.ref.delete().catch(() => {}); // 죽은/잘못된 토큰 정리
        }
      }
    }
    console.log(`expiryPush: ${snap.size} tokens, ${sent} sent`);
  }
);
