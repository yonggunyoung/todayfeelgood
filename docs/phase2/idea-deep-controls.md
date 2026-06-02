# 심화 컨트롤 — "글자 만들기를 훨씬 다양하게" 실현 스펙 (Phase 2 아이디어)

> 작성: 심화 컨트롤 아이디어 에이전트 / 코드 수정 없음 / 설계 제안서
> 대상 코드 근거: `packages/core/src/index.ts`(계약 v3: weight/slant/curvature/mono/cursive/weirdness/seed/letterSpacing) · `apps/font/engine/generator.py`(VF 인스턴싱 → 서브셋 → `_transform_glyf_coordinates`의 시드 펜 지터+베이스라인 wobble+합성 shear → hmtx 자간) · `apps/font/frontend/components/{DrawingCanvas,ParameterPanel}.tsx`
> 마스터 요구(취지): 더 세밀한 디자인 / 그리면서 **획 자체의 굵기·두께·질감** 조절 / **획 안의 무늬** / **구불구불** / **감성 옵션** / 틀을 깬 트렌드. **단 기본기(가독)는 유지.**

---

## 한 줄 결론
**구불구불(wavy)·획 대비(contrast)·감성 슬라이더**는 지금 엔진 구조(인스턴싱 후 glyf 좌표 직접 변형 = 이미 있는 펜 단계)에 그대로 얹혀 **진짜 폰트 파일에 구워지는 [REAL]** 이고 즉시 빌드 가능하다. 반면 **획 질감·무늬는 벡터 폰트에 못 굽는다 — 프리뷰/PNG 이미지·스티커로 정직하게 분리**하고, **그리면서 획 조절(브러시)** 은 글리프 캡처(Wave D) 경로의 입력 품질 단계로 묶는다.

## 지금 바로 빌드할 [REAL] TOP 3
1. **구불구불 `waviness` + `waveFreq`** — `_transform_glyf_coordinates`에 사인 워프 한 블록 추가. weirdness(랜덤 손맛)와 직교하는 **결정적(규칙적) 파형**. 가장 적은 코드로 가장 큰 "다른 글씨" 체감.
2. **획 대비 `contrast`** — y(세로) 성분에 비례한 가로 좌표 스케일로 가로획↔세로획 굵기차를 근사. wght와 합쳐 캘리그래피/패션 느낌. 같은 펜 단계 1패스.
3. **감성 슬라이더 2축**(`차분↔발랄`, `부드러움↔거침`) + STYLE_PRESETS 세분화 — 신규 알고리즘 0, 기존 축을 묶어 1~2개의 상위 노브로. 초심자 체감 최상, 슬라이더 무서움 제거.

> 위 셋은 전부 **출력 WOFF/TTF에 영구히 반영**된다(이미지 효과 아님). 사용자에게 "진짜 폰트" 라벨로 정직하게 표시.

---

## 1. 실현성 분류표

라벨: **[REAL]** 폰트파일에 구움 / **[PREVIEW]** 프리뷰·PNG/SVG 이미지로만 / **[CAPTURE]** 드로잉 글리프 캡처(Wave D) 필요 / **[SVGFONT]** COLR·SVG-in-OpenType(렌더 제약).
난이도 1(쉬움)~5, 가치 1~5(체감).

