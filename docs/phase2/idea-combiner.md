# Phase 2 — "조합기(Combiner)" 기획 설계서

> 작성: 조합기 기획 에이전트 / **코드 수정 없음**, 설계 문서.
> 전제(CLAUDE.md·plan.md): 1인 운영 · Oracle 무료티어 · **비용 0 비AI 기본** · AI는 유료/기본 OFF · "AI 생성" 라벨 강제 · 한 시야(single viewport) UX · 토스 미니앱 정합.
> 현재 자산(읽고 확인): `apps/font`(라틴 Recursive + 한글 Pretendard 가변폰트 변형 → WOFF/TTF/WOFF2/OTF), `FontPreview`의 **Canvas → PNG 견본 내보내기**(질감/무늬/색 적용·투명 PNG 가능), `DrawingCanvas`(PNG dataURL 추출), `packages/ui`(Mascot/Sticker/BrushStroke/Card/Segmented/Chip 등 "소프트 iOS 문방구" 시스템), `packages/core`의 계약(`FontParams`/`StylePreset`/`PreviewStyle`/`FontFormat`), `home`(도구 카드 허브). 이미 `idea-character-emoji.md`가 **별도 `apps/sticker`**(절차적 표정/색 변주 PNG 팩)를 권고했고, `idea-monetization.md`가 **상업 라이선스+풀포맷+워터마크 제거**(P0, 무코스트)와 **팀/브랜드킷**(P3, B2B)을 언급했다.

---

## 0. 한 줄 결론 + 1순위

**한 줄 결론: "조합기"는 산만하게 새 창작 도구를 또 만드는 게 아니라, 이미 만든 결과물(폰트·스티커·서명·색)을 한 곳에서 묶어 "쓸 수 있는 한 벌"로 내보내는 (A) 브랜드 키트 조합기여야 가장 가치 있다.** 신규 생성 엔진이 거의 필요 없고(기존 자산 재사용 최대), 실무 구매 동기가 명확하며(키트=결제 트리거), 폰트앱·스티커앱을 잇는 모노레포 시너지 허브가 된다.

**1순위 권고: (A) 브랜드 키트 조합기** — 사용자가 만든 **폰트 + 색 팔레트 + 서명/로고 PNG(+ 스티커)** 를 하나의 **"키트"**(폰트 파일 + 로고/서명 PNG/SVG + `colors.json`/CSS 변수 + `@font-face` 스니펫 + **미리보기 시트 1장** + README)로 묶어 **ZIP**으로 내보낸다. 비AI·비용 0, 키트 ZIP·고해상·상업 라이선스가 자연스러운 유료 게이트.

> 보조 권고: **(C) 스타일 리믹스**는 폰트앱 *내부* 작은 기능으로 흡수(별도 앱 금지), **(B) 캐릭터 파츠 조합**과 **(D) 글자+그림 스티커 메이커**는 이미 권고된 `apps/sticker`의 본체/하위기능이므로 조합기로 중복 신설하지 않는다. 즉 "조합기"의 고유 자리 = **키트 묶음 허브**.

---

## 1. 후보 비교 (가치·난이도·차별성·기존자산 재사용도·수익성)

평가: ★1(낮음)~★5(높음). 난이도는 ★많을수록 어려움.

| 후보 | 한 줄 정의 | 가치 | 난이도 | 차별성 | 기존자산 재사용 | 수익성 | 비AI | 비용 |
|------|-----------|:----:|:------:|:------:|:--------------:|:------:|:----:|:----:|
| **(A) 브랜드 키트 조합기** | 폰트+팔레트+서명/로고(+스티커)를 한 "키트" ZIP으로 묶어 내보내기 | ★★★★★ | ★★☆☆☆ | ★★★★☆ | ★★★★★ | ★★★★★ | O | 0 |
| (B) 캐릭터/이모지 파츠 조합 | 얼굴·표정·소품·색 파츠 조합으로 캐릭터/이모티콘 세트 | ★★★★☆ | ★★★☆☆ | ★★★★☆ | ★★★☆☆ | ★★★☆☆ | O | 0 |
| (C) 스타일 리믹스 조합기 | 두 프리셋/폰트 특징(굵기 A·곡률 B)을 섞어 새 스타일 | ★★★☆☆ | ★★☆☆☆ | ★★☆☆☆ | ★★★★★ | ★★☆☆☆ | O | 0 |
| (D) 글자+그림 스티커/로고 메이커 | 내 글씨 + 도형/이모지로 로고·뱃지·스티커 | ★★★★☆ | ★★★☆☆ | ★★★☆☆ | ★★★★☆ | ★★★☆☆ | O | 0 |

