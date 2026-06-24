// 그림공장 — 설정 영속화 (localStorage). API 키는 이 기기에만 저장되고 어디로도 전송/동기화되지 않는다.
// 보안: 공용 PC에서는 키를 넣지 말 것. 키는 호출 시 해당 제공자(OpenAI/Google)로만 전송된다.

const KEY = 'geurim.settings.v1';

const DEFAULTS = {
  openaiKey: '',
  geminiKey: '',
  geminiAuthMode: 'key',  // 'key' | 'oauth' (Google 로그인)
  googleClientId: '',     // OAuth 클라이언트 ID(공개값, 저장 안전). ...apps.googleusercontent.com
  gcpProject: '',         // 할당량용 프로젝트 ID(선택) → x-goog-user-project
  imageModel: 'dall-e-3',
  textModel: 'gpt-4o-mini',
  proxyBase: '',          // 비우면 브라우저에서 직접 호출. CORS가 막히면 로컬 프록시 주소(예: http://localhost:8787)
  concurrency: 2,         // 동시 호출 수(레이트리밋 보호)
  autoDownload: false,    // 생성 즉시 파일로 자동 저장
  translate: true,        // AI 보강 시 영어로 번역
  vary: true,             // 배치에서 장마다 살짝 다르게
  // 마지막 작업 복원
  lastSel: { subject: '', styleKind: 'photo', mood: 'soft', shot: 'portrait', palette: 'vivid', boosters: ['highres'], extra: '', negative: '' },
  lastPrompt: '',
  lastCount: 4,
  lastAspect: '1:1',
  lastQuality: 'auto',
  lastStyle: 'vivid',
};

let _s = null;

export function load() {
  if (_s) return _s;
  try { _s = { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY)) || {}) }; }
  catch { _s = { ...DEFAULTS }; }
  // 중첩 객체 기본값 보정
  _s.lastSel = { ...DEFAULTS.lastSel, ...(_s.lastSel || {}) };
  return _s;
}

export function get() { return load(); }

export function save(patch = {}) {
  _s = { ...load(), ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(_s)); } catch { /* 용량 초과 등 무시 */ }
  return _s;
}

export function reset() {
  _s = { ...DEFAULTS };
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  return _s;
}
