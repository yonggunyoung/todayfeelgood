# Engine-Agent 인수인계 — Phase 2 (Wave B 스타일 + Wave C 한글)

**한 줄 결론**: 계약 v3 전면 반영 완료. weight 매핑 버그 정정, MONO/CRSV 축 개방,
시드 기반 weirdness 펜 디스토션(재현성 보장), 합성 shear/자간, 한글(Pretendard VF, OFL)
script 추가. 26개 테스트 통과 + uvicorn 실측으로 latin/hangul × woff/ttf 4종 생성 확인.

- **Blocker**: 없음.
- **Warning**:
  - 한글은 `curvature/mono/cursive` 무시(Pretendard에 해당 축 없음) → FE는 한글 모드에서 해당 슬라이더 숨길 것.
  - 한글 폰트(Pretendard VF ~6.7MB) startup 다운로드 의존. 오프라인이면 `/health.hangul_font_loaded:false`, 한글 요청 즉시 503.
  - 배포 시 Pretendard **OFL-1.1 라이선스 파일 동봉** 필요(자체 패밀리명으로 RFN은 이미 회피).

## 반영 항목 (계약 v3)
1. **응답**: `generatedBy: "baseFontVariation"`(기존 "traditional" 교체), `script` 필드 추가.
2. **요청**: `script`(latin|hangul, 기본 latin) + 신규 파라미터(mono/cursive/weirdness/seed/letterSpacing). pydantic 범위검증(계약 PARAM_RANGES 동일) + 서버 clamp 유지.
3. **weight 매핑 버그 정정**: UI 100~900 → 폰트 fvar 실제 wght 범위로 **선형 매핑**(`_map_weight_to_axis`). Recursive 300~1000, Pretendard 45~930. 가는 굵기 정상 동작 실측 확인('A' 폭 570→639).
4. **미사용 축 개방**: `AXIS_MAP`에 `mono→MONO`, `cursive→CRSV` 추가. `curvature→CASL` 유지. 폰트에 있는 축만 적용·범위 클램프.
5. **weirdness(괴상함)**: 인스턴싱+서브셋 후 정적 `glyf` 좌표 직접 변형. 시드 RNG(`random.Random`, sha1(seed:glyph_name))로 (a) 점 지터, (b) 글자별 베이스라인 wobble. 강도 ∝ weirdness/100. 표준 `random`만 사용. weirdness=0 → 변형 없음(정형). 한글에도 적용.
6. **slant 합성 shear**: slnt 축 있으면 축, 없으면(한글) `x += y·tan(-slant)`를 glyf에 합성.
7. **letterSpacing**: hmtx advanceWidth를 `letterSpacing×unitsPerEm` 만큼 가감(0 미만 방지).
8. **한글(Wave C)**: `font_loader`에 Pretendard VF 다운로드/캐시(github raw 우선, Noto Sans KR VF 폴백). KS X 1001 2,350자 + ASCII 서브셋. 자체 패밀리명. startup 비블로킹 병렬 프리로드. 한글 세마포어 별도(1).
9. **재현성**: `recalcTimestamp=False` + `head.modified` 고정 → 같은 입력 동일 바이트.
10. **운영/보안 유지**: CORS 화이트리스트, 에러 살균, 스레드풀+세마포어, 비용 가드 주석.

## 사용한 한글 폰트 / 서브셋
- **Pretendard Variable** (orioncactus, SIL OFL 1.1), glyf 기반, wght 45~930 단일 축, 한/영 통합, 한글 음절 전 범위 커버.
  - URL: `raw.githubusercontent.com/orioncactus/pretendard/main/.../PretendardVariable.ttf` (HEAD 200, ~6.7MB).
  - 폴백: Noto Sans KR Variable (notofonts/noto-cjk, OFL).
- **서브셋**: `hangul_charset.py`가 EUC-KR 완성형 영역(0xB0~0xC8 × 0xA1~0xFE)을 디코딩해 **KS X 1001 상용 2,350자** 정확 생성 + ASCII. 전체 11,172자 금지(메모리). 외부 데이터 파일 불필요·재현 가능.

## 테스트 결과
`pytest -q` → **26 passed** (≈55s). 주요 케이스:
- clamp(기존+신규 범위/NaN/Inf), 신규 파라미터 422.
- weight 매핑(weight=100 vs 900 좌표 상이).
- weirdness 재현성: 같은 seed→동일 바이트, 다른 seed→상이, weirdness=0→seed 무관 동일.
- letterSpacing→advanceWidth 증가.
- latin/hangul × woff/ttf 매직 검증, 한글 cmap에 가/한/글/힝 + 'A' 포함, 한글 서브셋 numGlyphs<6000.
- API v3 응답 형태, 잘못된 format/script 422, imagePng 413, /health(`hangul_font_loaded`).

## uvicorn 실측 (4종)
| script/format | magic | bytes | generatedBy |
|---|---|---|---|
| latin/woff | wOFF | 17,004 | baseFontVariation |
| latin/ttf | 0x00010000 | 24,732 | baseFontVariation |
| hangul/woff | wOFF | 369,928 | baseFontVariation |
| hangul/ttf | 0x00010000 | 515,032 | baseFontVariation |
`/health` → `{font_loaded:true, hangul_font_loaded:true}`.

## 변경 파일 (apps/font/engine/ 내부만)
- `main.py` — 계약 v3 API, script 분기, 한글 세마포어, health 확장.
- `generator.py` — weight 선형매핑, AXIS_MAP 확장, weirdness 펜, 합성 shear, letterSpacing, 재현성, script.
- `font_loader.py` — 한글 폰트 다운로드/캐시(`ensure_hangul_font`/`hangul_font_is_available`), 상한 분리.
- `hangul_charset.py` (신규) — KS X 1001 2,350자 + ASCII 서브셋 텍스트.
- `tests/` — v3 테스트로 갱신(generator/api/conftest).
- `requirements.txt` — 신규 의존성 없음(표준 random + 기존 fontTools만 사용).
- `assets/PretendardVariable.ttf` — 캐시(.gitignore 대상).
- `README.md` — v3·한글·서브셋·파라미터 문서 갱신.

## 한계
- 한글 curvature/mono/cursive 무시. KS X 1001 밖 음절(힣/옛한글) 미생성. weirdness는 외곽선 근사(전문 손글씨급 아님). imagePng 미사용. SHA-256 핀 기본 None.
