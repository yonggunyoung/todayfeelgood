# Frontend 인수인계 — 손글씨 코어 (직접 그리기 메인)

**한 줄 결론:** `/font/studio` 메인을 "직접 그리기 → 내 손글씨 폰트"로 재편 완료. 글자 그리드·다듬기·실시간 프리뷰·BFF 프록시 모두 동작, `pnpm -r lint`/`pnpm -r build` 통과. 기존 슬라이더 스튜디오는 "빠른 시작 샘플" 보조 탭으로 강등(삭제 안 함).

## 변경 영역 (자기 폴더만: apps/font/frontend, packages 미수정)
- **BFF** `app/api/handwriting/route.ts` — 엔진 `POST /handwriting` 프록시.
  - 가드: content-length/본문 1.5MB 상한(413), glyph 살균(char 1글자만, 점 0..1 클램프, 빈 획/글자 드롭), 글자당 점수 MAX_STROKE_POINTS_PER_GLYPH 균등 솎기(끝점 보존, 서버측 2차 방어), MAX_TOTAL_GLYPHS 제한, refine REFINE_RANGES 클램프, format 정규화, 25s 타임아웃, 에러 살균(엔진 원문 비노출).
- **글자 그리드** `components/GlyphCell.tsx`(+css) — a–z 셀. 가이드선(어센더/캡/x-height/베이스라인/디센더). 포인터 경로를 **셀 정규화 0..1 폴리라인**으로 캡처(여러 획). 과샘플 솎기(MIN_DIST), 점수 상한 가드, 셀별 되돌리기/지우기.
- **다듬기** `components/RefinePanel.tsx`(+css) — RefineParams 슬라이더(smoothing/nib/taper/straighten/spacing), 범위 REFINE_RANGES. "0이면 날것, 올리면 정제" 안내.
- **프리뷰** `components/HandwritingPreview.tsx`(+css) — @font-face 등록 후 **그린 글자로만** 예문/알파벳 렌더(안 그린 글자는 흐리게 폴백 표시), 정직성 라벨(generatedBy:handwriting).
- **메인** `app/studio/HandwritingStudio.tsx`(+css) — 그리드+다듬기 → 700ms 디바운스 → `/api/handwriting` → 프리뷰. 진행률(n/26), 전체 지우기, 다운로드(WOFF/TTF, 풀포맷 안내), 모바일 하단 액션바, 데스크톱 sticky 프리뷰, reduced-motion. 너굴이 focused(굽는 중)·love(완성 토스트).
- **샘플 강등** `app/studio/FontStudio.tsx` — `embedded` prop 추가. HandwritingStudio의 "빠른 시작 샘플" 탭에서 헤드라인 없이 본문만 임베드. "기성 폰트 변형 샘플 — 진짜는 직접 그리기" 솔직 고지.
- `app/studio/page.tsx` 메타데이터 손글씨 방향으로 갱신. `app/page.tsx` 히어로/how 카피를 "직접 그리기" 중심으로 갱신(슬라이더는 보조 언급).

## 계약 정합성
- 엔진 응답 `{fontBase64, format, fontFamily:"MyHand-xxxx", generatedBy:"handwriting", glyphCount}` 그대로 소비. `@webapp/core`의 HandwritingRequest/Response/RefineParams/REFINE_RANGES/MAX_* 단일 출처 사용(core 미수정).
- basePath: fetch는 `apiPath()` 사용. 토큰은 @webapp/ui tokens(globals @import) 단일화 유지.

## Verify/Warning
- 엔진 없이도 빌드/lint 통과(확인됨). 실제 폰트 생성은 엔진 `/handwriting` 라이브 필요.
- 다운로드 포맷은 WOFF/TTF만 노출(FREE_FORMATS). WOFF2/OTF 풀포맷은 "곧 제공" 안내만.
- 한글은 다음 단계(현재 a–z 라틴 소문자만).
