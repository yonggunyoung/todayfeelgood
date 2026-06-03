# FE 인수인계 — 스튜디오 진입 "만드는 방법" 3갈래 입구 (방향 B)

한 줄 결론: 스튜디오 상단에 **1스텝 3갈래 카드**(몇 자만 그리기·다 직접 그리기·안 그리고 빠르게)를 신설해 "어떻게 만들지" 첫 선택을 직관화. 추천(몇 자만 그리기)을 전면 강조하고 autofill과 연동, 카피는 ko/en 사전에 동시 추가. `pnpm -r build`·`pnpm -r lint` 전부 통과. 자기 영역(`apps/font/frontend`, +`packages/ui` 읽기)만 수정, git 미실행.

## 변경 요약

### 진입 입구 = 3갈래 카드 (1스텝, 언제든 변경)
- `HandwritingStudio.tsx` 헤더에 `fieldset` + `role="radiogroup"` 카드 3장:
  1. 🪄 **몇 자만 그리기 (추천·쉬움)** — 전면 강조(첫 칸 넓게 `1.25fr`, 상단 "추천·쉬움" 배지, 강조 보더). 선택 시 **autofill ON**.
  2. ✍️ **다 직접 그리기 (정성파)** — autofill OFF.
  3. 🎚️ **안 그리고 빠르게 (그리기 싫을 때)** — 기존 슬라이더 `FontStudio` 샘플 모드.
- 기존 2탭(`직접 그리기`/`빠른 시작 샘플` Segmented)과 별도 autofill 토글을 **이 입구로 통합** — 조잡함 제거, 결정 1회.
- 각 카드에 `HelpTip` 한 줄 설명(너굴이 톤). 라틴/한글 스크립트 전환(기존 Segmented)은 draw일 때 그대로 유지.

### autofill 연동 (source of truth 유지)
- `method`는 `mode`/`autofill` **위의 파생 UI**. `mode/autofill`이 단일 출처라 기존 흐름(디바운스 생성, BFF `autofill` 전달, `filledChars` 정직표기, 이미지/편지)이 **그대로 동작 — 회귀 없음**.
  - `method = mode==="sample" ? "sample" : autofill ? "quick" : "full"`
  - `chooseMethod(m)`: sample→`setMode("sample")`, quick→draw+autofill ON, full→draw+autofill OFF.
- quick 선택 시: 입구 아래 **정직 안내**("안 그린 글자는 자동으로 채워요(내 글씨 아님)") + 그리드 액션줄에 "🪄 자동 채움 켜짐" 태그.

### 카피 ko/en
- `lib/dictionaries/{ko,en}.ts`에 `studioEntry`(legend/hint + quick/full/sample의 emoji·badge·title·desc·help·honesty) **동일 키로 양쪽 추가**(en 타입 = ko라 키 누락 시 빌드 에러로 보장).
- 스튜디오는 현재 i18n 비대상(KO 고정)이라 렌더는 컴포넌트 내 `ENTRY` 상수(ko값)로 인라인. EN 전환 시 사전 키 그대로 연결 가능.

### 스타일/접근성
- `HandwritingStudio.module.css`에 `.entry*` 추가: 모바일 1열, hover lift, focus-visible 링, reduced-motion 영향 없음(transition만), `role=radio`/`aria-checked`.

## 범위 밖(미터치)
- 전문 풀스펙(대문자/숫자/문장부호·커닝·메타) 보강 안 함(B 아님). 새 무거운 기능 없음 — 기존 기능 재배치/연결만.
- engine/infra/docs/`packages/core`/타 앱 미터치.

## 검증
- `pnpm install` → `pnpm -r build`(font `/studio` 27.4kB 정적 생성 OK, 전 앱 OK), `pnpm -r lint`(경고/에러 0). ko/en 사전 키 일치, autofill 토글이 선택과 연동, basePath·정직성 라벨 유지.
