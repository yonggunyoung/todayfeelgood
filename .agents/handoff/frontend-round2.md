# FE-Agent 인수인계 — Round 2 (Critique 대응)

**한 줄 결론:** Critique Round1의 Blocker 4건·Warning 7건을 모두 처리(또는 합리적 대안 적용)했고, 두 앱 `pnpm -r build`(타입체크 포함)와 `pnpm -r lint` 모두 통과. 빌드 산출물에서 링크 회귀(BL1)·폰트 self-host(BL4) 직접 확인.

## 고친 항목

### Blocker
- **BL1 (링크 이중 prefix)** — `apps/font/frontend/app/page.tsx`의 두 CTA `<Link href="/font/studio">` → `href="/studio"`로 수정(basePath가 자동 prefix). 빌드 HTML(`index.html`)에서 `href="/font/studio"`로 **정확히 한 번** prefix됨 확인. `/font/font` 이중 prefix는 산출물 전체에서 0건. 홈(`home/`)→폰트앱 교차 링크는 plain `<a href="/font">`/`/font` 그대로 유지(basePath 없음, 전체경로 맞음).
- **BL2 (제품 정직성 — 라틴 전용)** —
  - `components/FontPreview.tsx`: 생성 폰트로 렌더되는 견본 시트에서 한글 헤드라인("활자가 깨어나는 새벽")을 라틴 견본어 `Hamburgefonstiv`로 교체. 미지원 기호 `& @ #` 제거하고 엔진 `EXTRA_CHARS`(` .,;:!?'"-()`)와 일치하는 `. , ; : ! ? ( )`만 노출. 캡션도 "현재 라틴 A–Z·a–z·0–9 지원, 한글은 다음 단계"로 명시.
  - `components/InteractiveSpecimen.tsx`: 데모 문구 `가나다 ABG 0 1 2` → `Hwoek 0 1 2`. (이 데모는 시스템 글꼴 skew/weight 흉내라 생성 폰트 아님 → 라벨로 "시스템 글꼴 흉내" 명시.)
  - 랜딩 띠(`page.tsx` band)의 한글 문장("새벽 다섯 시…")은 **생성 폰트가 아니라 본문 세리프(Noto Serif KR)** 로 렌더되는 자리라 그대로 둠(오해 없음).
- **BL3 (드로잉 미반영 정직화)** —
  - `components/DrawingCanvas.tsx`: hint를 "손풀기용 스케치입니다. 지금은 폰트에 반영되지 않습니다(손글씨 반영은 다음 단계)."로 변경.
  - `app/studio/FontStudio.tsx`: 블록 제목 "밑그림 (선택)" → "스케치 (미반영 · 준비 중)".
  - `app/page.tsx` step01: "밑그림을 그립니다 / 손의 결을 참고" → "세 축을 정합니다"로 교체하고 "손글씨 그림 반영은 다음 단계로 준비 중"을 괄호로 명시.
- **BL4 (폰트 실제 self-host)** — `next/font/google`로 **Noto Sans KR(산세리프/UI)** + **Noto Serif KR(세리프/제목·견본)** self-host. 폰트앱·홈 두 layout에 동일 적용, `--font-sans`/`--font-serif` CSS 변수로 노출. `globals.css`의 죽은 선언(Pretendard/Iropke/문자열 "Noto …")을 변수 참조로 교체. 빌드 산출물에 `/_next/static/media/*.woff2` 실제 번들 확인.

### Warning
- **W1 (SEO 자기잠식)** — 홈을 "도구 허브"로 일반화. `home/app/page.tsx` keywords를 `["웹 도구","온라인 도구","도구 모음","획 공방"]`로, description도 폰트 키워드 제거. layout description도 동기화. 폰트 핵심 키워드는 `/font` 랜딩에만 잔류. canonical은 기존대로 각각 `/`·`/font`.
- **W2 (브랜드 로고 → 홈 허브)** — `components/SiteChrome.tsx`의 브랜드를 `next/Link`(basePath 자동 prefix로 `/font`행) → plain `<a href="/">`(도메인 루트 = 홈 허브)로 변경. aria-label "획 — 홈으로". 빌드 HTML에서 `href="/"` 확인.
- **W4 (대비)** — `--ink-faint` `#8a8275`(종이 3.45:1, 패널 3.14:1, AA 미달) → `#645d52`(종이 5.92:1, 패널 5.38:1, AA 통과). 폰트앱·홈 globals.css 둘 다. `--rule`은 별도 변수라 괘선 영향 없음.
- **W5 (캔버스 접근성)** — `<canvas>`에 `role="img"` + aria-label("…키보드 미지원…폰트에 반영되지 않습니다") 부여.
- **W6 (슬라이더 AT)** — `packages/ui/src/Slider.tsx` input에 `aria-valuetext={\`${label} ${display}\`}` 추가(예: "굵기 540", "기울기 -4°"). 키보드 조작은 네이티브 range라 기존 OK.
- **W7 (다운로드 중 busy)** — `FontStudio.tsx` ParameterPanel `disabled={loading}` → `disabled={loading || downloading}`. 다운로드 버튼은 이미 `downloading||loading`.

## 반박/대안 적용 (무비판 수용 안 한 항목)
- **W3 (히어로 데모 슬라이더 aria-hidden 일관성)** — Critique는 "슬라이더에도 aria-hidden을 주거나" 제안. 그러나 슬라이더는 **실제 조작 가능한 인터랙티브 컨트롤**이므로 aria-hidden으로 가리면 키보드/스크린리더 사용자가 조작 불가가 되어 접근성이 오히려 후퇴. 대신 **시각 데모(stage)에 `role="img"`+설명 라벨**을 주고 내부 글자 span은 `aria-hidden`, 슬라이더는 노출 유지로 일관성 확보. (데모 슬라이더도 W6의 aria-valuetext 혜택을 그대로 받음.)
- **BL3 캔버스 숨김 vs 정직 카피** — Critique 권장 1순위(정직 카피)를 택함. 숨기지 않고 "미반영·준비 중"을 라벨/hint/랜딩 카피 3곳에 명시. (입력 UX 경험 자체는 Phase 2 손글씨 반영의 발판이라 유지가 합리적.)

## 검증 결과
- `pnpm install`: up to date.
- `pnpm -r build`: 폰트앱·홈 모두 ✓ (Compiled + 타입체크 + 정적 생성 성공). 엔진 없이 빌드됨.
- `pnpm -r lint`: 두 앱 모두 "No ESLint warnings or errors".
- 링크 회귀 직접 확인: 빌드 `index.html`에서 `href="/font/studio"`(×2, 단일 prefix), 브랜드 `href="/"`, `/font/font` 0건.
- 폰트 self-host 확인: 빌드 산출물에 `/font/_next/static/media/*.woff2` 번들 존재.

## 범위 준수
`apps/font/frontend/`, `home/`, `packages/ui/`, `packages/seo/`만 수정. engine·infra·docs·CLAUDE.md·packages/core 미수정. git 미수행.
