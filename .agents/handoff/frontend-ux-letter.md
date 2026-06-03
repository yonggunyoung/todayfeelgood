# FE 인수인계 — UX 간편화·도우미·확대그리기·자동보정/채우기·편지

> 한 줄 결론: 스튜디오 정보 위계 정리 + 공용 `HelpTip` 도우미 신설 + 한 글자 확대 모달 + 자동 정리 프리셋/자동 채우기 토글 + 편지 모드까지 추가. `pnpm -r build`·`pnpm -r lint` 전부 통과. 자기 영역(`apps/font/frontend`, `packages/ui`)만 수정, git 미실행.

## 변경 요약

### P0 — 간편화 + 도우미
- **신규 공용 컴포넌트** `packages/ui/src/HelpTip.tsx`(+css): "?" 버튼 → 클릭 시 짧은 설명 팝오버. 접근성(aria-expanded/controls, role=dialog, ESC·바깥클릭 닫기, 포커스 이동), reduced-motion 대응. `@webapp/ui`에서 export.
- 스튜디오 곳곳에 HelpTip 배치: "글자 그리기"(확대 ⤢ 안내), "자동 정리", "자동 채우기".
- 다듬기 패널 재구성(`RefinePanel.tsx`): 핵심은 **"✨ 자동 정리" 쉬운 프리셋(날것/살짝/자동)** = smoothing+straighten 묶음. 세부 슬라이더(획두께·끝가늘기·자간 등)는 **"고급" 접기**로 강등 + 기본값 되돌리기. 조잡함 제거.

### P1 — 한 글자 확대 디테일 그리기
- 그리기 로직을 공용 `GlyphCanvas.tsx`로 추출(셀/모달 동일 코드, 좌표·가드 동일). `GlyphCell`은 이를 사용 + 우상단 ⤢ 버튼.
- 신규 `GlyphZoomModal.tsx`(+css): 큰 고해상도 캔버스, 같은 가이드선, 되돌리기/지우기, 실시간으로 셀에 반영. role=dialog·aria-modal·ESC·배경클릭·스크롤잠금.

### P1 — 자동 보정 / 자동 채우기
- 자동 보정 = 위 "✨ 자동 정리" 프리셋(슬라이더는 고급).
- 자동 채우기 = 스튜디오 토글 → BFF로 `autofill:true` 전달. **두 BFF 라우트(`/api/handwriting`, `/api/hangul-compose`)가 `autofill` 전달**(엔진 미지원이면 무시되는 graceful).
- 정직성: 엔진 응답에 `filledChars[]`가 오면 견본에서 **점선 강조 + "자동 채움(내 글씨 아님)"** 표기. 이미지/편지 honesty 문구도 autofill 시 정직 분기. (현재 엔진 응답 필드 없으면 빈 배열로 graceful.)

### P2 — 편지쓰기
- 신규 `LetterPanel.tsx`(+css): 편지지(크림/흰/민트/핑크/모눈, 줄·여백·색지) 위 긴 글 → 내 손글씨로 Canvas 렌더 → PNG. 기존 이미지 파이프라인(FontFace+Canvas) 재사용, 자동 줄바꿈. 라틴 결과 영역에 **"이미지·짤 ↔ 편지 쓰기" Segmented**로 전환.

## 엔진에 바라는 것(병행)
- `HandwritingResponse`/한글 응답에 **`filledChars: string[]`**(자동 채운 글자 목록) 추가 시 프론트가 즉시 정직 표기. 필드 없어도 동작은 깨지지 않음.

## 검증
- `pnpm -r build` OK(전 앱), `pnpm -r lint` OK(경고/에러 0). basePath·정직성 라벨 유지.

## 비고
- `packages/core`(계약) 미수정 — `autofill?`는 이미 존재. 다른 앱/engine/infra/docs 미터치.
