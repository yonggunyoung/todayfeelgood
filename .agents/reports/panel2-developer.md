# 🧑‍💻 개발자 참견쟁이 (2차) — 평가 보고서

**한 줄 결론:** 5개 앱이 동작은 하나, **복붙 부채(BFF·ZIP·RNG·디자인토큰·계약)가 임계점**을 넘었고 무료티어 동시 구동·dev 포트 충돌 등 운영 리스크가 누적됨 — 기능 추가 전에 `packages/` 승격 1라운드가 필수.

**Blocker: 1 / Warning: 8**

코드 수정·git 미수행(읽기 전용). 산출물은 이 보고서 1개.

---

## Blocker

### B1. dev 포트 충돌 — kit·sign이 둘 다 3003
- `apps/kit/frontend/package.json:6,8` 와 `apps/sign/frontend/package.json:6,8` 모두 `next dev -p 3003` / `next start -p 3003`.
- **영향:** 두 앱을 동시에 로컬 구동(또는 동일 호스트에서 `next start`)하면 두 번째가 `EADDRINUSE`로 죽음. 5앱 동시 개발/검증(Verify e2e)이 구조적으로 불가. 배포 시에도 포트 분리 안 되어 있으면 한쪽만 뜸.
- **수정안:** 포트를 앱별 고정 표(home=3000, font=3001, sticker=3002, sign=3003, kit=3004)로 재배치하고 README/infra에 단일 출처로 명시. 현재 3002(sticker)/3003(font·dup) 등 표가 흩어져 있으니 `infra/`에 포트 레지스트리 문서화.

---

## Warning

### W1. (중요) BFF `route.ts` 3중 복제 — font·kit는 사실상 동일, sign은 변종
- `apps/font/frontend/app/api/generate/route.ts` 와 `apps/kit/frontend/app/api/generate/route.ts` 는 **바이트 단위로 거의 동일**(둘 다 imagePng 2MB 가드 포함). `apps/sign/.../route.ts` 만 MAX_BODY_BYTES=64KB·imagePng 미전달의 경량 변종.
- **문제:** CLAUDE.md "공통 로직 복붙 금지, packages/ 추가" 정면 위반. `ENGINE_TIMEOUT_MS`, `MAX_IMAGE_PNG_BYTES`, `engineUrl()`, `normalizeFormat/Script`, 에러 살균/타임아웃 로직이 3곳에 흩어져, 한 곳만 고치면 드리프트 발생(이미 kit BFF는 imagePng 처리하는데 kit은 imagePng를 안 쓰므로 데드코드 복제).
- **수정안:** `packages/core`(또는 신설 `packages/bff`)에 `proxyGenerate(req, opts)` 헬퍼 승격. 각 route는 `opts`(maxBytes, forwardImage 여부, 에러 문구 prefix)만 주입. **승격 우선순위 1위**.

### W2. (중요) ZIP 라이터 2중 복제 — kit·sticker
- `apps/kit/frontend/lib/zip.ts` 와 `apps/sticker/frontend/lib/zip.ts` 의 `crc32`/`crcTable`/`makeZip` 코어가 동일(kit이 텍스트+base64 엔트리로 일반화한 상위호환). CRC32·헤더 바이트 구조는 정확(EOCD 22B, comment-length offset20=0 zero-init 정상, STORE 방식 유효).
- **수정안:** `packages/core`(또는 `packages/zip`)로 kit판(일반화) 승격, sticker는 `{name, base64}` 래퍼만 유지. **승격 우선순위 2위.** CRC 자체에 회귀 버그는 없음.

### W3. (중요) RNG mulberry32 3중 복제 + 함수명 불일치
- `apps/sticker/frontend/lib/rng.ts`(`makeRng`/`hashSeed`/`pick`), `apps/sign/frontend/lib/rng.ts`(`mulberry32`) — **동일 알고리즘인데 export 이름이 다름**(`makeRng` vs `mulberry32`). 향후 통합 시 호출부 모두 수정 필요.
- **수정안:** `packages/core`에 `mulberry32`/`hashSeed`/`pick` 단일 정의 후 양쪽 교체. **승격 우선순위 3위.**

