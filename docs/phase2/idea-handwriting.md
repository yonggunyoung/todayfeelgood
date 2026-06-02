# 손글씨 심화 — "진짜 내 글씨 폰트" 구현 설계서 (Phase 2 아이디어)

> 작성: 손글씨 심화 아이디어 에이전트 / 코드 수정 없음 / 설계 제안서
> 대상 독자: FE-Agent · Engine-Agent · Shared-Agent (착수 가능한 수준의 스펙)
> 현재 상태 전제: 그린 그림(`imagePng`)은 결과에 **0% 반영**. 엔진은 기성 가변폰트(Recursive VF)를 슬라이더 축(wght/slnt/CASL)으로만 변형. 캔버스는 "스케치·미반영" 라벨.

---

## 한 줄 결론
**비AI "글리프 직접 캡처" 방식이 비용 0으로 "진짜 내 글씨 폰트"를 만드는 유일하고 확실한 길이며, Phase 2의 1순위 MVP로 즉시 착수 가능하다.** AI는 안 그린 글자를 채우는 유료 옵션으로 분리한다.

---

## 권장 우선순위 (요약)
1. **[1순위, 무료, MVP] 글리프 직접 캡처 파이프라인** — 그리드 캔버스로 글자별 입력 → OpenCV 전처리 → Potrace 벡터화 → fontTools pen으로 글리프 주입 → WOFF. **이게 핵심이고, 충분히 현실적이다.**
2. **[2순위, 무료] 하이브리드 채움** — 핵심 글자만 그리고 나머지는 베이스폰트로 채우거나(즉시 사용 가능한 폰트), 사용자 글자의 굵기/곡률 통계만 추출해 베이스폰트 축에 반영(부분 스타일).
3. **[3순위, 유료] AI 스타일 전이** — few-shot으로 안 그린 글자까지 "내 스타일"로 생성. 환경변수 OFF 기본, "AI 생성" 라벨 의무.

---

## 1. 비AI 정공법 — 글리프 직접 캡처 (1순위 MVP)

### 1.1 전체 파이프라인 (글자 1개당)
```
사용자 그림(셀 PNG)
  → [전처리] 그레이스케일 → 가우시안 블러 → Otsu 이진화 → 노이즈 제거(모폴로지 open) → 가장 큰 연결요소만 남김(잡티 제거)
  → [정규화] 셀 좌표 → 폰트 em-square(1000 UPM) 좌표로 매핑, 베이스라인/엑스하이트 가이드 기준 정렬
  → [벡터화] Potrace로 비트맵 → 베지어 외곽선(path)
  → [경로 정리] 좌표 스케일링, y축 뒤집기(이미지 top-left → 폰트 bottom-left), 점 단순화(tolerance)
  → [글리프 조립] fontTools T2CharStringPen / TTGlyphPen으로 outline → glyf/CFF
  → [메트릭] advanceWidth, LSB/RSB(사이드베어링) 계산
모든 글자 반복 → 빈 폰트 골격(cmap/hmtx/name/OS2/post...)에 글리프 주입 → WOFF 인코딩
```

### 1.2 핵심 난제와 해법

**(a) 글자별 입력 UX — 노동량 (26×2 + 숫자 = 60자+)**
- 가장 큰 사용자 이탈 요인. → "한 번에 끝내야 한다"는 압박을 없앤다.
- **점진적 완성**: 최소 N자(예: 소문자 26자)만 그려도 폰트가 나오게. 대문자/숫자는 선택.
- **세션 저장**: 그린 셀을 로컬(IndexedDB)에 저장 → 중간에 나가도 이어서.
- **트릭**: 자동 다음 칸 이동, 진행률 바, "이 글자 건너뛰기" 버튼.
- 상세는 §4.

**(b) 벡터화 품질 — 노이즈/구멍**
- 펜이 끊긴 획 → 같은 글자가 분리된 조각으로 벡터화됨. → 모폴로지 close로 작은 끊김 메움, but 과하면 'o' 안쪽 구멍이 막힘. **파라미터 튜닝 필요**(close 커널 1~2px 권장).
- 'o','a','e','b','d','g','p','q','o','B','O','R' 등 **구멍(counter)** 있는 글자: Potrace는 내부 윤곽을 별도 컨투어로 잡고 방향(winding)으로 hole 처리. fontTools 주입 시 외곽=시계, 내부=반시계(TrueType 규약) 확인 필수. 방향 틀리면 구멍이 검게 채워짐.
- 점 떨림: Potrace `alphamax`(코너 임계)·`opttolerance`(곡선 최적화)로 부드럽게. 너무 매끈하면 손맛 사라짐 — 손글씨는 약간 거친 게 자연스러움.

