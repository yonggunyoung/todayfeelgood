# Engine 인수인계 — Phase 2b (심화 컨트롤, 계약 v4)

**한 줄 결론**: 계약 v4 신규 파라미터(waviness/waveFreq/contrast/roundness)를 glyf 좌표 변형 단계에 [REAL]로 추가 완료. 39개 테스트 전부 통과, latin·hangul woff 실제 생성 확인. **Blocker 없음.**

## 변경 범위 (오직 `apps/font/engine/`)
- `generator.py`
  - `PARAM_RANGES`/`FontParams`/`clamp_params`에 waviness(0~1)·waveFreq(0.5~6, def 2)·contrast(0~1)·roundness(0~1) 추가.
  - `_transform_glyf_coordinates`를 한 패스 합성으로 확장. 적용 순서: **roundness 스무딩 → weirdness 지터 → contrast 가로 스케일 → waviness 사인 워프 → shear**.
  - `_build_font_family` 시그니처에 v4 4필드 포함(패밀리명 유일성).
  - `generate_font` / `generate_font_base64` 시그니처에 v4 4필드 추가(`fmt` 앞 위치 인자). 기존 호출은 전부 `fmt=`/`script=` 키워드라 영향 없음.
- `main.py`
  - `FontParamsModel`에 v4 필드 + 범위 검증(ge/le) + 유한성 validator. `_generate_blocking`·응답 `appliedParams`에 전달. version 3.0.0→4.0.0, 주석 v3→v4.
- `tests/test_generator.py`, `tests/test_api.py`: v4 테스트 추가.

## 구현된 효과
- **waviness + waveFreq** [REAL]: 규칙적 사인 물결 워프 `dx = wave_amp * sin((2π·waveFreq/upem)·y)`. wave_amp = waviness·~50u(em1000 기준, upem 비례). **시드/random 무관 결정적**. weirdness(랜덤 손떨림)와 직교 → 둘 다 켜면 합성.
- **contrast** [REAL/근사]: 글리프 가로 무게중심 기준, y가 중앙(0.5·upem)에서 멀수록 가로폭을 더 압축(`scale = 1 - 0.6·contrast·|y/upem-0.5|·2`). 위/아래 가로획 ↔ 중앙 세로획 굵기차 모사. **max 0.6 보수적**(가독).
- **roundness** [REAL/가벼운 근사]: 컨투어별 순환 이웃 평균 쪽으로 점을 round_factor(≤0.35·roundness)만큼 끌어당기는 스무딩. 원본 좌표 사본 기준 계산, 3점 미만 컨투어 스킵.

## 테스트/검증
- `pytest -q` → **39 passed**(오프라인 skip 없음, 폰트 로드됨), ~86s.
  - v4 범위 클램프·NaN/None 기본값, waviness/contrast/roundness 적용 시 'A' 좌표 변화, waviness 시드 무관 결정성·재현성, waveFreq 차이 반영, 합성 유효 woff, 한글 v4 woff.
  - API: v4 appliedParams 반영, waviness>1·waveFreq<0.5·contrast>1 → 422.
- uvicorn 실측: latin woff(16,672B)·hangul woff(365,800B) 모두 `wOFF` 매직, appliedParams 정상. 서버 종료 완료.
- 재현성 유지: `head.modified` 고정 + recalcTimestamp=False. 같은 입력 = 같은 바이트(테스트 검증).

## 한계 (정직성)
- **contrast**는 획 방향 분석 기반 진짜 모듈 대비 아님 — y 비례 가로 스케일 근사. 가로/세로획을 정확히 구분하지 않음.
- **roundness**는 베지어 코너 라운딩 아님 — on/off-curve 구분 없는 가벼운 스무딩. 값이 커도 완전한 둥근 펜촉은 안 됨. 진짜 코너 라운딩은 후순위(난이도 4, doc 2c).
- waviness 진폭/contrast 강도/round_factor 상수는 보수적 튜닝값. FE에서 체감 부족/과함 피드백 오면 상수 재조정 가능.

## FE/Shared 협조 필요
- `packages/core` 계약 v4는 이미 신규 필드 정의됨(엔진은 동일 범위로 동기화 완료). FE는 슬라이더 노출 시 contrast UI max 0.6 권장(doc 권고).
- 한글도 v4 4필드 전부 동작(glyf 단계라 축 유무와 무관). 한글 모드에서 숨길 건 기존대로 curvature/mono/cursive뿐.
