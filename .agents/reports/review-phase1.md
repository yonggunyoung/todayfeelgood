# Review 보고서 — Phase 1 (코드 품질/구조/계약)

**한 줄 결론:** e2e 핵심 흐름(그리기→슬라이더→BFF→엔진→WOFF 프리뷰)은 정확하고 계약도 잘 맞으나, **nginx `/font` 서브경로 배포가 실제로는 깨진다(basePath 미설정)**. 로컬은 통과, 운영 배포는 불가 상태.
**Blocker 3 · Warning 7 · Nice-to-have 5**

---

## Blocker (반드시 수정)

### B1. nginx `/font` 서브경로와 Next `basePath` 불일치 → 운영 배포 시 앱 깨짐
- 근거:
  - `infra/nginx/webapp.conf:36` 주석 "basePath=/font 가정"으로 `location /font` → `font_frontend`(3001) 프록시.
  - 그러나 `apps/font/frontend/next.config.mjs:1-8`에 `basePath` 설정이 **없음**. 앱은 루트(`/`) 기준으로 라우팅됨.
- 영향: nginx가 `/font`로 들어온 요청을 Next에 그대로 전달하면, Next는 `/font` 페이지를 모름(실제 페이지는 `/font` 라우트가 맞지만 `_next` 정적 자산은 `/_next/*`로 나가 nginx `/font` 블록에 안 잡힘). `<Link href="/font">`, `<Link href="/">`, BFF `fetch("/api/generate")`가 모두 도메인 루트 기준으로 생성되어 nginx 라우팅과 어긋남. 결과적으로 CSS/JS 자산 404, API 프록시 미스.
- 수정 제안(택1, 권장 a):
  - (a) `next.config.mjs`에 `basePath: "/font", assetPrefix: "/font"` 추가하고, nginx `location /font/` + `location /font/_next/`를 명시. `<Link>`는 Next가 basePath 자동 prefix하므로 코드 변경 최소.
  - (b) basePath를 안 쓸 거면 nginx에서 `/font/` 경로를 rewrite로 떼고 프론트를 서브도메인/루트로 서빙.
  - 어느 쪽이든 **로컬(루트)과 운영(서브경로)에서 동일하게 동작하도록** 환경변수(`BASE_PATH`)로 통일 권장.

### B2. BFF 프록시에 타임아웃/취소(AbortController) 없음 → 엔진 행 시 라우트 무한 대기
- 근거: `apps/font/frontend/app/api/generate/route.ts:45-51` `fetch(target, {...})`에 `signal`/타임아웃 없음. 엔진 측 `font_loader.ensure_font()`는 미러 다운로드에 `requests.get(..., timeout=30)`(font_loader.py:49)이 걸려 있어, 콜드스타트 첫 요청이 **최대 30s+ 블로킹**될 수 있음.
- 영향: 엔진이 느리거나 미러가 지연되면 Next 서버 워커가 점유되고, 클라이언트는 무한 "생성 중…". 무료 티어(저메모리/저코어)에서 동시성 고갈 위험.
- 수정 제안: BFF에 `AbortController` + `setTimeout`(예: 15s)로 `signal` 전달하고, abort 시 504/503으로 변환. 엔진 미러 다운로드는 startup에서만 시도하고 `/generate` 경로에서는 재다운로드 대신 즉시 503 반환을 고려.

### B3. 매 요청마다 사용하지 않는 `imagePng`(base64 PNG)를 전송 → 대역폭/페이로드 낭비 + 잠재적 413
- 근거:
  - `apps/font/frontend/app/font/FontStudio.tsx:44-48` 디바운스된 슬라이더 변경마다 `canvasRef.current?.toPng()`(전체 캔버스 PNG dataURL)를 payload에 실음.
  - `apps/font/engine/generator.py:88,94` 및 `main.py:81`에서 **Phase 1은 imagePng를 명시적으로 무시**.
  - nginx는 `client_max_body_size 8m`(webapp.conf:21)로 막아둠.
- 영향: 슬라이더 한 번 움직일 때마다 수십~수백 KB PNG를 BFF→엔진으로 왕복. 무료 티어에서 불필요한 CPU/네트워크. 계약상 `imagePng`가 "선택"인데 항상 채워 보내는 건 의도와 불일치.
- 수정 제안: Phase 1에서는 `imagePng`를 **전송하지 않거나**(엔진 미사용이므로), 최소한 "사용자가 생성 버튼을 눌렀을 때"만 1회 첨부. 디바운스 자동 호출에는 params만 보낸다.

