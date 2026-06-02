# Font Engine (Phase 2 · 전통/비AI 방식) — 계약 v4

그린 글씨 서비스의 **폰트 생성 백엔드**. 공개 가변폰트를 입력 파라미터로 변형하고,
시드 기반 절차적 펜 디스토션을 얹어 라틴/한글 폰트를 만든다.
출력 포맷은 **WOFF**(프리뷰) 또는 **TTF**(다운로드) 선택.

**정직성**: 결과물은 공개 OFL 폰트를 변형한 것이지 "사용자가 직접 그린 글씨"가
아니다. 응답 `generatedBy: "baseFontVariation"`로 출처를 명시한다.

**비용 0**: 외부 유료 API(LLM/이미지 생성 등) 호출이 전혀 없다.
공개 폰트 미러 다운로드(앱 시작 시 1회) + 로컬 `fontTools` 연산만 사용한다.

## 베이스 폰트

| 스크립트 | 폰트 | 라이선스 | 축 | 비고 |
|---|---|---|---|---|
| latin | Recursive VF | Apache-2.0 / OFL 계열 (arrowtype) | wght 300~1000, slnt -15~0, CASL, MONO, CRSV | 라틴 a–z·A–Z·0–9 |
| hangul | **Pretendard Variable** | **SIL Open Font License 1.1** (orioncactus) | **wght 45~930 (단일)** | 한/영 통합 |

- 한글 폰트는 `wght` 단일 축이므로 `slant`는 **합성 shear**, `curvature/mono/cursive`는 **무시**한다.
- OFL 재배포: 생성 폰트는 **자체 패밀리명 `UserFont-xxxxxxxx`** 로 빌드해 Reserved Font Name 충돌을 회피한다(RFN 회피). 배포 패키지에는 원본 OFL 라이선스를 동봉할 것.

### 한글 서브셋 (무료티어 메모리 가드)
전체 11,172 음절을 서브셋하면 메모리 피크가 커지므로 **KS X 1001 완성형 상용 2,350자 + ASCII**로 제한한다.
2,350자는 외부 데이터 파일 없이 `hangul_charset.py`가 **EUC-KR(완성형) 인코딩 영역을
직접 디코딩**해 재현 가능하게 생성한다(첫바이트 0xB0~0xC8 × 둘째바이트 0xA1~0xFE).
세트 끝 음절은 `힝`(U+D79D), `힣`(U+D7A3)는 KS X 1001에 없으므로 미포함.

## 실행법

```bash
cd apps/font/engine
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

uvicorn main:app --port 8000
```

**앱 시작 시(lifespan)** 라틴(`assets/Recursive_VF.ttf`)과 한글
(`assets/PretendardVariable.ttf`)을 각각 1회 다운로드/캐시한다(비블로킹, 병렬).
`/generate`는 요청마다 다운로드하지 않으며, 해당 스크립트 폰트 로드에 실패하면
그 스크립트 요청은 **즉시 503**으로 빠르게 실패한다.

### 환경변수
| 변수 | 기본값 | 설명 |
|------|--------|------|
| `ALLOWED_ORIGINS` | `http://localhost:3000,http://localhost:3001,http://127.0.0.1:3001` | CORS 화이트리스트(쉼표구분). 와일드카드 미사용. |

## 엔드포인트

### `GET /health`
```json
{ "status": "ok", "font_loaded": true, "hangul_font_loaded": true }
```
캐시된 boolean만 반환(전체 파일 read 안 함). 한글 폰트 미확보 시 `hangul_font_loaded:false`.

