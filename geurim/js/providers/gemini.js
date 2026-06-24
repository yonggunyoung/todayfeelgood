// 그림공장 — Google Gemini 제공자
//  · 이미지: gemini-2.5-flash-image(Nano Banana, :generateContent) / imagen-4·3(:predict)
//  · 텍스트: gemini-2.5-flash (프롬프트 보강)
// 인증은 auth 객체로 받는다:  {mode:'key', key}  또는  {mode:'oauth', token, project?}
//  - key  : URL에 ?key=… (AI Studio API 키)
//  - oauth: Authorization: Bearer <access_token> (+ 선택 x-goog-user-project) — Google 로그인
// 빌더는 순수 함수 → node 테스트 가능.

import { fetchJson } from './net.js';

export const GEMINI_BASE = 'https://generativelanguage.googleapis.com';

export const isImagen = (model) => /imagen/i.test(model);

// Imagen은 한 번에 최대 4장(sampleCount), flash-image는 호출당 1장
export function maxPerCall(model) {
  return isImagen(model) ? 4 : 1;
}

// 인증 방식에 따라 URL(쿼리)·헤더를 구성 (순수)
export function applyAuth(path, auth = {}) {
  const headers = { 'Content-Type': 'application/json' };
  let url = path;
  if (auth.mode === 'oauth') {
    headers.Authorization = `Bearer ${auth.token}`;
    if (auth.project) headers['x-goog-user-project'] = auth.project;
  } else {
    url += `?key=${encodeURIComponent(auth.key || '')}`;
  }
  return { url, headers };
}

/**
 * 이미지 생성 요청 빌더 (순수).
 * @param {object} o {auth, base, model, prompt, n, aspect}
 * @returns {{url, headers, body}}
 */
export function buildImageRequest({ auth, base = GEMINI_BASE, model = 'gemini-2.5-flash-image', prompt, n = 1, aspect = '1:1' }) {
  const root = base.replace(/\/+$/, '');
  if (isImagen(model)) {
    // imagen-3.0-generate-002 / imagen-4 는 negativePrompt를 받지 않으므로 보내지 않는다(400 방지).
    const { url, headers } = applyAuth(`${root}/v1beta/models/${model}:predict`, auth);
    return {
      url, headers,
      body: { instances: [{ prompt }], parameters: { sampleCount: Math.min(Math.max(n, 1), 4), aspectRatio: aspect } },
    };
  }
  // gemini-2.5-flash-image (및 2.0 preview) — generateContent, 이미지 파트 반환
  const { url, headers } = applyAuth(`${root}/v1beta/models/${model}:generateContent`, auth);
  return {
    url, headers,
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
export function buildTextRequest({ auth, base = GEMINI_BASE, model = 'gemini-2.5-flash', prompt }) {
  const root = base.replace(/\/+$/, '');
  const { url, headers } = applyAuth(`${root}/v1beta/models/${model}:generateContent`, auth);
  return { url, headers, body: { contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.9 } } };
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

/** 자격 점검 — /v1beta/models GET (키 또는 OAuth 토큰) */
export async function testAuth(auth, base = GEMINI_BASE) {
  const { url, headers } = applyAuth(`${base.replace(/\/+$/, '')}/v1beta/models`, auth);
  await fetchJson(url, { method: 'GET', headers, retries: 0 });
  return true;
}