### 후보별 평가 근거

- **(A) 브랜드 키트 조합기 — 1순위**
  - *가치★★★★★*: 자영업·인스타 셀러·소규모 브랜드·청첩장/굿즈 제작자의 실무 단위는 "글자 하나"가 아니라 **"한 벌(폰트+색+로고)"**. 키트는 그대로 쓸 수 있는 완제품이라 지갑을 여는 동기가 가장 직접적(monetization 문서의 "결제는 실무 사용권에서 나온다"와 일치).
  - *난이도★★☆☆☆ / 비AI·비용0*: 새 생성 엔진 거의 불필요. 폰트는 기존 `/generate` 그대로, 미리보기 시트는 **이미 있는 `FontPreview`의 Canvas→PNG 경로 재사용**, 팔레트는 클라 상태, ZIP은 클라 라이브러리(JSZip류)면 **서버 0**으로 시작 가능.
  - *차별성★★★★☆*: 경쟁사(Calligraphr·Fontself 등)는 폰트 파일까지만 준다. "**색+서명+로고+`@font-face` 스니펫까지 한 벌로**"는 실무 묶음 가치가 분명하고, 토스/한국 UX에 맞춘 한국어 키트는 빈 시장.
  - *재사용★★★★★*: 폰트앱 결과·`FontPreview` PNG·`packages/ui`·`packages/core` 계약을 거의 그대로 흡수. 스티커앱 출시 후엔 스티커도 키트 슬롯에 합류.
  - *수익성★★★★★*: 키트 ZIP 자체가 유료 게이트(고해상·상업 라이선스·워터마크 제거). monetization 문서의 P0(풀포맷+상업 라이선스+워터마크 제거)와 P3(브랜드킷 B2B)를 **하나의 화면에서 단건/구독으로 동시 수익화**.

- **(B) 캐릭터/이모지 파츠 조합**: 놀이성·바이럴 강하고 가치 높지만, `idea-character-emoji.md`가 이미 **`apps/sticker`의 핵심(절차적 표정/색 변주 + 파츠 합성)** 으로 상세 설계함. 조합기로 다시 만들면 **토스 유사앱 중복**·모노레포 중복. → 조합기 신규 후보로는 부적합(스티커앱에서 구현).

- **(C) 스타일 리믹스 조합기**: "굵기는 A 프리셋, 곡률은 B 프리셋" 식 파라미터 블렌딩. 기존 `FontParams`/`STYLE_PRESETS`만으로 즉시 가능하고 재사용 최고지만, **별도 앱이 될 만큼 크지 않다**(슬라이더 2~3개 추가 수준). 차별성·수익성 약함. → **폰트앱 내부 미니 기능**으로 흡수(아래 3절). "조합기"라는 독립 정체성엔 미달.

- **(D) 글자+그림 스티커/로고 메이커**: 내 손글씨 + 도형/이모지 합성 로고/뱃지. 가치 높지만 이것도 `idea-character-emoji.md`의 **(d) "내 글씨+그림" 합성**(스티커앱 S5, font↔sticker 크로스앱)으로 이미 예약됨. 단독 "로고 메이커"는 스티커앱 또는 키트 조합기의 **로고 슬롯**에서 부분 충족. → 조합기 본체보다는 키트의 입력 채널.

**결론**: B·D는 스티커앱이, C는 폰트앱이 흡수한다. 네 후보 중 **어느 앱에도 아직 자리가 없고, 모든 앱의 결과를 모으는 상위 레이어가 비어 있는 것이 (A)** 다. 그래서 "조합기 = 브랜드 키트 허브"가 가장 가치 있고 중복이 없다.

