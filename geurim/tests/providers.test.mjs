// 제공자 요청 빌더/파서 단위 테스트 — node --test (네트워크 없음, 순수 함수만)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as openai from '../js/providers/openai.js';
import * as gemini from '../js/providers/gemini.js';
import * as reg from '../js/providers/index.js';

// ── OpenAI ──────────────────────────────────────
test('openai.sizeFor: 모델별 비율 매핑', () => {
  assert.equal(openai.sizeFor('dall-e-3', '9:16'), '1024x1792');
  assert.equal(openai.sizeFor('dall-e-3', '16:9'), '1792x1024');
  assert.equal(openai.sizeFor('dall-e-3', '1:1'), '1024x1024');
  assert.equal(openai.sizeFor('gpt-image-1', '3:4'), '1024x1536');
  assert.equal(openai.sizeFor('gpt-image-1', '4:3'), '1536x1024');
});

test('openai.maxPerCall: dall-e-3는 1, 그 외 10', () => {
  assert.equal(openai.maxPerCall('dall-e-3'), 1);
  assert.equal(openai.maxPerCall('gpt-image-1'), 10);
});

test('openai.buildImageRequest: dall-e-3 본문/헤더', () => {
  const r = openai.buildImageRequest({ key: 'KEY', model: 'dall-e-3', prompt: 'p', n: 5, aspect: '16:9', quality: 'hd', style: 'natural' });
  assert.equal(r.url, 'https://api.openai.com/v1/images/generations');
  assert.equal(r.headers.Authorization, 'Bearer KEY');
  assert.equal(r.body.n, 1, 'dall-e-3는 n=1 강제');
  assert.equal(r.body.size, '1792x1024');
  assert.equal(r.body.quality, 'hd');
  assert.equal(r.body.style, 'natural');
  assert.equal(r.body.response_format, 'b64_json');
});

test('openai.buildImageRequest: gpt-image-1 품질 처리', () => {
  const hi = openai.buildImageRequest({ key: 'K', model: 'gpt-image-1', prompt: 'p', n: 3, quality: 'high' });
  assert.equal(hi.body.quality, 'high');
  assert.equal(hi.body.n, 3);
  const auto = openai.buildImageRequest({ key: 'K', model: 'gpt-image-1', prompt: 'p', quality: 'auto' });
  assert.equal(auto.body.quality, undefined, 'auto면 quality 미포함');
});

test('openai.buildImageRequest: 프록시 베이스 사용', () => {
  const r = openai.buildImageRequest({ key: 'K', base: 'http://localhost:8787/openai', model: 'dall-e-3', prompt: 'p' });
  assert.equal(r.url, 'http://localhost:8787/openai/v1/images/generations');
});

test('openai.parseImage: b64_json만 추출', () => {
  const out = openai.parseImage({ data: [{ b64_json: 'AAA' }, { url: 'x' }, { b64_json: 'BBB' }] });
  assert.deepEqual(out, [{ b64: 'AAA', mime: 'image/png' }, { b64: 'BBB', mime: 'image/png' }]);
});

// ── Gemini ──────────────────────────────────────
test('gemini.isImagen / maxPerCall', () => {
  assert.equal(gemini.isImagen('imagen-4.0-generate-001'), true);
  assert.equal(gemini.isImagen('gemini-2.5-flash-image'), false);
  assert.equal(gemini.maxPerCall('imagen-4.0-generate-001'), 4);
  assert.equal(gemini.maxPerCall('gemini-2.5-flash-image'), 1);
});

test('gemini.buildImageRequest: imagen :predict + sampleCount 클램프', () => {
  const r = gemini.buildImageRequest({ key: 'K', model: 'imagen-4.0-generate-001', prompt: 'p', n: 10, aspect: '3:4' });
  assert.match(r.url, /:predict\?key=K$/);
  assert.equal(r.body.instances[0].prompt, 'p');
  assert.equal(r.body.parameters.sampleCount, 4, '최대 4로 클램프');
  assert.equal(r.body.parameters.aspectRatio, '3:4');
  assert.equal(r.body.parameters.negativePrompt, undefined, 'imagen엔 negativePrompt 미전송(400 방지)');
});

test('gemini.buildImageRequest: flash-image :generateContent + responseModalities', () => {
  const r = gemini.buildImageRequest({ key: 'K', model: 'gemini-2.5-flash-image', prompt: 'hi' });
  assert.match(r.url, /:generateContent\?key=K$/);
  assert.equal(r.body.contents[0].parts[0].text, 'hi');
  assert.deepEqual(r.body.generationConfig.responseModalities, ['TEXT', 'IMAGE']);
});

test('gemini.parseImage: predictions / candidates 두 형태', () => {
  assert.deepEqual(
    gemini.parseImage({ predictions: [{ bytesBase64Encoded: 'AAA', mimeType: 'image/png' }] }),
    [{ b64: 'AAA', mime: 'image/png' }],
  );
  assert.deepEqual(
    gemini.parseImage({ candidates: [{ content: { parts: [{ text: 'x' }, { inlineData: { data: 'BBB', mimeType: 'image/jpeg' } }] } }] }),
    [{ b64: 'BBB', mime: 'image/jpeg' }],
  );
});

// ── 레지스트리 ──────────────────────────────────
test('reg.providerOf / maxPerCall', () => {
  assert.equal(reg.providerOf('imagen-4.0-generate-001'), 'gemini');
  assert.equal(reg.providerOf('dall-e-3'), 'openai');
  assert.equal(reg.maxPerCall('imagen-4.0-generate-001'), 4);
  assert.equal(reg.maxPerCall('dall-e-3'), 1);
});

test('reg.baseFor: 직접 vs 프록시', () => {
  assert.equal(reg.baseFor('openai', { proxyBase: '' }), 'https://api.openai.com');
  assert.equal(reg.baseFor('gemini', { proxyBase: '' }), 'https://generativelanguage.googleapis.com');
  assert.equal(reg.baseFor('openai', { proxyBase: 'http://localhost:8787/' }), 'http://localhost:8787/openai');
  assert.equal(reg.baseFor('gemini', { proxyBase: 'http://x' }), 'http://x/gemini');
});
