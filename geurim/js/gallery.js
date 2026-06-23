// 그림공장 — 갤러리 렌더링 + 다운로드(개별/ZIP). 브라우저 전용.

import { makeZip } from './zip.js';

let _urls = []; // 현재 살아있는 objectURL — 재렌더 시 정리

function revokeAll() { _urls.forEach((u) => URL.revokeObjectURL(u)); _urls = []; }

function objectUrl(blob) { const u = URL.createObjectURL(blob); _urls.push(u); return u; }

export function slug(text, max = 40) {
  return (text || 'image').toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, max) || 'image';
}

const ext = (mime) => (mime && mime.includes('jpeg') ? 'jpg' : mime && mime.includes('webp') ? 'webp' : 'png');

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function downloadOne(rec, index = 0) {
  downloadBlob(rec.blob, `geurim-${stamp(rec.createdAt)}-${String(index + 1).padStart(2, '0')}-${slug(rec.prompt)}.${ext(rec.blob.type)}`);
}

function stamp(ms) {
  const d = new Date(ms || Date.now());
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

/** 여러 레코드를 ZIP 한 파일로 — 이미지 + prompts.txt(메타) 포함 */
export async function downloadZip(records) {
  if (!records.length) return;
  const files = [];
  const lines = [];
  let i = 0;
  for (const rec of records) {
    i += 1;
    const name = `${String(i).padStart(3, '0')}-${slug(rec.prompt)}.${ext(rec.blob.type)}`;
    const buf = new Uint8Array(await rec.blob.arrayBuffer());
    files.push({ name, bytes: buf });
    lines.push(`[${name}]\n모델: ${rec.modelId}\n비율: ${rec.aspect}\n프롬프트: ${rec.prompt}\n${rec.negative ? '제외: ' + rec.negative + '\n' : ''}생성: ${new Date(rec.createdAt).toLocaleString()}\n`);
  }
  files.push({ name: 'prompts.txt', bytes: new TextEncoder().encode(lines.join('\n')) });
  const zip = makeZip(files);
  downloadBlob(new Blob([zip], { type: 'application/zip' }), `geurim-${stamp(Date.now())}-${records.length}장.zip`);
}

/**
 * 갤러리 그리드 렌더.
 * @param container DOM
 * @param records 이미지 레코드 배열(최신순)
 * @param handlers {onOpen(rec,idx), onDelete(rec), onReuse(rec)}
 */
export function renderGrid(container, records, handlers = {}) {
  revokeAll();
  container.innerHTML = '';
  if (!records.length) {
    container.innerHTML = '<div class="empty">아직 생성한 그림이 없어요.<br>위에서 옵션을 고르고 <b>생성</b>을 눌러 보세요.</div>';
    return;
  }
  records.forEach((rec, idx) => {
    const cell = document.createElement('figure');
    cell.className = 'cell';
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.src = objectUrl(rec.blob);
    img.alt = rec.prompt || '';
    img.addEventListener('click', () => handlers.onOpen?.(rec, idx));
    const bar = document.createElement('div');
    bar.className = 'cell-bar';
    bar.innerHTML = `
      <button data-act="dl" title="다운로드">⬇</button>
      <button data-act="reuse" title="이 설정으로 다시">↻</button>
      <button data-act="del" title="삭제">🗑</button>`;
    bar.addEventListener('click', (e) => {
      const act = e.target?.dataset?.act;
      if (act === 'dl') downloadOne(rec, idx);
      else if (act === 'reuse') handlers.onReuse?.(rec);
      else if (act === 'del') handlers.onDelete?.(rec);
    });
    cell.append(img, bar);
    container.appendChild(cell);
  });
}

// 호출부가 직접 수명 관리하는 1회용 URL(스트립/라이트박스용 — 그리드 추적 배열과 분리)
export function tempUrl(blob) { return URL.createObjectURL(blob); }
