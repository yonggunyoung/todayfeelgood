# Handoff — 폰트 플래그십 재정렬 (FE-Agent)

한 줄 결론: home 히어로/대표를 텍스트 이모티콘 → **폰트생성(손글씨)** 으로 되돌리고, 폰트 랜딩을 제네릭 AI 폰트 생성기와 구분되는 4승부처로 포지셔닝했다. `pnpm -r build`·`pnpm -r lint` 통과.

## 건드린 파일 (자기 영역만)
- `home/app/page.tsx` — 히어로/대표카드/메타데이터 재정렬.
- `home/app/home.module.css` — `.secondaryCard` 추가(강한 보조 카드).
- `apps/font/frontend/app/page.tsx` — 히어로 카피 + "왜 여기서" 4승부처 섹션.
- `apps/font/frontend/app/landing.module.css` — `.why*` 스타일.

## A. home 위계 (확정)
폰트(히어로 + 대표카드) > 이모티콘(강한 보조 카드, 테두리 강조) > 스티커/키트(그리드) > (details 접힘)싸인.
- 히어로 = "내가 직접 그린 글씨로, 진짜 내 글씨체", CTA "폰트공방에서 직접 그리기 → /font".
- 히어로 견본 카드 카오모지 4종 → 손글씨 견본(Aa/가나/Bb/안녕)으로 교체.
- 메타데이터 title/description/keywords를 손글씨 폰트 중심으로 갱신.
- 기존 링크(/textmoji, /sticker, /kit, /sign) 전부 유지, 안 깨짐.

## B. 폰트 랜딩 4승부처 (vs Kapwing류)
신규 "왜 여기서 만들까요" 섹션:
1. 진짜 내 손글씨 — AI가 만든 남의 글씨가 아니라 내가 그린 내 획, 흉내가 아니라 진짜 너.
2. 한글도 된다 — 자모를 그려 내 손글씨 한글(경쟁 AI 약점).
3. 결과물을 진짜로 써요 — 이미지 어디에나(설치0) + WOFF·TTF 폰트파일 + 공유링크 리믹스.
4. 무료·비AI·정직 — '진짜 내 글씨'와 공개폰트 변형 '빠른 시작 샘플' 구분 고지.
- 히어로 카피: "AI가 흉내낸 게 아니라 진짜 내 글씨" + 너굴이 톤("~너굴") 약간.

## 검증
- `pnpm install` OK / `pnpm -r build` 전 앱 성공 / `pnpm -r lint` 경고·에러 0.
- 모바일 그리드 반응형(@media)·basePath·접근성(aria-label) 유지. 이모지불릿/과장 없음.

## Blocker / Warning
- 없음. git 미수행(규칙 준수). packages/* 미수정(읽기만).
