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
// 호출 오리진을 그대로 반사(보통 http://localhost:8080). 와일드카드(*) 대신 요청 오리진만 허용.
const corsFor = (req) => ({
  'Access-Control-Allow-Origin': req.headers.origin || 'null',
  'Vary': 'Origin',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'authorization,content-type',
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
  if (req.headers['authorization']) headers['authorization'] = req.headers['authorization'];
  if (req.headers['content-type']) headers['content-type'] = req.headers['content-type'];

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
