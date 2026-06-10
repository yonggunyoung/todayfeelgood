// AI 입고 스캔 — 영수증/장본 식재료 사진 → 품목 리스트 (Claude API, 본인 키 사용)
// 키는 이 기기의 localStorage에만 저장되며 동기화되지 않는다 (store.exportForSync에서 제거).

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
    headers: {
      'content-type': 'application/json',
      'x-api-key': settings.aiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
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

  if (!res.ok) {
    const msgByStatus = {
      401: 'API 키가 올바르지 않습니다. 설정에서 확인해 주세요.',
      429: '요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요.',
      529: '서비스가 혼잡합니다. 잠시 후 다시 시도해 주세요.',
    };
    let detail = '';
    try { detail = (await res.json()).error?.message || ''; } catch { /* ignore */ }
    throw new Error(msgByStatus[res.status] || `AI 호출 실패 (${res.status}) ${detail}`);
  }

  const msg = await res.json();
  if (msg.stop_reason === 'refusal') throw new Error('이미지를 분석할 수 없습니다. 다른 사진으로 시도해 주세요.');
  const text = (msg.content.find((b) => b.type === 'text') || {}).text || '{}';
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed.items) || parsed.items.length === 0) {
    throw new Error('사진에서 식재료를 찾지 못했습니다. 더 선명한 사진으로 시도해 주세요.');
  }
  return parsed.items;
}
