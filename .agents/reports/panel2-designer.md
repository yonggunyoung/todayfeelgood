# 🎨 디자이너 참견쟁이(2차) — 5개 앱 상시 평가 보고서

> 작업 폴더 `/home/user/todayfeelgood`. 코드 미수정(읽기·판정만).
> 검토: 5개 globals.css(home+font+sticker+sign+kit), 각 앱 landing/studio, `packages/ui/src/*`(Mascot·Sticker·BrushStroke·LiveText·Segmented·Chip·Button·Card), `home/`, `docs/phase2/plan.md`, 이전 `.agents/reports/panel-designer.md`.

## 한 줄 결론
**토큰 복제는 4개 앱 바이트 단위로 완전 동기화됐고 마스코트·보이스·붓획·스티커·트렌드 프리셋이 실제 코드에 박혀 1차 때의 "냄새는 지웠으나 향이 없다"는 미달이 상당 부분 해소됐다 — 그러나 "한 시야 UX"가 앱마다 제각각이라(폰트=완성형, 사인/키트=절반, 스티커=미적용) 일관성이 깨졌고, sticker/kit가 공용 `Segmented`/`Chip`을 안 쓰고 인라인 재구현해 다양성이 아닌 "표류"가 시작됐다.**

## AI냄새 최종 판정: **제거 (정체성 입힘 성공) — 단, 일관성 결함이 새 리스크**
- **제거 확인(코드 근거):** 5개 globals.css 전부 테라코타 `--accent:#c0492b`, 색지 `--paper-grain`(feTurbulence), 연속곡률 `--r-*`, 보라/인디고 0건. 붓획(`BrushStroke.tsx`), 마스킹테이프/스티커(`Sticker.tsx` clip-path 찢긴 끝), "살아있는 글자"(`LiveText.tsx` breathe), 갈색 너구리(`Mascot.tsx` `#a07350` 털+`var(--ink)` 마스크)까지 **컨셉이 시각 언어로 실재**. 트렌드 프리셋 7종(Y2K/바이브/낙서짤/두툼/글리치/말랑, `trendPresets.ts`), 스티커 밈 템플릿 12종(`presets.ts`), 주사위 리롤이 밈/의외성 후크로 실제 동작. **1차 B2(독창성 미달)는 해소.**
- **잔존 리스크:** 더 이상 "AI 템플릿"이 아니라 "잘 만든 자체 디자인 시스템"이다. 다만 (a)공용 컴포넌트를 두고 sticker/kit가 세그/칩을 **인라인 복제**, (b)한 시야 UX 구현 편차, (c)마스코트 표정 자산 절반이 死장(focused/surprised/worried/calm 거의 미사용) — **냄새가 아니라 "관리 안 된 복제"가 다음 냄새의 씨앗.**

## Blocker: 2 / Warning: 6

---

## Blocker (다음 라운드 전 반드시)

### B1. "한 시야 UX"가 앱마다 제각각 — 마스터 UX 원칙(plan.md §4) 직접 위반
- **위치:** `apps/sticker/.../StickerStudio.module.css:151-164`(`.right` sticky가 모바일에서 `static`로만 풀림, 하단 고정바 없음), `StickerStudio.tsx:255-275`(생성 버튼이 우측 컬럼 안). 대비군: `FontStudio.module.css:264-275`(모바일 `position:fixed; bottom:0` 하단 액션바 + `:52` `padding-bottom:76px` 확보 + `:240-262` 모바일 프리뷰 축소 sticky).
- **문제:** 같은 "조절→프리뷰→받기"인데 **구현 등급이 3단계로 갈림**:
  - **폰트 = 완성형**: 데스크톱 우측 sticky 프리뷰+받기, 모바일 상단 축소 sticky 프리뷰 + **하단 고정 액션바**(`safe-area-inset` 처리까지). 교과서.
  - **사인/키트 = 절반**: 데스크톱 sticky(`SignStudio.module.css:180`, `KitStudio.module.css:200`)는 OK, 모바일은 프리뷰만 상단 sticky(sign `:275-291`)거나 그냥 `static`(kit `:207-211`) — **모바일에서 핵심 액션(받기 버튼)이 스크롤로 사라진다.**
  - **스티커 = 미적용**: 모바일에서 sticky 전부 해제 → "표정 N종 만들기"·"ZIP 받기" 버튼이 긴 컨트롤 패널 **아래로 밀려 화면 밖**. 한 시야는커녕 스크롤 지옥.
