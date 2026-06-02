# FE-Agent 인수인계 — Phase 2b

**한 줄 결론:** Critique2 Blocker(인디고 악센트·대비 미달·다크 누락·휑한 홈) 전부 해소 + 심화 컨트롤/변주 갤러리/이미지 효과(PNG) 구현. build/lint green.

## Blocker / Warning
- **Blocker(해결):** route.ts가 `@webapp/core`에서 `MAX_IMAGE_PNG_BYTES`를 import했으나 계약 v4(고정)에 미존재 → 빌드 실패 상태였음. 코어를 못 건드리므로 BFF 로컬 상수(2_000_000, 엔진 main.py와 동일)로 대체해 해결.
- **Warning:** 코어가 export하지 않는 상수를 BFF가 참조하던 구조라, 향후 코어에 추가되면 import로 되돌릴 것(현재는 의도적 로컬 복제 + 주석).

---

## P0 — AI 냄새 제거

### 1. 악센트 전면 교체 (인디고 → 감빛 테라코타 코랄)
보라/파랑/인디고/페리윙클 폐기. 새 토큰(라이트):
- `--accent: #c0492b` (감빛 테라코타) — **흰 텍스트 대비 4.97:1 (AA 통과)**
- `--accent-press: #993a1e` (눌림 + 연한 면 위 텍스트 겸용)
- `--accent-weak: rgba(192,73,43,0.14)`, `--accent-weak-strong: rgba(192,73,43,0.2)` (hover)
- `--accent-ink: #ffffff` (악센트 면 위 흰 글자)
- **신규 `--accent-ink-weak: #993a1e`** — 칩/슬라이더 값/태그/링크 등 **연한 악센트 면 위 텍스트**. 대비: weak 칩 위 5.8:1, surface-2 위 6.1:1, surface 위 7.0:1 → 전 표면 AA 통과(B2/B3 해소).
- `--ink-faint: #6b6875` — surface-2 위 **4.71:1**, surface 위 5.44:1, bg 위 4.99:1 (전 표면 AA, ink-faint Blocker 해소).
- 캔디 보조색 새 악센트와 조화: coral `#ef7a52`, mint `#46b39a`, butter `#f5c451`, **plum `#b65a6e`**(보라성 lavender 폐기·Mascot 미사용 확인).
- favicon HEX `%235b6cf0` → `%23c0492b`.
- 적용처: 글로벌 `a`, Button.soft, Chip 값, Slider 값칩, Card 태그, FontPreview .live, seedBtn, landing eyebrow/secondary/howCta, home eyebrow/CTA 등 전부 `--accent-ink-weak`로 통일.
- 큰 디스플레이 텍스트(InteractiveSpecimen .glyphLine2, glyphLine2=clamp 1.6~3rem)만 `--accent` 유지(대형 텍스트 AA 3:1 충족, 4.97:1).

### 2. 다크모드 토큰 구현
두 앱 globals.css에 `@media (prefers-color-scheme: dark)` 블록 동기화. 따뜻한 슬레이트 + 밝은 코랄:
- bg `#1a1714` / surface `#241f1b` / surface-2 `#2e2823`
- accent `#ff8a5f`(어두운 배경 대비 7:1), accent-ink `#241f1b`(밝은 면 위 어두운 글자 7:1), accent-ink-weak `#ff8a5f`(weak 칩 위 4.6:1)
- ink `#f3efe9` / ink-soft `#c2bbb1` / ink-faint `#9c948a`(surface-2 위 4.8:1)
- **`--material-bg: rgba(26,23,20,0.72)`** → 블러 헤더가 다크에서 흰 띠로 깨지지 않음(W7 해소). shadow/clay/inset도 다크용 재정의.

