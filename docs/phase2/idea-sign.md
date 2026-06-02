# Phase 2 — "나만의 싸인(서명) 생성기" MVP 스펙

> 작성: 싸인(서명) 생성기 기획 에이전트 / **코드 수정 없음, 설계 문서.**
> 전제: 1인 운영 · Oracle 무료티어 · 비용 0 기본 · AI는 유료/기본 OFF · 향후 토스 미니앱.
> 재사용 자산: `apps/font/engine/generator.py`(가변폰트 변형·합성 shear·시드 펜 디스토션·waviness·contrast·roundness), `packages/core/src/index.ts`(FontParams/STYLE_PRESETS/포맷 계약), `apps/font/engine/font_loader.py`(OFL 폰트 캐시), `apps/font/frontend`(BFF·스튜디오 패턴).

---

## 0. 한 줄 결론 + 1순위 MVP

**한 줄 결론**: 서명 생성기는 **별도 앱 `apps/sign`으로 신설**하되 엔진은 폰트 엔진의 변형 파이프라인을 그대로 빌려 쓴다. 핵심 가치는 "폰트 파일"이 아니라 **한 장의 투명 PNG/SVG 서명 이미지**다 — 그래서 출력 1순위는 폰트가 아니라 **벡터 SVG 패스 + 고해상 투명 PNG**다.

**1순위 MVP**: **이름 입력 → 흘림체(CRSV/기울기/waviness) 변형으로 서명형 렌더 → 시드로 N종 변형 갤러리 → 한 종 선택 → 투명 PNG/SVG 내보내기.** 플러리시(앞뒤 장식 획)·밑줄은 **절차적 SVG 오버레이**로 합성(폰트 글리프 변형과 분리). 한글은 같은 흐름에 한글 베이스폰트 + 합성 shear로 동작.

이유: ① 서명은 "글자 모음"이 아니라 **단일 그래픽 자산**이라 폰트 파일보다 PNG/SVG가 본질에 맞다. ② 폰트 엔진은 글리프 단위 변형만 하므로 **글자 연결·플러리시·밑줄은 엔진 밖 SVG 합성**이 정직하고 빠르다. ③ 신규 앱이지만 엔진 코어를 공유해 추가 원가가 거의 0.

---

## 1. 생성 방식 (비AI 우선, 기존 자산 재사용)

서명 한 장 = **(A) 글자 본체** + **(B) 연결/장식 오버레이**. A는 기존 폰트 엔진, B는 신규 SVG 합성 레이어로 분리한다.

### (A) 글자 본체 — 기존 엔진 그대로 재사용 [REAL]
입력한 이름 텍스트를 변형된 폰트로 렌더해 **글리프 윤곽선(SVG 패스)** 으로 뽑는다. `generator.py`의 자산을 그대로 쓴다:
- **흘림체화**: `cursive`(CRSV 축, 라틴 Recursive 전용) + `slant`(slnt 축/합성 shear) + `waviness`(사인 물결 워프)의 조합. 기존 `STYLE_PRESETS`의 `elegant`(우아한 필기, cursive 1·slant -12·contrast 0.5)가 서명 무드의 출발점.
- **괴상함/손맛**: `weirdness`(시드 RNG 지터 + 베이스라인 wobble) → 같은 이름이라도 **시드만 바꿔 N종 변형**(주사위). `_glyph_seed_rng(seed, glyph_name)`가 이미 결정적 재현을 보장.
- **획 대비/둥글기**: `contrast`(가로↔세로 굵기차 근사), `roundness`(모서리 스무딩)로 펜촉 느낌.
- **자간 압축**: `letterSpacing` 음수로 글자를 바짝 붙여 서명 특유의 밀도를 만든다(연결의 1차 근사).
- 한글: Pretendard VF 베이스 + 합성 shear + weirdness + 음수 자간 → "이름 흘림". CRSV/CASL/MONO 없음(폰트에 축 없음)은 폰트 앱과 동일하게 숨김.

> 즉, **새 변형 알고리즘을 만들 필요가 없다.** 기존 `generate_font`가 내놓는 폰트로 텍스트를 글리프 패스화하면 본체가 완성된다.