- **개선 지시:** 폰트의 모바일 하단 고정 액션바 패턴을 **공용 레이아웃/컴포넌트로 추출**해 sticker·sign·kit에 동일 적용. 최소한 (1)스티커 생성/ZIP 버튼을 모바일 `position:fixed` 하단바로, (2)키트 받기 버튼·사인 내보내기 버튼도 모바일에서 항상 보이게. 폰트만 되고 나머지가 안 되는 현 상태는 "반응형 일관성"(plan.md §4) 명백 위반.

### B2. 공용 `Segmented`/`Chip`을 두고 sticker·kit가 인라인 재구현 — 토큰 동기화의 의미를 깎는 표류
- **위치:** `StickerStudio.tsx:115-132,152-169`(`.seg/.segOn` 인라인), `KitStudio.tsx:255-272`(인라인 세그), `KitStudio.module.css:74-90` vs `packages/ui/src/Segmented.tsx`. 칩도 동일(`StickerStudio.module.css:90-110`, `KitStudio.module.css:98-116`이 `Chip.tsx`를 안 씀).
- **문제:** 사인 스튜디오는 공용 `<Segmented>`/`<Chip>`/`<Slider>`/`<Button>`을 제대로 쓴다(`SignStudio.tsx:10,232,255`). 그런데 스티커·키트는 **같은 모양을 손으로 다시 짰다.** 결과:
  - 1차 W4에서 고친 Segmented thumb 슬라이드 인디케이터(부드러운 이동, `Segmented.tsx:46-53`)가 sticker/kit엔 없음 → **모션 어휘 불일치**(딱 끊김 vs 미끄러짐).
  - kit `.segOn`은 글자색 `--accent-ink-weak`(`:87`), sticker `.segOn`은 `--ink`(`:80`) → **선택 상태 표현이 앱마다 다름.** chipOn도 sticker는 `--accent`+`--accent-ink`, sign Chip 공용은 또 다른 규칙. "토큰은 같은데 컴포넌트는 다른" 상태는 동기화 노력을 무효화.
- **개선 지시:** sticker·kit의 인라인 세그먼티드/칩을 **공용 `Segmented`/`Chip`으로 교체**(스와치·컬러픽커 등 진짜 고유 UI만 인라인 유지). 새 앱 찍어낼 때 복붙 금지(CLAUDE.md §1) 규칙을 UI 컴포넌트에도 강제.

---

## Warning (개선 권고)

### W1. 홈 허브에 공용 헤더(SiteHeader)가 없음 — 5개 앱과 상단 위계 단절
- **위치:** `home/app/layout.tsx`(헤더 없음), `home/app/page.tsx`(자체 footer만). 4개 앱은 모두 `SiteHeader`(`SiteChrome.tsx`)로 워드마크+너굴이 36px 블러 헤더를 공유.
- 앱에서 홈으로 오면 갑자기 상단 너구리 워드마크 바가 사라져 "다른 사이트" 느낌. 홈에도 동일 헤더(또는 일관된 글로벌 내비)를 두어 허브↔앱 왕복의 연속성을 줘야 한다. 현재 홈→앱은 카드, 앱→홈은 헤더 로고뿐이라 비대칭.

### W2. 마스코트 표정 자산 절반이 死장 + sticker가 엉뚱한 표정 사용
- **위치:** `Mascot.tsx`에 happy/surprised/focused/sleepy/love/worried 6종 + pose 2종 정의. 실사용: love(완료 토스트·홈), sleepy(빈 상태), happy(헤더), focused. **surprised/worried/calm pose는 전 앱 0회.**
- 특히 sticker/sign 랜딩 "정직성" 섹션이 `mood="focused"`(혀 빼꼼 = 그리는 중 표정)를 씀(`sticker/page.tsx:131` 실제론 love, `sign/page.tsx`는 focused) — **상황과 표정 불일치.** 에러 상태(sticker `setError`, sign `error`, kit `error`)에 `worried` 너굴이를 붙이면 만들어 둔 자산을 살리고 감정 피드백도 일관. 견본/시트 갱신 순간 `surprised`도 미사용.
- **지시:** 에러=worried, 갱신=surprised 연결. focused는 그리기(캔버스) 맥락에만.

### W3. 붓획·LiveText 모티프가 일부 앱에만 — 정체성 적용 편차
- **위치:** `BrushUnderline` 사용처 = font·sign 랜딩뿐(`grep` 결과). **sticker/kit 랜딩엔 붓 밑줄 없음.** `BrushDivider`는 4개 다 씀(OK). `LiveText`(살아있는 글자)는 **오직 font**(`InteractiveSpecimen.tsx`)에만.
- "획"이라는 브랜드 모티프가 앱마다 농도가 다르면 정체성이 흐려진다. 최소한 각 앱 랜딩 헤드라인에 BrushUnderline 1회, 키트/사인 결과물 라벨에 붓획 디테일 1곳씩 통일.