---

## Warning (권장)

### W1. start 스크립트 포트 하드코딩(3000) vs nginx/배포 규약(3001) 불일치
- 근거: `apps/font/frontend/package.json:8` `"start": "next start -p 3000"`. nginx `upstream font_frontend{ server 127.0.0.1:3001; }`(webapp.conf:13), `deploy.sh`도 `--port 3001` 안내, `healthcheck.sh` `FRONT_URL=:3001`.
- 영향: `pnpm start` 그대로 쓰면 3000에 뜨는데 nginx는 3001을 봄 → 502. deploy.sh가 `start -- --port 3001`로 덮어쓰긴 하나 스크립트와 package.json이 모순.
- 수정 제안: `package.json`의 `start`를 `next start -p 3001`로 통일하거나, 포트를 환경변수(`PORT`)로 받아 한 곳에서 관리.

### W2. SEO STEP 4-3 핵심 누락: sitemap.xml / robots.txt / JSON-LD / metadataBase 부재
- 근거: 레포 전체에 `robots`/`sitemap` 파일 없음(검색 결과 0건). `packages/seo/src/index.ts`의 `buildMeta`는 OG 일부만 생성, JSON-LD/canonical base 미지원. `layout.tsx`/`page.tsx`에 `metadataBase` 없어 OG/canonical 절대 URL 생성 불가.
- 영향: CLAUDE.md §5("sitemap/robots/JSON-LD 기본")과 phase1-checklist STEP4 위반. 검색 노출이 프로젝트 핵심 목표인데 기반 미비.
- 수정 제안: `app/robots.ts`, `app/sitemap.ts`(Next App Router 규약) 추가, `metadata.metadataBase` 설정, `packages/seo`에 JSON-LD(SoftwareApplication/WebApplication) 헬퍼 추가.

### W3. `home/` 메인 홈페이지 미구현 (STEP 4)
- 근거: `home/` 디렉터리 존재하나 비어 있음. 현재 진입점은 `apps/font/frontend/app/page.tsx`의 랜딩이 대체 중.
- 영향: 모노레포 허브 구조(CLAUDE.md §1, §0.1)의 "검색 진입점/앱 카드 목록"이 없음. Phase 1 완료 기준 미달이나, font 앱 랜딩이 임시 대체하므로 Blocker는 아님.
- 수정 제안: Phase 1 범위를 "font 앱 랜딩으로 대체"로 명문화하거나, `home/`에 최소 카드 목록 페이지 작성.

### W4. 엔진/프론트 파라미터 계약이 "문서적으로만" 동기화 — 단일 출처 미달
- 근거: `packages/core/src/index.ts`의 `PARAM_RANGES`/`TARGET_CHARSET`과 `apps/font/engine/generator.py:23-36`의 동일 상수가 **각각 하드코딩**. core 주석(index.ts:4) "값이 바뀌면 양쪽을 함께 갱신할 것"이 수동 의존.
- 영향: 한쪽만 바뀌면 조용히 드리프트(예: slant 범위, charset 확장). 계약 위반이 런타임까지 안 잡힘.
- 수정 제안: core에서 `params.json`(범위/charset) 단일 파일을 두고 TS·Python 양쪽이 읽거나, 엔진 테스트에 "core 값과 일치" 어서션 추가. 최소한 EXTRA_CHARS(generator.py:29)는 core에도 정의해 프리뷰 문자셋과 맞출 것.

### W5. CORS `allow_origins=["*"]` 운영 노출
- 근거: `apps/font/engine/main.py:28`. 주석은 "개발용"이라 하나 배포 스크립트에 그대로 사용됨.
- 영향: BFF 프록시 구조면 브라우저가 엔진을 직접 호출할 일이 없으므로 와일드카드 CORS는 불필요한 표면. 엔진을 `/font/engine/`로 직접 노출(webapp.conf:28)하면 누구나 호출 가능.
- 수정 제안: 운영에서 CORS origin을 프론트 도메인으로 제한하거나, 엔진을 외부 비노출(127.0.0.1)로 두고 nginx `/font/engine/` 블록 제거. 동시성/rate-limit 가드는 audit W와 함께 추가.