### W4. (중요) 디자인 토큰 globals.css 4벌 100% 동일
- `apps/{font,sticker,kit,sign}/frontend/app/globals.css` **md5 전부 동일**(`9b8bb64…`, 각 110개 CSS 변수). 게다가 `packages/ui` 컴포넌트가 "각 앱 globals.css의 CSS 변수에 의존"(packages/ui/src/index.ts 주석)하므로, 토큰을 한 곳만 바꾸면 ui가 앱별로 깨짐.
- **영향:** 브랜드 토큰(--accent 등) 변경 시 4파일 수동 동기화. 신규 앱 추가마다 또 복제.
- **수정안:** `packages/ui`(또는 `packages/tokens`)에 `tokens.css` 단일 파일을 두고 각 앱 globals가 `@import` 또는 layout에서 1줄 로드. **승격 우선순위 4위.**

### W5. (중요) 계약 드리프트 — SignParams/SignFlourish/SignUnderline이 core 밖 로컬 정의
- `apps/sign/frontend/lib/signParams.ts:38-47` 의 `SignParams` 등은 `idea-sign.md §7`이 `packages/core` 단일 출처로 규정했으나 sign 앱 로컬에 정의됨(핸드오프 sign-mvp.md:21에서도 Warning으로 자인). `FontParams`/`clampParams`만 core에서 import.
- **영향:** sign이 FontParams 부분집합 + 오버레이 파라미터를 자체 계약화 → core가 진화하면 어긋남. kit도 `BrandKit` 계약을 core에 안 올림(kit-mvp.md:32).
- **수정안:** Shared-Agent 경유로 `SignParams`·`BrandKit`·`MAX_IMAGE_PNG_BYTES`를 core로 승격. **계약 통합 우선순위 1위.**

### W6. 무료티어 동시 구동 현실성 — Next 4프로세스 + 엔진 1
- home/font/sticker/sign/kit = **Next 인스턴스 5개(`next start` 각각) + Python 엔진 1개**가 Oracle 무료티어(보통 1 OCPU / 1GB, Ampere라도 한정)에서 상주. Next `start` 1개가 idle ~80-120MB RSS × 4-5 → 이미 RAM 압박. `pnpm -r build`(root build 스크립트)는 앱별 순차라도 피크 메모리 큼(Next 빌드 1개가 700MB+ 흔함) → 무료티어에서 OOM 가능.
- **수정안:** (1) 배포는 단일 Node 프로세스 다중 basePath 합치기 또는 빌드는 CI/외부에서, 산출물만 서버에 올리기. (2) `next build`에 `NODE_OPTIONS=--max-old-space-size` 가드. (3) 앱 수만큼 Next를 띄우지 말고 reverse proxy(nginx) + 정적/SSR 최소화 검토.

### W7. 엔진 동시성 — 4앱이 한 엔진(8000) 공유, 세마포어 경합
- `apps/font/engine/main.py:48-52` `MAX_CONCURRENT_GENERATES=3`, 한글=1. **4개 앱(font·sign·kit, sticker는 서버0)이 같은 :8000를 공유**하므로 동시 요청 시 전역 세마포어 3을 나눠 씀 → kit 시트 생성(여러 폰트 연속 호출 가능)·VariationGallery(`VariationGallery.tsx:129` 병렬 generate)가 갤러리 N장 요청을 동시에 던지면 `sem.locked()` 즉시 503 빈발.
- **영향:** 한 앱의 갤러리/배치 호출이 다른 앱 사용자를 503으로 굶김(per-app·per-IP 큐 없음).
- **수정안:** 프론트에서 갤러리 요청을 동시성 2-3으로 클라이언트 측 스로틀(현재 Promise.all 추정), 또는 엔진에 간단 대기큐(503 대신 짧은 대기). 무료티어면 세마포어 3 유지가 맞으나 호출측 배치 제어 필요.

