// 그림공장 — 메인 UI 컨트롤러. 옵션 선택 → 프롬프트 조립/보강 → 시안/배치 생성 → 저장·갤러리.

import * as store from './store.js';
import * as db from './db.js';
import * as P from './providers/index.js';
import { runBatch } from './batch.js';
import * as gauth from './providers/google-auth.js';
import { buildPrompt, enrichInstruction, clampPrompt } from './prompt.js';
import * as data from './styles-data.js';
import * as gallery from './gallery.js';

const $ = (id) => document.getElementById(id);
const s = store.load();

// ── 토스트 ──────────────────────────────────────
let toastTimer;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}
function credMsg(provider) {
  if (provider === 'gemini' && s.geminiAuthMode === 'oauth') return 'Google 로그인이 필요해요 (설정 → Gemini 인증 → Google로 로그인).';
  return `${provider === 'gemini' ? 'Gemini' : 'OpenAI'} 자격이 필요해요 (설정).`;
}

// ── 현재 선택 상태 (store.lastSel 복원) ──────────
const sel = { ...s.lastSel };

// 스트립/라이트박스 objectURL 수명 관리(누수 방지)
let stripUrls = [];
let lbUrl = null;

// ── 칩 렌더 ─────────────────────────────────────
function renderChips(containerId, list, key, multi = false) {
  const box = $(containerId);
  box.innerHTML = '';
  list.forEach((item) => {
    const b = document.createElement('button');
    b.className = 'chip';
    b.textContent = item.ko;
    const isOn = multi ? (sel[key] || []).includes(item.id) : sel[key] === item.id;
    if (isOn) b.classList.add('on');
    b.addEventListener('click', () => {
      if (multi) {
        const arr = new Set(sel[key] || []);
        arr.has(item.id) ? arr.delete(item.id) : arr.add(item.id);
        sel[key] = [...arr];
      } else {
        sel[key] = sel[key] === item.id ? '' : item.id;
      }
      renderChips(containerId, list, key, multi);
      persistSel();
    });
    box.appendChild(b);
  });
}

function persistSel() {
  sel.subject = $('subject').value;
  sel.extra = sel.extra || '';
  sel.negative = $('negative').value;
  store.save({ lastSel: sel });
}

// ── 셀렉트 채우기 ───────────────────────────────
function fillSelect(elId, items, value, labelKey = 'label', valKey = 'id') {
  const elx = $(elId); elx.innerHTML = '';
  items.forEach((it) => {
    const o = document.createElement('option');
    o.value = it[valKey]; o.textContent = it[labelKey] || it.ko; elx.appendChild(o);
  });
  if (value != null) elx.value = value;
}

function qualityOptionsFor(modelId) {
  if (modelId === 'gpt-image-1') return [['auto', '자동'], ['high', '고품질'], ['medium', '보통'], ['low', '빠름·저렴']];
  if (modelId === 'dall-e-3') return [['standard', '표준'], ['hd', 'HD(고품질)']];
  return [['auto', '기본']];
}

function updateModelUI() {
  const modelId = $('sel-model').value;
  // 품질 옵션 갱신
  const qsel = $('sel-quality'); const prev = qsel.value;
  qsel.innerHTML = '';
  qualityOptionsFor(modelId).forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; qsel.appendChild(o); });
  if ([...qsel.options].some((o) => o.value === prev)) qsel.value = prev;
  else if ([...qsel.options].some((o) => o.value === s.lastQuality)) qsel.value = s.lastQuality;
  // DALL·E 스타일 노출
  $('sel-style-wrap').classList.toggle('hidden', modelId !== 'dall-e-3');
  // 노트
  $('model-note').textContent = P.modelInfo(modelId)?.note || '';
}

// ── 프롬프트 조립/보강 ──────────────────────────
function assemble() {
  const subject = $('subject').value.trim();
  if (!subject) { toast('주제를 먼저 입력해 주세요.'); $('subject').focus(); return ''; }
  const prompt = buildPrompt({ ...sel, subject });
  $('prompt').value = prompt;
  store.save({ lastPrompt: prompt });
  return prompt;
}

