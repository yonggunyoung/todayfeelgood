# 인수인계 — 싸인(서명) 생성기 MVP (`apps/sign`)

**한 줄 결론**: 이름 입력 → 무드 선택 → 흘림체 변형(폰트엔진 재사용) + 절차적 SVG 장식 → N종 변주 갤러리 → 투명 PNG/SVG 내보내기까지 한 화면에서 동작. 엔진 없이 build/lint 통과(실 생성은 엔진 필요).

## 한 일
- 신규 앱 `apps/sign/frontend` (`@webapp/sign-frontend`, basePath `/sign`, dev 포트 3003). 폰트앱 패턴 복제(globals.css 토큰·SiteChrome·layout·robots/sitemap·landing).
- **BFF** `app/api/generate/route.ts`: 폰트앱 BFF를 본떠 `ENGINE_URL`(기본 127.0.0.1:8000)의 `/generate`로 프록시. 항상 `format:woff`로 요청, 타임아웃 20s, 바디 상한 64KB, 에러 살균, `clampParams`. script latin/hangul 정규화.
- **엔진 재사용**: 새 Python 엔진 없음. 폰트 엔진이 준 변형 WOFF를 `FontFace`로 등록해 이름을 렌더.
- **서명다움 오버레이(엔진 밖 절차적 SVG)** `lib/overlay.ts`: 베이스라인 연결선·앞뒤 플러리시·밑줄 스트로크를 seed 결정적 베지어로 합성(`lib/rng.ts` mulberry32).
- **합성/내보내기** `lib/render.ts`: 자기완결 SVG(WOFF base64 `@font-face` 내장) + 오버레이 path 결합. SVG→canvas로 투명 PNG 래스터(2x/4x).
- **N종 변주 갤러리**: 같은 이름·무드에서 seed만 바꿔 9종, 주사위로 시드셋 변경, 클릭 선택.
- **무드 프리셋 6종**(`lib/signParams.ts`): 우아한 필기/날렵한 흘림/둥근 손맛/각진 모던/미니멀 밑줄/한글 흘림. FontParams 축 재사용 + 오버레이 묶음. `clampSign` 가드 포함.
- **UX**: 한 시야 2열(좌 컨트롤 / 우 sticky 프리뷰+내보내기), 모바일 단일컬럼·프리뷰 상단 sticky. 투명 체커 배경 미리보기. 너굴이 빈상태/완료 토스트("받았다 너굴.")·시크 보이스.
- **정직성 라벨**: "공개 가변폰트 변형 + 절차적 장식 = 서명 스타일, 진짜 한붓 자필 아님, AI 미사용, 브라우저 내 완결" 명시.
- **home 카드**: `home/app/page.tsx`에 "싸인공방" 카드 추가 → `/sign`.

## 검증
- 루트 `pnpm install` OK(9 workspace). `pnpm --filter @webapp/sign-frontend build` ✅ + `lint` ✅. `pnpm --filter home build` ✅.

## Blocker / Warning
- **Warning(계약 위치)**: `SignParams`/`SignStylePreset` 등이 idea-sign.md §7대로 `packages/core`에 아직 없어, 현재 `apps/sign/lib/signParams.ts`에 **로컬 정의**. `FontParams`/`clampParams`/`FontScript`만 `@webapp/core`에서 import. 정식화는 Shared-Agent가 core로 승격 필요.
- **Warning(글자 폭 근사)**: 서버 글리프 측정이 없어 오버레이 앵커 box를 글자수 기반으로 근사. 장식이 근사이므로 허용 범위지만, 정밀 정렬이 필요하면 opentype.js 등으로 폭 측정 도입 검토(무거운 의존성은 정책상 신중).
- **Warning(수익화 게이팅 미구현)**: MVP는 PNG 2x/4x·SVG 모두 다운로드 허용(워터마크 분기 코드는 `render.ts`에 존재하나 미사용). 무료/유료 게이팅·워터마크는 결제 추상화와 함께 후속.
- **Note(infra)**: nginx `/sign` 라우팅(포트 3003)·엔진 loopback 비노출은 Infra-Agent 영역(미수정).

https://claude.ai/code/session_017FwHb7Z9Ra78pVVbD323Mj
