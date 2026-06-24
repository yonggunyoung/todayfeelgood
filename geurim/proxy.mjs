// 그림공장 — 선택용 로컬 CORS 프록시 (의존성 0, Node 18+ 내장 fetch 사용).
// 브라우저 직접 호출이 CORS로 막힐 때만 사용. 폴더에서:  npm run proxy   (또는  node proxy.mjs)
// 그 다음 앱 설정의 "로컬 프록시"에  http://localhost:8787  을 넣으면 됨.
//
// 경로 매핑:  /openai/...  → https://api.openai.com/...
//             /gemini/...  → https://generativelanguage.googleapis.com/...
// 키는 사용자의 브라우저→로컬 프록시→해당 제공자 로만 흐른다(이 스크립트는 로그/저장하지 않음).

import http from 'node:http';

const PORT = process.env.PORT || 8787;
const TARGETS = {
  openai: 'https://api.openai.com',
  gemini: 'https://generativelanguage.googleapis.com',
};
// 브라우저→프록시→제공자로 통과시키는(그리고 CORS 프리플라이트에서 허용하는) 요청 헤더 화이트리스트.
//  · x-goog-user-project: Gemini를 Google 로그인(OAuth)으로 쓸 때 청구 프로젝트 지정 — 빠지면 403.
//  · x-goog-api-key:      Gemini 키를 헤더로 보내는 방식도 통과(현재 앱은 ?key= 사용).
// 두 곳(아래 CORS 응답 + 실제 포워딩)에서 같은 목록을 써서 서로 어긋나지 않게 한다.
const FWD_HEADERS = ['authorization', 'content-type', 'x-goog-user-project', 'x-goog-api-key'];
// 호출 오리진을 그대로 반사(보통 http://localhost:8080). 와일드카드(*) 대신 요청 오리진만 허용.
const corsFor = (req) => ({
  'Access-Control-Allow-Origin': req.headers.origin || 'null',
  'Vary': 'Origin',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': FWD_HEADERS.join(','),
  'Access-Control-Max-Age': '86400',
});

const server = http.createServer(async (req, res) => {
  const CORS = corsFor(req);
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); res.end(); return; }

  const [, prefix, ...rest] = req.url.split('/');
  const base = TARGETS[prefix];
  if (!base) { res.writeHead(404, CORS); res.end('use /openai/* or /gemini/*'); return; }

  const targetUrl = base + '/' + rest.join('/'); // 쿼리스트링(?key=)은 rest 마지막에 포함됨
  const headers = {};
  for (const h of FWD_HEADERS) { if (req.headers[h]) headers[h] = req.headers[h]; }

  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', async () => {
    try {
      const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : Buffer.concat(chunks);
      const upstream = await fetch(targetUrl, { method: req.method, headers, body });
      const buf = Buffer.from(await upstream.arrayBuffer());
      res.writeHead(upstream.status, {
        ...CORS,
        'content-type': upstream.headers.get('content-type') || 'application/json',
      });
      res.end(buf);
    } catch (e) {
      res.writeHead(502, { ...CORS, 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: { message: '프록시 포워딩 실패: ' + (e?.message || e) } }));
    }
  });
});

// 127.0.0.1 바인딩 — 같은 PC(브라우저)에서만 접근 가능, LAN에 노출 안 됨.
server.listen(PORT, '127.0.0.1', () => {
  console.log(`그림공장 프록시 실행 중 → http://localhost:${PORT} (이 PC 전용)`);
  console.log('앱 설정의 "로컬 프록시"에 위 주소를 넣으세요. (종료: Ctrl+C)');
});
