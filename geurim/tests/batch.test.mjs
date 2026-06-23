// 배치 통합 테스트 — fetch를 스텁해 네트워크 없이 "N 요청 → N 저장" 과 실패 집계를 검증.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runBatch } from '../js/batch.js';

const baseJob = { modelId: 'dall-e-3', prompt: 'p', aspect: '1:1', quality: 'standard', style: 'vivid', vary: false, concurrency: 3 };
const settings = { openaiKey: 'k', proxyBase: '' };
const okResp = (obj) => ({ ok: true, status: 200, json: async () => obj });

test('runBatch: N 요청 → 정확히 N장 저장(저장을 await)', async () => {
  globalThis.fetch = async () => okResp({ data: [{ b64_json: 'AAA' }] }); // dall-e-3: 호출당 1장
  let saved = 0;
  const res = await runBatch({ ...baseJob, count: 5 }, settings, {
    onImage: async () => { await Promise.resolve(); saved += 1; }, // 비동기 저장
  });
  assert.equal(res.made, 5);
  assert.equal(res.failed, 0);
  assert.equal(saved, 5, '저장 콜백이 정확히 N번, 그리고 끝까지 await됨');
});

test('runBatch: 빈 응답 1건은 made가 아니라 failed로 집계(합계 보존)', async () => {
  let call = 0;
  globalThis.fetch = async () => { call += 1; return okResp({ data: call === 2 ? [] : [{ b64_json: 'AAA' }] }); };
  const res = await runBatch({ ...baseJob, count: 5 }, settings, { onImage: async () => {} });
  assert.equal(res.made, 4);
  assert.equal(res.failed, 1);
  assert.equal(res.made + res.failed, 5, '요청 수치 = 성공 + 실패');
});

test('runBatch: 저장 실패(onImage throw)도 failed로 집계', async () => {
  globalThis.fetch = async () => okResp({ data: [{ b64_json: 'AAA' }] });
  let n = 0;
  const res = await runBatch({ ...baseJob, count: 4 }, settings, {
    onImage: async () => { n += 1; if (n === 1) throw new Error('디코딩 실패'); },
  });
  assert.equal(res.made, 3);
  assert.equal(res.failed, 1);
});

test('runBatch: 인증 오류(401)는 즉시 전체 중단', async () => {
  globalThis.fetch = async () => ({ ok: false, status: 401, json: async () => ({ error: { message: 'bad key' } }) });
  const res = await runBatch({ ...baseJob, count: 6, concurrency: 1 }, settings, { onImage: async () => {} });
  assert.equal(res.made, 0);
  assert.ok(res.aborted, '401이면 aborted=true 로 조기 종료');
});
