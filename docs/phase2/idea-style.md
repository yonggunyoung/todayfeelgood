# 스타일·효과 다양화 아이디어 카탈로그 (비AI · 비용0)

> 작성: 스타일·효과 아이디어 에이전트 / 코드 수정 없음 / 검증: `assets/Recursive_VF.ttf` 실측
> 대상 코드: `packages/core/src/index.ts`(3축 계약), `apps/font/engine/generator.py`(VF 인스턴싱+서브셋), `apps/font/frontend/components/ParameterPanel.tsx`(슬라이더)

---

## 한 줄 결론
Recursive VF가 이미 가진 **숨은 축(wdth는 없지만 MONO·CRSV가 있음)** 을 즉시 슬라이더로 열고, **시드 기반 펜 디스토션 "괴상함" 슬라이더**와 **무드 프리셋**을 얹으면, 비용 0·코드 수정 없이 스타일 다양성을 한 단계 끌어올릴 수 있다.

## 즉시 추가 권장 TOP 5 (가성비 순)
1. **MONO(모노스페이스) 슬라이더** — 폰트에 이미 있는 축. 매핑 한 줄. 체감 큼.
2. **CRSV(커서브/필기체 전환) 슬라이더** — 이미 있는 축. a/g/l 등 글자 모양이 바뀌어 "다른 글씨체"처럼 보임.
3. **무드 프리셋 6종** — 기존 축 조합 큐레이션. 신규 알고리즘 0, 체감 가치 최상.
4. **wght 범위 버그 수정 겸 확장** — 현재 계약은 100~900인데 폰트 실제 wght는 **300~1000**. 하단(가는 굵기)이 안 먹고 있음.
5. **weirdness(괴상함) 슬라이더 v1** — 시드 기반 jitter/wobble 펜. 비AI 손맛의 핵심 차별점.

---

## 0. 베이스 폰트 실측 (Recursive_VF.ttf, fontTools 4.63 확인)

| 축(tag) | min | default | max | 의미 | 현재 사용 |
|---|---|---|---|---|---|
| `wght` | **300** | 300 | **1000** | 굵기 | weight로 매핑(범위 불일치 버그) |
| `slnt` | -15 | 0 | 0 | 기울기 | slant로 매핑 |
| `CASL` | 0 | 0 | 1 | Casual(둥글기/캐주얼) | curvature로 매핑 |
| `MONO` | 0 | 0 | 1 | 0=비례 ↔ 1=모노스페이스 | **미사용(기본 핀)** |
| `CRSV` | 0 | **0.5** | 1 | Cursive(필기체 형태 전환) | **미사용(기본 핀)** |

- 명명 인스턴스(named instances) 64개 → 프리셋 큐레이션의 검증된 출발점으로 활용 가능.
- 글리프 1304개. **전체 인스턴싱+서브셋+저장 실측 ≈ 1.4초** (로딩이 대부분). 서브셋 후 글리프 ~70개 → 펜 변형은 글리프당 µs 수준, 무료티어 무리 없음.
- `wdth`(폭) 축은 **이 폰트에 없음**. 폭 다양화는 (a) MONO로 근사, 또는 (b) TransformPen 가로 스케일 + advance width 보정으로 직접 구현해야 함(주의: 자연스러움 떨어짐).

---

## 1. 효과 카탈로그

표기: 난이도 1(쉬움)~5(어려움), 가치 1~5(사용자 체감), 점수 = 가치 ÷ 난이도(높을수록 먼저).

### A. 가변폰트 축(폰트가 무료로 제공 — 매핑만)

| # | 이름 | 원리 | 난이도 | 가치 | 점수 | 계약 필드(범위/기본) |
|---|---|---|---|---|---|---|
| A1 | 모노스페이스 mono | `MONO` 0~1 핀 값 변경 | **1** | 4 | 4.0 | `mono: 0~1, step .05, def 0` |
| A2 | 커서브 cursive | `CRSV` 0~1, a/g/l 형태 전환 | **1** | 4 | 4.0 | `cursive: 0~1, step .05, def 0.5` |
| A3 | wght 범위 정정 | 계약 100~900 → **300~1000** 으로(폰트 실제값) | **1** | 3 | 3.0 | `weight: 300~1000, def 400` |
| A4 | 캐주얼 명칭화 | curvature → `casual`(CASL 의미 명확화). 별도 "둥글기"는 펜으로 분리 | 1 | 2 | 2.0 | (라벨/문서 정리) |

