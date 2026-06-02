# FE-Agent 인수인계 — Phase 2 (Wave A 디자인 재설계 + Wave B/C 컨트롤)

**한 줄 결론:** "소프트 iOS 문방구" 디자인 시스템 + 마스코트 "획이"로 전면 재설계 완료, 계약 v3 컨트롤(script/신규 슬라이더/주사위/무드 프리셋/정직성 라벨) 반영. `pnpm -r build`·`pnpm -r lint` 모두 green.

## 1. 디자인 토큰 (두 globals.css 동기화)
- `apps/font/frontend/app/globals.css` + `home/app/globals.css`를 **동일 키**로 교체.
- 핵심: 바탕 `--bg #f6f5f2`(색지), 표면 `--surface #fff`, 잉크 `--ink #2b2a33`(완전검정 금지), 악센트 `--accent #5b6cf0`(잉크-블루베리), 캔디 4종(소량), 라운드 `--r-xs..xl`(8~32px)+`--r-pill`, 그림자 `--shadow-sm/md/lg`·`--clay`·`--inset`, 블러 `--blur`+`--material-bg`, 스프링 `--ease-spring`·dur 140/240/420, 간격 `--sp-*` 4px 베이스, 타이포 스케일.
- 타이포: 세리프 본문 **폐기**. 본문/UI = Noto Sans KR, 디스플레이(`.display`, 로고/라지타이틀/마스코트) = Quicksand. layout.tsx 양쪽 갱신(`--font-sans`, `--font-display`).
- 블랙리스트 제거: 세리프 제목, 올캡스+트래킹 라벨(전부 일반 케이스로), 전면 1px 보더 구획(면/그림자/색지로 대체), 균등 01/02/03 3단 스텝, `<br>` 강제 히어로, 보라/제네릭 블루. `--paper`/`--rule`/`.ruled`/`.sans` 전부 삭제.
- `prefers-reduced-motion` 존중(전역).

## 2. packages/ui (공용, 두 앱 재사용)
- 리스타일: **Button**(solid/soft/clay/ghost, 스프링 누름), **Slider**(인셋 트랙+악센트 채움+클레이 thumb, 값 알약 칩), **Card**(보더 폐기, 떠 있는 그림자+큰 라운드, `interactive` prop, 알약 칩 tag).
- 신규: **Segmented**(제네릭 `<T>`, 슬라이드 흰 알약 인디케이터, radiogroup), **Chip**(프리셋용, selected 악센트), **Mascot**(인라인 SVG "획이": 잉크방울 몸체 1 path + 머리 "획" + 표정 6종 happy/surprised/focused/sleepy/love/worried, idle 둥실, SSR 안전·에셋0). index.ts에 모두 export.

## 3. 마스코트 "획이" 배치
- 홈 히어로(96px), 폰트 랜딩 eyebrow(28)·how 카드(focused 72), SiteHeader 브랜드 마크(36), 스튜디오 빈/로딩 상태(sleepy/surprised 88)·정직성 라벨(22). 기능 불릿 장식엔 미사용.

## 4. 새 컨트롤 (계약 v3, 스튜디오)
- **script 세그먼티드**(라틴/한글): 전환 시 BFF 요청 `script` 반영. 한글 선택 시 `LATIN_ONLY_PARAMS`(curvature/mono/cursive) 슬라이더 **숨김**(ParameterPanel에서 필터).
- **슬라이더 추가**: mono, cursive, letterSpacing, weirdness(+기존 weight/slant/curvature). 범위/기본값 `PARAM_RANGES` 사용.
- **괴상함 + 주사위**: weirdness 슬라이더 + 인라인 주사위 SVG 버튼(이모지 아님)으로 `seed` 무작위 변경, 현재 시드 값 표시(재현 가능).
- **무드 프리셋 칩**: `STYLE_PRESETS` 6종 → 클릭 시 params 적용, 현재 일치 프리셋 selected 표시.
- **프리뷰**: script별 견본(한글/라틴), 빈/로딩 마스코트, "라이브/대기/갱신 중" 상태 칩. **정직성 라벨**: "공개 폰트 변형 — 내가 그린 글씨가 아닙니다" 명시. 다운로드(WOFF/TTF 세그먼티드 + 클레이 CTA) 유지.

## 5. BFF
- `app/api/generate/route.ts`: `normalizeScript()` 추가, payload에 `script` 포함해 엔진 전달. 기존 타임아웃/크기 방어/에러 살균 유지.

## 6. basePath 규칙(유지)
- 폰트앱 내부 이동 = `<Link href="/studio">`(상대), 홈→폰트앱 = `<a href="/font">`, 폰트앱→홈 = `<a href="/">`(SiteChrome). fetch는 `apiPath()`.

## 7. 검증
- 루트 `pnpm install` 완료. `pnpm -r build` ✅(타입체크 green, 엔진 없이 빌드), `pnpm -r lint` ✅(경고/에러 0).

## Blocker / Warning
- **Warning**: 한글 견본은 엔진이 `script:"hangul"`에 한글 글리프를 실제로 반환해야 정상 표시됨(엔진 측 Wave C 의존). 엔진 미반영 시 빈 상태/폴백으로 떨어짐 — 동작에는 문제 없음.
- **Warning**: Segmented 인디케이터 폭은 옵션 2개 기준으로 검증(라틴/한글, WOFF/TTF). 옵션 수가 바뀌면 시각 확인 권장.
- Blocker 없음.
