// 그림공장 — OpenAI 제공자 (이미지: gpt-image-1 / dall-e-3 / dall-e-2, 텍스트: gpt-4o-mini 등)
// 본인 OpenAI API 키(platform.openai.com)를 사용한다. ※ ChatGPT Plus 구독과는 별개의 API 결제다.
// 빌더(buildImageRequest/parseImage 등)는 순수 함수 → node 테스트 가능. fetch는 generate*에서만.

import { fetchJson } from './net.js';

export const OPENAI_BASE = 'https://api.openai.com';

// 화면 비율 → OpenAI 허용 크기. 모델별로 허용 사이즈가 다르다.
export function sizeFor(model, aspect) {
  const portrait = aspect === '3:4' || aspect === '9:16';
  const landscape = aspect === '4:3' || aspect === '16:9';
  if (model === 'dall-e-3') {
    if (portrait) return '1024x1792';
    if (landscape) return '1792x1024';
    return '1024x1024';
  }
  if (model === 'dall-e-2') return '1024x1024'; // dall-e-2는 정사각만 실용적
  // gpt-image-1
  if (portrait) return '1024x1536';
  if (landscape) return '1536x1024';
  return '1024x1024';
}

// 한 번의 호출로 만들 수 있는 최대 장수
export function maxPerCall(model) {
  if (model === 'dall-e-3') return 1; // DALL·E 3는 n=1만 허용
  return 10; // gpt-image-1 / dall-e-2
}

/**
 * 이미지 생성 요청 빌더 (순수).
 * @param {object} o {key, base, model, prompt, n, aspect, quality, style}
 * @returns {{url, headers, body}}
 */
export function buildImageRequest({ key, base = OPENAI_BASE, model = 'gpt-image-1', prompt, n = 1, aspect = '1:1', quality = 'auto', style = 'vivid' }) {
  const size = sizeFor(model, aspect);
  const body = { model, prompt, n, size };
  if (model === 'gpt-image-1') {
    if (quality && quality !== 'auto') body.quality = quality; // low|medium|high
    // gpt-image-1은 항상 b64_json 반환(별도 지정 불필요)
  } else if (model === 'dall-e-3') {
    body.n = 1;
    body.quality = quality === 'hd' ? 'hd' : 'standard';
    body.style = style === 'natural' ? 'natural' : 'vivid';
    body.response_format = 'b64_json';
  } else {
    body.response_format = 'b64_json';
  }
  return {
    url: `${base.replace(/\/+$/, '')}/v1/images/generations`,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body,
  };
}

/** 응답 → [{b64, mime}] (순수) */
export function parseImage(json) {
  const data = json?.data || [];
  return data.filter((d) => d?.b64_json).map((d) => ({ b64: d.b64_json, mime: 'image/png' }));
}

/** 텍스트(프롬프트 보강) 요청 빌더 (순수) */
export function buildTextRequest({ key, base = OPENAI_BASE, model = 'gpt-4o-mini', prompt }) {
  return {
    url: `${base.replace(/\/+$/, '')}/v1/chat/completions`,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: { model, messages: [{ role: 'user', content: prompt }], temperature: 0.9, max_tokens: 600 },
  };
}

export function parseText(json) {
  return (json?.choices?.[0]?.message?.content || '').trim();
}

// ── 네트워크 동작부 ─────────────────────────────────────────
export async function generateImages(opts, signal) {
  const { url, headers, body } = buildImageRequest(opts);
  const json = await fetchJson(url, { headers, body, signal });
  return parseImage(json);
}

export async function enrichPrompt(opts, signal) {
  const { url, headers, body } = buildTextRequest(opts);
  const json = await fetchJson(url, { headers, body, signal });
  return parseText(json);
}

/** 키 유효성 점검 — /v1/models GET (성공 시 true) */
export async function testKey(key, base = OPENAI_BASE) {
  await fetchJson(`${base.replace(/\/+$/, '')}/v1/models`, {
    method: 'GET', headers: { Authorization: `Bearer ${key}` }, retries: 0,
  });
  return true;
}
