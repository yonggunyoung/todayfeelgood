# Critique-Agent 보고서 — Round 1 (적대적 재검증)

**한 줄 결론:** 보안·엔진 측 Blocker(B2/B3, H1~H3, M1/M2)는 **실제로 해소됐다(코드 확인)**. 그러나 **basePath 리팩터가 내비게이션 링크를 새로 깨뜨렸고**(`/font/studio` → `/font/font/studio` 404), **제품이 만들 수 없는 한글을 생성 폰트로 미리보기에 렌더해 "한글도 된다"는 오해를 적극적으로 유발**하며, **그린 그림은 결과에 전혀 반영되지 않는데 UI는 "글씨를 그리면 참고한다"고 말한다**. 디자인은 "AI 티" 지적을 잘 걷어냈으나, **선언만 하고 로드하지 않은 웹폰트(Pretendard/Iropke 등)**로 의도한 타이포가 대부분 폴백된다.

**Blocker 4 · Warning 7**

---

## Blocker (반드시 수정)

### BL1. basePath 이중 prefix로 핵심 CTA 링크가 404 — "공방 들어가기"가 안 열림 (회귀)
- 근거:
  - `apps/font/frontend/next.config.mjs:11` `basePath: "/font"` 설정됨(B1 해결 자체는 맞음).
  - `apps/font/frontend/app/page.tsx:33` `<Link href="/font/studio">`, `page.tsx:57` `<Link href="/font/studio">`.
  - 스튜디오 실제 라우트는 `app/studio/page.tsx` → 라우트 `/studio` → basePath 적용 후 `/font/studio`로 서빙.
- 문제: Next의 `<Link>`는 **basePath를 자동 prefix**한다. `href="/font/studio"`는 최종적으로 `/font` + `/font/studio` = **`/font/font/studio`**로 렌더 → 404. 랜딩의 헤더 CTA와 히어로 주 CTA **두 개의 주요 진입 버튼이 전부 깨진다**.
- 수정 지시: `page.tsx:33,57`의 `href="/font/studio"`를 **`href="/studio"`** 로 변경(basePath가 자동으로 `/font` 붙임). `lib/paths.ts`의 `apiPath`는 `fetch`용(자동 prefix 안 됨)이라 `/api/generate`에 수동 prefix가 맞고 그대로 유지. 즉 **`<Link>`/`<a>` 내부 링크에는 basePath를 절대 손으로 붙이지 말 것.**

### BL2. 제품 정직성 — 생성 폰트는 라틴 전용인데 한글을 그 폰트로 미리보기에 렌더 (오해 유발)
- 근거:
  - `apps/font/frontend/components/FontPreview.tsx:83` `<p className={styles.headline}>활자가 깨어나는 새벽</p>` 이 단락은 `styles.sheet`의 `style={fontStyle}`(=생성된 `activeFamily`) 안에 있다(FontPreview.tsx:81~92). 생성 폰트에는 한글 글리프가 없으므로 이 줄은 **폴백 Georgia/serif로 렌더**되며, 사용자는 "내가 만든 글자체가 한글까지 적용됐다"고 오해한다.
  - 엔진 서브셋은 라틴만: `apps/font/engine/generator.py:24~30`(`TARGET_CHARSET` = A-Z a-z 0-9 + `EXTRA_CHARS`). 한글 0자.
  - CLAUDE.md §0.1 "타깃 문자: 라틴 a–z(+대문자/숫자) 먼저. 한글은 다음 단계."
- 수정 지시: **견본 시트(FontPreview)에서는 생성 폰트가 실제로 적용되는 라틴/숫자만 보여줄 것.** `FontPreview.tsx:83`의 한글 헤드라인을 라틴 문구(예: `Hamburgefonstiv` 또는 `Quietude` 같은 폰트 디자이너용 견본어)로 교체하거나, 한글을 꼭 두려면 **그 단락만 `fontStyle`에서 빼서 본문 폰트로 명시**하고 "한글은 폴백 표시"라는 캡션을 달 것. 동시에 `FontPreview.tsx:91`의 `& @ # ? !`는 엔진 `EXTRA_CHARS`(generator.py:30: ` .,;:!?'"-()`)에 **`& @ #`가 없어** 폴백 렌더되므로, 견본 문자열을 `EXTRA_CHARS`와 일치시키거나 미지원 기호를 빼라.