### `POST /generate`
요청 (`GenerateRequest`, `packages/core` 계약 v4):
```json
{
  "params": {
    "weight": 600, "slant": -6, "curvature": 0.5,
    "mono": 0.8, "cursive": 1, "weirdness": 40,
    "seed": 7, "letterSpacing": 0.05,
    "waviness": 0.6, "waveFreq": 3, "contrast": 0.4, "roundness": 0.5
  },
  "script": "latin",
  "format": "woff",
  "imagePng": null
}
```
- `script`: `"latin"`(기본) | `"hangul"`. 그 외 값 **422**.
- `format`: `"woff"`(기본) | `"ttf"`. 그 외 값 **422**.
- `params`: 범위(계약 PARAM_RANGES) 밖이면 pydantic **422**, 통과해도 서버에서 한 번 더 clamp.
- `imagePng`: 선택, 미사용. 길이 2MB(`MAX_IMAGE_PNG_BYTES`) 초과면 **413**.

응답 (`GenerateResponse` v4):
```json
{
  "fontBase64": "<base64 폰트>",
  "format": "woff",
  "script": "latin",
  "fontFamily": "UserFont-xxxxxxxx",
  "generatedBy": "baseFontVariation",
  "appliedParams": { "weight": 600, "slant": -6, "curvature": 0.5, "mono": 0.8, "cursive": 1, "weirdness": 40, "seed": 7, "letterSpacing": 0.05, "waviness": 0.6, "waveFreq": 3, "contrast": 0.4, "roundness": 0.5 }
}
```

## 파라미터 처리

| 파라미터 | UI 범위 | 처리 | 라틴 | 한글 |
|---|---|---|---|---|
| weight | 100~900 | 폰트 wght 실제 범위로 **선형 매핑** | ✅ (300~1000) | ✅ (45~930) |
| slant | -15~0 (deg) | slnt 축 있으면 축, 없으면 합성 shear (x += y·tan(-slant)) | 축(slnt) | 합성 shear |
| curvature | 0~1 | CASL 축 | ✅ | 무시(축 없음) |
| mono | 0~1 | MONO 축 | ✅ | 무시 |
| cursive | 0~1 | CRSV 축 | ✅ | 무시 |
| weirdness | 0~100 | 시드 RNG 펜 디스토션(점 지터 + 글자별 베이스라인 wobble). 0=정형 | ✅ | ✅ |
| seed | 0~999999 | weirdness 재현용. 같은 seed → 동일 바이트 | ✅ | ✅ |
| letterSpacing | -0.05~0.6 (em) | hmtx advanceWidth ± (em×upem) | ✅ | ✅ |
| waviness | 0~1 | 규칙적 **사인 물결** 워프(dx=amp·sin(y·k)). 시드 무관·결정적. 0=정형 | ✅ | ✅ |
| waveFreq | 0.5~6 | 물결 주파수(em 높이당 주기 수). waviness>0일 때만 의미 | ✅ | ✅ |
| contrast | 0~1 | 획 대비 **근사**. y에 비례한 가로 비대칭 스케일(중심 기준), max 0.6 보수적 | ✅ | ✅ |
| roundness | 0~1 | 모서리 둥글기 **근사**. 인접 점 평균 쪽 약한 스무딩(round_factor≤0.35) | ✅ | ✅ |

- **weight 매핑 버그 정정(v2→v3)**: UI 100~900을 폰트 fvar 실제 범위로 선형 매핑해 가는 굵기가 정상 동작.
- **weirdness**: 인스턴싱+서브셋 후 정적 `glyf` 좌표를 직접 변형. 표준 `random`만 사용(numpy 금지).
  글리프별 RNG 시드 = `sha1(f"{seed}:{glyph_name}")`. 같은 `(seed, weirdness, slant)` → 동일 결과(재현성).
  컴포지트 글리프는 좌표 직접 변형 대상에서 제외(베이스 글리프 변형으로 따라감).
- **v4 심화 컨트롤**(waviness/contrast/roundness): 모두 `_transform_glyf_coordinates`의 **한 패스**에서 처리한다.
  적용 순서는 roundness 스무딩 → weirdness 지터 → contrast 가로 스케일 → waviness 사인 워프 → shear.
  waviness/contrast/roundness는 **seed·random과 무관한 결정적** 변형이며, weirdness(랜덤 손떨림)와 직교해 함께 켜면 합성된다.
  진폭은 폰트 `unitsPerEm`에 맞춰 스케일(em 1000 기준 waviness ~50u, weirdness 지터 ~22u).
