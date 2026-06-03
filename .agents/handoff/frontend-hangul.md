# 인수인계 — FE: 한글 자모 손글씨(조합 음절 이미지)

**한 줄 결론:** 스튜디오에 라틴↔한글 스크립트 전환을 넣고, 기본 자모 24자 그리드 → `/api/hangul-compose` 프록시 → 그린 자모로 음절을 조합한 한글 문구 이미지(PNG)까지 동작. `pnpm -r build` + `pnpm -r lint` 통과(엔진 없이도). 라틴 모드 회귀 없음.

## 한 일
- **스크립트 전환**: `HandwritingStudio` 그리기 모드 상단에 `Segmented`(영문 a–z ↔ 한글 자모). 라틴/한글 그리드 맵을 분리(`glyphMap`/`jamoMap`)해 섞이지 않음. 라틴 폰트 디바운스 생성 effect는 `script==="latin"`일 때만 동작.
- **자모 그리드**: `BASIC_JAMO`(자음14+모음10=24) 셀. `GlyphCell` 재사용 + `script="hangul"`(정사각 칸·중앙 십자 가이드선), `labelName`(접근성: 기역/니은…/아/야…). 진행률 `n / 24`.
- **한글 견본**: `components/HangulPreview.tsx` — 그린 자모로 완성 가능한 견본 단어(안녕·사랑·오늘…)만 골라 엔진 합성 폰트로 렌더. 24 자모 칸은 그린 것 진하게/안 그린 것 흐리게.
- **한글 문구 이미지**: `components/HangulImagePanel.tsx` — 문구 입력 → 디바운스 → `/api/hangul-compose`로 그린 자모 + text 전송 → @font-face 등록 → Canvas 렌더 → PNG(투명/단색/색지결·SNS 크기·짤 템플릿). 라틴 `HandwritingImagePanel`/`imageTemplates` 패턴·CSS 모듈 재사용.
- **필요 자모 안내**: `lib/hangul.ts` — 음절→기본 자모 분해(쌍자음/겹모음/겹받침은 기본 자모 조합으로 근사). 문구에 필요한데 안 그린 자모를 표시해 "적은 입력 유도", 미완 음절은 이미지에서 제외.
- **BFF**: `app/api/hangul-compose/route.ts` — 엔진 `/hangul-compose` 프록시. handwriting BFF 패턴(content-length/본문 크기 가드, char∈BASIC_JAMO 살균·중복 제거, 점 좌표 클램프·균등 솎기, refine 클램프, text 길이 200 상한, 25s 타임아웃, 에러 살균).
- **정직성**: 견본/이미지/토글 힌트에 "기본 자모를 그려 음절을 조합한 글씨(조합 티가 있을 수 있어요)" 명시. 너굴이 마스코트·`prefers-reduced-motion`·aria-live·모바일 레이아웃 유지.

## 계약/전제 (Engine-Agent 확인 필요)
- 엔진 `POST /hangul-compose` 요청 = `HangulComposeRequest{ jamo, text, refine, format }`, 응답 = `HandwritingResponse{ fontBase64, format, fontFamily, generatedBy, glyphCount }`.
- **합성 폰트는 요청 `text`의 음절을 cmap에 포함**해야 프론트 @font-face 렌더가 동작(프론트는 text를 그대로 캔버스에 그림).
- 엔진 미가동 시 한글 이미지/견본은 "조합 중…/대기" 빈 상태로 안전 폴백(에러 살균). 라틴 경로 영향 없음.

## Blocker
- 없음(엔진 없이 build/lint 통과). 단, 실 렌더 e2e는 엔진 `/hangul-compose` 가동 후 Verify 필요.

## Warning
- 한글 폰트 파일 다운로드 UI는 미제공(한글은 이미지 중심). 폰트 파일 받기는 라틴 전용으로 유지.
- 자모→음절 근사 분해는 안내·견본 필터 용도일 뿐, 실제 조합 품질은 엔진 책임.