> 핵심: A1·A2는 **이미 generator.py가 모든 축을 핀**하고 있어(124~133행), AXIS_MAP에 두 줄과 계약 필드만 추가하면 끝. 신규 알고리즘 0.

### B. 펜 기반 외곽선 변형 (괴상함/손맛 — 커스텀 펜)

구현 골격(개념): 인스턴싱 후 `glyf` 테이블의 각 글리프를 `RecordingPen`으로 떠서, 좌표를 시드 RNG로 변형하고 다시 그려 넣는다(또는 `TTGlyphPen`/`T2CharStringPen` 재구성). 시드는 `(글로벌seed, 글리프이름, 점인덱스)` 해시로 결정 → **완전 재현 가능**.

| # | 이름 | 원리 | 난이도 | 가치 | 점수 | 계약 필드 |
|---|---|---|---|---|---|---|
| B1 | jitter(점 흔들기) | 각 on/off-curve 점을 시드 난수로 ±N units 이동 | **2** | 5 | 2.5 | `weirdness`에 통합 |
| B2 | roughen(거칠게) | 세그먼트를 잘게 쪼개고 각 분할점에 수직 노이즈 → 거친 손맛 | 3 | 5 | 1.7 | `weirdness` 상위 구간 |
| B3 | wobble(파형 흔들림) | 점을 sin파(위상=시드)로 변위 → 출렁이는 느낌 | 2 | 4 | 2.0 | `weirdness` |
| B4 | baseline jitter | 글리프 전체를 글자 단위로 상하/좌우/회전 랜덤 배치 | **2** | 5 | 2.5 | `baselineWobble` 또는 weirdness 일부 |
| B5 | per-glyph 회전/스케일 | 글리프별 미세 회전(±deg)·스케일(±%) (TransformPen) | 2 | 4 | 2.0 | `weirdness` |
| B6 | 외곽선 단순화 | 점 솎기(Douglas-Peucker류)로 거친 폴리곤화 → 8bit/판화 느낌 | 3 | 3 | 1.0 | `simplify` 또는 weirdness 반대편 |
| B7 | 외곽선 과장(뚱뚱/holriz) | 점을 무게중심 기준 방사 스케일 → 부풀린 버블 효과 | 3 | 3 | 1.0 | `inflate`(후순위) |
| B8 | 라운딩(코너 깎기) | 코너 점을 베지어로 라운드 처리 → CASL과 별개의 진짜 "둥글기" | 3 | 3 | 1.0 | `roundness: 0~1`(후순위) |

> **weirdness 슬라이더 설계**: 0~100 단일 슬라이더가 B1·B3·B4·B5의 강도를 한꺼번에 스케일. 0=원본(변형 0), 50=손글씨 손맛, 100=괴상. **seed**(정수)와 **주사위 버튼**으로 같은 강도의 다른 변형을 뽑게 한다. 시드 고정 시 동일 출력 보장 → 다운로드/공유 재현성.

### C. 메트릭/간격 (글리프 외곽선 안 건드림 — 가벼움)

| # | 이름 | 원리 | 난이도 | 가치 | 점수 | 계약 필드 |
|---|---|---|---|---|---|---|
| C1 | 자간(tracking) | 모든 advance width에 +δ, 또는 hmtx 일괄 조정 | **1** | 4 | 4.0 | `tracking: -50~200, def 0` |
| C2 | 행간(line-height) | 폰트 메트릭(OS/2, hhea) 또는 CSS line-height. 프리뷰는 CSS, 폰트엔 메트릭 | 1 | 3 | 3.0 | `lineHeight`(프리뷰 전용 가능) |
| C3 | x-height/opsz 근사 | Recursive엔 opsz 축 없음. 펜 세로 스케일로 근사(난이도↑, 후순위) | 4 | 2 | 0.5 | `xHeight`(후순위) |
| C4 | 대비(contrast) | 수직/수평 획 굵기 차. 진짜 구현은 어려움(획 방향 분석 필요). wght+펜으로 부분 근사 | 5 | 3 | 0.6 | `contrast`(장기 후순위) |

