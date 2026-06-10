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
  throw new Error(STATUS_MSG[res.status] || `AI 호출 실패 (${res.status}) ${detail}`);
}

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
  if (!settings.aiKey) throw new Error('설정에서 Claude API 키를 먼저 등록해 주세요.');
  const b64 = await downscale(file);

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: aiHeaders(settings),
    body: JSON.stringify({
      model: settings.aiModel || 'claude-opus-4-8',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } },
          { type: 'text', text: PROMPT },
        ],
      }],
      output_config: { format: { type: 'json_schema', schema: SCHEMA } },
    }),
  });

  if (!res.ok) await throwApiError(res);

  const msg = await res.json();
  if (msg.stop_reason === 'refusal') throw new Error('이미지를 분석할 수 없습니다. 다른 사진으로 시도해 주세요.');
  const text = (msg.content.find((b) => b.type === 'text') || {}).text || '{}';
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed.items) || parsed.items.length === 0) {
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
4) 분량은 1인분 기준으로 환산하고, 환산이 어려우면 영상 기준 그대로 두세요.
5) tags는 다음 중에서만 고르세요: 반찬, 고단백, 운동, 자취, 초간단, 국물, 집밥, 도시락, 다이어트, 순한맛, 매콤, 아침

마지막 응답은 설명 없이 아래 형태의 JSON 하나만 출력하세요:
{"ok":true,"title":"요리명","time":15,"kcal":400,"protein":20,"tags":["국물"],"ingredients":[{"name":"두부","amount":0.5,"unit":"모","seasoning":false}],"steps":["1단계 설명","2단계 설명"]}
레시피를 찾지 못하면 {"ok":false,"reason":"이유"} 만 출력하세요.`;

export async function extractRecipeFromYouTube(url, settings) {
  if (!settings.aiKey) throw new Error('설정에서 Claude API 키를 먼저 등록해 주세요.');
  const tools = [
    { type: 'web_fetch_20260209', name: 'web_fetch' },
    { type: 'web_search_20260209', name: 'web_search' },
  ];
  let messages = [{ role: 'user', content: YT_PROMPT(url) }];
  let msg = null;

  // 서버측 도구 루프가 길어지면 pause_turn으로 끊겨 돌아온다 → 그대로 이어서 재호출 (최대 3회)
  for (let i = 0; i < 4; i++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: aiHeaders(settings),
      body: JSON.stringify({
        model: settings.aiModel || 'claude-opus-4-8',
        max_tokens: 4096,
        tools,
        messages,
      }),
    });
    if (!res.ok) await throwApiError(res);
    msg = await res.json();
    if (msg.stop_reason === 'pause_turn') {
      messages = [...messages, { role: 'assistant', content: msg.content }];
      continue;
    }
    break;
  }

  if (!msg) throw new Error('AI 응답이 없어요. 다시 시도해 주세요.');
  if (msg.stop_reason === 'refusal') throw new Error('이 영상은 분석할 수 없어요.');

  const text = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
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