| # | 항목 | 라벨 | 난이도 | 가치 | 계약 필드(제안) | 비고 |
|---|---|---|---|---|---|---|
| 1 | 구불구불 wavy(사인 워프) | **[REAL]** | 2 | 5 | `waviness 0~1`, `waveFreq 0.5~6` | 펜 단계 1블록. weirdness와 직교 |
| 2a | 굵기 wght(기존) | [REAL] | – | – | `weight`(이미 있음) | 가변폰트 축 |
| 2b | 획 대비 contrast | **[REAL]** | 3 | 4 | `contrast 0~1` | y비례 가로 스케일 근사 |
| 2c | 끝모양 라운드 roundness | [REAL] | 4 | 3 | `roundness 0~1` | 코너 베지어화. 후순위 |
| 2d | 스트로크 확장/축소(외곽선 오프셋) | [REAL] | 5 | 3 | (자체 노출 안 함) | wght로 대체 권장. §2 정직성 |
| 3a | 획 질감 texture(그레인/거친 잉크) | **[PREVIEW]** | 2 | 4 | `texture`(프리뷰 전용 표식) | feTurbulence/노이즈, PNG로만 |
| 3b | 획 안 무늬 pattern(줄무늬/도트/그라데이션 채움) | **[PREVIEW]** | 2 | 4 | `fillStyle`(프리뷰 전용) | SVG fill/그라데이션. PNG/스티커 |
| 3c | 컬러 글리프로 폰트에 굽기 | [SVGFONT] | 5 | 2 | – | COLRv1/SVG, 렌더 지원 한계 큼 |
| 4 | 그리면서 획 조절(브러시 다이내믹스) | **[CAPTURE]** | 4 | 5 | (Wave D 입력 단계) | 지금은 스케치, 다음은 글리프화 |
| 5 | 감성 옵션(무드 상위 노브) | **[REAL]** | 1 | 5 | `mood`(프리셋) + 감성 슬라이더 | 기존 축 묶음. 알고리즘 0 |
| 6a | 변주 갤러리(9분할) | [REAL] | 2 | 5 | seed/params 배열(클라) | 폰트 N개 생성. 강력 |
| 6b | 랜덤 서프라이즈 | [REAL] | 1 | 4 | seed+params 무작위 | 주사위 확장 |
| 6c | 글자별 개별 변형 | [REAL] | 3 | 3 | `perGlyph` 맵 | 글리프별 시드/오프셋 |
| 6d | 캔버스 직접 드래그/왜곡 | [PREVIEW]→[REAL] | 4 | 4 | warp 핸들 → params | 워프 envelope |
| 6e | 그라데이션/컬러 스페시먼 | [PREVIEW] | 1 | 3 | (CSS/캔버스) | 견본 이미지·공유카드 |
| 6f | 모션 스페시먼(움직이는 견본) | [PREVIEW] | 2 | 3 | (CSS anim/GIF) | 폰트 아님. 공유·SNS |

---

## 2. 항목별 상세 + 정직성

### 1) 구불구불 wavy — [REAL] (TOP)
- **원리**: 인스턴싱·서브셋 후 glyf 좌표에 사인 변위. 현재 `_transform_glyf_coordinates`가 점마다 `(x,y)`를 순회하므로, 그 안에 한 블록만 추가하면 된다.
  - 가로 출렁임: `nx += amp * sin(2π * waveFreq * y / upem + phase)` (세로를 따라 좌우로 휨)
  - (옵션) 세로 출렁임: `ny += amp * sin(2π * waveFreq * x / upem + phase)`
  - `amp = waviness * 약 40~60 units`(EM 1000 기준), `phase`는 글리프 시드(`_glyph_seed_rng`)에서 뽑아 글자마다 위상차 → 줄 전체가 물결.
- **weirdness와 관계**: weirdness = **랜덤 지터(불규칙·손떨림)**, waviness = **규칙적 사인(의도된 물결·리듬)**. 직교 개념이므로 **별도 슬라이더**로 둔다(섞지 않기). 둘 다 펜 단계라 같은 패스에서 합성 적용 가능.
- **계약**: `waviness: 0~1, step .05, def 0` / `waveFreq: 0.5~6, step .5, def 2`. 0이면 완전 스킵(정형 유지 = 기본기 보존).
- **정직성**: 진짜 폰트에 구워짐. "그대로 다운로드돼요" OK.

### 2) 획 굵기·대비·끝모양 — [REAL/일부 난이도]
- **굵기(2a)**: 이미 `weight`→wght 축 매핑 존재. 추가 작업 없음.
- **대비 contrast(2b)** [REAL]: 진짜 대비(가로획만 얇게)는 획 방향 분석이 필요해 어렵지만, **근사**는 실용적이다. 글리프 무게중심 기준으로 **세로 성분(주로 세로획)은 가로 두께 유지, 가로 성분은 축소**하는 대신, 간단히 **x좌표를 무게중심 기준 비대칭 스케일**하거나, wght를 올린 뒤 **수평 방향만 살짝 압축**해 세로획↔가로획 굵기차를 만든다. 패션/매거진/캘리 느낌. `contrast: 0~1`.
  - 한계 정직: "방향성 있는 진짜 모듈 대비"가 아니라 근사. 과하면 가독 저하 → max를 보수적으로(0.6 권장).
- **끝모양 라운드 roundness(2c)** [REAL, 후순위]: 코너 점을 베지어로 깎아 둥근 펜촉 느낌. CASL(curvature)과 별개의 "진짜 둥글기". 구현 난이도 4 → Wave 후반.
- **외곽선 오프셋(스트로크 확장/축소, 2d)**: fontTools에 범용 outline-offset이 없어 직접 구현은 난이도 5(자기교차·구멍 처리). **wght 축이 사실상 같은 체감**을 무료로 주므로 **자체 노출하지 않고 weight로 대체** 권장. → 사용자에게 "굵기"로 통합 제시(정직: 별도 기능인 척 안 함).

