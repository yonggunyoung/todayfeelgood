# AI 게이트웨이 워커 (Cloudflare)

클라이언트(정적 PWA)는 API 키를 모른다. 이 워커가 운영자 키를 **시크릿으로 보관**하고,
클라이언트 요청에 키만 끼워 업스트림으로 전달한다. 라이브 주소: `ai-gateway.yonggunyoung.workers.dev`.

`ai-gateway.js` 한 파일이 전부다. Anthropic(기본) + Gemini 두 프로바이더를 지원한다.

## 배포 (대시보드)

1. Cloudflare → **Workers & Pages** → 이 워커 → **Edit code**
2. `ai-gateway.js` 내용을 통째로 붙여넣고 **Deploy**
3. **Settings → Variables and Secrets** 에 시크릿 확인/추가:
   | 이름 | 값 | 비고 |
   |---|---|---|
   | `ANTHROPIC_API_KEY` | 기존 Anthropic 키 | 이미 있으면 그대로 (시크릿은 코드 교체해도 유지됨) |
   | `GEMINI_API_KEY` | Google AI Studio 키 | **새로 추가** |
   | `GEMINI_MODEL` | 예: `gemini-flash-latest` | 선택 — 기본 모델. 비우면 클라이언트가 헤더로 지정 |
4. 검증: 브라우저로 워커 주소를 GET → **`WORKER-OK-v10`** 이 보이면 OK.

> 모델 버전명은 워커 코드에 박지 않는다. `GEMINI_MODEL` 시크릿 또는 클라이언트의 `x-gemini-model`
> 헤더로 지정한다(역할 ↔ 버전 분리). 정확한 모델 ID는 Google AI Studio에서 확인 후 넣는다.

## 호출 규약

- **Anthropic (기본):** `POST /` — 본문은 Anthropic Messages 형식. `content-type: text/plain` 권장(프리플라이트 생략).
- **Gemini:** `POST /` + 헤더 `x-ai-provider: gemini` (또는 `POST /gemini`) — 본문은 Gemini `generateContent` 형식.
  모델은 `x-gemini-model` 헤더 또는 `GEMINI_MODEL` 시크릿.
- 업스트림 상태코드(429/529 등)는 그대로 전달된다 → 클라이언트의 자동 재시도가 동작한다.

## ⚠️ 알려진 보안 과제 (Gemini와 별개, 출시 전 처리 권장)

지금 이 워커는 **인증이 없다** — 주소를 아는 누구나 운영자 키로 호출할 수 있다(키 비용 유출 위험).
출시 전 권장: 클라이언트가 보내는 공유 시크릿 헤더 검증, 또는 Firebase Functions(`functions/index.js`,
사용자별 쿼터·인증 이미 구현됨)로 전환. 이번 Gemini 작업과는 독립적인 별도 항목.
