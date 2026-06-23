// 그림공장 — 공용 네트워크 헬퍼 (재시도·백오프·친절한 에러). DOM 비의존, 전역 fetch 사용.

const STATUS_MSG = {
  400: '요청 형식이 올바르지 않아요. 모델/옵션을 확인해 주세요.',
  401: 'API 키가 올바르지 않습니다. 설정에서 키를 확인해 주세요.',
  403: '이 키로는 권한이 없어요(모델 미허용·결제 미설정·지역 제한일 수 있어요).',
  404: '모델 또는 엔드포인트를 찾을 수 없어요. 모델 이름을 확인해 주세요.',
  413: '요청이 너무 커요(프롬프트/이미지 크기).',
  429: '요청이 너무 잦거나 한도를 초과했어요. 잠시 후 다시 시도해 주세요.',
  500: '제공자 서버 내부 오류예요. 잠시 후 다시 시도해 주세요.',
  503: '서비스가 혼잡해요. 잠시 후 다시 시도해 주세요.',
};

/**
 * JSON POST/GET + 자동 재시도(429/5xx, 네트워크 오류).
 * @returns {Promise<object>} 파싱된 JSON
 */
export async function fetchJson(url, { method = 'POST', headers = {}, body, retries = 4, signal } = {}) {
  const backoff = (n) => new Promise((r) => setTimeout(r, 800 * (n + 1))); // 0.8→1.6→2.4→3.2s
  const payload = body == null ? undefined : (typeof body === 'string' ? body : JSON.stringify(body));
  for (let attempt = 0; ; attempt++) {
    let res;
    try {
      res = await fetch(url, { method, headers, body: payload, signal });
    } catch (e) {
      if (signal?.aborted) throw e; // 사용자가 취소
      if (attempt < retries) { await backoff(attempt); continue; }
      throw new Error('네트워크/CORS 오류로 호출에 실패했어요. 브라우저 직접 호출이 막혀 있다면, 설정에서 로컬 프록시를 켜고 다시 시도해 보세요. (' + (e?.message || '') + ')');
    }
    if (res.ok) return res.json();
    if ((res.status === 429 || res.status >= 500) && attempt < retries) { await backoff(attempt); continue; }
    let detail = '';
    try {
      const j = await res.json();
      detail = j?.error?.message || j?.error?.status || (typeof j?.error === 'string' ? j.error : '') || '';
    } catch { /* ignore */ }
    const err = new Error((STATUS_MSG[res.status] || `호출 실패 (${res.status})`) + (detail ? ` — ${detail}` : ''));
    err.status = res.status;
    throw err;
  }
}
