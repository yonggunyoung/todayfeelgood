# Handoff — FE: 내 손글씨로 이미지/짤 만들기

**한 줄 결론:** 손글씨 스튜디오에 "PNG 이미지/짤 내보내기"를 추가해, 결과물을 폰트 파일이 아니라 **카톡/인스타에 바로 쓰는 이미지**로 만든다(회의적 검증관 must #3 해소). build·lint 통과.

## 한 것
- **문구 입력 + 필요 글자 안내**: 문구에 필요하지만 안 그린 a–z 글자를 `ㅁ · ㅁ 글자를 더 그리면 완성` 식으로 표시. 안 그린 글자는 이미지에서 자동 제외 → 적은 글자로도 결과(노동↓).
- **이미지 합성(Canvas 직접, 무거운 라이브러리 0)**: 생성된 손글씨 폰트를 별도 `FontFace`(family `HwImage-N`, 프리뷰 sheet와 충돌 회피)로 등록 → 캔버스에 문구 렌더 → PNG. 자동 줄바꿈/폰트크기 자동 축소(2패스). 결정적 렌더(색지결 노이즈도 좌표 기반 의사난수).
  - 옵션: 배경(투명/단색/색지결), 글자색·배경색·장식색(전부 `@webapp/ui` `sanitizeColor` 살균), 정렬(좌/중/우), 크기 프리셋(정사각1080·스토리1080×1920·스티커512·가로1200×630).
- **짤/스티커 템플릿**: `lib/imageTemplates.ts` 데이터 배열(말풍선/테두리 카드/밑줄 강조/그냥 글씨). `decorate(back|front)` 훅으로 글자 뒤·앞 장식. 새 템플릿 = 객체 1개 추가.
- **내보내기**: `canvas.toDataURL` → 투명/단색 PNG 다운로드(주력). 기존 WOFF/TTF 폰트 다운로드는 `<details>` "고급: 폰트 파일로 받기 (무한 재사용)"로 강등. "이미지는 어디든 바로, 폰트는 무한 재사용" 안내.
- **정직성/접근성**: "진짜 내가 그린 글씨로 만든 이미지", "색지결은 이미지 전용 효과(폰트 파일엔 안 들어감)" 라벨. 너굴 마스코트 활용. 투명배경 체커보드 미리보기. `aria-live`/`aria-pressed`/`role="img"`. `prefers-reduced-motion` 대응.

## 파일
- 신규: `apps/font/frontend/lib/imageTemplates.ts`, `components/HandwritingImagePanel.tsx` + `.module.css`
- 수정: `app/studio/HandwritingStudio.tsx`(패널 삽입·폰트받기 details화), `HandwritingStudio.module.css`(summary 스타일)

## 검증
- `pnpm install` → `pnpm -r lint`(✔ 전 워크스페이스) → `pnpm -r build`(✔, 엔진 없이 통과, font `/studio` 18kB).

## 경계
- `apps/font/frontend`만 수정. `packages/core`·engine·infra·docs 미수정. git 미실행.

## Warning / 후속
- 폰트는 클라이언트 `previewFont`(woff base64) 재사용 — 엔진 무관, 추가 호출 없음.
- 한글은 현재 라틴 a–z만 타깃이라 이미지도 라틴만(필요 글자 안내도 a–z 기준). 한글 코어 들어오면 안내/필터 확장 필요.
- 미세조정 nice: 폰트 baseline이 글자마다 달라 중앙정렬 미세 오차 가능(`textBaseline=middle`로 완화).
