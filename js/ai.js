// AI 입고 스캔 + 유튜브 레시피 정리 — Claude API (본인 키 사용)
// 키는 이 기기의 localStorage에만 저장되며 동기화되지 않는다 (store.exportForSync에서 제거).

const aiHeaders = (settings) => ({
  'content-type': 'application/json',
  'x-api-key': settings.aiKey,
  'anthropic-version': '2023-06-01',
  'anthropic-dangerous-direct-browser-access': 'true',
});

const STATUS_MSG = {
  401: 'API 키가 올바르지 않습니다. 설정에서 확인해 주세요.',
  429: '요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요.',
  529: '서비스가 혼잡합니다. 잠시 후 다시 시도해 주세요.',
};

async function throwApiError(res) {
  let detail = '';
  try { detail = (await res.json()).error?.message || ''; } catch { /* ignore */ }
  const err = new Error(STATUS_MSG[res.status] || `AI 호출 실패 (${res.status}) ${detail}`);
  err.status = res.status; // 429 등 상태코드 보존 (광고 후 재시도 흐름이 이걸 본다)
  throw err;
}

/* ── 서버 경유 모드 — Cloudflare 게이트웨이(워커)가 Anthropic 키만 보관·주입.
   클라이언트가 프롬프트/스키마/도구를 모두 만들어 보내고, 워커는 키를 끼워 그대로 전달한다. ── */
import { AI_ENDPOINT } from './config.js';
const endpointOf = (settings) => settings.aiEndpoint || AI_ENDPOINT;
const isServer = (settings) => settings.aiMode === 'server' && !!endpointOf(settings);

// 서버 모드 사용 모델(운영자 부담 → 저가 Haiku) / 본인 키 모드는 기본 Opus
const modelFor = (settings) => settings.aiModel || (isServer(settings) ? 'claude-haiku-4-5-20251001' : 'claude-opus-4-8');

// Anthropic 호출 통합 — 서버 모드면 게이트웨이(워커)로 전체 payload 전달(워커가 키만 끼움), 아니면 본인 키로 직접.
async function callClaude(body, settings) {
  if (isServer(settings)) {
    const res = await fetch(endpointOf(settings).replace(/\/+$/, ''), {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    });
    if (!res.ok) await throwApiError(res);
    return res.json();
  }
  if (!settings.aiKey) throw new Error('설정에서 Claude API 키를 등록하거나, 서버 연결(엔드포인트)을 켜주세요.');
  const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: aiHeaders(settings), body: JSON.stringify(body) });
  if (!res.ok) await throwApiError(res);
  return res.json();
}
const extractText = (msg) => (Array.isArray(msg && msg.content) ? msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n') : '') || '';
function parseJsonLoose(text) {
  try { return JSON.parse(text); } catch { /* 본문에서 JSON 블록만 추출 시도 */ }
  const s = text.indexOf('{'), e = text.lastIndexOf('}');
  if (s >= 0 && e > s) { try { return JSON.parse(text.slice(s, e + 1)); } catch { /* ignore */ } }
  return null;
}

// 광고 보상 — 게이트웨이엔 서버 한도가 없어 충전 개념이 없다. 호출부 호환을 위해 성공만 반환(클라 적립은 points.js).
export async function claimReward() { return { ok: true }; }

const SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: '일반 재료명으로 정규화 (예: 서울우유1L→우유)' },
          qty: { type: 'number' },
          unit: { type: 'string' },
        },
        required: ['name', 'qty'],
        additionalProperties: false,
      },
    },
  },
  required: ['items'],
  additionalProperties: false,
};

const PROMPT = `이 사진은 한국 마트/온라인몰 영수증이거나 장 봐온 식재료를 펼쳐 놓은 사진입니다.
식품(요리 재료)만 추출하세요. 휴지·세제 등 비식품과 봉투값·할인·합계 줄은 제외합니다.
상품명은 일반 재료명으로 정규화하세요: "서울우유1L" → "우유", "CJ 햇반 210g×3" → "즉석밥"(qty 3), "1+1" 표기는 수량 2.
수량을 알 수 없으면 1로 두세요. JSON으로만 답하세요.`;

// 토큰 절약을 위해 긴 변 1280px로 축소 후 JPEG 인코딩
async function downscale(file, max = 1280) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function scanImage(file, settings) {
  if (!isServer(settings) && !settings.aiKey) throw new Error('설정에서 Claude API 키를 등록하거나, 서버 연결을 켜주세요.');
  const b64 = await downscale(file);

  const msg = await callClaude({
    model: modelFor(settings),
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } },
        { type: 'text', text: PROMPT },
      ],
    }],
    output_config: { format: { type: 'json_schema', schema: SCHEMA } },
  }, settings);

  if (msg.stop_reason === 'refusal') throw new Error('이미지를 분석할 수 없습니다. 다른 사진으로 시도해 주세요.');
  const parsed = parseJsonLoose(extractText(msg) || '{}');
  if (!parsed || !Array.isArray(parsed.items) || parsed.items.length === 0) {
    throw new Error('사진에서 식재료를 찾지 못했습니다. 더 선명한 사진으로 시도해 주세요.');
  }
  return parsed.items;
}