### (B) 글자 연결 / 플러리시 / 밑줄 — 신규 절차적 SVG 합성 레이어
폰트 글리프 변형으로는 표현 못 하는 부분. 새 모듈에서 SVG 패스를 **수학적으로 생성**해 본체 위/아래/앞뒤에 합성한다. 난이도 정직히 분류(아래 표 참조):
- **베이스라인 연결선(글자 잇기 근사)** [REAL·중난이도]: 글자 본체를 음수 자간으로 붙인 뒤, 글자 사이 하단에 **가는 베지어 곡선**을 절차적으로 그어 "이어진 듯한" 인상을 만든다. 진짜 리거처(글리프 합체)가 아니라 **연결선 오버레이**임을 코드/UX에 명시.
- **앞뒤 플러리시(장식 획)** [REAL·중난이도]: 이름 앞/뒤에 **시드 기반 베지어 곡선**(루프·꼬리·소용돌이)을 절차적으로 생성. 시작점=첫 글자 좌상단, 끝점=마지막 글자 우하단에 앵커. 진폭/회전수/방향을 무드 파라미터로 노출.
- **밑줄/스트로크** [REAL·저난이도]: 이름 폭에 맞춘 1~2획의 손맛 곡선(waviness 재사용). 끝을 가늘게(테이퍼) 처리.
- **낙관(한글 도장) 느낌** [REAL·저난이도/PREVIEW]: 빨간 사각/원 테두리 + 이름 한두 글자 SVG. 단순 도형은 [REAL] SVG, 전각 텍스처/번짐은 [PREVIEW] PNG 효과.

### 시드 N종 변형 갤러리
하나의 이름 + 무드에 대해 `seed`만 바꿔 6~12종을 동시 생성(폰트 앱 `VariationGallery` 패턴 재사용). 플러리시도 같은 seed로 변주되어 매번 다른 장식이 나온다. **결정적**이라 마음에 든 seed를 다시 부르면 동일 결과.

---

## 2. 실현성 분류표 (정직하게)

| 기능 | 분류 | 근거 / 난이도 |
|------|------|--------------|
| 이름 텍스트 → 변형 폰트 글리프 패스 | **[REAL]** | 기존 `generate_font` 결과 폰트로 렌더 → opentype.js/HarfBuzz로 패스 추출. 저난이도 |
| 기울기·흘림(cursive)·물결·괴상함·자간 | **[REAL]** | `generator.py`에 이미 구현된 축/효과 그대로 |
| 밑줄 / 스트로크 | **[REAL]** | 절차적 SVG 곡선 1~2획. 저난이도 |
| 앞뒤 플러리시(장식 획) | **[REAL]** | 시드 베지어 합성. **중난이도**(자연스러움 튜닝 필요). 폰트와 무관한 별도 패스 |
| 글자 연결(베이스라인 연결선 근사) | **[REAL, 근사]** | 연결선 오버레이로 "이어 보이게". **진짜 리거처/필기 연속 획 아님** — UX에 "연결 근사"로 고지 |
| 진짜 리거처(글리프 합체·연속 필기 스트로크) | **[AI/후순위]** | 폰트 보간으론 불가. 한 붓 흘림은 스타일 합성(AI Phase) 영역 |
| 한글 서명(이름 흘림 + 낙관 도형) | **[REAL]** | Pretendard 변형 + 합성 shear + SVG 도형. 단 한글은 CRSV 없어 "흘림"은 shear/weirdness/자간으로만 근사 |
| 투명 PNG(고해상) | **[REAL/PREVIEW]** | SVG → 래스터(브라우저 Canvas 또는 서버 resvg/Pillow). 종이 질감/번짐은 [PREVIEW] |
| SVG 패스(벡터) | **[REAL]** | 글리프 패스 + 오버레이 패스 결합. 가장 본질적 출력 |
| 선택적 폰트 파일(서명을 글리프로) | **[REAL, 제한적]** | 단일 "서명" 글리프를 한 코드포인트에 담은 폰트는 가능하나 수요 작음. 후순위 |
| "안 그린 펜글씨 스타일" 합성 | **[AI]** | 유료/기본 OFF. Phase F |

> 핵심 정직성 메시지(UX에 노출): "**공개 폰트를 변형해 만든 서명 이미지**이며, 연결/장식은 절차적으로 합성한 것입니다. 사용자가 직접 쓴 필체가 아닙니다." (plan.md 정직성 원칙)

---

## 3. 출력