---

## 2. 1순위 (A) 브랜드 키트 조합기 — MVP 스펙

### 2.1 한 줄 정의
"내가 만든 폰트 한 벌 + 색 팔레트 + 서명/로고(+스티커)를 모아 **바로 쓸 수 있는 한 벌(키트)** 로 묶어 내려받는다."

### 2.2 입력 (전부 기존 자산/클라에서 수집 — 신규 생성 없음)
1. **폰트**: 폰트앱에서 만든 설정. 두 경로 지원.
   - (a) 폰트앱에서 "이 폰트 키트에 담기" → 키트로 `FontParams`+`script` 전달(앱 내 완결, 외부 다운로드 아님).
   - (b) 조합기 자체의 압축 미니 컨트롤(프리셋 칩 + weight/slant 슬라이더)로 즉석 지정.
   - 키트는 필요 시 기존 `/api/generate`를 호출해 **선택 포맷의 폰트 파일**을 받는다(폰트앱과 동일 경로, 중복 엔진 없음).
2. **색 팔레트**: 4~6색. 입력 방법 = (i) 프리셋 팔레트 칩(문방구 캔디 토큰 기반: butter/coral/mint/plum…), (ii) 컬러 피커, (iii) **서명/로고 PNG에서 대표색 자동 추출**(클라 Canvas 픽셀 샘플링, 비AI). 잉크색/배경색은 `PreviewStyle`과 연동.
3. **서명/로고**: `DrawingCanvas`로 직접 그리기(투명 PNG dataURL) **또는** PNG 업로드(상한 `MAX_IMAGE_PNG_BYTES` 재사용). 흰 배경 제거(키 컬러 → 알파) 토글로 투명화. 벡터화(SVG)는 후순위(Potrace, 메모리 검토 후).
4. **(스티커앱 출시 후) 스티커 슬롯**: 스티커 세트 대표 N장을 키트에 첨부(크로스앱).
5. **키트 메타**: 키트 이름, 한 줄 설명(미리보기 시트·README에 인쇄).

### 2.3 조합 UI (한 시야 · plan.md 원칙)
- **데스크톱 2열**: 좌 = 컨트롤(아코디언: ① 폰트 ② 색 ③ 서명/로고 ④ 스티커 ⑤ 키트 정보), 우 = **sticky 키트 미리보기 시트**(폰트 견본 + 팔레트 띠 + 로고 배치를 한 장으로 합성한 라이브 프리뷰) + 항상 보이는 "키트 받기" 버튼.
- **모바일**: 상단 sticky 미리보기 시트 + 하단 고정 시트(컨트롤) + 하단 고정 "키트 받기" 바. 핵심 흐름(고르기 → 미리보기 → 받기) 한 화면 완결.
- **컨트롤 과밀 금지**: 빠른시작(프리셋 키트 템플릿 1탭) → 세부 → 고급(아코디언). 첫 화면은 "프리셋 키트 + 미리보기"만 가볍게.
- **프리셋 키트 템플릿**: "카페 간판 키트", "청첩장 키트", "인스타 셀러 키트" 등 = 폰트 프리셋 + 어울리는 팔레트 묶음(선택 피로 해소, 비전문가도 1탭 완성). `packages/ui`의 Mascot/Sticker로 문방구 톤 유지.

### 2.4 출력 (ZIP 키트 — 비AI, 서버 0안부터)
키트 ZIP 구조(MVP):
```
mybrand-kit/
├── font/  <fontFamily>.woff (무료) / +woff2/ttf/otf (유료 풀포맷)
├── logo/  signature.png (투명) [+ logo.svg 유료·후순위]
├── colors/ palette.json  +  palette.css ( :root{ --brand-1.. } )  + swatches.png
├── preview/ kit-sheet.png  (폰트 견본 + 팔레트 + 로고 한 장 — FontPreview Canvas 경로 재사용)
├── snippet/ font-face.css  (@font-face + 사용 예시)
├── LICENSE.txt  (개인=비상업 / 유료=상업 라이선스 증서, generatedBy/출처 명시)
└── README.txt   (키트 이름·설명·구성·출처 라벨: "공개폰트 변형/내 글씨/AI 생성")
```
- **개별 출력**도 제공: 미리보기 시트 PNG 단독, 팔레트 PNG/CSS 단독, 폰트 단독(기존 경로).
- **SVG/벡터 로고**는 Potrace 도입(메모리 검토) 후 유료 슬롯으로 추가 — MVP는 PNG로 충분.