### W6. FontPreview family 키에 `Date.now()` 사용 — 매 응답마다 FontFace 누적/충돌 회피용 임시방편
- 근거: `components/FontPreview.tsx:36` `${fontFamily}-${Date.now()}`.
- 영향: 같은 밀리초 내 두 응답이 오면 family 충돌 가능(희박). 정상 흐름에선 cleanup(:58-66)이 이전 FontFace를 delete하므로 누수는 없으나, 키 생성이 비결정적이라 디버깅 난해.
- 수정 제안: 엔진이 주는 `fontFamily`(이미 파라미터 해시 기반 `UserFont-xxxx`, generator.py:80)를 그대로 쓰고, 캐시 충돌 회피가 필요하면 단조 증가 카운터(useRef) 사용.

### W7. 입력 PNG 검증/크기 제한 부재 (보안 표면 — audit와 중복이나 코드 관점 재확인)
- 근거: BFF `route.ts:39` `imagePng: body.imagePng ?? null`을 검증 없이 전달. 형식/길이/data URL 스킴 체크 없음.
- 영향: Phase 1은 엔진이 무시하므로 즉시 위험은 낮으나, B3대로 매 요청 전송 중이라 거대 페이로드 DoS 표면이 열려 있음.
- 수정 제안: B3로 전송 자체를 줄이고, 향후 사용 시 길이 상한 + `data:image/png;base64,` 스킴 화이트리스트.

---

## Nice-to-have

- **N1.** `DrawingCanvas.tsx:61,72,98`의 비제어 non-null 단언(`canvasRef.current!`)·`pos()` 내부 `cv!`. 현재 흐름상 안전하나 가드 추가가 견고.
- **N2.** `packages/ui`(src/index.ts:6 `export {}`)가 빈 자리만. `DrawingCanvas`/`ParameterPanel`은 폰트 앱에 종속적이라 추출 후보는 아니지만, Slider 같은 순수 UI는 향후 승격 권장(CLAUDE.md §1 새 앱 규칙 대비).
- **N3.** 매직넘버: `DEBOUNCE_MS=350`(FontStudio.tsx:19), 캔버스 600x240(DrawingCanvas.tsx:29), `lineWidth=4`(:52), `detail.slice(0,500)`(route.ts:57). 상수/주석으로 의미 부여.
- **N4.** `clampParams`가 프론트(core), BFF(route.ts:38), FontStudio(:46,92) 3중으로 호출됨 — 방어적이라 나쁘진 않으나 BFF만으로 충분. 의도(이중 가드)면 주석으로 명시.
- **N5.** 엔진 `@app.on_event("startup")`(main.py:54)는 deprecated(FastAPI lifespan 권장). 현재 동작엔 무해.

---

## 디자인/UX 관점 "AI 티" (구체 지적)
- **단일 다크 컬럼 + 제네릭 블루 액센트**: `globals.css:1-11`의 `#0f1115` 배경 + `#6ea8fe/#4f86f7` 파랑은 "AI가 뽑은 기본 다크 대시보드" 인상. 손글씨/폰트 도메인다운 따뜻함·종이질감·타이포 개성이 없음.
- **밋밋한 2분할 그리드**: `FontStudio.module.css:16-21` `1fr 1fr` 좌(입력)·우(프리뷰)는 전형적 보일러플레이트 레이아웃. 손글씨 앱이면 캔버스를 주인공으로 키우고 프리뷰를 "종이 위" 메타포로 차별화 권장.
- **프리뷰 샘플 문구가 클리셰**: `FontPreview.tsx:78` "The quick brown fox..." 팬그램은 무난하나 흔함. 한글 안내 UI에 라틴 팬그램만 있어 톤 불일치.
- **CTA/버튼이 기본 라운드 사각형 일변도**: landing `cta`(landing.module.css:19-27), download 버튼 등 모두 동일 패턴 — 시각적 위계/브랜드 요소 부재.
- 개선 방향: 브랜드 컬러 1~2색 + 손글씨 폰트 헤드라인, 캔버스를 히어로로, 프리뷰를 "노트/엽서" 카드로. 라이트 테마 옵션. (디자인은 비기능이라 Blocker 아님)

---

## 다음 빌드에서 우선순위 TOP 5
1. **B1** nginx `/font` ↔ Next `basePath` 정합화 (운영 배포 차단 해소).
2. **B2** BFF fetch 타임아웃/Abort + 엔진 `/generate`의 다운로드 블로킹 제거.
3. **B3** 디바운스 자동 호출 시 `imagePng` 미전송(엔진 미사용) — 페이로드 낭비/표면 제거.
4. **W2/W3** SEO 기본(robots.ts·sitemap.ts·JSON-LD·metadataBase) + `home/` 또는 랜딩 대체 명문화.
5. **W1/W4** 포트 3001 통일 + 파라미터 계약 단일 출처화(core↔engine 드리프트 방지).