### 3. 홈 보강 (휑함·단일컬럼 클리셰 탈피)
`home/app/page.tsx` 재구성:
- (a) **스타일 샘플 카드**: 히어로 우측 비대칭 2열에 "차분/발랄/우아/거침" 4종 견본(같은 도구의 다른 표정). 시스템 글꼴 흉내 + aria-label 정직 고지.
- (b) **너굴이 소개 섹션**: 색지 배경 면 분리 + 큰 마스코트(104px) + 소개 카피.
- (c) **도구 섹션**: 더미 "준비 중" 카드 → 실 카드 1개 + 가라앉은 "다음 작업대" 안내 면으로 정리(균등 카드 반복 탈피).

---

## P1 — 심화 컨트롤 ([REAL])
`ParameterPanel.tsx`를 의미 그룹으로 재편: **기본 골격**(굵기/기울기/자간) · **곡선·형태**(곡률/모노/필기체/둥근끝 roundness/획대비 contrast) · **손맛**(구불구불 waviness + 물결주기 waveFreq + 괴상함 weirdness + 시드).
- waviness 0이면 "곧게", waveFreq는 waviness=0일 때 비활성(disabled).
- 모두 계약 v4 `PARAM_RANGES` 단일 출처에서 범위/step. 한글 모드 LATIN_ONLY(곡률/모노/필기체) 숨김 유지.
- **무드 프리셋**: 계약 `STYLE_PRESETS` 9종 칩 그대로 적용(activePreset 일치 강조 유지).
- **변주 갤러리(9분할)** `VariationGallery.tsx`: 버튼 트리거 → 현재 params 기준 9종(1번칸=원본, 나머지 seed+weight/slant/curvature/waviness/weirdness 결정적 흩뿌림) 생성 → 3×3 라이브 프리뷰(FontFace 등록) → 칸 클릭 시 그 params 적용. **동시요청 throttle=3** (오라클 무료티어 의식). 언마운트/재생성 시 FontFace 정리.

## P2 — [PREVIEW] 이미지 전용 효과 (정직 분리)
`PreviewStylePanel.tsx` + FontPreview 확장:
- `PreviewStyle`(texture grain/paper/rough · pattern stripe/dots/grid · inkColor · bgColor). **엔진 미전송** — FontStudio state로만 보유, /generate payload에 미포함(BFF는 기존대로 params/script/format만 포워딩).
- 프리뷰 표면에 질감(SVG feTurbulence data-URI ::after) + 무늬(CSS background) + 글자색/배경색 적용.
- **"이미지 전용 · 폰트 파일 미포함" 배지** 패널 상단 명시.
- **"이미지로 저장 (PNG)" 버튼**(FontPreview 내, 폰트 다운로드와 별도 행): 등록된 생성 폰트로 캔버스(1200×675)에 견본 렌더 + 무늬/질감/색 적용 후 PNG 저장. 투명 배경 지원.
- 다운로드 그룹 제목 "폰트 받아 가기"로 명확화(폰트 vs 이미지 분리).

## 정합/품질
- 정직성 라벨("공개 폰트 변형") 유지. honesty pill → `--r-lg` + flex-start(W5 모바일 2줄 깨짐 해소).
- 접근성: 변주 셀/스와치/칩 aria-pressed·aria-label·focus-visible, reduced-motion 분기 전부 포함. 모바일 1열 반응형 유지.
- basePath: 갤러리 fetch도 `apiPath()` 사용. 홈 링크는 기존 `<a href="/font">` 규칙 유지.

## 검증
- 루트 `pnpm install` → `pnpm -r build` **green**(엔진 없이 타입/정적생성 통과), `pnpm -r lint` **green**(no warnings/errors).

## 남은 권고(범위 밖/후속)
- `MAX_IMAGE_PNG_BYTES`를 계약(packages/core)에 정식 export하면 BFF 로컬 상수 제거 가능(Shared-Agent 경유).
- 변주 갤러리는 엔진 가동 시에만 셀이 채워짐(엔진 없으면 셀 error 표시 "—"). e2e는 Verify가 엔진 띄우고 확인 필요.
