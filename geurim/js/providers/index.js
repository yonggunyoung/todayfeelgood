// 그림공장 — 제공자 레지스트리/디스패처. 모델 카탈로그 + 직접/프록시 베이스 해석 + 통합 호출.

import * as openai from './openai.js';
import * as gemini from './gemini.js';
import * as gauth from './google-auth.js';

// 이미지 모델 카탈로그 (UI 드롭다운). 모델명이 바뀌면 설정의 "직접 입력"으로 덮어쓸 수 있다.
export const IMAGE_MODELS = [
  { id: 'gpt-image-1',               provider: 'openai', label: 'OpenAI · GPT Image 1',          note: '고품질·글자 표현 우수 (조직 인증 필요할 수 있음)' },
  { id: 'dall-e-3',                  provider: 'openai', label: 'OpenAI · DALL·E 3',             note: '안정적·널리 사용 가능 (호출당 1장)' },
  { id: 'dall-e-2',                  provider: 'openai', label: 'OpenAI · DALL·E 2',             note: '저렴·정사각' },
  { id: 'gemini-2.5-flash-image',    provider: 'gemini', label: 'Gemini · 2.5 Flash Image',      note: '빠름·자연스러움 (호출당 1장)' },
  { id: 'imagen-4.0-generate-001',   provider: 'gemini', label: 'Gemini · Imagen 4',             note: '고품질 (호출당 최대 4장, 결제 필요)' },
  { id: 'imagen-3.0-generate-002',   provider: 'gemini', label: 'Gemini · Imagen 3',             note: '안정적 (호출당 최대 4장, 결제 필요)' },
];

// 프롬프트 보강용 텍스트 모델
export const TEXT_MODELS = [
  { id: 'gpt-4o-mini',     provider: 'openai', label: 'OpenAI · GPT-4o mini (저렴)' },
  { id: 'gpt-4o',          provider: 'openai', label: 'OpenAI · GPT-4o' },
  { id: 'gemini-2.5-flash', provider: 'gemini', label: 'Gemini · 2.5 Flash (저렴)' },
  { id: 'gemini-2.5-pro',  provider: 'gemini', label: 'Gemini · 2.5 Pro' },
];

export const modelInfo = (id) => IMAGE_MODELS.find((m) => m.id === id) || null;
export const providerOf = (modelId) => modelInfo(modelId)?.provider || (/imagen|gemini/i.test(modelId) ? 'gemini' : 'openai');
const mod = (provider) => (provider === 'gemini' ? gemini : openai);

// 직접 호출 베이스 vs 로컬 프록시 베이스 해석.
// 프록시를 켜면 OpenAI는 `${proxy}/openai`, Gemini는 `${proxy}/gemini` 로 보낸다(proxy.mjs가 포워딩).
export function baseFor(provider, settings) {
  const proxy = (settings?.proxyBase || '').trim().replace(/\/+$/, '');
  if (proxy) return `${proxy}/${provider}`;
  return provider === 'gemini' ? gemini.GEMINI_BASE : openai.OPENAI_BASE;
}

// Gemini 인증 객체 구성 — 키 모드면 {mode:'key'}, OAuth 모드면 토큰을 (무UI로) 받아 {mode:'oauth'}.
async function geminiAuth(settings) {
  if (settings.geminiAuthMode === 'oauth') {
    if (!settings.googleClientId) throw new Error('Google OAuth 클라이언트 ID를 설정에 입력해 주세요.');
    const token = await gauth.getToken(settings.googleClientId); // silent; 실패 시 throw → "다시 로그인"
    return { mode: 'oauth', token, project: (settings.gcpProject || '').trim() || undefined };
  }
  if (!settings.geminiKey) throw new Error('Gemini 자격이 없어요. 설정에서 API 키를 넣거나 Google 로그인을 하세요.');
  return { mode: 'key', key: settings.geminiKey };
}

// 생성 전 빠른 자격 확인(동기) — 버튼 가드용
export function hasCredentials(provider, settings) {
  if (provider === 'gemini') {
    return settings.geminiAuthMode === 'oauth'
      ? (!!settings.googleClientId && (gauth.hasValidToken() || gauth.isConsented()))
      : !!settings.geminiKey;
  }
  return !!settings.openaiKey;
}

// 호출당 최대 장수 — 배치 청크 크기 결정에 사용
export function maxPerCall(modelId) {
  const p = providerOf(modelId);
  return mod(p).maxPerCall(modelId);
}

/**
 * 이미지 1청크 생성 (n장 한 번에). 배치 엔진이 청크 단위로 호출한다.
 * @returns {Promise<{b64,mime}[]>}
 */
export async function generateChunk({ modelId, prompt, n, aspect, quality, style }, settings, signal) {
  const provider = providerOf(modelId);
  const base = baseFor(provider, settings);
  if (provider === 'gemini') {
    const auth = await geminiAuth(settings);
    return gemini.generateImages({ auth, base, model: modelId, prompt, n, aspect }, signal);
  }
  if (!settings.openaiKey) throw new Error('OpenAI API 키가 없어요. 설정에서 키를 등록해 주세요.');
  return openai.generateImages({ key: settings.openaiKey, base, model: modelId, prompt, n, aspect, quality, style }, signal);
}

/** 프롬프트 보강 (텍스트 모델) */
export async function enrich({ textModelId, prompt }, settings, signal) {
  const provider = TEXT_MODELS.find((m) => m.id === textModelId)?.provider || (/gemini/i.test(textModelId) ? 'gemini' : 'openai');
  const base = baseFor(provider, settings);
  if (provider === 'gemini') {
    const auth = await geminiAuth(settings);
    return gemini.enrichPrompt({ auth, base, model: textModelId, prompt }, signal);
  }
  if (!settings.openaiKey) throw new Error('OpenAI API 키가 없어요(프롬프트 보강용). 설정에서 키를 등록해 주세요.');
  return openai.enrichPrompt({ key: settings.openaiKey, base, model: textModelId, prompt }, signal);
}

/** 자격 테스트 (키 또는 Google 로그인) */
export async function testCredentials(provider, settings) {
  const base = baseFor(provider, settings);
  if (provider === 'gemini') {
    const auth = await geminiAuth(settings);
    return gemini.testAuth(auth, base);
  }
  if (!settings.openaiKey) throw new Error('키가 비어 있어요.');
  return openai.testKey(settings.openaiKey, base);
}
