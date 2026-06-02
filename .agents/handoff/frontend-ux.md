# FE 인수인계 — 반응형 UX 라운드

> 한 줄 결론: 스튜디오를 "한 시야 처리" 구조로 재편 — **데스크톱 우측 sticky(프리뷰+받기)**, **모바일 상단 축소 sticky 프리뷰 + 하단 고정 액션바**, **변주 갤러리 자동 1회 생성+스켈레톤**, **Segmented 3+옵션 인디케이터 보정**, **트렌드 프리셋 6종(프론트 데이터)** 추가. build/lint 통과.

## 처리 항목
1. **데스크톱 sticky (목표 1)** — `.preview`를 `position:sticky; top:84px`로 두고, 프리뷰 카드 **바로 아래에 받기 패널(`.desktopActions`)을 같은 sticky 묶음에 포함**. 좌측 컨트롤을 아무리 스크롤해도 프리뷰·포맷·받기가 항상 보인다. 기존 tools 컬럼의 "받아 가기" 카드는 제거(중복 방지), statusRow(갱신/오류)만 좌측에 남김.
2. **모바일 시트/액션바 (목표 2)** — `≤900px`에서 `.grid`를 flex-column으로, `.preview { order:-1 }`로 **프리뷰를 컨트롤 위로** 올리고 `position:sticky; top; max-height:46vh; overflow:auto`로 **축소 sticky**(긴 견본은 내부 스크롤). 받기는 `.mobileActionBar`(position:fixed bottom, safe-area-inset 반영, blur 배경)로 **항상 한 손 도달**. tools에 하단 패딩(76px+safe-area)으로 가림 방지. 토스트도 모바일에서 바 위로 올림.
   - 포맷·받기 동작은 `renderActions("panel"|"bar")` 한 함수에서 공유 → 두 폼팩터 동등 도달(핸들러 동일).
3. **균형 (목표 3)** — 3단계 위계(빠른시작/세부 details open/고급 details) 유지. 받기를 컨트롤 흐름에서 분리(sticky/바)해 좌측 첫 화면이 가벼워짐.
4. **변주 갤러리 자동생성 (목표 4)** — `VariationGallery`가 **마운트 시 1회 자동 생성**(ref로 base 변경 재실행 차단), **script 전환 시 재생성**. 한글 직렬화(CONCURRENCY_HANGUL=1)+503/504 백오프 유지. **로딩 스켈레톤**: 생성 전 9칸 셔머 placeholder + pending 칸도 셔머. `reduced-motion` 시 셔머 정지. 버튼 라벨은 자동 시작에 맞춰 "굽는 중…"/"다시 9가지 뽑기".
5. **Segmented 3+옵션 보정 (목표 5)** — 기존 `translateX(calc((100%-8px)/n*idx))`는 translateX의 `100%`가 트랙이 아닌 **thumb 자기 폭**이라 3옵션부터 어긋났음. **`translateX(${idx*100}%)`**(=thumb 폭의 idx배 = 정확히 한 칸/스텝)로 교체. 2/3/4+ 모두 정확. (향후 포맷 4종·script 다옵션 대비.)
6. **트렌드 프리셋 (목표 6)** — `apps/font/frontend/lib/trendPresets.ts` 신설(`TREND_PRESETS` 6종: Y2K/바이브/낙서짤/두툼임팩트/글리치/말랑다이어리). **코어 STYLE_PRESETS 불변** — 프론트 데이터로만 확장(배열에 한 줄 추가로 늘림). 빠른시작에 "트렌드 [요즘]" 칩 그룹 추가, 무드 프리셋과 동일 매처(`matchPreset`)로 선택 표시. 칩 `title=hint`로 무드 설명. 밈 IP/브랜드명 회피(일반 명사 라벨).

## 변경 파일 (자기 영역만)
- `apps/font/frontend/app/studio/FontStudio.tsx` · `.module.css` — 레이아웃 재편, renderActions, 트렌드 칩, matchPreset 일반화.
- `apps/font/frontend/components/VariationGallery.tsx` · `.module.css` — 자동생성+스켈레톤.
- `apps/font/frontend/lib/trendPresets.ts` — 신규(프론트 데이터).
- `packages/ui/src/Segmented.tsx` — 인디케이터 transform 보정.

## 검증
- `pnpm -r build` ✅ (font/home/sticker 정적 생성) · `pnpm -r lint` ✅ (0 warnings).
- 접근성: 하단 바 `role=region` + aria-label, Segmented radiogroup 키보드 유지, focus-visible 유지, `prefers-reduced-motion`(셔머·토스트·셀 모션 정지). 터치: 하단 바 버튼 min-height 유지(Button/Segmented 36~40px).
- 정직성 라벨·basePath(apiPath) 규칙 유지. engine/infra/docs/core/CLAUDE.md·마스코트 불변. git 미사용.

## 남은 권고
- 모바일 프리뷰 축소 sticky는 max-height 고정(46vh) 방식 — 스크롤 연동 자동 축소(헤더처럼 줄어듦)는 JS 필요해 보류.
- 트렌드 프리셋은 데이터만 추가 가능하나, 정렬/만료(시즌) 메타는 미도입 — 운영 늘면 `expiresAt`/`order` 필드 고려.
