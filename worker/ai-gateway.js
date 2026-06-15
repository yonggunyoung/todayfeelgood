// 냉비서 AI 게이트웨이 — Cloudflare Worker (멀티프로바이더)
// ──────────────────────────────────────────────────────────────────────────
// 운영자 API 키를 시크릿으로 보관하고, 클라이언트가 만든 요청 본문에 "키만 끼워"
// 업스트림(Anthropic / Google Gemini)으로 그대로 전달한다. 키는 절대 클라이언트로 나가지 않는다.
//
// 클라이언트는 본문(JSON)을 text/plain 으로 보내 CORS 프리플라이트(OPTIONS)를 생략한다.
// 프로바이더 선택: 헤더 `x-ai-provider: gemini` (또는 경로 끝이 /gemini). 기본은 Anthropic(기존 동작 그대로).
//
// 배포 (Cloudflare 대시보드):
//   Workers & Pages → 이 워커 → Edit code 에 이 파일 내용 붙여넣기 → Deploy
//   Settings → Variables and Secrets 에 시크릿 추가:
//     ANTHROPIC_API_KEY   (기존에 이미 있을 것 — 그대로 두면 됨)
//     GEMINI_API_KEY      (Google AI Studio에서 발급한 키 — 새로 추가)
//     GEMINI_MODEL        (선택: 기본 모델 ID. 비우면 클라이언트가 헤더로 지정)
//   배포 후 브라우저로 GET 하면 "WORKER-OK-v10" 이 보이면 정상.
// ──────────────────────────────────────────────────────────────────────────

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, GET, OPTIONS',
  'access-control-allow-headers': 'content-type, x-ai-provider, x-gemini-model',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (request.method === 'GET') {
      return new Response('WORKER-OK-v10', { headers: { ...CORS, 'content-type': 'text/plain' } });
    }
    if (request.method !== 'POST') return json({ error: 'POST only' }, 405);

    const url = new URL(request.url);
    const wantsGemini = url.pathname.replace(/\/+$/, '').endsWith('/gemini')
      || request.headers.get('x-ai-provider') === 'gemini';
    const body = await request.text(); // 클라이언트가 만든 페이로드를 그대로 전달

    try {
      if (wantsGemini) {
        const key = env.GEMINI_API_KEY;
        if (!key) return json({ error: 'GEMINI_API_KEY 시크릿이 설정되지 않았어요' }, 501);
        // 모델 버전명은 코드에 박지 않는다 — 헤더 또는 GEMINI_MODEL 시크릿으로 받는다(역할↔버전 분리).
        const model = request.headers.get('x-gemini-model') || env.GEMINI_MODEL;
        if (!model) return json({ error: 'Gemini 모델명을 x-gemini-model 헤더나 GEMINI_MODEL 시크릿으로 지정해 주세요' }, 400);
        const upstream = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
          { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key }, body },
        );
        return relay(upstream);
      }

      // 기본: Anthropic (기존 워커와 동일한 동작)
      const key = env.ANTHROPIC_API_KEY;
      if (!key) return json({ error: 'ANTHROPIC_API_KEY 시크릿이 설정되지 않았어요' }, 501);
      const upstream = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body,
      });
      return relay(upstream);
    } catch (e) {
      return json({ error: String((e && e.message) || e) }, 502);
    }
  },
};

// 업스트림 상태코드·본문을 그대로 전달하되 CORS 헤더만 입힌다 (과부하 529 등 상태 보존 → 클라이언트 재시도 로직이 본다)
async function relay(upstream) {
  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: { ...CORS, 'content-type': upstream.headers.get('content-type') || 'application/json' },
  });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'content-type': 'application/json' } });
}