**(c) 일관 메트릭 — 글자가 들쭉날쭉**
- 사용자가 셀마다 크기/위치를 다르게 그림 → 폰트로 조립하면 글자마다 들쭉날쭉.
- **가이드라인 강제**: 캔버스 셀에 베이스라인·엑스하이트·캡하이트·디센더 라인을 옅게 그려, 사용자가 거기 맞춰 쓰게 유도.
- **자동 정렬**: 그린 잉크의 바운딩박스를 검출 → 베이스라인에 바닥을 스냅, x-height 글자는 x-height 라인에 상단 스냅. 어센더/디센더 글자('b','p','y' 등)는 예외 규칙.
- **advanceWidth**: 글리프 폭 + 좌우 사이드베어링(권장: em의 5~8% 고정 여백). 폭이 들쭉날쭉해도 사이드베어링 일정하게 줘 자간 균일.
- 어떤 글자가 어센더/x-height/디센더 그룹인지는 **사전 정의 테이블**로 둔다(아래 계약 §6).

**(d) 안 그린 글자 처리**
- 세 가지 정책(사용자가 선택 가능하게):
  - (i) **빈칸**: 해당 글자는 `.notdef` 또는 공백. 정직하지만 실용성 낮음.
  - (ii) **베이스폰트로 채움**: 안 그린 글자는 Recursive에서 빌려옴. → "내 글씨 + 시스템 글씨 혼합" 명시. 가장 실용적.
  - (iii) **자동 보완(AI)**: §3 유료 경로.
- MVP 기본값: **(ii) 베이스폰트 채움 + "N자만 직접 작성됨" 배지**.

### 1.3 정직성 고지 (토스 대비)
- 결과 화면에 "직접 그린 글자 N개 / 자동 채움 M개" 명시.
- 베이스폰트 채움 시 "나머지는 기본 폰트로 채워졌어요" 라벨.
- AI 채움 시 "AI 생성" 라벨 **필수**(CLAUDE.md §6, §4 규칙).

---

## 2. 하이브리드 — 핵심 글자만 + 나머지 채움

세 가지 채움 전략과 정직한 품질 기대치:

| 전략 | 방법 | 품질 기대치 | 비용 |
|---|---|---|---|
| (i) 비워두기 | 안 그린 글자 = 공백/notdef | "내 글씨"지만 글 못 씀. 데모용. | 0 |
| (ii) 베이스폰트 채움 | 안 그린 글자 = Recursive 글리프 | 실용적이나 두 글씨체가 섞여 이질감. 솔직히 "반쪽 내 글씨". | 0 |
| (iii) 부분 스타일 추출 | 사용자 글자에서 **굵기·기울기·곡률 통계**만 추출 → 베이스폰트 축(wght/slnt/CASL)에 반영 | 글자 모양은 베이스폰트지만 "내 손글씨 느낌의 굵기/기울기"는 반영. **Phase1 슬라이더를 자동화한 것** = 비용0로 가장 빨리 구현 가능 | 0 |

**(iii) 부분 스타일 추출 — 비용0의 빠른 승리(quick win)**:
- 사용자가 몇 글자만 그려도, 그 잉크에서 다음을 측정:
  - **평균 획 두께**: 잉크 픽셀의 거리변환(distance transform) 평균 → `wght` 축 값으로 매핑.
  - **기울기**: 수직 스트로크의 회귀 기울기 → `slnt` 축.
  - **곡률/둥글기**: 코너 각도 분포(샤프 vs 라운드) → `CASL` 축.
- 이건 지금 엔진 구조(`AXIS_MAP`)를 **거의 그대로 재활용**한다. 슬라이더를 손으로 만지는 대신 손글씨가 슬라이더를 자동 설정. **"내 글씨 반영"의 가장 저렴한 첫걸음**으로 1순위 MVP와 병행 가치 높음.
- 한계 정직 고지: 글자 모양 자체는 안 바뀜 → "느낌만 반영". 진짜 글자 모양은 §1 글리프 캡처라야 됨.

---

## 3. AI 경로 (Phase 2 유료, 기본 OFF)

### 3.1 목표
few-shot 스타일 전이: 사용자가 5~10자만 그려도 나머지 50여 자를 "같은 스타일"로 생성.

### 3.2 모델 후보