### 2.5 비AI 실현성 (핵심: "새로 만들 게 거의 없다")
| 키트 구성 | 실현 방식 | 신규 의존성 | 비용 |
|----------|----------|------------|------|
| 폰트 파일 | 기존 `/api/generate`(format별) 그대로 호출 | 없음 | 0 |
| 미리보기 시트 PNG | `FontPreview`의 Canvas→PNG 로직 일반화(폰트+팔레트 띠+로고 합성) | 없음(클라 Canvas) | 0 |
| 팔레트 추출 | 업로드/그린 PNG 픽셀 다운샘플 + 빈도/거리 군집(간단 비AI) | 없음 | 0 |
| `palette.css` / `font-face.css` | 문자열 템플릿 | 없음 | 0 |
| 로고 투명화 | 키 컬러→알파(Canvas) | 없음 | 0 |
| ZIP 패키징 | 클라 JSZip류로 묶기(서버 0) → 트래픽 늘면 엔진에서 묶기 | JSZip(경량, 클라) | 0 |
| 로고 SVG 벡터화(후순위·유료) | Potrace | Potrace(**메모리 영향 검토 필수**) | 0 |
| AI 로고/팔레트 추천(유료·기본 OFF) | 외부 API | 환경변수 OFF | 유료 |

→ **MVP는 외부 API·서버 무거운 의존성 0.** 모든 합성은 브라우저 Canvas + 클라 ZIP. 엔진은 폰트 생성(기존)만. CLAUDE.md "전통 방식 기본·비용 0" 충족.

---

## 3. 앱 구조 — 권고: **신규 앱 `apps/kit`** (단, 1차는 frontend만, engine 없이)

### 3.1 신규 앱 vs 기존 앱 기능
- **폰트앱 내부 기능으로?** 폰트앱의 핵심 = "글자 스타일 → 폰트 파일". 키트는 "여러 결과물 → 쓸 수 있는 한 벌(브랜드 자산)"로 **입력·출력·사용맥락이 다르다.** 한 앱에 넣으면 UX가 흐려지고, 토스 전환 시 "한 앱 두 목적"으로 심사 모호.
- **권고: `apps/kit/frontend` 신규 앱** (CLAUDE.md "새 앱 추가 규칙" 준수).
  - **engine은 1차에 만들지 않는다**(서버 0안: 폰트는 폰트앱 `/api/generate` 재사용, 합성·ZIP은 클라). ZIP/SVG/대형 시트를 서버로 옮길 필요가 생기면 그때 `apps/kit/engine` 추가.
  - 토스 유사앱 규정: **핵심기능이 "묶음/브랜드 자산화"로 폰트·스티커와 명확히 다름** → 별도 앱 정당.
- **(C) 스타일 리믹스는 예외적으로 폰트앱 내부**: 별도 앱 가치 없음. `STYLE_PRESETS` 두 개를 고르면 키별 가중 보간(`mix∈[0,1]`)으로 `FontParams` 합성하는 작은 컨트롤을 `FontStudio`에 추가(아래 4.4 계약 제안). 키트 조합기에서도 같은 헬퍼를 import해 "리믹스 폰트"를 키트에 담을 수 있게 함.