### 3) 획 질감·무늬 — [PREVIEW] (정직성 핵심)
- **벡터 폰트의 한계**: WOFF/TTF의 glyf/CFF는 **단색 채움 외곽선**이다. 종이 그레인, 거친 잉크, 줄무늬·도트·그라데이션 채움은 **폰트 파일에 담기지 않는다.** 담으려면 [SVGFONT](COLRv1/SVG-in-OpenType)인데 **렌더 지원이 들쭉날쭉**(워드/한글·구형 뷰어·많은 디자인툴 미지원)하여 "다운받았는데 무늬가 안 보임" 사고가 난다 → MVP 부적합.
- **실용 해법(권장)**: 무늬·질감은 **프리뷰와 PNG/SVG 내보내기에서만** 적용한다.
  - 프리뷰: 텍스트를 SVG로 렌더 → `feTurbulence`(그레인)·`pattern`/`linearGradient` fill을 글자에 입힘. 캔버스로 PNG 합성.
  - 산출물: **"스티커/이미지 내보내기"** (PNG·SVG). 로고·SNS·굿즈용. 폰트 다운로드와 **버튼·라벨을 분리.**
- **계약**: 폰트 params에 넣지 말고 **프리뷰 전용 상태**로 분리(`PreviewStyle { texture, fillStyle, color, gradient }`). 폰트 생성 요청 바디에 섞지 않음(엔진 부담 0·재현성 유지).
- **정직성 고지(필수)**: 이 효과들 옆에 **"이미지 전용 효과 — 폰트 파일에는 포함되지 않아요"** 배지. 다운로드 버튼을 "폰트(WOFF) 받기"와 "이미지(PNG) 받기"로 나눠 혼동 차단. (토스 대비: 앱 내 완결, 외부로 보내 다운로드 강요 금지.)

### 4) 그리면서 획 조절(브러시 다이내믹스) — [CAPTURE]
- 현재 `DrawingCanvas`는 고정 `lineWidth=4`·"미반영" 라벨. 속도·필압 가변 브러시·텍스처 브러시를 캔버스에 넣어도 **지금 파이프라인은 그림을 0% 반영**하므로 "예쁜 스케치"에 그친다.
- **단계적 경로**:
  - **(now) 스케치 고도화**: Pointer Events의 `pressure`/속도로 `lineWidth` 가변(빠르면 얇게)·끝맺음 테이퍼. 손맛 나는 입력 경험 + 그대로 PNG 내보내기(3과 합류 → 이미지 산출물).
  - **(next) 글리프화 [CAPTURE]**: `idea-handwriting.md`의 글리프 직접 캡처(그리드 캔버스 → Potrace → fontTools 주입)와 합류. 이때 브러시로 그린 획 두께가 **벡터 외곽선 두께로 실제 반영** → 비로소 "그리면서 굵기 조절"이 폰트에 구워짐.
- **정직성**: 캡처 전 단계에서는 "이 브러시 그림은 이미지로 저장돼요(폰트 반영은 글씨 만들기 모드에서)" 명시. 현재의 "미반영" 라벨 정신 유지.

### 5) 감성(emotion) 옵션 — [REAL] (TOP)
- 마스터의 "감성 옵션"을 **여러 축을 묶은 상위 노브**로 실현. 알고리즘 신규 0 — 기존 weight/slant/curvature/cursive/weirdness/waviness/letterSpacing 조합 큐레이션.
- **(a) 무드 칩 확장**: 현재 `STYLE_PRESETS` 6종을 8~10종으로 세분(아래). 신규 `waviness/contrast`까지 묶어 체감 폭 확대.
  - 추가 제안: `dreamy(몽환)` = 가는 weight·waviness↑·letterSpacing↑·slant 약간 / `sharp(날카로움)` = contrast↑·slant↑·curvature0·weirdness0 / `bubbly(통통)` = weight↑·curvature1·waviness 약간 / `wild(거친)` = weirdness↑·waviness↑.
- **(b) 감성 슬라이더(2축, 권장)**: 칩보다 직관적인 **연속 무드 노브**.
  - `차분 ↔ 발랄`: 0(차분)에서 weight↓·slant0·curvature↓·weirdness0·waviness0 → 1(발랄)에서 curvature↑·weirdness 약간·waviness 약간·slant 약간.
  - `부드러움 ↔ 거침`: 0(부드)에서 roundness/curvature↑·weirdness0 → 1(거침)에서 weirdness↑·contrast↑.
  - 매핑은 클라(packages/core)에서 감성값 → FontParams로 펼치는 순수 함수(`moodToParams(calmness, roughness)`). 사용자는 슬라이더 2개만 보고, 고급 사용자는 "세부 조절 펼치기"로 개별 축 노출.
