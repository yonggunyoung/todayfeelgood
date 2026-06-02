# Security-Agent 보고서 — Phase 1 폰트 앱

**한 줄 결론:** 외부 유료 API·하드코딩 비밀은 없고 파라미터 클램프는 양호하나, **`imagePng` 페이로드 크기 무제한 + 엔진 CORS 전면 개방**으로 인한 DoS/직접 노출 위험이 실재한다. 배포 전 입력 크기 제한·CORS 제한이 필수다.

**심각도 개수:** High 3 · Medium 4 · Low 4

---

## High

### H1. `imagePng` base64 페이로드 크기 무제한 → 메모리 고갈 DoS
- **파일:** `apps/font/frontend/app/api/generate/route.ts:28,39` / `apps/font/engine/main.py:44,66` / `packages/core/src/index.ts:51`
- **근거/시나리오:** BFF는 `req.json()`으로 바디 전체를 파싱하고 `imagePng`를 검증·크기제한 없이 그대로 엔진으로 포워딩한다(`imagePng: body.imagePng ?? null`). 엔진 `GenerateRequest.imagePng: Optional[str]`도 길이 제한이 없다. 공격자가 수백 MB짜리 문자열을 보내면 Next 서버와 FastAPI(Pydantic) 양쪽이 메모리에 통째로 적재 → **Oracle 무료 티어(저메모리)에서 OOM/프로세스 다운**. Phase 1에서 `imagePng`는 실제로 *사용조차 안 됨*(generator에서 무시)이라 순수 공격면.
- **수정안:**
  1. BFF에서 `req.headers.get("content-length")`로 상한(예: 2MB) 검사 후 초과 시 413 반환. 또는 텍스트로 먼저 읽어 길이 검사.
  2. 엔진에서 `imagePng: Optional[str] = Field(default=None, max_length=2_000_000)`로 길이 제한.
  3. Phase 1에서 안 쓰는 필드이므로, 미사용 기간엔 BFF에서 `imagePng`를 아예 드롭(`imagePng: null` 강제 전송)하는 것이 가장 안전.

### H2. 엔진 CORS 전면 개방 + 엔진 직접 노출 구조
- **파일:** `apps/font/engine/main.py:26-32`
- **근거/시나리오:** `allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]`. BFF 프록시(`route.ts`)를 둔 목적이 "CORS 회피 + 엔진 주소 은닉"인데, 엔진이 모든 오리진을 허용하면 임의 웹사이트가 사용자 브라우저로 직접 `/generate`를 때릴 수 있고, 엔진이 공인 IP/포트에 노출되면 BFF의 크기·검증 가드를 우회당한다.
- **수정안:**
  1. 운영에서 `allow_origins`를 프론트 도메인만으로 제한(환경변수 `ALLOWED_ORIGINS` 화이트리스트). 기본값을 `["*"]`로 두지 말 것.
  2. 인프라: 엔진(8000)을 외부로 노출하지 말고 내부망/loopback에만 바인딩, 외부 진입은 BFF만 통과하도록 nginx에서 차단(Infra-Agent).
  3. `allow_methods`는 `["POST","GET"]`, `allow_headers`는 `["Content-Type"]`로 최소화.

### H3. BFF·엔진에 요청 타임아웃/동시성 제한 없음 → 자원 고갈
- **파일:** `apps/font/frontend/app/api/generate/route.ts:45-51` / `apps/font/engine/generator.py:98-133`
- **근거/시나리오:** BFF `fetch`에 타임아웃이 없어 엔진이 느리면 무한 대기. 엔진 `/generate`는 매 요청마다 `TTFont` 로드·`instantiateVariableFont`·서브셋·WOFF 인코딩(CPU/메모리 집약)을 동기 수행하고 동시 요청 수 제한이 없다. 소수의 동시 요청만으로 무료 티어 CPU/메모리를 포화시켜 서비스 정지(저비용 DoS).
- **수정안:**
  1. BFF `fetch`에 `AbortController`로 타임아웃(예: 15s) 추가.
  2. 엔진 앞단에 동시성 세마포어 또는 reverse-proxy(rate limit/concurrency limit) 도입. nginx `limit_req`/`limit_conn`(Infra-Agent).
  3. 베이스 폰트 `TTFont`를 startup에 1회 로드해 재사용(요청당 디스크 재파싱 제거)하면 부하 감소.

---

## Medium

### M1. BFF가 엔진 원문 에러/예외 메시지를 클라이언트로 전달 (정보 노출)
- **파일:** `apps/font/frontend/app/api/generate/route.ts:54-58,63-72`
- **시나리오:** `detail: text.slice(0,500)`로 엔진 응답 본문을, `detail: err.message`로 fetch 예외(연결 거부 시 내부 호스트/포트 `127.0.0.1:8000` 등)를 그대로 노출. 내부 토폴로지·스택 단서가 외부로 샌다.
- **수정안:** 사용자에겐 일반 메시지만 반환하고, 상세는 `console.error` 서버 로그로만. `detail` 필드를 응답에서 제거하거나 개발 환경에서만 포함.