| 후보 | 형태 | 비용 | 지연 | 품질 | 메모 |
|---|---|---|---|---|---|
| 오픈소스 SD/diffusion 기반 폰트생성 (예: 글자 이미지 diffusion) | self-host | GPU 필요 → 무료티어 불가 | 수 초~수십 초 | 가변적 | Oracle 무료티어(CPU)엔 부적합. 별도 GPU 인스턴스/온디맨드 필요 |
| Few-shot 폰트 전용 모델 (FANnet/zi2zi/DG-Font 계열) | self-host | 추론은 비교적 가벼움(CPU 가능성 있음) but 모델/학습 부담 | 초 단위 | 라틴은 한글보다 쉬움 | 사전학습 가중치 라이선스 확인 필수 |
| 상용 이미지생성 API | 외부 유료 API | **호출당 과금** | 초 단위 | 높음 but 폰트 일관성 보장 안 됨 | CLAUDE.md §2 철칙: 환경변수 on/off + 호출 전 비용경고 주석 필수, 기본 OFF |

### 3.3 정책 (CLAUDE.md 준수)
- **기본 OFF**: `ENABLE_AI_FONT=false`. 켜야만 노출.
- **유료 사용자 전용**: 비AI 무료 라인과 명확히 분리(§7).
- **비용 경고 주석**: 외부 API 호출 직전 코드에 비용 주석 필수.
- **"AI 생성" 라벨**: 결과물·메타데이터·UI 배지 모두에 표시. `generatedBy: "ai"` 추가(§6).
- **메모리 검토**: ML 의존성은 무료티어 메모리 영향 사전 검토 후 도입(무거우면 별도 워커로 격리, 메인 엔진에 ML 의존성 섞지 말 것).

### 3.4 정직한 기대치
- 라틴 few-shot 전이는 한글보다 훨씬 쉬움(글자 수 적고 구조 단순).
- 그래도 "진짜 내가 쓴 것"은 아님 → 라벨 의무 + "AI가 당신 스타일을 흉내냄" 문구.

---

## 4. 입력 UX 설계 (글리프 캡처용)

### 4.1 그리드 캔버스
- 화면: 글자 그리드(예: 한 줄 5~7칸). 각 셀 = 독립 미니 캔버스 + 목표 글자 라벨('a', 'b'...).
- 각 셀에 **옅은 가이드라인**: 캡하이트 / 엑스하이트 / 베이스라인 / 디센더(4선). 목표 글자에 맞춰 강조 라인 변경(예: 'b'는 어센더 라인, 'p'는 디센더 라인 하이라이트).
- 셀 안에 **회색 힌트 글자**(베이스폰트로 옅게) 깔아주기 — 따라 쓰기 유도(품질·일관성 급상승).

### 4.2 노동 절감 트릭
- **자동 다음 칸**: 한 글자 다 쓰고 떼면 짧은 지연 후 다음 칸 포커스(혹은 "다음" 버튼).
- **진행률**: "24/60 작성됨" + 그룹별(소문자/대문자/숫자) 진행.
- **건너뛰기/나중에**: 건너뛴 글자는 채움 정책(§2) 적용.
- **획 두께 자동**: 펜 두께를 캔버스 크기에 비례 고정(사용자가 신경 안 쓰게). 너무 얇으면 벡터화 깨짐.
- **되돌리기/지우기**: 셀 단위 undo + clear.
- **한 번에 여러 글자**(고급): 한 줄에 단어를 쓰면 연결요소 분리로 글자 자동 분절 — 난도 높음(붙은 필기체 분절 어려움). MVP는 셀 분리 방식 권장.

### 4.3 모바일 터치
- Pointer Events(이미 `DrawingCanvas`가 사용 중) 그대로 활용 → 터치/펜 지원.
- 셀이 작으면 손가락으로 못 씀 → 모바일은 **한 번에 한 글자 풀스크린 입력** 모드 권장(셀 탭 → 큰 캔버스 모달 → 저장 → 다음).
- `touch-action: none`으로 스크롤 충돌 방지(현재 캔버스 CSS 확인 필요).

### 4.4 기존 자산 재활용
- 현재 `DrawingCanvas.tsx`의 pointer 드로잉/좌표 환산/PNG export 로직 재사용 가능. "미반영" 라벨만 제거하고, 단일 캔버스 → 글자별 셀 컴포넌트로 확장.

---

## 5. 벡터화 기술 스택 (무료티어 검토)