### BL3. 드로잉 캔버스가 결과에 0% 반영되는데 UI는 "밑그림을 참고한다"고 안내 (기대-실제 간극)
- 근거:
  - 캔버스 PNG는 **상위에서 호출조차 안 됨**: `app/studio/FontStudio.tsx`는 `canvasRef`(:56)를 만들지만 `canvasRef.current.toPng()`를 **어디서도 부르지 않는다**. 프리뷰/다운로드 payload(:67~70, :120~123)에 `imagePng` 자체가 없음. 엔진도 무시(generator.py:102,109 "Phase 1 미사용").
  - 그런데 안내 카피는 반대로 말한다: 랜딩 `app/page.tsx:99~102` "캔버스에 글씨를 끄적여 보세요. 손의 결을 **참고하기 위한** 밑그림" / `DrawingCanvas.tsx:130` "여기에 마우스/손가락으로 글씨를 그려보세요". → 사용자는 그림이 폰트에 반영된다고 믿는다.
- 수정 지시(택1):
  - (권장) Phase 1 캔버스의 카피를 **정직하게**: 예) 밑그림 영역 라벨(`FontStudio.tsx:170` "밑그림 (선택)")과 hint(`DrawingCanvas.tsx:130`)를 "지금은 손풀기용 스케치입니다. 이 그림은 폰트에 반영되지 않습니다(손글씨 반영은 다음 단계)." 류로 변경. 랜딩 step01 카피(page.tsx:98~102)도 "그림이 폰트가 된다"는 인상 제거.
  - 또는 Phase 1 동안 캔버스를 **숨기거나** "준비 중(Coming soon)" 배지로 명확히 비활성 표기.

### BL4. 디자인 타이포가 선언만 되고 로드되지 않음 — 의도한 글꼴 대부분 폴백
- 근거: `app/globals.css:32` `font-family: "Iropke", "Noto Serif KR", Georgia, ...`, `:40~41` `.sans { font-family:"Pretendard", system-ui, ..., "Noto Sans KR" }`. 그러나 레포 전체에 **`@font-face`도, `next/font`도, Google Fonts `<link>`도, 자체 폰트 파일도 없음**(`grep next/font` 0건, `*.woff/*.ttf` 자산 0건).
- 문제: 사용자/서버 환경에 Pretendard·Iropke·Noto가 설치돼 있지 않으면 **세리프=Georgia, 산세리프=system-ui로 전부 폴백**한다. 리뷰가 칭찬한 "세리프 헤드라인 vs 산세리프 UI 대비", 한글 본문 미감이 대부분 사라진다. SSR/검색 미리보기/타 OS에서 디자인 일관성 붕괴.
- 수정 지시: 핵심 폰트(최소 Pretendard, 한글 본문용 Noto Sans/Serif KR)를 **`next/font/local` 또는 `next/font/google`로 self-host**하고 `globals.css`의 family와 연결. 라이선스/용량(무료 티어) 고려해 subset. 폴백만으로 버틸 거면 globals.css 주석에 "폴백 전제" 명시하고 디자인 보고서의 "세리프/산세리프 대비" 주장을 철회.

---

## Warning (권장)

### W1. 홈(`/`)과 폰트 랜딩(`/font`)이 거의 같은 랜딩 — 키워드 자기잠식(cannibalization)
- 근거: 두 페이지가 동일 키워드를 동시에 노린다. `home/app/page.tsx:10` `keywords: ["폰트 만들기","손글씨 폰트","글씨체 만들기","웹 도구"]` vs `apps/font/frontend/app/page.tsx:12` `["손글씨 폰트","글씨체 만들기","폰트 만들기","자동 폰트 생성"]`. 카피·히어로도 "손으로 빚는 글자체"로 사실상 중복. canonical은 각각 `/`와 `/font`로 분리돼 중복콘텐츠 페널티는 피하지만 **같은 쿼리에서 서로 순위를 깎는다**.
- 수정 지시: 홈은 "도구 허브(여러 앱)" 포지셔닝으로 키워드를 일반화(예: "웹 도구 모음", "온라인 도구")하고, "폰트 만들기/글씨체" 핵심 키워드는 `/font`에만 집중시켜라. 홈 keywords에서 "글씨체 만들기/손글씨 폰트" 제거 권장.

