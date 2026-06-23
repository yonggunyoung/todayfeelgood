// 그림공장 — Google Gemini 제공자
//  · 이미지: gemini-2.5-flash-image(Nano Banana, :generateContent) / imagen-4·3(:predict)
//  · 텍스트: gemini-2.5-flash (프롬프트 보강)
// 본인 Gemini API 키(aistudio.google.com)를 사용한다. ※ Gemini Advanced 구독과는 별개의 API 결제다.
// 빌더는 순수 함수 → node 테스트 가능.

import { fetchJson } from './net.js';

export const GEMINI_BASE = 'https://generativelanguage.googleapis.com';

export const isImagen = (model) => /imagen/i.test(model);

// Imagen은 한 번에 최대 4장(sampleCount), flash-image는 호출당 1장
export function maxPerCall(model) {
  return isImagen(model) ? 4 : 1;
}

/**
 * 이미지 생성 요청 빌더 (순수).
 * @param {object} o {key, base, model, prompt, n, aspect}
 * @returns {{url, headers, body}}
 */
export function buildImageRequest({ key, base = GEMINI_BASE, model = 'gemini-2.5-flash-image', prompt, n = 1, aspect = '1:1' }) {
  const root = base.replace(/\/+$/, '');
  const auth = `?key=${encodeURIComponent(key)}`;
  if (isImagen(model)) {
    // imagen-3.0-generate-002 / imagen-4 는 negativePrompt를 받지 않으므로 보내지 않는다(보내면 400).
    // 제외 요소는 호출부에서 프롬프트에 "(avoid: …)" 절로 녹여 전달한다.
    const parameters = { sampleCount: Math.min(Math.max(n, 1), 4), aspectRatio: aspect };
    return {
      url: `${root}/v1beta/models/${model}:predict${auth}`,
      headers: { 'Content-Type': 'application/json' },
      body: { instances: [{ prompt }], parameters },
    };
  }
  // gemini-2.5-flash-image (및 2.0 preview) — generateContent, 이미지 파트 반환
  return {
    url: `${root}/v1beta/models/${model}:generateContent${auth}`,
    headers: { 'Content-Type': 'application/json' },
    body: {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
    },
  };
}

/** 응답 → [{b64, mime}] (순수, 두 응답 형태 모두 처리) */
export function parseImage(json) {
  // Imagen :predict
  if (Array.isArray(json?.predictions)) {
    return json.predictions
      .filter((p) => p?.bytesBase64Encoded)
      .map((p) => ({ b64: p.bytesBase64Encoded, mime: p.mimeType || 'image/png' }));
  }
  // generateContent — candidates[].content.parts[].inlineData
  const out = [];
  for (const c of json?.candidates || []) {
    for (const part of c?.content?.parts || []) {
      const inline = part.inlineData || part.inline_data;
      if (inline?.data) out.push({ b64: inline.data, mime: inline.mimeType || inline.mime_type || 'image/png' });
    }
  }
  return out;
}

/** 텍스트(프롬프트 보강) 요청 빌더 (순수) */
export function buildTextRequest({ key, base = GEMINI_BASE, model = 'gemini-2.5-flash', prompt }) {
  const root = base.replace(/\/+$/, '');
  return {
    url: `${root}/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
    headers: { 'Content-Type': 'application/json' },
    body: { contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.9 } },
  };
}

export function parseText(json) {
  const parts = json?.candidates?.[0]?.content?.parts || [];
  return parts.map((p) => p.text || '').join('').trim();
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

/** 키 유효성 점검 — /v1beta/models GET */
export async function testKey(key, base = GEMINI_BASE) {
  await fetchJson(`${base.replace(/\/+$/, '')}/v1beta/models?key=${encodeURIComponent(key)}`, {
    method: 'GET', retries: 0,
  });
  return true;
}
