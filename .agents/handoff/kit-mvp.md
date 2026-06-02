# Handoff — 키트공방(브랜드 키트 조합기) MVP

**한 줄 결론:** `apps/kit/frontend` 신규 앱(서버0, 폰트는 엔진 재사용) — 브랜드명+무드+악센트색 → 조화 팔레트 자동 + 라이브 시트 미리보기 + 키트 ZIP(폰트 woff/ttf + palette.css + font-face.css + preview.png + README/LICENSE). build·lint·home 빌드 통과.

## 무엇을 만들었나 (자기 영역: apps/kit/ + home 카드 1개)
- `apps/kit/frontend` (package `@webapp/kit-frontend`, basePath `/kit`, port 3003). 폰트·스티커앱과 동일 패턴(config/globals/SiteChrome/landing/robots/sitemap 미러).
- BFF `app/api/generate/route.ts` = 폰트앱 프록시 그대로 복사(엔진 `/generate` 재사용, CORS 회피·엔진주소 은닉·413/타임아웃 가드). **kit 전용 엔진 없음.**
- 핵심 로직 lib:
  - `palette.ts` — 악센트 1색 → HSL 규칙(유사색·보색·명도변주)으로 4~5색 조화 팔레트 + 잉크/배경 자동. 비AI·클라 계산. 프리셋 악센트 6종 + 컬러피커.
  - `presets.ts` — 무드 프리셋은 `@webapp/core` STYLE_PRESETS 재사용(단일 출처), 프리셋 키트 템플릿 4종(카페/청첩장/셀러/스튜디오) 1탭 적용.
  - `sheet.ts` — FontPreview Canvas→PNG 경로 일반화: 브랜드명 로고 + 팔레트 칩 + 알파벳/숫자 견본 한 장 합성. FontFace 등록 후 생성폰트로 렌더. highRes(2x)·워터마크 옵션.
  - `kitfiles.ts` — palette.css(:root --brand-*)/font-face.css(@font-face+예시)/README.txt/LICENSE.txt 문자열 빌더. **정직성·OFL 고지 포함.**
  - `zip.ts` — 스티커앱 자체 ZIP(STORE+CRC32, 외부 의존성 0) 참고, **텍스트+base64 바이너리 혼합 엔트리**로 일반화(폰트/CSS/README 함께 묶음).
- `app/studio/KitStudio.tsx` — 한 시야 2열(좌 컨트롤 아코디언식 패널 / 우 sticky 시트+받기 버튼), 모바일 단일컬럼. 무드/스크립트 변경 시 엔진에서 woff 미리보기 폰트 받아 시트 갱신(디바운스), 받기 시 선택 포맷 전부 받아 ZIP.
- `home/app/page.tsx` — "브랜드키트" 카드 1개 추가 → `/kit` (기존 패턴, 그 외 변경 없음).

## 수익화 게이트 (코드 반영)
- 무료: FREE_FORMATS(woff/ttf) + 워터마크 시트 + 개인·비상업 라이선스.
- 상업용 토글: FULL_FORMATS(woff/woff2/ttf/otf) + 고해상(2x) 시트 + 워터마크 제거 + 상업 라이선스 고지. (core의 FREE_FORMATS/FULL_FORMATS 재사용)

## 정직성·라이선스 (유지됨)
- 시트 워터마크, footer/honesty 문구, README·LICENSE에 "공개 가변폰트(OFL Recursive/Pretendard) 변형 · 비AI · 실제 자필 아님 · generatedBy: baseFontVariation" 고지. OFL 핵심 준수사항(고지 동봉, 단독판매 금지) 명시.

## 검증
- `pnpm install` (10 projects 인식) OK.
- `pnpm --filter @webapp/kit-frontend build` ✓ (타입체크 포함), `lint` ✓ (0 warnings).
- `pnpm --filter home build` ✓ (카드 추가 후도 정상).
- 스모크: ZIP CRC32 = 0x3610a686("hello", 레퍼런스 일치), 팔레트 HSL 변환 검증.

## 경계 준수 / 미수정
- apps/font·sticker·sign, packages/*, infra, docs, CLAUDE.md **미수정**(읽기만). git 미사용.
- packages/core 키트 계약(BrandKit 등)·packages/kit-spec은 **추가하지 않음**(쓰기 금지 영역). kit 로컬 lib로 자급. 후속에서 Shared-Agent 경유로 승격 가능.

## Blocker / Warning
- **Blocker 없음.**
- Warning: ZIP/시트/폰트요청은 전부 브라우저+엔진 의존. 엔진 미가동 시 시트는 시스템폰트 폴백·안내문구로 degrade(받기 시 재시도). e2e(실제 ZIP 열기)는 브라우저 런타임 검증 필요 — 빌드/타입/CRC 스모크까지 확인.
- Warning(후속): `infra/nginx`에 `/kit` 라우팅 추가 필요(경계 밖 — Infra-Agent). 컬러피커는 키보드 접근 OK이나 그리기 입력은 미도입(비드로잉 경로로 키트 완성 가능 — plan 충족).
