// 냉비서 — 서버 경유 AI 프록시 (Firebase Functions v2)
// 사용자는 API 키를 모른다. 운영자 키(시크릿) 1개로 호출하고, 사용자별 월 한도를 집계한다.
// 배포 가이드: docs/07-server-ai-deploy.md
const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');

// 모델·한도는 환경변수로 교체 가능 (비용 최적화 실험용)
const SCAN_MODEL = process.env.SCAN_MODEL || 'claude-haiku-4-5';
const RECIPE_MODEL = process.env.RECIPE_MODEL || 'claude-sonnet-4-6';
const FREE_QUOTA = Number(process.env.FREE_QUOTA || 10); // 월 무료 횟수
const REWARD_DAILY_CAP = Number(process.env.REWARD_DAILY_CAP || 3); // 광고 충전 일일 상한

/* ── 한도 집계 (무료 + 광고 보너스) ─────────── */
const usageRef = (uid) => db.collection('ai_usage').doc(`${uid}_${new Date().toISOString().slice(0, 7)}`);

async function consumeQuota(uid, type) {
  const ref = usageRef(uid);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const d = snap.exists ? snap.data() : {};
    const count = d.count || 0;
    const allowed = FREE_QUOTA + (d.bonus || 0);
    if (count >= allowed) {
      const err = new Error('이번 달 무료 AI를 모두 사용했어요. 광고를 보면 1회씩 충전돼요!');
      err.code = 429;
      throw err;
    }
    tx.set(ref, {
      count: count + 1,
      [`by_${type}`]: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  });
}

// 보상형 광고 시청 → +1회 충전 (일일 상한으로 어뷰징 방지)
async function grantReward(uid) {
  const ref = usageRef(uid);
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

/* ── HTTP 엔드포인트 ─────────────────────── */
exports.ai = onRequest(
  { region: 'asia-northeast3', secrets: [ANTHROPIC_API_KEY], cors: true, timeoutSeconds: 120, memory: '256MiB' },
  async (req, res) => {
    try {
      if (req.method !== 'POST') { res.status(405).json({ error: 'POST만 허용됩니다' }); return; }

      // Firebase 익명 로그인 토큰 검증 → 사용자 식별 (한도 집계 기준)
      const authHeader = req.get('authorization') || '';
      const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
      if (!idToken) { res.status(401).json({ error: '로그인이 필요해요. 앱 설정에서 기기 연동을 먼저 연결해 주세요.' }); return; }
      let uid;
      try { uid = (await admin.auth().verifyIdToken(idToken)).uid; }
      catch { res.status(401).json({ error: '로그인이 만료됐어요. 앱을 새로고침해 주세요.' }); return; }

      const path = req.path.replace(/\/+$/, '');
      const apiKey = ANTHROPIC_API_KEY.value();

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
        await consumeQuota(uid, 'ytrecipe');
        res.json(await handleYtRecipe(url, apiKey));
        return;
      }

      if (path.endsWith('/reward')) {
        res.json(await grantReward(uid));
        return;
      }

      res.status(404).json({ error: '알 수 없는 경로입니다 (/scan, /ytrecipe, /reward)' });
    } catch (e) {
      res.status(e.code && e.code >= 400 && e.code < 600 ? e.code : 500).json({ error: e.message || '서버 오류' });
    }
  }
);
