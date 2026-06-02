# 인수인계 — 스티커공방 MVP (apps/sticker)

**한 줄 결론:** 한 번 그리면 표정·색·테두리·짤 캡션 변주 12종을 자동 생성해 투명 PNG(개별/ZIP)로 받는 비AI·서버0 스티커 앱 신규 추가. 빌드·린트 통과, 라우트 200 확인.

## 무엇을 만들었나
- 신규 앱 `apps/sticker/frontend` (`@webapp/sticker-frontend`, Next.js App Router, basePath `/sticker`, env로 덮어쓰기 가능). 워크스페이스 `apps/*/frontend`에 자동 포함.
- `home/`에 "스티커공방" 카드 1개 추가(`/sticker`로 이동). 홈 그리드를 2열 동일폭으로(기존 placeholder 카드 대체). 그 외 홈은 최소 변경.
- **engine 폴더 없음** — 모든 생성은 브라우저 Canvas에서.

## 핵심 동작
- **그리기**: `components/SketchCanvas.tsx` 자체 구현(packages/ui 미사용 — 충돌 회피). 마우스/터치, 펜 색 6종·굵기 슬라이더·지우개·전체 지우기. 흰 배경에 그리고, 변주 시 흰색은 투명 처리.
- **변주 N종**: `lib/generate.ts` + `lib/render.ts`. 입력 1장 → `cropToContent`로 내용만 잘라 투명화 → 감정 12종 각각에 표정 파츠(눈/입/데코 절차적 Canvas 드로잉)·색조 틴트·둥근 배경칩·알파 외곽선·캡션 합성. 얼굴 앵커는 본체 상단 영역 자동 배치.
- **다양성·의외성(해자)**: 감정 12 × 팔레트 6 × 밈 템플릿 4 × 시드 흔들기 = 곱연산. `lib/rng.ts` mulberry32 시드 기반 → 재현 가능. 주사위("다른 조합") 버튼이 시드를 바꿔 새 세트 발견. CRC32/RNG 로직 단위 스모크 통과.
- **밈·트렌드 템플릿**: `lib/presets.ts`의 `EMOTION_PRESETS`/`COLOR_PALETTES`/`MEME_TEMPLATES`/`SHARE_PRESETS` 전부 **데이터 배열** → 항목 추가만으로 확장(코드 수정 불요). 짤 캡션(굵은 외곽선), 둥근 칩, 위/아래 캡션 등.
- **내보내기**: 개별 투명 PNG 다운로드 + 전체 **ZIP**(외부 의존성 0, `lib/zip.ts` STORE 방식 자체 구현 + CRC32). 크기 프리셋 512/360/128.
- **정직성/토스**: "AI 아님 · 절차적 자동 합성 · 그림은 브라우저 밖으로 안 나감" 라벨 명시. 앱 내 완결, 외부 유출 없음.

## 디자인
- `app/globals.css`는 폰트앱 토큰을 **동일 키로 복제**(--accent 테라코타 등) → `@webapp/ui` 공유. 너굴이 Mascot 활용(빈상태=sleepy, 완료/소개=love). 소프트 iOS 문방구 톤. 한 시야 2열(데스크톱: 좌 그리기/컨트롤 + 우 sticky 갤러리), 모바일 세로 적층. 투명 확인용 체커보드 배경.

## 검증
- `pnpm install` (8 워크스페이스 인식) → `pnpm --filter @webapp/sticker-frontend build` ✅, `lint` ✅(경고0), `@webapp/home build` ✅.
- prod 서버 라우트: `/` `/studio` `/robots.txt` 모두 200, SSR 콘텐츠 렌더 확인.
- 핵심 로직(CRC32 known-vector, RNG 결정성/시드민감) 헤드리스 스모크 통과.

## Warning / 후속
- 브라우저 실제 그리기→다운로드 클릭 흐름은 자동화 브라우저 도구 부재로 수동 확인 권장(로직·SSR·빌드까지는 검증됨).
- APNG/WebP 모션은 MVP 미포함(정지 PNG 기준). `MotionKind`는 데이터에 정의해 둠(후속 인코딩 시 활용).
- 공유 규격 px/용량 수치는 가정 — 배포 전 각 플랫폼 가이드 재확인 필요.
- `infra/nginx` `/sticker` 라우팅 추가는 Infra-Agent 영역(본 작업 범위 밖).
