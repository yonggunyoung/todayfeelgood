# 스튜디오 i18n + 기본 추천화 — FE-Agent 인수인계

한 줄 결론: 폰트앱 스튜디오(`/font/studio`) 내부 전체 사용자 문자열을 ko/en 사전으로 추출해 영어 라우트 `/font/en/studio`를 신설, 입구 기본 선택을 추천(몇 자만 그리기/하이브리드, autofill ON)으로 바꿨다. `pnpm -r build`·`pnpm -r lint` 전부 통과. 자기 영역(`apps/font/frontend`, +`packages/ui` 읽기)만 수정, git 미실행.

## 라우팅
- KO=`/font/studio`(기존 `(ko)/studio`), EN=`/font/en/studio`(신규 `(en)/en/studio/page.tsx`).
- EN 페이지는 기존 `HandwritingStudio`(`(ko)/studio`)를 `locale="en"`으로 재사용 — 컴포넌트 단일 출처, KO/EN 공유.
- `lib/i18n.ts`에 `studioRoute(locale)`(ko=`/studio`, en=`/en/studio`)·`studioPath`·`studioAlternates` 추가. `LandingView`의 studio CTA가 locale별 경로로 연결(EN 랜딩→`/font/en/studio` 확인).
- `<html lang>`=en-US, canonical/hreflang(ko-KR·en-US·x-default) 정상. sitemap에 EN 스튜디오 + 양 언어 alternates 추가.

## 사전(dictionary)
- `lib/dictionaries/{ko,en}.ts`에 **`studio` 섹션 신설**(meta/chrome/head/scriptTabs/grid/refineAcc/status/resultTabs/advanced/actions/toast/cell/zoom/refine/hwPreview/hangulPreview/hwImage/hangulImage/imgOptions/letter/share/templates/sizes/bgKinds/sample/params/previewStyle/variation/fontPreview/sketch/specimen).
- ko가 타입 원본(`Dictionary = typeof ko`), `en: typeof ko`라 **키 누락 시 빌드 에러로 보장**. `{name}`/`{fmt}`/`{kb}`/`{c}`/`{n}`/`{seed}`/`{text}` 토큰은 컴포넌트에서 `.replace`로 치환.
- 인라인 한국어 상수 제거: `HandwritingStudio`의 `ENTRY`, `FontStudio`/`RefinePanel`/`ParameterPanel`/`PreviewStylePanel`의 라벨 맵, `LetterPanel`의 PAPERS/SIZES label, `InteractiveSpecimen`의 KO_LABELS(스튜디오 미사용·랜딩 전용 유지) 등.

## 컴포넌트 변경(모두 `t` 사전 prop 주입)
- HandwritingStudio(locale prop), FontStudio(t), RefinePanel, GlyphCell/GlyphZoomModal/GlyphCanvas(셀 aria), HandwritingPreview, HangulPreview, HandwritingImagePanel, HangulImagePanel, LetterPanel, ShareButton, VariationGallery, PreviewStylePanel, ParameterPanel, FontPreview, DrawingCanvas.
- 견본 텍스트(Aa/Hamburgefonstiv/한글 팬그램/예시 단어)는 타이포 견본 콘텐츠라 의도적으로 비번역 유지. JAMO_NAMES(자모 한글 명칭)도 본질상 한국어라 유지.

## 기본 선택 = 추천(하이브리드)
- `HandwritingStudio`의 `autofill` 초기값 `false→true`. 파생 `method = mode==="sample"?"sample":autofill?"quick":"full"`가 그대로 동작하므로 진입 시 **quick(몇 자만 그리기·추천) 카드가 aria-checked, autofill ON, 자동채움 태그 노출**. KO/EN 공통. 빌드 HTML로 quick 카드 aria-checked="true" 확인.

## 영어 톤
- 기계번역 X. 손맛=hand-feel, 다듬기=refine/tidy, 자동채움=auto-fill, 편지=letter, 짤=meme, 안전/정직=honest. "~너굴" 말장난은 EN에서 담백하게(예: "Got it!", "Draw a letter in the cells on the left.").

## 검증
- `pnpm install` → `pnpm -r build`(font `/studio`·`/en/studio` 정적 생성, 전 워크스페이스 OK) → `pnpm -r lint`(경고/에러 0).
- 빌드 HTML: `/en/studio` 영어 카피·EN 입구·quick 기본선택·`<html lang=en-US>`·canonical/hreflang 확인. `/studio` 한국어 회귀 없음. basePath(/font)·모바일 액션바·접근성(aria-label/role) 유지.

## 범위 밖(미터치)
- `s`(공유 뷰) 내부 문자열은 이번 범위 밖(스튜디오 컴포넌트 미사용·독립). `packages/core`의 STYLE_PRESETS·trendPresets 라벨은 무드 고유명이라 유지. engine/infra/docs/타 앱 미터치.