### W2. 폰트앱 브랜드 로고가 홈 허브로 못 감 (내비 단절)
- 근거: `components/SiteChrome.tsx:10` `<Link href="/" aria-label="획 폰트공방 홈">`. basePath 자동 prefix로 이 링크는 **`/font/`(폰트 랜딩)** 로 가지, 도메인 루트의 홈 허브(`home/`)로는 못 간다. aria-label은 "홈"이라 기대와 어긋남.
- 수정 지시: 홈 허브로 보내려면 **절대 외부 링크**가 필요(`<a href="/">`는 basePath 안 붙음, 하지만 Next `<Link>`가 아니라 `<a>`여야 함). 의도가 "폰트앱 안에서만 순환"이면 aria-label을 "획 폰트공방"으로 바꿔 오해 제거. BL1과 함께 "내부 링크 basePath 규칙"을 정리할 것.

### W3. 히어로 스페시먼도 한글("가나다")을 보여줘 BL2 오해를 강화
- 근거: `components/InteractiveSpecimen.tsx:46` `가나다 ABG 0 1 2`. 이건 시스템 폰트를 skew/weight로 흉내내는 **데모**(실제 생성 아님)지만, 사용자는 구분 못 하고 "한글도 만들어준다"로 읽는다. 또 `:41` stage가 `aria-hidden`이라 데모 자체는 AT에서 안 보이는데 **하단 슬라이더(:50~75)는 aria-hidden 아님** → 스크린리더 사용자는 "굵기/기울기" 슬라이더가 안 보이는 무언가를 바꾼다.
- 수정 지시: 데모 문구를 라틴/숫자 위주로(`Hwoek 0123`) 정리하고, 한글이 필요하면 "데모용 시스템 글꼴" 캡션 추가. 슬라이더 묶음에도 `aria-hidden`을 주거나, 데모 전체에 `role="img"`+설명을 부여해 일관되게.