| 포맷 | 용도 | 무료/유료 | 구현 |
|------|------|----------|------|
| **투명 PNG(저해상, 워터마크)** | 미리보기·공유·개인용 | 무료 | SVG → Canvas 래스터, 작은 배율 + 모서리 워터마크 |
| **투명 PNG(고해상 2x~4x, 워터마크 없음)** | 문서 삽입·이메일 서명·굿즈 | **유료** | 서버 resvg/Pillow 또는 고배율 Canvas |
| **SVG 패스(벡터)** | 무한 확대·인쇄·디자인 작업 | **유료** | 글리프+오버레이 패스 병합, 색/배경 분리 |
| **PDF(서명 도장본)** | 계약서 첨부 | 유료(후순위) | SVG → PDF 1페이지 |
| **선택적 폰트(WOFF)** | "이 서명을 폰트로" 니치 | 유료(후순위) | 기존 엔진 포맷 경로 재사용 |

활용 동선 명시: **문서(워드/PDF 도장)·이메일 서명(고해상 투명 PNG)·SNS/굿즈(스티커형 PNG)**. plan.md "한 시야 처리"에 따라 내보내기는 미리보기 옆 고정 액션바에 둔다.

---

## 4. 앱 구조 권고

### 권고: **신규 앱 `apps/sign/{frontend,engine}` 신설** (단, 엔진 코어는 공유)
- **토스 정합**: 토스는 "핵심기능이 다르면 별도 앱 허용". 폰트 생성(글자 묶음 폰트 파일) vs 서명 생성(단일 그래픽 자산)은 **정체성이 명확히 다름** → 유사앱 중복 회피 OK. 서브경로 `/sign`으로 SEO 독립 랜딩("내 서명 만들기" 키워드).
- **엔진 중복 금지(CLAUDE.md §3 경계 규칙)**: `apps/sign/engine`은 변형 로직을 **복붙하지 않는다.** `generator.py`의 변형 파이프라인을 `packages/`로 끌어올려 공유한다(아래 공통화 포인트). sign 엔진은 "텍스트→글리프 패스 추출 + 오버레이 합성 + 래스터화"만 신규로.
- 대안(가벼운 길): 별도 앱이 부담이면 `apps/font` 안에 모드 추가도 가능하나, **토스 앱 분리·SEO·도메인 전략상 별도 앱이 깔끔**. 권고는 신규 앱.

### `packages/`에서 재사용/공통화할 것 (Shared-Agent 경유)
1. **`packages/core`**: 타입 계약 단일 출처. 기존 `FontParams`·`STYLE_PRESETS`·`FONT_FORMATS` 재사용 + 신규 `SignParams`·`SignStylePreset`·`SignExportFormat` 추가(§7).
2. **`packages/font-engine`(신규 권고)**: `generator.py`의 변형 코어(`generate_font`, `_transform_glyf_coordinates`, `clamp_params`, `font_loader`)를 **Python 공유 패키지로 승격**. font·sign 엔진이 동일 코드를 import. (현재 `packages/`는 TS만 → Python 공유 패키지 디렉터리 규약 신설 필요. 그 전 임시로는 sign 엔진이 font 엔진 모듈을 sys.path로 참조하되, 정식화는 Shared-Agent가.)
3. **`packages/ui`**: `VariationGallery`·슬라이더·세그먼티드 컨트롤·프리셋칩·`SiteChrome` 등 폰트 스튜디오 UI 컴포넌트를 공통화해 sign 프론트가 재사용.
4. **`packages/seo`**: title/description/OG/JSON-LD 그대로.

### home 카드 / infra 라우팅 추가 항목
- **home**: `home/app/page.tsx`에 "나만의 서명 만들기" 카드 추가(폰트 카드 옆). 링크 `/sign`.
- **infra/nginx (`webapp.conf`)**:
  - `upstream sign_frontend { server 127.0.0.1:3002; }`
  - `location /sign { proxy_pass http://sign_frontend; ... }` (폰트 블록 복제, basePath=`/sign`)
  - sign 엔진은 **loopback 전용·nginx 비노출**, sign 프론트 BFF(`/sign/api/generate`)만 호출(폰트 앱과 동일 보안 패턴).
  - `client_max_body_size`는 그린-서명 입력 대비 기존 4m 유지.

---

## 5. UX (plan.md UX 원칙 준수: 한 시야·시의성·균형·반응형)

핵심 흐름 = **이름 입력 → 무드 선택 → N종 변형 → 선택 → 내보내기**, 한 화면에서.