- **재현성**: 저장 시 `head.modified`를 고정값으로 덮고 `recalcTimestamp=False`로 열어 동일 입력 → 동일 바이트.

## 보안/견고성 (review·security 보고서 반영)
- **CORS**: 와일드카드 제거 → `ALLOWED_ORIGINS` 화이트리스트, 메서드 `GET/POST`, 헤더 `Content-Type`만.
- **동시성/비블로킹**: CPU 집약 생성을 `run_in_executor`(스레드풀)로 처리. 라틴 `Semaphore(3)`, **한글은 글리프가 많아 `Semaphore(1)`** 로 더 강하게 제한. 포화 시 **503**.
- **에러 살균**: 전역 예외 핸들러가 내부 예외/스택/절대경로를 숨기고 일반 메시지만 반환.
- **폰트 다운로드 안전화**(`font_loader.py`): HTTPS만, 리다이렉트 최대 3회, 스트리밍 + 바이트 상한(라틴 10MB / 한글 16MB), content-type 확인, sfnt 매직+크기 검증(+선택 SHA-256 핀). github raw 우선(jsDelivr 차단 환경 대비).
- **의존성 핀**: `requirements.txt` `==` 고정.

## 테스트
```bash
source .venv/bin/activate
pytest -q
```
- `test_generator.py`: clamp(기존+v4 범위/NaN/Inf), woff/ttf 매직, weight 매핑(가는↔굵은 차이), weirdness 재현성(같은 seed→동일·다른 seed→상이·0=정형), letterSpacing advance 증가, **v4: waviness/contrast/roundness 적용 시 좌표 변화, waviness 시드 무관 결정성, waveFreq 차이 반영, 합성 유효 woff**, 한글 woff/ttf·한글 글리프 cmap 포함·서브셋 크기 제한·한글 v4 적용.
- `test_api.py`: v4 응답 형태(`script`/`generatedBy:baseFontVariation`/v4 appliedParams), latin/hangul × woff/ttf, 잘못된 format/script 422, 범위 밖(기존+v4) 422, imagePng 초과 413, /health(`hangul_font_loaded`).
- 폰트 다운로드 실패(오프라인) 시 해당 생성 테스트는 자동 **skip**.

## 알려진 한계
- 한글은 `curvature/mono/cursive`가 무시된다(Pretendard에 해당 축 없음). 프론트는 한글 모드에서 해당 슬라이더를 숨겨야 한다.
- 한글 서브셋은 KS X 1001 2,350자로 제한 → 그 밖의 음절(예: `힣`, 옛한글)은 생성 폰트에 없다. 풀세트는 메모리상 후순위.
- `weirdness` 합성 shear/지터는 외곽선을 직접 흔드는 근사이며 전문 손글씨 폰트 수준의 자연스러움은 아니다.
- **contrast**는 획 방향 분석 기반의 진짜 모듈 대비가 아니라 y 비례 가로 스케일 **근사**다(가독 위해 max 0.6 보수적). 가로획/세로획을 정확히 구분하지 않는다.
- **roundness**는 베지어 코너 라운딩이 아니라 on-curve/off-curve 구분 없이 점을 인접 평균 쪽으로 끌어당기는 **가벼운 스무딩 근사**다(round_factor≤0.35). 값이 커도 모서리가 완전히 둥글어지지는 않으며, 3점 미만 컨투어는 건너뛴다. 진짜 펜촉 라운딩은 후순위(난이도 4).
- `EXPECTED_SHA256`/`EXPECTED_HANGUL_SHA256`는 기본 `None`(매직+크기 검증만). 운영 전 해시 핀을 권장.
- imagePng는 받되 미사용(향후 스타일 추출 자리).