### W4. 보조 텍스트 색 `--ink-faint`가 WCAG AA 미달 (대비 3.1~3.5:1)
- 근거: `globals.css:11` `--ink-faint:#8a8275`. 측정: 바탕 paper(#f7f4ec) 위 **3.45:1**, 패널 paper-2(#efe9dc) 위 **3.14:1** (AA 본문 기준 4.5:1 미달). 이 색이 본문 크기 보조텍스트에 다수 사용됨: 스튜디오 상태 "견본 갱신 중…"(FontStudio.module.css `.status`→`--ink-faint`), `FontPreview` `.note`, 랜딩 `.bandLabel`, `SiteChrome` `.fineprint`, 스튜디오 `.blockHead` 등.
- 수정 지시: `--ink-faint`를 최소 4.5:1 되는 톤으로 어둡게(예: `#6b6458`대 → 측정해 4.5 이상 확보). 순수 장식(괘선 `--rule`)은 예외로 두되, **텍스트에 쓰는 보조색은 전부 4.5:1 충족**시켜라.

### W5. 캔버스 접근성·키보드 대안 전무
- 근거: `DrawingCanvas.tsx:118~128` `<canvas>`에 `role`/`aria-label`/`tabindex` 없음. 포인터 전용(`onPointerDown/Move`)이라 키보드 사용자는 그릴 수 없다. (BL3로 어차피 기능이 무의미하므로 우선순위는 낮지만, 유지한다면 표시 필요.)
- 수정 지시: 캔버스에 `role="img"` 또는 `aria-label="글씨 스케치 영역(키보드 미지원)"`을 주고, BL3대로 "반영 안 됨"을 명확히. Phase 1에선 숨기는 편이 접근성·정직성 모두 유리.

### W6. 슬라이더가 사람이 읽는 값(°, 굵기 수치)을 AT에 전달 안 함
- 근거: `packages/ui/src/Slider.tsx:42~53` 네이티브 range는 min/max/value만 노출. UI에 보이는 `display`("−4°", "0.05" 등)는 `aria-valuetext`로 연결 안 됨. 스크린리더는 곡률을 "0.05"가 아니라 raw value로만 읽음(대체로 동일하나 단위/포맷 누락).
- 수정 지시: `Slider`에 `aria-valuetext={display}`를 input에 추가. 라벨-input 연결(`htmlFor`/`id`)은 이미 양호.

### W7. 다운로드 중 프리뷰 슬라이더가 안 잠김 + 빈 캔버스 `dirty` 가드만 — 사소한 UX 결함
- 근거: `FontStudio.tsx:203` 다운로드 버튼은 `downloading||loading`으로 비활성화되나, 다운로드 진행 중 **슬라이더(ParameterPanel)는 `disabled={loading}`만**(:179) 보고 막지 않아, 다운로드 중 파라미터를 바꾸면 진행 중 다운로드 파일명(`shortHash(params)`, :141)과 실제 받는 폰트의 params가 어긋날 수 있다(다운로드는 `params` 클로저 캡처라 파일 내용은 일관되나 파일명 해시는 최신 params로 계산될 위험은 낮음 — 그래도 동시 조작 UX 혼란).
- 수정 지시: 다운로드 중에도 `ParameterPanel disabled`를 `loading || downloading`으로. 사소하지만 일관성.

---

## 재검증 요약 (이전 보고서 항목별)

| 항목 | 상태 | 근거 |
|---|---|---|
| B1 basePath | **해결**(단 BL1 새 회귀) | next.config.mjs:6~12 basePath/assetPrefix. 그러나 page.tsx:33,57 이중 prefix 버그 발생 |
| B2 BFF 타임아웃/엔진 블로킹 | **해결** | route.ts:92~93 AbortController+20s; main.py:56~65 lifespan 1회 로드, /generate는 다운로드 안 함, 미로드 시 503(main.py:145) |
| B3 imagePng 미전송 | **해결** | FontStudio.tsx:67~70,120~123 payload에 imagePng 없음. 단 그 결과 캔버스가 완전 무의미해짐 → BL3 |
| H1 imagePng 크기제한(이중) | **해결** | route.ts:38~58(content-length+본문길이+413), main.py:152(엔진 413), core MAX_IMAGE_PNG_BYTES:60 |
| H2 CORS | **해결** | main.py:47~77 ALLOWED_ORIGINS 화이트리스트, allow_credentials=False, 메서드/헤더 최소화 |
| H3 타임아웃/동시성 | **해결** | route.ts 타임아웃; main.py:43~44,159~165 Semaphore(3)+포화 503; run_in_executor 비블로킹 |
| M1 에러 살균(BFF) | **해결** | route.ts:106~127 원문은 console.error만, 클라엔 일반 메시지 |
| M2 에러 살균(엔진) | **해결** | main.py:113~120 전역 exception_handler, 경로/스택 미노출 |
| W2 SEO 기본 | **해결** | robots.ts/sitemap.ts(양 앱), buildMeta metadataBase/canonical/OG, webApplicationJsonLd |
| W3 home 허브 | **해결** | home/app/page.tsx 카드 목록 구현 |
| 디자인 "AI 티" | **대체로 해결** | 종이/먹+주묵 단일악센트, 비대칭 그리드. 단 BL4(폰트 미로드)로 의도 일부 미구현 |

> 참고(코드 수정 금지라 지적만): `main.py:159` `_generate_semaphore.locked()` 사전검사는 TOCTOU(검사~acquire 사이 경합)지만 방어용이라 치명적 아님. `font_loader`는 이번 범위에서 재검 안 함.

---

## 이번 라운드 필수 수정 TOP 5
1. **BL1** — `app/page.tsx:33,57` `/font/studio` → `/studio`. 주 CTA 2개가 현재 404다(운영·로컬 모두). 내부 `<Link>`에 basePath 수동 prefix 금지 규칙 명문화.
2. **BL2** — `FontPreview.tsx:83`의 한글 헤드라인을 생성 폰트가 실제 커버하는 라틴 견본으로 교체(또는 한글 단락만 본문 폰트로 분리+캡션). `:91` 미지원 기호(`& @ #`) 정리.
3. **BL3** — 캔버스 카피 정직화(`DrawingCanvas.tsx:130`, `FontStudio.tsx:170`, `page.tsx:98~102`): "이 그림은 폰트에 반영되지 않습니다(다음 단계)". 또는 Phase 1 동안 캔버스 숨김.
4. **BL4** — Pretendard/Noto 등 핵심 폰트를 `next/font`로 self-host해 디자인 의도 실제 구현(폴백 전제면 명시·주장 철회).
5. **W4** — `--ink-faint`(#8a8275)를 4.5:1 이상으로 어둡게. 텍스트용 보조색 전부 AA 충족.