- **계약**: `mood?: string`(칩 id, 서버 무시 가능) + 프론트 전용 감성→params 매핑 함수. 폰트 params 스키마 자체는 유지(하위호환).
- **정직성**: 감성 노브는 **기존 진짜 폰트 축을 조정**하는 것이므로 결과는 100% 폰트에 반영. 안전.

### 6) 틀을 깬 트렌드 기능
- **변주 갤러리 "9가지 변형 한눈에"(6a)** [REAL, 강력 권장]: 현재 params 기준으로 seed·waviness·weight 등을 흩뿌린 **9개 변형을 그리드로 동시 프리뷰**, 마음에 드는 칸을 누르면 그 params로 확정. 폰트 N회 생성이지만 서브셋 글리프가 적어 가볍다(베이스 폰트 캐시 시 더). **선택 피로↓, 발견의 재미↑** — 슬라이더를 모르는 사용자에게 최고의 진입점. 가치 5.
- **랜덤 서프라이즈(6b)** [REAL]: 주사위 확장. seed뿐 아니라 params 전체를 "보기 좋은 범위"에서 무작위 → "오늘의 글씨". 가치 4, 난이도 1.
- **글자별 개별 변형(6c)** [REAL]: `_glyph_seed_rng`가 이미 글리프별 결정적 RNG → 글자마다 다른 waviness 위상·미세 회전. "손글씨처럼 같은 글자도 매번 조금 다름"의 폰트 버전(단, 폰트는 글자당 1글리프라 "매 등장 다름"은 불가 — 정직 고지). 가치 3.
- **캔버스 직접 드래그/왜곡(6d)** [PREVIEW→REAL]: 글자 위 핸들을 끌어 envelope 워프. 프리뷰는 CSS transform/SVG로 즉시, 확정 시 동일 변형을 glyf 좌표에 구워 [REAL]화. 난이도 4.
- **그라데이션/컬러 스페시먼(6e)** [PREVIEW]: 컬러·그라데이션 견본 카드(공유용 이미지). 폰트는 흑백, 색은 이미지에만(3과 동일 정직성).
- **모션 스페시먼(6f)** [PREVIEW]: 글자가 그려지는/출렁이는 애니메이션 견본(CSS/GIF). SNS 공유·바이럴용. 폰트 파일과 무관(라벨 분리).

---

## 3. 계약(`packages/core/src/index.ts`) 추가 제안

기존 `FontParams` 8필드 **유지** + **선택적/기본값 안전** 추가(하위호환·`clampParams` 자동 가드).

```ts
export interface FontParams {
  // ...기존 8개 유지...
  // 신규 [REAL] — 펜 단계에서 glyf에 구움
  waviness?: number;   // 0~1   구불구불(사인 진폭). def 0
  waveFreq?: number;   // 0.5~6 물결 주파수. def 2 (waviness>0일 때만 의미)
  contrast?: number;   // 0~1   가로획↔세로획 굵기차 근사. def 0
  roundness?: number;  // 0~1   끝/코너 둥글기(후순위). def 0
  mood?: string;       // 무드 칩 id(UI 편의, 서버는 무시 가능)
}
```

```ts
// PARAM_RANGES 추가
waviness:  { min: 0,   max: 1, step: 0.05, default: 0 },
waveFreq:  { min: 0.5, max: 6, step: 0.5,  default: 2 },
contrast:  { min: 0,   max: 1, step: 0.05, default: 0 }, // max 노출은 0.6 권장(가독)
roundness: { min: 0,   max: 1, step: 0.05, default: 0 },
```

```ts
// 감성 슬라이더 → params 펼침(프론트 전용 순수 함수, packages/core)
export function moodToParams(calmness: number, roughness: number): Partial<FontParams> { /* 큐레이션 */ }
```

**프리뷰 전용(폰트 params와 분리 — 엔진에 안 보냄)** [PREVIEW]:
```ts
export interface PreviewStyle {
  texture?: "none" | "grain" | "rough";        // feTurbulence 류
  fillStyle?: "solid" | "stripe" | "dots" | "gradient";
  color?: string;
  gradient?: { from: string; to: string; angle: number };
}
```

**엔진 영향(`generator.py`)**: `_transform_glyf_coordinates`에 (i) 사인 워프 블록(waviness/waveFreq), (ii) contrast 비대칭 x-스케일 블록 추가 — **이미 좌표를 점단위 순회**하므로 같은 루프에 합류. `PARAM_RANGES`/`FontParams`/`clamp_params` 양쪽 동기화(파일 주석 규칙). 비용 0(로컬 fontTools, 서브셋된 ~70글리프).