### M2. FastAPI 기본 에러 응답이 내부 경로/스택 노출 가능
- **파일:** `apps/font/engine/main.py:66-93` (예외 핸들러 부재)
- **시나리오:** `generator.generate_woff`가 손상된 폰트·예기치 못한 입력으로 예외를 던지면 FastAPI 500이 발생. 디버그 설정/트레이스가 켜져 있으면 `/home/user/...` 절대경로(`font_loader.py`의 `Path(__file__)`)나 스택이 노출될 수 있다.
- **수정안:** 전역 `exception_handler`로 500을 일반 메시지로 변환, `uvicorn`을 디버그/reload 없이 운영. 절대경로를 응답에 절대 포함하지 않음.

### M3. 폰트 다운로드 응답 크기 무제한 (`requests.get(..., stream 없음)`)
- **파일:** `apps/font/engine/font_loader.py:49-55`
- **시나리오:** `resp.content`로 전체 본문을 메모리에 적재. 미러가 (또는 미러 탈취/리다이렉트로) 거대 파일을 반환하면 메모리 폭증. `_looks_like_font`는 다운로드 *후*에야 검사하므로 이미 적재된 뒤다. 또한 리다이렉트가 기본 허용(`allow_redirects=True`)이라 미러가 임의 위치로 보낼 수 있다.
- **수정안:** `stream=True` + `Content-Length`/누적 바이트 상한(예: 50MB) 검사, `allow_redirects=False` 또는 리다이렉트 도메인 화이트리스트. (HTTPS·고정 URL이라 위험은 낮으나 무결성 강화 권장.)

### M4. 다운로드 폰트 무결성 검증이 매직넘버 4바이트뿐
- **파일:** `apps/font/engine/font_loader.py:31-32,55`
- **시나리오:** 미러(jsDelivr/GitHub raw) 또는 전송 경로가 변조되면, sfnt 매직만 맞는 악성/변조 폰트를 캐시에 기록하고 fontTools가 파싱. 공급망 무결성 보장이 약하다.
- **수정안:** 알려진 정상 폰트의 **SHA-256 해시를 코드에 고정**하고 다운로드분과 대조, 불일치 시 폐기. (버전 1.085 고정이므로 해시 핀이 자연스럽다.)

---

## Low

### L1. `engineUrl()` 폴백이 신뢰 경계지만 SSRF 위험은 낮음
- **파일:** `apps/font/frontend/app/api/generate/route.ts:17-23,42`
- **설명:** 타깃 URL은 서버 환경변수에서만 오고 사용자 입력이 호스트에 섞이지 않으므로 전형적 SSRF는 아니다. 다만 `ENGINE_URL`이 외부 입력으로 오염되는 배포 실수를 막도록 화이트리스트/스킴 검증(http(s)만)을 두면 안전.

### L2. 의존성 버전 미고정 (requirements.txt 핀 없음)
- **파일:** `apps/font/engine/requirements.txt:1-5`
- **설명:** `fastapi`,`fonttools`,`requests` 등 버전 미지정 → 빌드마다 다른 버전, 취약 버전 유입 가능. `==`로 핀 + 정기 `pip-audit` 권장. 프론트 `package.json`은 캐럿(`^`) 사용으로 동일 리스크(소폭).

### L3. 헬스체크가 매 호출마다 폰트 파일 전체를 디스크에서 읽음
- **파일:** `apps/font/engine/font_loader.py:64-66,44`
- **설명:** `font_is_available()`/`ensure_font()`가 `read_bytes()`로 폰트 전체를 읽어 매직만 확인. `/health`를 자주 폴링하면 불필요한 I/O. 헤더 4바이트만 읽도록 변경 권장(자원 절약).

### L4. Next.js 라우트 바디 크기 기본 제한 미설정
- **파일:** `apps/font/frontend/next.config.mjs` (관련 설정 부재)
- **설명:** App Router Route Handler는 Pages API의 `bodyParser.sizeLimit`이 자동 적용되지 않는다. H1과 연계해 라우트 레벨에서 명시적 크기 가드를 두는 것이 안전.

---

## 지금 당장 막아야 할 TOP 3
1. **H1 — `imagePng` 크기 제한:** BFF·엔진 양쪽에 길이/Content-Length 상한(예: 2MB) 추가, Phase 1 미사용이면 BFF에서 아예 드롭. 무료 티어 OOM 직격탄.
2. **H2 — 엔진 CORS/노출 제한:** `allow_origins=["*"]` → 프론트 도메인 화이트리스트, 엔진 포트를 외부에 노출하지 말고 BFF만 진입점으로. 가드 우회 차단.
3. **H3 — 타임아웃·동시성 제한:** BFF `fetch` 타임아웃 + 엔진/프록시 동시성·rate limit. 소수 요청 DoS 방지(CPU 집약 폰트 인코딩).