> C1 자간은 **외곽선 미변형**이라 매우 싸고 체감 큼 → 빠른 승.

### D. 정형화(클린) 옵션 — "반듯하게"

"괴상함"의 반대 방향. 사용자 요구 "좀 더 정형화된 글씨체" 대응.

| # | 이름 | 원리 | 난이도 | 가치 | 점수 |
|---|---|---|---|---|---|
| D1 | weirdness=0 잠금 | 모든 펜 디스토션 끔(기본값) | 1 | 4 | 4.0 |
| D2 | 기울기 0 고정 | slant=0 프리셋/토글 | 1 | 3 | 3.0 |
| D3 | 메트릭 정렬 | advance/사이드베어링 균일화로 정돈된 느낌 | 2 | 2 | 1.0 |
| D4 | 외곽선 스무딩 | 점을 베지어 평활화(라운딩과 동일 엔진) → 깔끔 | 3 | 2 | 0.7 |

> 사실상 D는 **B/C를 0으로 둔 상태 + "단정" 프리셋**이면 충족. 별도 알고리즘 최소.

---

## 2. 무드 프리셋표 (여러 축 묶음 큐레이션)

각 값은 출발 제안(named instance 64종과 교차검증 권장). weirdness/seed/tracking 포함.

| 프리셋 | weight | slant | casual(CASL) | mono | cursive(CRSV) | weirdness | tracking | 분위기 |
|---|---|---|---|---|---|---|---|---|
| 차분·단정 (Clean) | 400 | 0 | 0.0 | 0 | 0.0 | 0 | 0 | 정형, 본문 |
| 장난기 (Playful) | 600 | 0 | 1.0 | 0 | 0.5 | 25 | 20 | 둥글둥글 명랑 |
| 빈티지 타자기 (Typewriter) | 450 | 0 | 0.2 | 1.0 | 0.0 | 15 | 10 | 모노 + 약한 잉크번짐 |
| 미래·기하 (Geometric) | 700 | 0 | 0.0 | 0.5 | 0.0 | 0 | 40 | 넓은 자간·각진 |
| 거친 손글씨 (Rough hand) | 500 | -6 | 0.6 | 0 | 1.0 | 70 | 5 | 흔들·거침 |
| 우아한 필기 (Elegant script) | 350 | -12 | 0.3 | 0 | 1.0 | 10 | -10 | 가늘고 기울고 커서브 |

> 프리셋 선택 시 슬라이더 값이 그 조합으로 점프(이후 미세조정 가능). UI는 **프리셋 칩(chip) 행**.

---

## 3. 파라미터 계약 변경안 (`packages/core/src/index.ts`)

기존 3필드 유지 + 확장. 모든 신규 필드는 **선택적/기본값 안전** 하게 추가해 하위호환.

```ts
export interface FontParams {
  // 기존
  weight: number;     // 300~1000 (★범위 정정), def 400
  slant: number;      // -15~0, def 0
  curvature: number;  // 0~1 (CASL), def 0  ← 라벨 "캐주얼/둥글기"
  // 신규: 가변폰트 축 (즉시, 난이도1)
  mono?: number;      // 0~1, step .05, def 0   (MONO)
  cursive?: number;   // 0~1, step .05, def 0.5 (CRSV, 폰트 기본 0.5)
  // 신규: 메트릭 (가벼움)
  tracking?: number;  // -50~200 units, step 5, def 0
  // 신규: 펜 디스토션
  weirdness?: number; // 0~100, step 1, def 0   (B1/B3/B4/B5 강도)
  seed?: number;      // 0~999999, def 0        (재현성, 주사위로 변경)
  // 큐레이션
  preset?: string;    // "clean" | "playful" | ... (UI 편의, 서버는 무시 가능)
}
```