/* ── 빠른 레시피 보기 — 유튜브 영상을 보지 않고 AI가 재료·순서 정리 ──
   Claude의 서버측 웹 도구(web_fetch/web_search)가 영상 페이지의 제목·설명란을 읽고
   부족하면 검색으로 보완해 구조화한다. 자막 직접 수집보다 가볍고 브라우저 CORS 제약이 없다. */
const YT_PROMPT = (url) => `유튜브 요리 영상에서 레시피를 정리하는 작업입니다.
영상: ${url}

1) web_fetch로 위 영상 페이지를 열어 제목과 설명란을 읽으세요. 설명란에 재료·만드는 법이 있으면 그것을 우선 사용합니다.
2) 부족하면 web_search로 "영상 제목 + 레시피"를 검색해 보완하세요.
3) 재료명은 한국 마트의 일반 명칭으로 정규화하세요 (예: "서울우유 1L" → 우유, "대패삼겹" → 삼겹살). 간장·소금·설탕·식용유·참기름·고춧가루 같은 기본 양념은 seasoning을 true로 표시하세요.
4) 분량은 1인분 기준으로 환산하고(예: 4인분 영상이면 ÷4), 환산이 어려우면 영상 기준 그대로 두되 단위를 명확히 쓰세요.
5) steps는 실제 조리 순서대로 5~9개. 각 단계에 핵심 수치(불 세기, 시간, 계량스푼)를 포함해 따라만 하면 되게 쓰세요.
6) tips에는 영상에서 강조한 키포인트·실패 방지 요령을 최대 3개 담으세요 (예: "고기는 센 불에 한 번에", 없으면 빈 배열).
7) tags는 다음 중에서만 고르세요: 반찬, 고단백, 운동, 자취, 초간단, 국물, 집밥, 도시락, 다이어트, 순한맛, 매콤, 아침

마지막 응답은 설명 없이 아래 형태의 JSON 하나만 출력하세요:
{"ok":true,"title":"요리명","time":15,"kcal":400,"protein":20,"tags":["국물"],"ingredients":[{"name":"두부","amount":0.5,"unit":"모","seasoning":false}],"steps":["1단계 설명"],"tips":["키포인트"]}
레시피를 찾지 못하면 {"ok":false,"reason":"이유"} 만 출력하세요.`;

export async function extractRecipeFromYouTube(url, settings) {
  if (!isServer(settings) && !settings.aiKey) throw new Error('설정에서 Claude API 키를 등록하거나, 서버 연결을 켜주세요.');
  const tools = [
    { type: 'web_fetch_20260209', name: 'web_fetch' },
    { type: 'web_search_20260209', name: 'web_search' },
  ];
  let messages = [{ role: 'user', content: YT_PROMPT(url) }];
  let msg = null;

  // 서버측 도구 루프가 길어지면 pause_turn으로 끊겨 돌아온다 → 그대로 이어서 재호출 (최대 3회)
  for (let i = 0; i < 4; i++) {
    msg = await callClaude({
      model: modelFor(settings),
      max_tokens: 4096,
      tools,
      messages,
    }, settings);
    if (msg.stop_reason === 'pause_turn') {
      messages = [...messages, { role: 'assistant', content: msg.content }];
      continue;
    }
    break;
  }

  if (!msg) throw new Error('AI 응답이 없어요. 다시 시도해 주세요.');
  if (msg.stop_reason === 'refusal') throw new Error('이 영상은 분석할 수 없어요.');

  const text = extractText(msg);
  const start = text.lastIndexOf('{"ok"');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('레시피를 정리하지 못했어요. 다른 영상으로 시도해 주세요.');

  let data;
  try { data = JSON.parse(text.slice(start, end + 1)); }
  catch { throw new Error('정리 결과를 읽지 못했어요. 한 번 더 시도해 주세요.'); }
  if (!data.ok) throw new Error(data.reason || '이 영상에서 레시피를 찾지 못했어요.');
  if (!Array.isArray(data.ingredients) || !data.ingredients.length) throw new Error('재료를 찾지 못했어요.');
  return data;
}

// 유튜브 검색은 운영자 YouTube Data API 키가 필요(워커 게이트웨이로는 불가) → 본인 ytKey가 있을 때만 노출.
export async function searchYouTube(q, settings) {
  if (!settings.ytKey) throw new Error('유튜브 검색은 설정에서 YouTube API 키를 등록해야 사용할 수 있어요.');
  const res = await fetch(
    'https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=12&q='
    + encodeURIComponent(q + ' 레시피') + '&key=' + encodeURIComponent(settings.ytKey),
  );
  if (!res.ok) await throwApiError(res);
  const data = await res.json();
  return (data.items || []).map((it) => ({
    id: it.id?.videoId,
    title: it.snippet?.title || '',
    channel: it.snippet?.channelTitle || '',
    thumb: it.snippet?.thumbnails?.medium?.url || it.snippet?.thumbnails?.default?.url || '',
  })).filter((v) => v.id);
}