### 5.1 라이브러리
| 단계 | 라이브러리 | 비고 |
|---|---|---|
| 전처리 | OpenCV(`opencv-python-headless`) 또는 Pillow+numpy | headless가 메모리 가벼움. 단순 작업이면 Pillow+numpy로도 충분(의존성 절감) |
| 이진화/모폴로지 | OpenCV / scikit-image | Otsu, morphology |
| 벡터화 | **Potrace** (pypotrace 바인딩) 또는 potrace CLI(subprocess) | pypotrace는 빌드 까다로움 → CLI 호출이 배포 단순. 또는 순수파이썬 대안 검토 |
| 글리프 주입 | **fontTools** (이미 설치됨 4.63.0) | `fontTools.pens.t2CharStringPen` / `ttGlyphPen`, `fontTools.fontBuilder.FontBuilder`로 빈 폰트 골격 생성 |
| 인코딩 | fontTools + brotli(설치됨) | WOFF 출력 |

### 5.2 fontTools 글리프 조립 (핵심)
- `FontBuilder(unitsPerEm=1000, isTTF=True)`로 빈 TTF 골격 생성 → `setupGlyphOrder`, `setupCharacterMap`, `setupGlyf`, `setupHorizontalMetrics`, `setupHorizontalHeader`, `setupNameTable`, `setupOS2`, `setupPost`.
- Potrace path → fontTools pen 변환 어댑터 1개만 잘 만들면 됨(베지어 cubic → quadratic 변환 주의: TrueType은 quadratic. CFF면 cubic 그대로).
- 권장: **TTF(glyf, quadratic)** 골격. cubic→quadratic 변환은 `fontTools.pens.cu2quPen` 사용.

### 5.3 무료티어 메모리/속도
- Potrace는 가볍고 빠름(글자당 수 ms~수십 ms). 60자도 1초 내외 예상.
- OpenCV-headless는 ~수십 MB. Pillow만으로 끝낼 수 있으면 더 가벼움 → **우선 Pillow+numpy로 시도, 부족할 때만 OpenCV 추가**.
- **AI 모델은 메인 엔진에 절대 안 섞기**(메모리 격리). 비AI 글리프 캡처 엔진은 추가 ML 의존성 0.
- 동시성: 현재 `main.py`의 Semaphore(3) + run_in_executor 패턴 그대로 적용. 글리프 조립도 CPU 집약이므로 스레드풀로.
- 페이로드: 60셀 PNG를 한 번에 보내면 2MB 상한 초과 가능 → **셀당 개별 전송 + 서버 누적**, 또는 셀 이미지를 다운스케일/이진화 후 전송. 계약의 `MAX_IMAGE_PNG_BYTES` 재설계 필요(§6).

---

## 6. 파라미터 / 데이터 계약 영향 (`packages/core/src/index.ts`)

> Shared-Agent 경유 변경. 프론트·엔진 동시 갱신(파일 주석 규칙).

### 6.1 글리프 캡처 데이터 모델 (신규 제안)
```ts
/** 글자별 입력 한 칸 */
export interface GlyphCapture {
  char: string;            // 대상 글자 'a' 등 (TARGET_CHARSET 중 1)
  imagePng: string;        // 해당 셀 PNG dataURL (data:image/png;base64,...)
  // 선택: 클라이언트가 잉크 바운딩박스/베이스라인을 미리 계산해 보내면 서버 부담↓
  inkBox?: { x: number; y: number; w: number; h: number };
}

/** 글자 분류(메트릭 정규화용) — 어센더/엑스하이트/디센더 그룹 */
export type GlyphMetricClass = "ascender" | "xHeight" | "descender" | "capital" | "digit";

/** 안 그린 글자 채움 정책 */
export type FillPolicy = "blank" | "baseFont" | "ai";

/** 글리프 캡처 기반 폰트 생성 요청 (신규 엔드포인트 /generate-handwriting) */
export interface HandwritingGenerateRequest {
  glyphs: GlyphCapture[];   // 사용자가 그린 글자들(부분 가능)
  fillPolicy: FillPolicy;   // 안 그린 글자 처리
  format?: FontFormat;
  // 가이드 기준값(em-square 1000 기준 라인 위치). 서버 기본값 있음.
  metrics?: { baseline: number; xHeight: number; capHeight: number; ascender: number; descender: number };
}

export interface HandwritingGenerateResponse {
  fontBase64: string;
  format: FontFormat;
  fontFamily: string;
  generatedBy: "handwriting" | "handwriting+baseFont" | "ai";  // 정직성: 무엇으로 만들었는지
  drawnCount: number;       // 직접 그린 글자 수
  filledCount: number;      // 자동 채운 글자 수
}
```

### 6.2 글자 분류 테이블 (메트릭 정규화 단일 출처)
- `TARGET_CHARSET` 각 글자 → `GlyphMetricClass` 매핑 상수를 core에 추가.
  - 어센더: b d f h k l (소문자 중 위로 솟는)
  - 디센더: g j p q y
  - 엑스하이트: a c e m n o r s u v w x z, i t(근사)
  - 대문자: A–Z → capital, 숫자 → digit