### 3.2 공통 로직은 `packages/`로 (복붙 금지 — CLAUDE.md)
- `packages/ui`: **`FontPreview`의 Canvas→PNG 렌더러를 공용 헬퍼로 승격**(현재 `apps/font/frontend/components`에 있음 → Shared-Agent 경유, 키트 시트/스티커가 함께 사용). `DrawingCanvas`도 공용화(이미 `idea-character-emoji.md`가 동일 제안). Mascot/Sticker/Card/Segmented/Chip은 이미 공용.
- `packages/core`: 키트 계약(4.4) 추가 — `FontParams`/`StylePreset`/`PreviewStyle` 등 기존 단일 출처를 그대로 재사용·확장.
- **신규 `packages/kit-spec`(또는 core 하위)**: ZIP 디렉터리 규격·`palette.css`/`font-face.css` 템플릿·프리셋 키트 템플릿 상수. 프론트(+추후 엔진)가 같은 규격 참조.
- `home/`: 도구 카드 추가(현재 "준비 중" 자리 → "키트 공방"). `infra/nginx`: `메인도메인/kit` 라우팅 추가(CLAUDE.md 규칙).

### 3.3 모노레포/토스 정합 체크
- 핵심 기능 **앱 내 완결**: 폰트앱→키트 전달은 외부 다운로드가 아닌 앱 내 상태/세션 전달. 미니앱에선 보관함+공유로 완결, 웹은 직접 ZIP 다운로드(별도 코드경로 — monetization 문서의 분기와 동일).
- AI 슬롯(로고/팔레트 추천)은 환경변수 OFF 기본 + 결과물 "AI 생성" 라벨(`generatedBy`) 강제.
- 결제/로그인은 `PaymentProvider`/`AuthProvider` 추상화 재사용(monetization 문서 P0와 공유).

---

## 4. UX·수익화·계약

### 4.1 UX (plan.md 4절 원칙 충족)
- **한 시야**: 데스크톱=좌 컨트롤/우 sticky 시트+받기, 모바일=상단 시트/하단 컨트롤+고정 받기 바. 스크롤 없이 고르기→미리보기→받기.
- **시의성**: 키트 미리보기 시트와 "키트 받기"는 어느 단계에서도 항상 보이게(sticky/고정 바).
- **균형**: 프리셋 키트 1탭(빠른시작) → 색/로고 세부 → 풀포맷/벡터/AI(고급 아코디언). 첫 화면 가볍게.
- **반응형 일관성**: 그리기(`DrawingCanvas`)는 키보드 미지원이므로(주석 명시) **비드로잉 경로**(프리셋 키트 + 색 칩 + PNG 업로드)만으로도 키트 완성 가능하게.
- **문방구 톤**: Mascot가 빈 상태/완성 순간 안내, Sticker/마스킹테이프로 "키트 봉투" 느낌. 기존 디자인 시스템 그대로.

### 4.2 수익화 (monetization 문서와 정합 — 키트가 게이트를 한 화면에 모음)
| 항목 | 무료(유입 미끼) | 유료(전환 트리거) |
|------|----------------|-------------------|
| 미리보기 시트 | 무제한·워터마크 포함 | 워터마크 제거 |
| 폰트 포맷 | WOFF(개인용) | 풀포맷 TTF/OTF/WOFF2 |
| 키트 ZIP | 저해상 시트 + WOFF + 팔레트, 개인·비상업 | 고해상 시트 + 풀포맷 + **상업 라이선스 증서** + SVG 로고(후순위) |
| 팔레트/스니펫 | 기본 제공 | (락 없음 — 유입 가치) |
| AI 로고/팔레트 추천 | — | 크레딧, 환경변수 OFF 기본·"AI 생성" 라벨 |
| 브랜드킷 구독(B2B) | — | 다중 키트 보관·팀 공유·확장 상업 라이선스(monetization P3 흡수) |
- **게이팅 순간**: "키트 받기" 클릭 시 무료=워터마크/개인용 고지, **"상업·고해상·풀포맷 키트"** 업셀 모달. 가격은 monetization 단건(3,900~5,900원)·Pro/상업 구독 카탈로그 공유.
- **그로스 루프**: 키트 미리보기 시트를 OG 이미지로 한 공유 페이지(`/kit/k/[id]`) → SNS 공유 유입(SSR, `packages/seo` 규칙: 고유 title/description/OG/JSON-LD). 무료 시트 워터마크 = 서비스명 광고.

