# Engine 인수인계 — 손글씨 품질 개선 (Q판, `handwriting.py`)

**한 줄 결론**: 계약·엔드포인트 동일. 외곽선을 직선 폴리라인 → **2차 베지어(qCurveTo) 곡선**으로,
오프셋을 **라운드 조인 + 마이터 클램프 + 둥근 캡**으로, 글자를 **가이드 밴드 기준 약한 수직 정렬**로
끌어올렸다. "개성은 살리되 읽힌다." 전체 `pytest -q` **71 passed**, 라이브 woff 생성·재오픈 확인.

## 변경 파일 (apps/font/engine/ 만)
- **`handwriting.py`**: 곡선화·오프셋·메트릭 정렬. (계약 `RefineParams` 필드/엔드포인트 불변)
- **`tests/test_handwriting.py`**: 곡선/자기교차/스무딩/메트릭 테스트 5개 추가(기존 14 유지 → 19).

## 무엇을 고쳤나
1. **곡선 외곽선**: `_to_quad_contour`가 외곽선 점열을 midpoint 트릭으로 `qCurveTo`(2차 베지어)로 그린다.
   `_smooth_stroke`는 smoothing=0이어도 RDP eps를 거의 0으로 두고 Catmull-Rom 약한 곡선화(원형 보존),
   smoothing↑ 시 더 솎고 더 부드럽게. 직선 2점 획('l')은 보간 생략 → 직선 유지.
2. **오프셋 품질**: `_offset_side`가 외측(볼록) 꺾임에 호(arc)를 끼워 라운드 조인, 점별 법선은 마이터
   길이>2.2면 단일 법선으로 클램프(코너 폭주/자기교차 완화). 획 끝은 taper 프로파일 + `_end_cap` 반원.
3. **메트릭 정렬(읽힘)**: `_align_to_guides`가 글자별 목표 밴드(대문자/숫자=cap 700, 소문자=x-height 500,
   어센더 글자 bdfhklt=cap, 디센더 글자 gjpqy=베이스라인 아래)로 잉크 세로범위를 **부분만**(METRIC_SNAP 0.55,
   스케일 0.7~1.4 클램프) 이동/스케일. straighten 슬라이더와 연동해 강도 조절. advance/사이드베어링은 기존 로직 유지.
4. **적은 글자/단일 글자**: 1글자도 안정(테스트 포함). 단일 점은 16각 원형 도트.

## 검증
- `pytest -q` 전체 **71 passed**(손글씨 19 = 기존 14 + 신규 5: 곡선 off-curve 존재, o/l/e 자기교차 무파손·점
  폭증 없음, smoothing 0≠1, 메트릭 밴드(l>o, g<baseline), 단일 글자 안정).
- 라이브 uvicorn(a,b,c,o,e 합성 획): woff(`wOFF`) 생성·재오픈 OK, cmap에 abceo, glyphCount=5.
  글리프 contours 1~2, 점 수 138~616(폭증 없음), off-curve ≈ 절반(곡선 증거).
  메트릭: b yMax 733(어센더)·바닥 아래 내려감, a/o/e/c x-height 밴드. `/health` 정상.

## 한계 / Warning
- 오프셋은 여전히 좌우 평행선 방식 — 매우 급격한 U턴/날카로운 꺾임에선 내측 미세 자기교차가 남을 수 있다
  (라운드 조인/마이터 클램프로 대부분 무해화, 폰트는 유효). 진짜 부울 오프셋은 후순위.
- 메트릭 정렬은 잉크의 세로 min/max만 본다 — 오버슈트(o가 약간 더 큼) 보정/세리프 인지는 없음. 개성 보존 위해 의도적 약정렬.
- smoothing↑ 시 보간 밀도가 올라 점 수가 늘 수 있으나 상한 내(테스트로 <1500 보장).
- nib은 균일 원형 펜 근사(각도 펜촉/contrast 없음). taper는 양 끝 감쇠. (이전과 동일)
- **Blocker 없음. 계약/응답 스키마 불변.** 자기 폴더(apps/font/engine) 외 미변경, git 미수행.