- 엔진/프론트가 같은 표로 가이드라인·정렬·사이드베어링 처리.

### 6.3 기존 계약 영향
- 기존 `/generate`(슬라이더 변형)는 **그대로 유지**. 글리프 캡처는 **별도 엔드포인트**로 추가(파괴적 변경 회피).
- `GenerateResponse.generatedBy`는 현재 `"traditional"` 고정 → 유니온 확장(`"traditional" | "handwriting" | ...`) 필요.
- `MAX_IMAGE_PNG_BYTES`(2MB): 단일 이미지 기준. 글리프 다건 전송 시 **셀당 상한 + 총합 상한** 둘 다 정의 필요(예: 셀당 200KB, 총 5MB). 또는 셀별 개별 업로드 API.

---

## 7. 무료 vs 유료 라인 (CLAUDE.md §2 비용 철칙)

| 기능 | 라인 | 근거 |
|---|---|---|
| 슬라이더 변형(현재) | **무료** | 로컬 fontTools, 비용0 |
| 부분 스타일 추출(§2-iii) | **무료** | 로컬 이미지 분석, 비용0 |
| 글리프 직접 캡처(§1) — N자 직접 작성 | **무료** | Potrace+fontTools 로컬, 비용0. 핵심 가치를 무료로 제공해 유입 |
| 안 그린 글자 = 베이스폰트 채움(§2-ii) | **무료** | 로컬, 비용0 |
| 안 그린 글자 = **AI 자동완성**(§3) | **유료** | GPU/외부 API 비용 발생. `ENABLE_AI_FONT` OFF 기본, 유료 사용자 전용, "AI 생성" 라벨 |

**라인 그리는 원칙**: "내가 직접 그린 글씨"는 전부 무료(전통 방식·비용0). "내가 안 그린 걸 AI가 대신 그려주는 것"만 유료. 토스 대비: 핵심 기능(직접 캡처) 앱 내 완결, 외부 다운로드 강제 금지.

---

## 8. 단계별 착수 플랜 (빌더용)

### MVP-A (1순위, 가장 빠른 가치) — 부분 스타일 추출
- Engine-Agent: 사용자 잉크에서 평균 두께/기울기/곡률 측정 → 기존 `AXIS_MAP`에 자동 매핑하는 분석기 추가. 기존 `/generate` 재활용.
- FE-Agent: 캔버스 "미반영" 라벨 제거 → "이 글씨의 느낌을 폰트에 반영" 버튼.
- 의존성: Pillow+numpy(가벼움). **가장 적은 노력으로 "내 글씨 반영" 첫 실현.**

### MVP-B (1순위 본진) — 글리프 직접 캡처
1. Shared-Agent: §6 계약 추가(`GlyphCapture`, 글자 분류표, 신규 엔드포인트 타입).
2. FE-Agent: 그리드 캔버스 + 가이드라인 + 힌트 글자 + 진행률 + IndexedDB 저장(§4).
3. Engine-Agent: 전처리(Pillow/OpenCV) → Potrace → fontTools 글리프 주입 → WOFF. 신규 `/generate-handwriting`. 채움 정책(blank/baseFont).
4. Verify: 그리기 → 26자 캡처 → WOFF 다운로드 → 실제로 내 글씨로 렌더 e2e.

### Phase 2 후반 (유료) — AI 자동완성
- 별도 워커/인스턴스로 격리. `ENABLE_AI_FONT` 게이트. "AI 생성" 라벨. 결제 추상화 뒤에.

---

## 9. 리스크 / 정직 메모
- **벡터화 품질이 체감 품질을 좌우**: 펜 끊김·구멍 처리·방향(winding)이 가장 흔한 버그 원천. 초기엔 "힌트 글자 따라쓰기 + 두꺼운 펜"으로 입력 품질을 높여 우회.
- **노동량이 최대 이탈 요인**: "26자만 그려도 폰트 나옴 + 나머지 베이스폰트 채움 + 세션 저장"으로 완화. 한 번에 다 시키지 말 것.
- **"진짜 내 글씨"의 정직한 범위**: 직접 그린 글자만 진짜 내 글씨. 채운 글자는 명시. AI는 "흉내"로 라벨.
- **무료티어**: 비AI 경로는 가볍다(걱정 적음). AI만 메모리/GPU 부담 → 반드시 격리·게이트.
- 본 문서는 설계 제안이며 코드 변경 없음. 계약 변경은 Shared-Agent 경유 필수.