### 4.3 정직성/정책
- 키트 README·`LICENSE.txt`에 **출처 라벨** 인쇄: 폰트=공개폰트 변형/내 글씨/AI 생성 구분, 로고=내 그림/AI. `generatedBy` 항상 응답에 포함(토스 "AI 생성" 의무).

### 4.4 계약 영향 (`packages/core` 추가 제안 — 하위호환, 기존 `FontParams`/`GenerateRequest` 불변)

```ts
// ── (C) 스타일 리믹스: 폰트앱·키트 공용 헬퍼 (기존 FontParams 그대로 사용) ──
/** 두 프리셋/파라미터를 키별 가중치로 섞는다. mix=0 → a, 1 → b. 키별 mix 오버라이드 가능. */
export function mixParams(
  a: FontParams,
  b: FontParams,
  mix: number,                                 // 0~1 전역 블렌드
  per?: Partial<Record<keyof FontParams, number>> // 예: { weight: 0(=A), curvature: 1(=B) }
): FontParams; // 내부에서 clampParams로 강제. seed는 보간하지 않고 한쪽 채택.

// ── 브랜드 키트 계약 (apps/kit, packages/kit-spec 공유) ──

/** 팔레트: 브랜드 색 4~6개 + 잉크/배경(PreviewStyle와 연동). */
export interface BrandPalette {
  colors: string[];            // CSS color, 4~6개 권장
  ink: string;                 // 글자색
  bg: string;                  // 배경색("transparent" 허용)
  source: "preset" | "picker" | "extracted"; // 추출=비AI 픽셀 군집
}

/** 키트에 담는 로고/서명 이미지(투명 PNG, 후순위 SVG). MAX_IMAGE_PNG_BYTES 재사용. */
export interface KitLogo {
  png: string;                 // dataURL(투명 권장)
  svg?: string | null;         // 후순위(Potrace, 메모리 검토 후)
  origin: "drawn" | "uploaded";
}

/** 키트 구성. 폰트는 params로 들고 다니다 받기 시점에 /generate로 파일화(앱 내 완결). */
export interface BrandKit {
  name: string;
  description?: string;
  fontParams: FontParams;      // 리믹스 결과 포함
  script: FontScript;
  formats: FontFormat[];       // 무료=["woff"], 유료=FULL_FORMATS
  palette: BrandPalette;
  logo?: KitLogo | null;
  stickers?: string[];         // (스티커앱 출시 후) 대표 PNG dataURL들
  preview: PreviewStyle;       // 시트 합성에 사용
}

/** 키트 ZIP 빌드 요청/응답. 1차는 클라 빌드(서버 0) → 필요 시 엔진. */
export interface KitExportRequest {
  kit: BrandKit;
  commercial: boolean;         // 유료 게이트(상업 라이선스 + 워터마크 제거)
  highRes: boolean;
  useAi?: boolean;             // 기본 false. true는 유료 + 환경변수 ON일 때만
}
export interface KitExportResponse {
  zipBase64?: string;          // 서버 빌드 시
  watermarked: boolean;
  generatedBy: "procedural" | "ai"; // 정직성 라벨(항상 포함)
}
```
- **신규 상수**: `KIT_TEMPLATES`(카페 간판/청첩장/인스타 셀러 = 폰트 프리셋 + 팔레트), `KIT_ZIP_LAYOUT`(디렉터리 규격), `PALETTE_CSS_TEMPLATE`/`FONTFACE_CSS_TEMPLATE`. `MAX_IMAGE_PNG_BYTES`는 기존 값 재사용.
- 기존 `FontParams`·`GenerateRequest`·`GenerateResponse`·`PreviewStyle`·`STYLE_PRESETS`는 **불변**. 키트 타입은 분리 추가(하위호환).

---