1. **이름 입력**: 라틴/한글 토글(세그먼티드). 텍스트 입력(예: "Yong Gun" / "용군"). 선택적으로 "직접 그리기" 탭(`DrawingCanvas` 재사용) — Phase D 스타일 추출 자리만 마련, MVP는 텍스트 우선.
2. **스타일/무드 선택**: 프리셋 칩 4~6종 — `우아한 필기`/`날렵한 흘림`/`둥근 손맛`/`각진 모던`/`낙관(한글)`/`미니멀 밑줄`. 각 칩 = SignParams 묶음(축 + 플러리시/밑줄 on·강도). 비전문가 선택 피로 해소.
3. **N종 변형 갤러리**: 선택 무드 + 같은 이름으로 6~12종(seed 변주) 카드 그리드. **주사위 버튼**으로 새 시드 셋. 카드 = 실시간 SVG 미리보기(투명 배경 체커).
4. **선택 & 미세조정(아코디언/고급)**: 한 종 선택 → 기울기·흘림·굵기·플러리시 강도·밑줄 on/off 슬라이더로 미조정. 큰 미리보기는 **sticky**.
5. **내보내기(항상 보이는 액션바)**: 잉크색/배경(투명·흰·종이) → PNG/SVG 버튼. 무료=저해상+워터마크, 유료 게이트=고해상·SVG·워터마크 제거.
- **모바일**: 프리뷰 상단 고정 + 컨트롤 하단 시트 + 내보내기 고정 바(폰트 스튜디오 모바일 패턴 재사용). 터치 타깃·키보드 동등 도달.
- **시의성**: 미리보기와 "받기"가 스크롤과 무관하게 항상 노출.

---

## 6. 수익화 (개인 브랜드 가치 → 유료 전환 후보)

서명은 "내 브랜드"라 감정·실무 가치가 커 폰트 변형보다 결제 저항이 낮다. idea-monetization.md 라인과 정합.

| 항목 | 무료 (유입 미끼) | 유료 (전환 트리거) |
|------|-----------------|-------------------|
| 생성/미리보기 | 무제한, 라틴+한글, N종 갤러리 | 동일(미끼 유지) |
| PNG | 저해상(예: 600px) + **워터마크** | **고해상 2x~4x, 워터마크 없음** |
| SVG 벡터 | ✕ | **○ (벡터 다운로드)** |
| 플러리시/프리셋 | 기본 2~3종 | 전체 묶음 + 강도 고급 |
| 라이선스 | 개인용 | **상업용 라이선스 증서**(서명 로고화 대비) |
| 다포맷(PDF 도장본·폰트) | ✕ | ○ |
| 보관 | 즉시 다운로드 | 클라우드 보관·재다운로드 |

- **게이팅 트리거**: 다운로드 클릭 → 무료는 워터마크 PNG 즉시, "고해상·SVG·워터마크 제거" 업셀 모달.
- **요금(안)**: 단건 **2,900~4,900원/서명**(고해상+SVG+개인 라이선스), 상업 라이선스 +α, Pro 구독에 묶음. (가격은 가정 — 검증 후 갱신.)
- **그로스**: 워터마크 = 광고(서비스명). 생성 서명 OG 카드 → "이 서명 어떻게 만들었어?" 유입. SEO "내 서명 만들기/사인 만들기/전자서명 이미지".
- **AI(기본 OFF·Phase F)**: "안 그린 펜글씨 스타일 합성"은 크레딧 과금 + **"AI 생성" 라벨**(토스 의무).
- 토스: 결제=인앱결제 추상화(`PaymentProvider`), 외부 다운로드 대신 미니앱 보관함 완결, 외부 광고망 금지 — idea-monetization.md §5 그대로 적용.

---

## 7. 계약 영향 (`packages/core` 하위호환 추가안)

기존 `FontParams`/`FONT_FORMATS`는 **변경하지 않는다**(폰트 앱 무영향). sign 전용 타입을 신규 export로 추가.