### W8. SVG injection 잠복 — inkColor/bg 미살균
- `apps/sign/frontend/lib/render.ts:48-49,~70` 에서 `text`는 `escapeXml`로 안전하나 `ink`(inkColor)·`bg`는 SVG 속성에 **raw 보간**(`stroke="${ink}"`, `fill="${bg}"`). `clampSign`(signParams.ts:201)은 inkColor를 검증하지 않음.
- **현 상태:** SignStudio UI에 inkColor 자유입력 필드가 없고 프리셋의 하드코딩 hex만 들어가 **현재 경로로는 미도달**. 그러나 inkColor는 SignParams 공개 필드라 향후 color picker 추가/외부 값 주입 시 `"#000"/><script>` 류 속성 탈출 가능.
- **수정안:** `clampSign`에 hex/rgb 정규식 화이트리스트(`/^#[0-9a-fA-F]{3,8}$|^rgb/`) 추가. 비매칭 시 기본색 폴백. (Blocker 아님 — 현재 비활성)

---

## 추가 관찰(경미)

- **에러 살균 일관성 OK:** 3 BFF 모두 엔진 원문은 `console.error`로만, 클라엔 일반 메시지. 타임아웃 20s/504, 연결실패 503으로 통일됨(문구만 다름).
- **CORS는 BFF 경로상 무해:** 브라우저는 same-origin `/api/generate`(`apiPath`)로만 호출하고 Next route가 서버-서버로 엔진 호출 → 엔진 `ALLOWED_ORIGINS` 기본값이 3000/3001만이어도 BFF 경로엔 영향 없음. **단**, 누군가 `NEXT_PUBLIC_ENGINE_URL`로 브라우저 직접호출 전환 시 sign(3003)·kit(3004)·sticker(3002) 출처가 화이트리스트에 없어 차단됨 → main.py:58-60 기본값에 신규 포트 추가 권장(저위험 사전조치).
- **FE 테스트 전무:** `home`·`apps/*/frontend` 어디에도 `*.test.*`/`*.spec.*` 없음(엔진만 `apps/font/engine/tests/` 3종). clampSign·zip CRC·overlay path·apiPath(basePath) 등 순수함수는 테스트하기 쉬운데 미작성 → 공유화 리팩터 시 회귀 검증 수단 없음. 공유화와 **동시에** core 단위테스트를 붙일 것.
- **정직성 라벨:** 앱별 free-text 카피라 "복제"라기보다 UX 문구(허용). 단 핵심 출처 라벨은 `generatedBy:"baseFontVariation"`(core 단일 출처)로 통일돼 있어 양호.
- **basePath/포트:** `next.config.mjs` basePath는 font=/font, sign=/sign, kit=/kit, sticker=/sticker로 정상 분리. `paths.ts`(apiPath) 3벌 복제는 사소하나 역시 core 승격 후보.

---

## 필수 수정 TOP 5

1. **[Blocker] kit·sign dev 포트 충돌 해소** (3003 중복 → 앱별 고정 포트표, infra 단일 출처). 동시 구동/검증의 전제.
2. **[공유화] BFF `proxyGenerate` 헬퍼를 `packages/`로 승격** — font·kit·sign route 3중 복제 제거(타임아웃·크기가드·에러살균·engineUrl 단일화).
3. **[계약통합] SignParams·BrandKit·MAX_IMAGE_PNG_BYTES를 `packages/core`로 승격** (Shared-Agent 경유) — 로컬 정의 드리프트 차단.
4. **[공유화] ZIP·RNG·디자인토큰(globals.css) 패키지화** — kit/sticker zip 1벌, mulberry32 1벌, tokens.css 1벌. packages/ui의 CSS변수 의존을 토큰 패키지로 정합.
5. **[무료티어] 빌드/런타임 메모리 가드 + 엔진 동시성 호출측 스로틀** — 5 Next 프로세스 동시 구동·`pnpm -r build` OOM 회피, 갤러리/시트 배치 generate를 클라 동시성 2-3으로 제한(공유 엔진 세마포어 3 경합 완화).