## 5. 착수 순서 (가치-노력)
| 순위 | 항목 | 가치 | 노력 | 비용 | 비고 |
|------|------|:----:|:----:|:----:|------|
| **K1** | 키트 미리보기 시트(폰트+팔레트+로고 합성 PNG) — `FontPreview` Canvas 경로 일반화 | 매우 높음 | 낮음 | 0 | 첫 체감 가치·OG 소재 |
| K2 | 팔레트(프리셋 칩/피커/추출) + `palette.css`/`font-face.css` 스니펫 | 높음 | 낮음 | 0 | 실무 묶음 핵심 |
| K3 | 키트 ZIP 묶기(클라 JSZip, 서버 0) + 개인 라이선스 README | 높음 | 중 | 0 | 무료 완결 흐름 |
| K4 | 프리셋 키트 템플릿(비드로잉 경로) | 높음 | 낮음 | 0 | 비전문가 1탭 완성 |
| K5 | (C) 스타일 리믹스(`mixParams`) — 폰트앱 + 키트 공용 | 중 | 낮음 | 0 | 별도 앱 아님 |
| K6 | 유료 게이트: 풀포맷·고해상·상업 라이선스·워터마크 제거 | 높음 | 중 | 0 | monetization P0 흡수 |
| K7 | OG 공유 페이지 `/kit/k/[id]` | 높음(유입) | 중 | 0 | 바이럴·SEO |
| K8 | 스티커앱 슬롯 연동(크로스앱) | 중 | 중 | 0 | 스티커앱 출시 후 |
| K9 | SVG 로고 벡터화 / AI 로고·팔레트 추천 | 중 | 중상 | (AI 유료) | Potrace 메모리 검토 / AI OFF 기본 |

---

## 요약 (빌더용)

- **권고안**: "조합기" = **(A) 브랜드 키트 조합기**. 사용자가 만든 **폰트 + 색 팔레트 + 서명/로고(+스티커)** 를 **한 벌 키트 ZIP**(폰트 파일 + 로고 PNG + `palette.css`/`font-face.css` + 미리보기 시트 PNG + 상업 라이선스 + README)으로 묶어 내보낸다.
- **왜 1순위**: 새 생성 엔진 거의 불필요(기존 `/generate`·`FontPreview` Canvas·`packages/ui`·`core` 재사용 = 비용 0·비AI), 실무 구매 단위와 일치해 수익 동기 직접적, 폰트·스티커앱을 잇는 모노레포 허브로 중복 없음. **B·D는 이미 `apps/sticker`가, C는 폰트앱이 흡수**하므로 조합기의 고유 자리는 키트 허브뿐.
- **앱 구조**: **신규 `apps/kit/frontend`(engine 없이 서버 0안 시작)**. 폰트 파일은 폰트앱 `/api/generate` 재사용, 합성·ZIP은 클라 Canvas/JSZip. 공통 로직은 `packages/ui`(`FontPreview` PNG 렌더러·`DrawingCanvas` 공용화)·`packages/core`(키트 계약)·신규 `packages/kit-spec`(ZIP 규격·템플릿)로. `home` 카드·`infra/nginx /kit` 추가. **(C) 리믹스는 폰트앱 내부 기능**.
- **UX**: 한 시야(데스크톱 좌 컨트롤/우 sticky 시트+받기, 모바일 상단 시트/하단 컨트롤+고정 바). 프리셋 키트 1탭(빠른시작)→세부→고급. 비드로잉 경로 보장.
- **수익화**: 무료=워터마크 시트+WOFF+팔레트(개인용), 유료=고해상·풀포맷·상업 라이선스·워터마크 제거(단건/구독), AI 로고·팔레트 추천은 환경변수 OFF 기본·"AI 생성" 라벨. OG 공유 페이지로 유입 루프. monetization P0(라이선스·포맷·워터마크)·P3(브랜드킷 B2B)를 한 화면에서 수익화.
- **계약**: `mixParams()`(리믹스), `BrandPalette`/`KitLogo`/`BrandKit`/`KitExportRequest|Response`, 상수 `KIT_TEMPLATES`/`KIT_ZIP_LAYOUT`/CSS 템플릿 신규. 기존 `FontParams`/`GenerateRequest` 불변(하위호환), `generatedBy` 항상 포함(정직성).
- **의존성 주의**: MVP는 외부 API·무거운 서버 의존성 0(클라 Canvas/JSZip). 로고 SVG 벡터화(Potrace)·서버 ZIP·AI 추천은 후순위로, 도입 전 메모리 영향 검토(CLAUDE.md).
</content>
</invoke>
