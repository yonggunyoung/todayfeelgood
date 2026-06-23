// 그림공장 — 배치 생성 엔진. 수치(N) 입력 → 동시성 제어로 N장을 자동 생성하고, 완성될 때마다 저장 콜백.
// 호출당 여러 장(Imagen 4·gpt-image-1) 모델은 청크로 묶어 호출수를 줄인다. 취소·부분실패 처리 포함.

import { generateChunk, maxPerCall } from './providers/index.js';
import { variantPrompt } from './prompt.js';

// 배치를 청크 목록으로 분해. 각 청크는 한 번의 API 호출(최대 perCall장).
export function planChunks(modelId, count, basePrompt, vary) {
  const perCall = maxPerCall(modelId);
  const chunks = [];
  let made = 0;
  let ci = 0;
  while (made < count) {
    const n = Math.min(perCall, count - made);
    chunks.push({ index: ci, n, prompt: variantPrompt(basePrompt, ci, vary) });
    made += n;
    ci += 1;
  }
  return chunks;
}

/**
 * 배치 실행.
 * @param job {modelId, prompt, negative, aspect, quality, style, count, vary}
 * @param settings 설정(키/프록시)
 * @param handlers {onImage(b64,mime,meta), onProgress(done,total,msg), onChunkError(err,chunk)}
 * @param signal AbortSignal (취소)
 * @returns {Promise<{made:number, failed:number, errors:string[]}>}
 */
export async function runBatch(job, settings, handlers = {}, signal) {
  const { modelId, prompt, negative, aspect, quality, style, count, vary, concurrency = 2 } = job;
  const chunks = planChunks(modelId, count, prompt, vary);
  const total = count;
  let done = 0;
  let failed = 0;
  const errors = [];
  let aborted = false;

  handlers.onProgress?.(0, total, '시작…');

  // 인증/권한 오류는 재시도해도 안 되므로 배치 전체 중단
  const isFatal = (e) => e?.status === 401 || e?.status === 403;

  const queue = chunks.slice();
  async function worker() {
    while (queue.length && !aborted && !signal?.aborted) {
      const chunk = queue.shift();
      try {
        const imgs = await generateChunk({
          modelId, prompt: chunk.prompt, n: chunk.n, aspect, quality, style,
        }, settings, signal);
        if (!imgs.length) throw new Error('이미지를 받지 못했어요(안전 필터 차단 또는 빈 응답일 수 있어요).');
        for (const img of imgs) {
          // 저장까지 끝난 것만 done으로 집계 — 저장 실패(디코딩/IndexedDB)는 done이 아니라 failed.
          // (이렇게 해야 "N장 요청 → N장 저장" 수치가 실제 저장 수와 일치한다)
          try {
            await handlers.onImage?.(img.b64, img.mime, { prompt: chunk.prompt, negative, modelId, aspect, quality });
            done += 1;
            handlers.onProgress?.(done, total, `${done} / ${total} 생성됨`);
          } catch (saveErr) {
            if (signal?.aborted) return;
            failed += 1;
            errors.push(saveErr?.message || String(saveErr));
            handlers.onChunkError?.(saveErr, chunk);
          }
        }
        // 모델이 요청보다 적게 준 경우 보정 카운트
        if (imgs.length < chunk.n) failed += (chunk.n - imgs.length);
      } catch (e) {
        if (signal?.aborted) return;
        failed += chunk.n;
        errors.push(e?.message || String(e));
        handlers.onChunkError?.(e, chunk);
        handlers.onProgress?.(done, total, `오류: ${e?.message || e}`);
        if (isFatal(e)) { aborted = true; return; }
      }
    }
  }

  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, chunks.length)) }, () => worker());
  await Promise.all(workers);

  return { made: done, failed, errors, aborted: aborted || !!signal?.aborted };
}