### W4. 색지 톤이 여전히 거의 흰색 — 1차 W1 미해결
- **위치:** 5개 globals.css 공통 `--bg:#f6f4f0` vs `--surface:#ffffff`. 명도 차 미미. `--paper-grain` opacity 0.04는 "있는지 모를" 수준.
- 홈 샘플 카드는 `color-mix(--paper 16%, --surface-2)`로 색지 톤을 잘 살렸는데(`home.module.css:86`), **정작 전역 바탕·카드는 1차 때와 동일하게 밋밋.** 색지 톤을 한 단 따뜻하게 내리거나 surface와 대비를 키워 depth 확보.

### W5. 스티커 랜딩/스튜디오의 "표정 N종"이 12 vs MAX_STICKER_SET_SIZE 혼용 — 숫자 신뢰
- **위치:** `sticker/page.tsx:59,62`("12종" 하드코딩) vs `StickerStudio.tsx:258,287`(`MAX_STICKER_SET_SIZE` 변수). 랜딩은 "12종" 약속, 스튜디오는 상수. `presets.ts` 템플릿은 13종(joy~blank). 약속 숫자와 실제 출력 수가 어긋나면 첫인상 신뢰가 깎인다. 단일 출처(상수)로 카피까지 묶을 것.

### W6. SiteChrome 주석 "획이" vs 렌더 "획" 불일치 (사소·문서 위생)
- **위치:** `SiteChrome.tsx:5` 주석 `워드마크 "획이"` 인데 실제 렌더는 `<span>획</span>`(`:16`). plan.md는 마스코트명 "너굴이"·브랜드 "획". 주석이 옛 네이밍("획이")으로 남아 혼동. 코멘트만 정리.

---

## 항목별 점검 요약
- **5개 앱 토큰 일관성:** font/sticker/sign/kit globals.css **바이트 동일**, home은 값 동일·주석만 다름 → **동기화 A.** 단 컴포넌트 레벨(B2)·UX 레벨(B1)에서 표류 시작.
- **AI냄새:** **제거.** 컨셉(너구리·색지·붓획·스티커·트렌드)이 코드에 실재. 잔여는 "복제 관리" 문제지 "냄새"는 아님.
- **밈/트렌드·의외성:** 트렌드 프리셋 7종 + 스티커 밈 템플릿 12종 + 주사위 리롤 + 시드 재현 → **바이럴 후크 실재(B등급).** 스티커 짤 캡션·카톡/디스코드 크기 프리셋이 트렌드 정조준. 폰트 Y2K/글리치 양호.
- **한 시야 UX:** **편차 심각(B1).** 폰트=완성, 사인/키트=데스크톱만, 스티커=거의 없음.
- **홈 허브:** 4개 앱 카드 일관·매력적(태그·CTA·너굴이 소개). 단 공용 헤더 부재(W1)로 허브↔앱 연속성 약함.
- **마스코트:** 갈색·"~너굴" 보이스 전 앱 일관, 과용 없음(앱당 2~6회, 짧은 quip). 표정 자산 절반 死장(W2)이 유일 흠.

## 전 제품 디자인 필수 수정 TOP 5
1. **[B1] 한 시야 UX 통일** — 폰트의 "모바일 하단 고정 액션바 + 축소 sticky 프리뷰"를 공용 레이아웃으로 추출해 sticker/sign/kit에 적용. 특히 스티커는 모바일에서 받기 버튼이 화면 밖이라 최우선.
2. **[B2] sticker·kit 인라인 세그먼티드/칩 → 공용 `Segmented`/`Chip` 교체.** 선택상태 색·thumb 모션 불일치 제거, 복붙 금지 규칙을 UI에도.
3. **[W2] 마스코트 표정 자산 살리기** — 에러=worried, 갱신=surprised 연결. sticker/sign 정직성 섹션의 focused 오용 교정(love 또는 happy).
4. **[W1/W3] 정체성 농도 균일화** — 홈에 공용 헤더, sticker/kit 랜딩에 BrushUnderline·붓획 디테일 추가해 "획" 모티프를 5개 앱 동일 농도로.
5. **[W4/W5] 색지 depth + 숫자 단일출처** — 전역 색지 톤/대비 한 단 강화, 스티커 "표정 N종" 카피를 상수와 묶어 약속·출력 일치.