권장 `PARAM_RANGES` 추가:
```ts
weight:    { min: 300, max: 1000, step: 10, default: 400 }, // ★ 100→300 정정
mono:      { min: 0,   max: 1,    step: 0.05, default: 0 },
cursive:   { min: 0,   max: 1,    step: 0.05, default: 0.5 },
tracking:  { min: -50, max: 200,  step: 5,    default: 0 },
weirdness: { min: 0,   max: 100,  step: 1,    default: 0 },
seed:      { min: 0,   max: 999999, step: 1,  default: 0 },
```

엔진 `AXIS_MAP` 추가(generator.py): `"mono": "MONO"`, `"cursive": "CRSV"`. 이미 전 축 핀 구조라 두 줄로 동작. weirdness/tracking/seed는 인스턴싱 **후** 펜/hmtx 단계로 처리.

UI 아이디어:
- 슬라이더: 굵기·기울기·캐주얼·**모노·커서브**·자간·**괴상함**.
- **프리셋 칩 행**(6종) — 누르면 슬라이더 점프.
- **주사위 버튼**(🎲) — seed 무작위 재생성(weirdness>0일 때만 의미). 시드 값 표시/복사 가능 → 공유 재현.
- 괴상함 슬라이더 양끝 라벨: "단정 ←→ 괴상".

---

## 4. 구현 기술 메모

- **축 매핑(A군)**: `instantiateVariableFont(font, {..., 'MONO':v, 'CRSV':v})`. 기존 코드 그대로, 핀 값만 파라미터화.
- **펜 디스토션(B군)**: 인스턴싱(정적화) 후 `glyf` 순회 → `RecordingPen`으로 외곽선 추출 → 좌표 변형 → `TTGlyphPen`으로 재구성해 `glyf[name]` 교체. quad/composite 주의(컴포지트는 펼치거나 스킵).
- **시드 RNG**: `random.Random(hash((seed, glyph_name, idx)) & 0xffffffff)` 또는 `numpy` 없이 표준 `random`. **numpy 등 무거운 ML 의존성 도입 금지**(CLAUDE.md 비용·메모리 철칙).
- **자간(C1)**: `hmtx`의 advanceWidth 일괄 +tracking, 또는 프리뷰는 CSS `letter-spacing`으로 즉시(폰트 재생성 불필요 → 슬라이더 반응 빠름). 다운로드 시에만 hmtx 반영.
- **성능**: 무거운 비용은 1.4초의 VF 로딩/인스턴싱(서브셋 무관 고정). 펜 변형은 서브셋된 ~70글리프 대상이라 미미. **베이스 폰트를 메모리/디스크 캐시**(매 요청 재로딩 회피)하면 응답 크게 개선 — 별도 최적화 아이템.
- **재현성 테스트**: 같은 (params, seed) → 바이트 동일 보장 단위테스트(핵심 로직 테스트 규칙 준수).

---

## 5. 빌드 순서 (가치÷난이도 + 의존성)

**Wave 1 (즉시, 거의 공짜 / 점수 3~4)**
1. wght 범위 정정 (A3) — 버그성, 1줄.
2. MONO·CRSV 슬라이더 (A1·A2) — AXIS_MAP 2줄 + 계약 2필드 + 슬라이더 2개.
3. 자간 tracking (C1) — 프리뷰는 CSS, 다운로드는 hmtx.
4. 무드 프리셋 6종 + 프리셋 칩 UI (B/C 없이도 기존 축만으로 5종 이상 가능).

**Wave 2 (차별화 / 손맛)**
5. weirdness v1 = jitter(B1) + baseline jitter(B4) + seed + 주사위 버튼.
6. wobble(B3) / per-glyph 회전(B5)을 weirdness 곡선에 합성(강도별 가중).

**Wave 3 (심화·후순위)**
7. roughen(B2), 진짜 roundness(B8), 외곽선 스무딩(D4).
8. 폭(wdth 부재 → TransformPen 근사), 대비(C4), x-height(C3) — 자연스러움 한계 있어 마지막.

**비고**: D(정형화)는 별도 개발 거의 불필요 — Wave1 완료 시 "단정" 프리셋 + weirdness=0으로 충족.