---

## 4. [PREVIEW]·[CAPTURE] 로드맵 연결
- **[PREVIEW] (질감/무늬/컬러/모션)** → 별도 **"이미지/스티커 내보내기"** 기능군으로 묶어 `idea-character-emoji.md`(스티커·캐릭터화)·`idea-monetization.md`(굿즈/공유)와 합류. 폰트 다운로드 흐름과 UI·라벨 분리.
- **[CAPTURE] (브러시→글리프화)** → `idea-handwriting.md`의 글리프 직접 캡처(Potrace+fontTools, MVP-B)와 동일 경로. 브러시 다이내믹스는 그 입력 품질 향상 단계로 흡수. 부분 스타일 추출(MVP-A: 잉크에서 굵기/기울기/곡률→축)도 여기로.
- **[SVGFONT]** (컬러 폰트)는 렌더 지원 성숙 전까지 **보류**. 컬러 욕구는 [PREVIEW] 이미지로 충족.

## 5. UI 아이디어 (idea-design-direction.md 톤: 소프트 iOS 문방구·스프링 모션 준수)
- **기본 화면 = 감성 슬라이더 2개 + 무드 칩 + "변주 갤러리"** 만 노출(초심자). 슬라이더 공포 제거.
- **"세부 조절 펼치기"** 아코디언 안에 굵기/기울기/곡률/모노/필기체/자간/괴상함 + 신규 **구불구불·대비**. 구불구불은 `waviness`(양끝 "곧게↔물결") + 펼치면 `waveFreq`.
- **변주 갤러리**: 3×3 그리드 라이브 프리뷰, 칸 탭 = 확정 + 스프링 팝. "랜덤 서프라이즈" 알약 버튼.
- **이미지 효과 탭(분리)**: 질감/무늬/컬러/모션 + 상단 고정 배지 **"이미지 전용 — 폰트엔 미포함"**. 하단 버튼 2개: `폰트(WOFF) 받기` · `이미지(PNG) 받기`.
- 정직 배지 패턴: [REAL] 컨트롤엔 "폰트에 적용", [PREVIEW] 컨트롤엔 "이미지에만".

## 6. 빌드 순서
**Wave A (즉시·거의 공짜 [REAL])**
1. 구불구불 `waviness`+`waveFreq` (펜 사인 워프 1블록 + 계약 2필드 + 슬라이더).
2. 감성 슬라이더 2축 + `moodToParams` + 무드 칩 8~10종(알고리즘 0).
3. 변주 갤러리(9분할) + 랜덤 서프라이즈(클라에서 params 흩뿌려 N회 생성).

**Wave B (차별화 [REAL])**
4. 획 대비 `contrast`(펜 비대칭 스케일, max 보수적).
5. 글자별 개별 변형(`_glyph_seed_rng` 활용 — 위상/미세회전).

**Wave C ([PREVIEW] 이미지 산출물)**
6. 프리뷰 SVG 렌더 + 질감(grain)·무늬(stripe/dots/gradient)·컬러 + PNG/SVG 내보내기(폰트와 라벨 분리).
7. 모션 스페시먼(공유 카드/GIF).

**Wave D ([CAPTURE] 진짜 내 글씨)**
8. 브러시 다이내믹스(필압/속도) → 글리프 직접 캡처(Potrace+fontTools, `idea-handwriting.md` MVP-B)와 합류. 이때 "그리면서 획 굵기 조절"이 폰트에 실제 반영.

**후순위**: 끝모양 `roundness`(2c), 캔버스 직접 드래그/왜곡(6d), 컬러 폰트 [SVGFONT].

## 7. 정직성 원칙 (사용자 고지 — 토스/CLAUDE.md §6)
- **[REAL]**(구불구불·대비·감성·굵기·변주): "그대로 폰트(WOFF/TTF)에 들어가요" — 안전.
- **[PREVIEW]**(질감·무늬·컬러·모션): **"이미지 전용 효과 — 폰트 파일엔 포함되지 않아요"** 배지 필수. 다운로드 버튼을 폰트/이미지로 분리.
- **[CAPTURE] 전 브러시 스케치**: 현재 "미반영" 라벨 정신 유지 — "이미지로 저장돼요(폰트 반영은 글씨 만들기 모드)".
- 글자별 변형은 "폰트는 글자당 한 모양이라 매 등장마다 다르진 않아요" 한 줄 고지(과대광고 회피).
