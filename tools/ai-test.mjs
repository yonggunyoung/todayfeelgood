#!/usr/bin/env node
// 관리자용 AI 파이프라인 테스트 CLI — 폰/앱 없이 터미널에서 검증한다.
// Claude Code(클로드 CLI) 세션 안에서도 그대로 실행 가능.
//
// 사용법:
//   export ANTHROPIC_API_KEY=sk-ant-…
//   node tools/ai-test.mjs scan ./영수증.jpg        # 영수증/식재료 사진 → 품목 추출
//   node tools/ai-test.mjs yt   https://youtu.be/…  # 유튜브 → 빠른 레시피 정리
//
// 모델 교체 실험: SCAN_MODEL / RECIPE_MODEL 환경변수 (서버 functions/와 동일 규약)
import fs from 'node:fs';

const KEY = process.env.ANTHROPIC_API_KEY;
const SCAN_MODEL = process.env.SCAN_MODEL || 'claude-haiku-4-5';
const RECIPE_MODEL = process.env.RECIPE_MODEL || 'claude-sonnet-4-6';
const [, , cmd, arg] = process.argv;

if (!KEY) { console.error('❌ ANTHROPIC_API_KEY 환경변수를 설정하세요 (console.anthropic.com에서 발급)'); process.exit(1); }
if (!cmd || !arg) {
  console.log('사용법:\n  node tools/ai-test.mjs scan <이미지파일>\n  node tools/ai-test.mjs yt <유튜브URL>');
  process.exit(0);
}

async function callApi(body) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) { console.error(`❌ API 오류 ${res.status}:`, json.error?.message || json); process.exit(1); }
  return json;
}

const usageLine = (m) =>
  `   (모델 ${m.model} · 입력 ${m.usage?.input_tokens ?? '?'}tok / 출력 ${m.usage?.output_tokens ?? '?'}tok)`;

/* ── scan: 영수증/식재료 사진 ─────────────── */
async function runScan(file) {
  if (!fs.existsSync(file)) { console.error('❌ 파일이 없습니다:', file); process.exit(1); }
  const buf = fs.readFileSync(file);
  if (buf.length > 3_500_000) { console.error('❌ 이미지가 너무 큽니다 (3.5MB 이하 JPEG 권장 — 미리 줄여주세요)'); process.exit(1); }
  const mediaType = file.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

  const schema = {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: { name: { type: 'string' }, qty: { type: 'number' }, unit: { type: 'string' } },
          required: ['name', 'qty'],
          additionalProperties: false,
        },
      },
    },
    required: ['items'],
    additionalProperties: false,
  };
  const prompt = `이 사진은 한국 마트/온라인몰 영수증이거나 장 봐온 식재료를 펼쳐 놓은 사진입니다.
식품(요리 재료)만 추출하세요. 비식품과 봉투값·할인·합계 줄은 제외합니다.
상품명은 일반 재료명으로 정규화하세요: "서울우유1L" → "우유". 수량을 알 수 없으면 1. JSON으로만 답하세요.`;

  console.log(`📷 스캔 중… (${(buf.length / 1024).toFixed(0)}KB, ${SCAN_MODEL})`);
  const msg = await callApi({
    model: SCAN_MODEL,
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: buf.toString('base64') } },
        { type: 'text', text: prompt },
      ],
    }],
    output_config: { format: { type: 'json_schema', schema } },
  });
  const text = (msg.content.find((b) => b.type === 'text') || {}).text || '{}';
  const { items = [] } = JSON.parse(text);
  console.log(`\n✅ 인식 결과 ${items.length}개`);
  for (const it of items) console.log(`   · ${it.name}  ×${it.qty}${it.unit || ''}`);
  console.log(usageLine(msg));
}

/* ── yt: 유튜브 빠른 레시피 ──────────────── */
async function runYt(url) {
  const prompt = `유튜브 요리 영상에서 레시피를 정리하는 작업입니다.
영상: ${url}

1) web_fetch로 영상 페이지를 열어 제목·설명란을 읽으세요.
2) 부족하면 web_search로 "영상 제목 + 레시피"를 검색해 보완하세요.
3) 재료명은 한국 마트 일반 명칭으로 정규화, 기본 양념은 seasoning: true.
4) 분량은 1인분 기준 환산.

5) steps는 5~9개(불 세기·시간·계량 포함), tips에는 키포인트 최대 3개.

마지막 응답은 JSON 하나만:
{"ok":true,"title":"...","time":15,"kcal":400,"protein":20,"tags":["국물"],"ingredients":[{"name":"두부","amount":0.5,"unit":"모","seasoning":false}],"steps":["..."],"tips":["..."]}
못 찾으면 {"ok":false,"reason":"이유"}`;

  const tools = [
    { type: 'web_fetch_20260209', name: 'web_fetch' },
    { type: 'web_search_20260209', name: 'web_search' },
  ];
  let messages = [{ role: 'user', content: prompt }];
  let msg = null;
  console.log(`🎬 영상 분석 중… (${RECIPE_MODEL}, 20~40초)`);
  for (let i = 0; i < 4; i++) {
    msg = await callApi({ model: RECIPE_MODEL, max_tokens: 4096, tools, messages });
    if (msg.stop_reason === 'pause_turn') {
      console.log('   …웹 조사 계속');
      messages = [...messages, { role: 'assistant', content: msg.content }];
      continue;
    }
    break;
  }
  const text = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  const start = text.lastIndexOf('{"ok"');
  const end = text.lastIndexOf('}');
  if (start < 0) { console.error('❌ JSON을 찾지 못했어요. 원문:\n', text.slice(0, 800)); process.exit(1); }
  const data = JSON.parse(text.slice(start, end + 1));
  if (!data.ok) { console.error('❌', data.reason || '레시피를 찾지 못했어요'); process.exit(1); }
  console.log(`\n✅ ${data.title}  (⏱${data.time || '?'}분 · ${data.kcal || '?'}kcal · 단백질 ${data.protein || '?'}g · 태그 ${(data.tags || []).join(',')})`);
  console.log('   [재료]');
  for (const g of data.ingredients) console.log(`   · ${g.name} ${g.amount || ''}${g.unit || ''}${g.seasoning ? ' (양념)' : ''}`);
  console.log('   [순서]');
  data.steps.forEach((s, i) => console.log(`   ${i + 1}. ${s}`));
  if (data.tips?.length) { console.log('   [키포인트]'); data.tips.forEach((t2) => console.log(`   💡 ${t2}`)); }
  console.log(usageLine(msg));
}

if (cmd === 'scan') await runScan(arg);
else if (cmd === 'yt') await runYt(arg);
else { console.error('❌ 알 수 없는 명령:', cmd, '(scan | yt)'); process.exit(1); }