```ts
// === 서명(Sign) 전용 계약 — 하위호환 신규 추가 ===

/** 서명 글자 본체는 FontParams 부분집합을 재사용(흘림 관련 축 중심). */
export interface SignParams {
  text: string;              // 서명할 이름(라틴/한글)
  script: FontScript;        // "latin" | "hangul" 재사용
  // --- 글자 본체(폰트 엔진 변형) — FontParams 일부 재사용 ---
  weight: number;
  slant: number;
  cursive: number;           // 라틴 전용(한글은 무시)
  weirdness: number;
  waviness: number;
  contrast: number;
  roundness: number;
  letterSpacing: number;     // 서명은 보통 음수(밀착)
  seed: number;              // N종 변형 키
  // --- 연결/장식 오버레이(신규, 엔진 밖 SVG 합성) ---
  connect: number;           // 0~1 글자 연결선 강도(베이스라인 근사)
  flourish: SignFlourish;    // 앞뒤 장식 획
  underline: SignUnderline;  // 밑줄/스트로크
  seal: SignSeal | null;     // 한글 낙관(도장) 느낌, 없으면 null
}

export interface SignFlourish {
  enabled: boolean;
  intensity: number;         // 0~1 진폭/길이
  loops: number;             // 소용돌이/루프 수 0~3
  position: "lead" | "trail" | "both"; // 앞/뒤/양쪽
}

export interface SignUnderline {
  enabled: boolean;
  strokes: number;           // 1~2획
  waviness: number;          // 0~1 곡선 흔들림(엔진 waviness와 별개, 오버레이용)
  taper: number;             // 0~1 끝 가늘기
}

export interface SignSeal {
  shape: "square" | "circle";
  text: string;              // 도장 안 글자(보통 1~2자)
  color: string;             // 보통 빨강 계열(CSS color)
}

/** 서명 무드 프리셋 — SignParams 부분집합 묶음(프론트 적용). */
export interface SignStylePreset { id: string; label: string; params: Partial<SignParams>; }

/** 서명 출력 포맷 — 폰트와 다름(이미지/벡터 중심). */
export type SignExportFormat = "png" | "png2x" | "png4x" | "svg" | "pdf" | "woff";
export const SIGN_FREE_FORMATS: SignExportFormat[] = ["png"];           // 저해상+워터마크
export const SIGN_PAID_FORMATS: SignExportFormat[] = ["png2x", "png4x", "svg", "pdf", "woff"];

/** 서명 생성 요청/응답(폰트 GenerateRequest와 분리). */
export interface SignGenerateRequest { params: SignParams; format?: SignExportFormat; }
export interface SignGenerateResponse {
  // 벡터는 svg 문자열, 래스터는 base64 PNG. 둘 중 형식에 맞는 필드만 채움.
  svg?: string;
  imageBase64?: string;
  format: SignExportFormat;
  appliedParams: SignParams;
  generatedBy: "baseFontVariation+proceduralOverlay"; // 정직성: 변형+절차합성
  watermarked: boolean;
}
```

- **하위호환**: 기존 export 불변, sign 타입은 전부 신규. font 앱은 영향 없음.
- `generatedBy`에 `"baseFontVariation+proceduralOverlay"` 신설로 "변형 글자 + 절차 합성 장식"임을 메타에 정직히 표기. AI 합성 추가 시 `"ai"`(idea-monetization 권장)와 별개 값으로 확장.
- `clampParams` 패턴을 본떠 `clampSignParams`(Partial→안전값) 공통 가드를 함께 추가 권장.

---

## 빌더 착수 체크리스트
- [ ] Shared-Agent: `packages/core`에 §7 sign 타입 추가(하위호환). `generator.py` 변형 코어를 `packages/font-engine`(Python 공유)으로 승격.
- [ ] Engine-Agent(sign): 텍스트→변형폰트→글리프 SVG 패스 추출(opentype.js or fonttools pen) + 플러리시/연결선/밑줄 절차 SVG 합성 + 래스터화(고해상 PNG). 워터마크 분기. 동시성 세마포어·BFF 보안 패턴은 font 엔진 그대로.
- [ ] FE-Agent(sign): `apps/sign/frontend` basePath=`/sign`. 이름입력→무드칩→N종 갤러리(`VariationGallery` 재사용)→미세조정→내보내기 액션바. 모바일 시트.
- [ ] FE-Agent(home): home에 "서명 만들기" 카드.
- [ ] Infra-Agent: nginx `/sign` 라우팅(포트 3002), 엔진 loopback 비노출.
- [ ] Audit: 워터마크/AI 라벨/정직성 고지("공개폰트 변형+절차합성, 직접 쓴 필체 아님") · 비용 0 가드 확인.

*본 문서는 설계안이며 코드 변경을 포함하지 않는다. 가격·해상도 수치는 검증 전 가정.*
