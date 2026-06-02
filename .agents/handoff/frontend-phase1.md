# FE-Agent 핸드오프 — 폰트 앱 프론트엔드 (Phase 1)

작업 영역: `apps/font/frontend/` (자기 폴더 밖 소스 미수정)

## 완료한 것

기존에 스캐폴딩된 파일들을 검수하고, **유일하게 누락되어 빌드를 깨던** 메인 조립 컴포넌트를 새로 작성해 채웠다.

신규 작성 파일:
- `app/font/FontStudio.tsx` — 메인 폰트 생성 앱(클라이언트 컴포넌트). 데이터 흐름 전체 조립.
- `app/font/FontStudio.module.css` — 스튜디오 레이아웃 스타일.

검수만 한(이미 존재, 계약 부합) 파일:
- `package.json` (name `@webapp/font-frontend`, deps: next/react/react-dom/`@webapp/core`/`@webapp/seo` `workspace:*`)
- `next.config.mjs` (`transpilePackages: ["@webapp/core", "@webapp/seo"]`)
- `tsconfig.json` (`../../../packages/config/tsconfig.base.json` extends)
- `app/layout.tsx`, `app/page.tsx`(랜딩), `app/font/page.tsx`(metadata)
- `app/api/generate/route.ts` (BFF 프록시)
- `components/DrawingCanvas.tsx`, `components/ParameterPanel.tsx`, `components/FontPreview.tsx` (+ 각 CSS Module)
- `app/globals.css`, `app/landing.module.css`

## 계약 준수
- `@webapp/core`에서 `FontParams`, `PARAM_RANGES`, `DEFAULT_PARAMS`, `clampParams`, `GenerateRequest`, `GenerateResponse`를 import해서 사용(재정의 없음).
- 엔진 API: `POST {ENGINE}/generate` body=`GenerateRequest` → `GenerateResponse`. 프론트는 same-origin `/api/generate`로만 호출.
- 파라미터 축: weight(100~900) / slant(-15~0°) / curvature(0~1). 범위·기본값·step 모두 `PARAM_RANGES`에서 가져옴.
- `clampParams`로 입력단(`onChangeParams`), BFF 라우트 양쪽에서 방어.

## 데이터 흐름 (FontStudio.tsx)
슬라이더 조작 → `params` 상태 업데이트 → **디바운스 350ms** → `/api/generate`로 `{ params, imagePng }` POST → `fontWoffBase64`/`fontFamily` 수신 → `FontPreview`가 FontFace API로 등록 후 예시 문장 렌더.
- 로딩(`생성 중…`)·에러(role="alert") 상태 표시.
- 응답 경합 방지: `reqIdRef`로 마지막 요청 응답만 반영.
- DrawingCanvas의 PNG는 그린 흔적이 있을 때만 `imagePng`에 실어 선택 전송.
- 다운로드 버튼은 `disabled`(준비 중) 자리만 마련.

## 엔진과의 연결 지점
- 클라이언트 → `POST /api/generate` (same-origin, BFF)
- BFF(`app/api/generate/route.ts`) → 엔진 `POST {ENGINE}/generate`로 포워딩
- 엔진 주소 결정 우선순위(서버측): `ENGINE_URL` → `NEXT_PUBLIC_ENGINE_URL` → `http://127.0.0.1:8000`
- 엔진 다운/네트워크 장애 시 503, 엔진 에러응답 시 502로 변환해 클라이언트에 전달.

## 빌드 결과
- 레포 루트 `pnpm install`: 성공(6개 워크스페이스 인식).
- `pnpm --filter @webapp/font-frontend build`: **성공** (타입체크+lint+빌드 통과).
  - `/`, `/font` 정적 프리렌더, `/api/generate` 동적(force-dynamic).
  - 엔진 없이도 빌드 통과 확인.

## 실행법
- 개발: 레포 루트에서 `pnpm dev:font` (→ `next dev -p 3000`, http://localhost:3000)
- 프로덕션: `pnpm --filter @webapp/font-frontend build` 후 `... start`
- 환경변수(.env): `NEXT_PUBLIC_ENGINE_URL`(또는 서버측 `ENGINE_URL`)로 엔진 주소 지정. 기본 `http://127.0.0.1:8000`.

## 남은 일
- 엔진(`/generate`, `/health`) 기동 후 실 e2e 연결 검증(현재 엔진 미기동으로 미수행).
- 폰트 다운로드(WOFF/TTF 저장) 기능 실제 구현 — 지금은 버튼 자리만.
- `/health` 기반 엔진 상태 표시는 선택적으로 추가 가능(현재 미구현).
- 그린 글씨(imagePng) 활용은 Phase 1 전통 방식에선 참고용/생략 가능 — 엔진 정책 확정 시 동기화.
