# FE-Agent 핸드오프 — 프론트엔드 (Phase 1, 2차)

작업 영역: `apps/font/frontend/`, `home/`, `packages/ui/`, `packages/seo/` (이 넷만 수정. core/engine/infra/docs 불가침)

## 한 줄 결론
계약 v2(`fontBase64`/`format`) 반영, Blocker B1·B2·B3 해소, 다운로드/SEO/홈/공용UI 완성, 디자인을 "획 폰트공방" 타입 스페시먼 미감으로 전면 재설계. 두 앱 빌드 green.

---

## 브랜드/디자인 방향
- **브랜드명: 획(劃)** — "획 폰트공방". 워드마크는 주묵(인주 붉은색) 도장 형태의 "획" 글리프 + 산세리프 부제.
- **무드: 라이트 단일 무드.** 팔레트 = 종이/먹 웜뉴트럴(`--paper #f7f4ec`, `--ink #1a1714`) + **단일 악센트 주묵 `--accent #b5341f`**. 인디고/바이올렛·그라데이션 버튼 전부 제거.
- **타이포: 세리프 제목/스페시먼 + 산세리프 UI** 대비. 의도된 스케일, 비대칭 레이아웃(히어로 26rem+1fr, 스튜디오 22rem+1fr), 드롭섀도 대신 얇은 괘선(2px 직각 모서리).
- **히어로 = 대형 인터랙티브 스페시먼**(`InteractiveSpecimen`): 굵기/기울기 슬라이더로 시스템 폰트 축을 라이브 변형(엔진 없이도 동작), 입장 시 굵기 호흡 모션.
- **카피**: 사람이 쓴 듯한 한국어. 클리셰 팬그램 대신 다양한 의도된 조합(대/소문자·숫자·한글·문장). 이모지 불릿 없음.
- **접근성**: 슬라이더 키보드(네이티브 range)+포커스 링, 포맷 선택 radiogroup, aria-live 상태, 반응형, 절제된 모션.

## 반영한 Blocker / 보안
- **B1 basePath**: `next.config.mjs`에 `basePath`/`assetPrefix` = `/font`(`BASE_PATH` env로 덮어쓰기 가능, `NEXT_PUBLIC_BASE_PATH` 노출). `<Link>`/자산은 자동 prefix, **fetch는 `lib/paths.ts`의 `apiPath()`로 basePath 수동 prefix**.
- **B2 BFF 타임아웃/살균**: `app/api/generate/route.ts` — `AbortController` 20s 타임아웃(초과 504), content-length+본문길이 이중 크기검사로 `MAX_IMAGE_PNG_BYTES`(2MB) 초과 시 **413**, `imagePng`는 `data:image/png;base64,` 스킴만 통과(아니면 드롭), 엔진 원문/예외는 `console.error`로만 남기고 클라이언트엔 일반 메시지. `maxDuration=30`.
- **B3 imagePng 미전송**: 슬라이더 자동 프리뷰는 `{params, format:"woff"}`만 전송. (현재 imagePng를 명시 전송하는 경로 없음 — 캔버스는 밑그림 UX용으로만 존재.)

## 계약 v2
- 응답을 `GenerateResponse.fontBase64`/`format`로 사용(기존 `fontWoffBase64` 전부 제거). 프리뷰는 항상 `format:"woff"`.

## 기능 완성
- **다운로드 동작**: 포맷 선택(WOFF/TTF) → 해당 format으로 `/api/generate` 요청 → `fontBase64` 디코드 → `FONT_FORMATS[format]` mime/ext로 Blob 다운로드. 파일명 `hwoek-<해시>.<ext>`. **앱 내 완결**(외부 전송 없음).
- **SEO**: `packages/seo` 확장(`siteUrl`, `buildMeta`=metadataBase+canonical+OG+twitter, `webApplicationJsonLd`). 폰트앱·홈 각각 `app/robots.ts`·`app/sitemap.ts`, 페이지별 metadata, JSON-LD(WebApplication) 주입. 타깃 키워드 반영.
- **home/**: 신규 Next 앱(루트, basePath 없음, 포트 3000). 공방 소개 + 앱 카드(폰트 → `/font`) + SEO 기본. `@webapp/ui`의 Card 사용.
- **packages/ui**: `Button`/`Slider`/`Card` 추출 → 폰트앱·홈 공유. CSS Module만(무거운 라이브러리 없음). 색은 각 앱 globals.css의 CSS 변수 토큰에 의존.

## 라우팅 변경(중요)
- basePath=/font이므로 스튜디오를 `app/font/`→**`app/studio/`**로 이동. 운영 경로:
  - 랜딩: `메인도메인/font` (= 앱 루트 `/`)
  - 공방: `메인도메인/font/studio`
  - robots/sitemap: `메인도메인/font/robots.txt`, `/font/sitemap.xml`
- **Infra-Agent 참고**: nginx `/font` 블록이 `/font/_next/` 정적자산까지 프록시해야 함(assetPrefix=/font). 포트는 프론트 **3001**(package.json start 통일), 홈 3000.

## 포트 정리
- font-frontend dev/start `-p 3001` (W1 해소), home `-p 3000`.

## 빌드/실행
- 루트 `pnpm install`(7 워크스페이스).
- `pnpm --filter @webapp/font-frontend build` ✅, `pnpm --filter @webapp/home build` ✅, `pnpm -r build` ✅ (엔진 없이 통과, 타입체크+lint green).
- 개발: `pnpm dev:font`(폰트앱 :3001), 홈은 `pnpm --filter @webapp/home dev`(:3000).
- env: `NEXT_PUBLIC_SITE_URL`(SEO 절대URL, 기본 http://localhost:3000), `ENGINE_URL`/`NEXT_PUBLIC_ENGINE_URL`(엔진 주소), `BASE_PATH`(폰트앱 basePath, 기본 /font).

## 남은 일 / 경계 밖
- 엔진 실연결 e2e는 오케스트레이터/Verify.
- 엔진 CORS 제한·동시성(security H2/H3 후반부), nginx `/font/_next/` 라우팅·포트는 **Infra/Engine 영역**(미수정).
- OG 이미지는 현재 미첨부(텍스트 메타만). 필요 시 `public/og.png` 추가 후 `buildMeta({ogImage})`.