async function enrich() {
  let prompt = $('prompt').value.trim() || assemble();
  if (!prompt) return;
  const textModelId = s.textModel;
  const provider = P.TEXT_MODELS.find((m) => m.id === textModelId)?.provider || 'openai';
  if (!P.hasCredentials(provider, s)) { toast(credMsg(provider)); return; }
  setBusy($('btn-enrich'), true, '다듬는 중…');
  try {
    const out = await P.enrich({ textModelId, prompt: enrichInstruction(prompt, { translate: s.translate }) }, s);
    const cleaned = clampPrompt((out || '').replace(/^["'`\s]+|["'`\s]+$/g, '').split('\n')[0].trim());
    if (cleaned) { $('prompt').value = cleaned; store.save({ lastPrompt: cleaned }); toast('✨ 프롬프트를 다듬었어요'); }
    else toast('보강 결과가 비어 있어요. 원본을 사용하세요.');
  } catch (e) { toast(e.message || '보강 실패'); }
  finally { setBusy($('btn-enrich'), false, '✨ AI로 다듬기'); }
}

// ── 생성 ────────────────────────────────────────
let abortCtl = null;

function currentJob(count) {
  let prompt = $('prompt').value.trim() || assemble();
  if (!prompt) return null;
  // 제외 요소(negative)는 네이티브 지원 모델이 없어, 프롬프트에 자연어 절로 녹인다(지시 따르는 모델에 효과).
  const userNeg = $('negative').value.trim();
  if (userNeg) prompt = `${prompt}. (avoid: ${userNeg})`;
  prompt = clampPrompt(prompt);
  const modelId = $('sel-model').value;
  return {
    modelId, prompt,
    negative: userNeg,
    aspect: $('sel-aspect').value,
    quality: $('sel-quality').value,
    style: $('sel-style').value,
    count, vary: s.vary, concurrency: s.concurrency,
  };
}

async function generate(count) {
  if (abortCtl) return;
  const job = currentJob(count);
  if (!job) return;
  const provider = P.providerOf(job.modelId);
  if (!P.hasCredentials(provider, s)) { toast(credMsg(provider)); switchTab('settings'); return; }

  store.save({ lastCount: count, lastAspect: job.aspect, lastQuality: job.quality, lastStyle: job.style });
  abortCtl = new AbortController();
  revokeStrip();
  $('strip').innerHTML = '';
  for (let i = 0; i < count; i++) addPlaceholder();
  $('progress-wrap').classList.remove('hidden');
  setBar(0, count, '시작…');
  $('btn-batch').disabled = true; $('btn-draft').disabled = true;
  $('btn-cancel').classList.remove('hidden');

  let result = { made: 0, failed: count, aborted: false };
  try {
    result = await runBatch(job, s, {
      onImage: (b64, mime, meta) => addResult(b64, mime, meta), // Promise 반환 → batch가 저장 완료를 기다림
      onProgress: (done, total, msg) => setBar(done, total, msg),
      onChunkError: (e) => toast(e.message || '일부 실패'),
    }, abortCtl.signal);
  } catch (e) {
    toast(e.message || '생성 중 오류');
  } finally {
    $('btn-batch').disabled = false; $('btn-draft').disabled = false;
    $('btn-cancel').classList.add('hidden');
    clearPlaceholders();
    abortCtl = null;
  }
  await refreshGalleryCount(); // 저장이 모두 끝난 뒤라 수치가 정확
  if (result.aborted) toast('중지했어요');
  else if (result.failed) toast(`${result.made}장 완료 · ${result.failed}장 실패`);
  else toast(`✅ ${result.made}장 생성 완료`);
}

function cancel() { if (abortCtl) abortCtl.abort(); }

// 결과 1장 저장 + UI 반영. 실패하면 throw → batch가 done이 아닌 failed로 집계(수치 정확).
async function addResult(b64, mime, meta) {
  let blob;
  try { blob = db.b64ToBlob(b64, mime); }
  catch { throw new Error('이미지 디코딩 실패'); }
  const rec = {
    id: (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`),
    blob, prompt: meta.prompt, negative: meta.negative || '',
    modelId: meta.modelId, provider: P.providerOf(meta.modelId),
    aspect: meta.aspect, quality: meta.quality, createdAt: Date.now(),
  };
  await db.putImage(rec); // 실패 시 throw
  fillPlaceholder(rec);
  if (s.autoDownload) gallery.downloadOne(rec, 0);
  return rec;
}

// 스트립 플레이스홀더 관리
function addPlaceholder() {
  const ph = document.createElement('div'); ph.className = 'ph'; ph.innerHTML = '<div class="spin"></div>';
  $('strip').appendChild(ph);
}
function fillPlaceholder(rec) {
  const ph = $('strip').querySelector('.ph');
  const img = document.createElement('img');
  const u = gallery.tempUrl(rec.blob); stripUrls.push(u);
  img.src = u; img.alt = rec.prompt;
  img.addEventListener('click', () => openLightbox(rec));
  if (ph) ph.replaceWith(img); else $('strip').appendChild(img);
}
function clearPlaceholders() { $('strip').querySelectorAll('.ph').forEach((p) => p.remove()); }
function revokeStrip() { stripUrls.forEach((u) => URL.revokeObjectURL(u)); stripUrls = []; }

function setBar(done, total, msg) {
  $('progress-bar').style.width = `${total ? Math.round((done / total) * 100) : 0}%`;
  $('progress-text').textContent = msg || `${done} / ${total}`;
}
function setBusy(btn, busy, label) { btn.disabled = busy; if (label) btn.textContent = label; }

// ── 갤러리 ──────────────────────────────────────
async function refreshGalleryCount() {
  const n = await db.count();
  $('gallery-count').textContent = `${n}장`;
}
async function renderGallery() {
  const all = await db.allImages();
  $('gallery-count').textContent = `${all.length}장`;
  gallery.renderGrid($('grid'), all, {
    onOpen: (rec) => openLightbox(rec),
    onDelete: async (rec) => { await db.deleteImage(rec.id); renderGallery(); },
    onReuse: (rec) => reuse(rec),
  });
}

function reuse(rec) {
  $('prompt').value = rec.prompt;
  if ([...$('sel-model').options].some((o) => o.value === rec.modelId)) $('sel-model').value = rec.modelId;
  if ([...$('sel-aspect').options].some((o) => o.value === rec.aspect)) $('sel-aspect').value = rec.aspect;
  updateModelUI();
  switchTab('create');
  toast('설정을 불러왔어요. 수량을 정하고 생성하세요.');
}

// ── 라이트박스 ──────────────────────────────────
function openLightbox(rec) {
  if (lbUrl) URL.revokeObjectURL(lbUrl);
  lbUrl = gallery.tempUrl(rec.blob);
  $('lb-img').src = lbUrl;
  $('lb-prompt').textContent = rec.prompt;
  $('lb-meta').textContent = `${rec.modelId} · ${rec.aspect} · ${new Date(rec.createdAt).toLocaleString()}`;
  $('lb-dl').onclick = () => gallery.downloadOne(rec, 0);
  $('lb-reuse').onclick = () => { closeLightbox(); reuse(rec); };
  $('lightbox').classList.remove('hidden');
}
function closeLightbox() {
  $('lightbox').classList.add('hidden'); $('lb-img').src = '';
  if (lbUrl) { URL.revokeObjectURL(lbUrl); lbUrl = null; }
}

// ── 탭 전환 ─────────────────────────────────────
function switchTab(name) {
  ['create', 'gallery', 'settings'].forEach((t) => $(`screen-${t}`).classList.toggle('hidden', t !== name));
  document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
  if (name === 'gallery') renderGallery();
  window.scrollTo(0, 0);
}

// ── 설정 패널 ───────────────────────────────────
function getGeminiMode() {
  const on = document.querySelector('#gemini-mode .seg-btn.on');
  return on?.dataset.mode === 'oauth' ? 'oauth' : 'key';
}
function setGeminiMode(mode) {
  document.querySelectorAll('#gemini-mode .seg-btn').forEach((b) => b.classList.toggle('on', b.dataset.mode === mode));
  $('gemini-key-block').classList.toggle('hidden', mode !== 'key');
  $('gemini-oauth-block').classList.toggle('hidden', mode !== 'oauth');
}
function setStatus(id, text, color) { const el = $(id); if (!el) return; el.textContent = text; el.style.color = color || ''; }
function refreshGoogleStatus() {
  if (gauth.hasValidToken()) {
    const t = new Date(gauth.expiryMs()); const p = (n) => String(n).padStart(2, '0');
    setStatus('status-google', `✅ 로그인됨 (토큰 만료 ${p(t.getHours())}:${p(t.getMinutes())})`, 'var(--green)');
  } else if (gauth.isConsented()) {
    setStatus('status-google', '동의됨 — 생성 시 자동 로그인되거나 ‘Google로 로그인’을 누르세요.', '');
  } else {
    setStatus('status-google', '아직 로그인하지 않았어요.', '');
  }
}

function syncSettings() {
  store.save({
    openaiKey: $('set-openai').value.trim(),
    geminiKey: $('set-gemini').value.trim(),
    geminiAuthMode: getGeminiMode(),
    googleClientId: $('set-google-client').value.trim(),
    gcpProject: $('set-gcp-project').value.trim(),
    imageModel: $('set-image-model').value,
    textModel: $('set-text-model').value,
    proxyBase: $('set-proxy').value.trim(),
    concurrency: Math.max(1, Math.min(4, +$('set-concurrency').value || 2)),
    autoDownload: $('set-autodl').checked,
    translate: $('set-translate').checked,
    vary: $('set-vary').checked,
  });
  Object.assign(s, store.get());
}

function loadSettingsUI() {
  $('set-openai').value = s.openaiKey || '';
  $('set-gemini').value = s.geminiKey || '';
  $('set-google-client').value = s.googleClientId || '';
  $('set-gcp-project').value = s.gcpProject || '';
  setGeminiMode(s.geminiAuthMode || 'key');
  fillSelect('set-image-model', P.IMAGE_MODELS, s.imageModel);
  fillSelect('set-text-model', P.TEXT_MODELS, s.textModel);
  $('set-proxy').value = s.proxyBase || '';
  $('set-concurrency').value = s.concurrency;
  $('set-autodl').checked = s.autoDownload;
  $('set-translate').checked = s.translate;
  $('set-vary').checked = s.vary;
  refreshGoogleStatus();
}

function bindSettings() {
  ['set-openai', 'set-gemini', 'set-google-client', 'set-gcp-project', 'set-proxy', 'set-concurrency'].forEach((id) => $(id).addEventListener('change', syncSettings));
  ['set-image-model', 'set-text-model', 'set-autodl', 'set-translate', 'set-vary'].forEach((id) => $(id).addEventListener('change', () => {
    syncSettings();
    if ([...$('sel-model').options].some((o) => o.value === s.imageModel)) { $('sel-model').value = s.imageModel; updateModelUI(); }
  }));
  document.querySelectorAll('#gemini-mode .seg-btn').forEach((b) => b.addEventListener('click', () => { setGeminiMode(b.dataset.mode); syncSettings(); }));

  $('btn-test-openai').addEventListener('click', () => testCred('openai', 'status-openai'));
  $('btn-test-gemini').addEventListener('click', () => testCred('gemini', 'status-gemini'));
  $('btn-test-gemini-oauth').addEventListener('click', () => testCred('gemini', 'status-google'));

  $('btn-google-signin').addEventListener('click', async () => {
    syncSettings();
    if (!s.googleClientId) { setStatus('status-google', '❌ 먼저 OAuth 클라이언트 ID를 입력하세요.', 'var(--red)'); return; }
    setStatus('status-google', '로그인 창 여는 중…', '');
    try { await gauth.signInInteractive(s.googleClientId); refreshGoogleStatus(); toast('✅ Google 로그인됨'); }
    catch (e) { setStatus('status-google', '❌ ' + (e.message || '로그인 실패'), 'var(--red)'); }
  });
  $('btn-google-signout').addEventListener('click', async () => { await gauth.signOut(); refreshGoogleStatus(); toast('로그아웃됨'); });

  $('btn-reset').addEventListener('click', () => {
    if (!confirm('설정과 API 키를 모두 지울까요? (생성한 이미지는 유지)')) return;
    gauth.signOut();
    store.reset(); Object.assign(s, store.get()); loadSettingsUI();
    fillSelect('sel-model', P.IMAGE_MODELS, s.imageModel); updateModelUI();
    toast('초기화했어요');
  });
}

async function testCred(provider, statusId) {
  syncSettings();
  setStatus(statusId, '확인 중…', '');
  try {
    await P.testCredentials(provider, s);
    setStatus(statusId, '✅ 정상이에요', 'var(--green)');
    if (statusId === 'status-google') refreshGoogleStatus();
  } catch (e) {
    setStatus(statusId, '❌ ' + (e.message || '실패'), 'var(--red)');
  }
}

// ── 초기화 ──────────────────────────────────────
function init() {
  // 칩
  renderChips('chips-style', data.STYLE_KINDS, 'styleKind');
  renderChips('chips-mood', data.MOODS, 'mood');
  renderChips('chips-shot', data.SHOTS, 'shot');
  renderChips('chips-palette', data.PALETTES, 'palette');
  renderChips('chips-booster', data.BOOSTERS, 'boosters', true);

  // 셀렉트
  fillSelect('sel-aspect', data.ASPECTS, s.lastAspect, 'ko');
  fillSelect('sel-model', P.IMAGE_MODELS, s.imageModel);
  updateModelUI();
  $('sel-quality').value = s.lastQuality || 'auto';
  $('sel-style').value = s.lastStyle || 'vivid';

  // 복원
  $('subject').value = s.lastSel?.subject || '';
  $('negative').value = s.lastSel?.negative || '';
  if (s.lastPrompt) $('prompt').value = s.lastPrompt;
  $('count').value = s.lastCount || 4;

  // 이벤트
  $('subject').addEventListener('change', persistSel);
  $('negative').addEventListener('change', persistSel);
  $('btn-idea').addEventListener('click', () => {
    const idea = data.SEED_IDEAS[Math.floor(Math.random() * data.SEED_IDEAS.length)];
    $('subject').value = idea; persistSel(); toast('아이디어를 넣었어요');
  });
  $('sel-model').addEventListener('change', () => { updateModelUI(); store.save({ imageModel: $('sel-model').value }); Object.assign(s, store.get()); });
  $('btn-make').addEventListener('click', assemble);
  $('btn-enrich').addEventListener('click', enrich);
  $('btn-copy').addEventListener('click', async () => {
    const v = $('prompt').value.trim(); if (!v) return;
    try { await navigator.clipboard.writeText(v); toast('복사했어요'); } catch { toast('복사 실패'); }
  });
  $('adv-toggle').addEventListener('click', () => $('adv-body').classList.toggle('hidden'));
  $('count-minus').addEventListener('click', () => { $('count').value = Math.max(1, (+$('count').value || 1) - 1); });
  $('count-plus').addEventListener('click', () => { $('count').value = Math.min(50, (+$('count').value || 1) + 1); });
  $('btn-draft').addEventListener('click', () => generate(1));
  $('btn-batch').addEventListener('click', () => {
    const n = Math.max(1, Math.min(50, +$('count').value || 1));
    generate(n);
  });
  $('btn-cancel').addEventListener('click', cancel);

  // 갤러리
  $('btn-zip').addEventListener('click', async () => {
    const all = await db.allImages();
    if (!all.length) { toast('내보낼 이미지가 없어요'); return; }
    toast('ZIP 만드는 중…'); await gallery.downloadZip(all);
  });
  $('btn-clear').addEventListener('click', async () => {
    if (!confirm('갤러리의 모든 이미지를 삭제할까요?')) return;
    await db.clearAll(); renderGallery(); toast('갤러리를 비웠어요');
  });

  // 라이트박스
  $('lb-close').addEventListener('click', closeLightbox);
  $('lightbox').addEventListener('click', (e) => { if (e.target.id === 'lightbox') closeLightbox(); });

  // 탭/설정 진입
  document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => switchTab(b.dataset.tab)));
  $('btn-go-settings').addEventListener('click', () => switchTab('settings'));

  loadSettingsUI();
  bindSettings();
  refreshGalleryCount();

  // OAuth 모드 + 이전 동의가 있으면 조용히 토큰을 미리 받아둔다(첫 생성이 매끄럽도록)
  if (s.geminiAuthMode === 'oauth' && s.googleClientId && gauth.isConsented()) {
    gauth.getToken(s.googleClientId).then(refreshGoogleStatus).catch(() => {});
  }

  // 서비스워커
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
}

init();
