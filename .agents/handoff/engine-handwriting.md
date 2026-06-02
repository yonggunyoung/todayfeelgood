# Engine 인수인계 — 손글씨 코어 (`POST /handwriting`)

**한 줄 결론**: 사용자가 직접 그린 획 → 진짜 글씨체(WOFF/WOFF2/TTF/OTF) 엔드포인트
`POST /handwriting` 구현 완료. 베이스 폰트 불필요(획 기반), 비용 0, 기존 `/generate`·`/health` 회귀 없음.

## 변경 파일 (apps/font/engine/ 만)
- **신규 `handwriting.py`**: 획→외곽선→glyf 조립 코어(`build_handwriting_font[_base64]`, `RefineParams`).
- **`main.py`**: 모델(`HandwritingRequest/RefineParamsModel/...`) + 라우트 `POST /handwriting` 추가.
  손글씨 동시성 세마포어(2) 추가. 기존 코드 유지.
- **신규 `tests/test_handwriting.py`**: 14개(모듈 + API). 베이스폰트 불필요 → 오프라인에서도 실행.
- **`README.md`**: `/handwriting` 섹션(요청/응답/refine/가드) 추가.

## 계약 (packages/core 그대로 준수)
`HandwritingRequest{ glyphs:[{char,strokes:[{points:[[x,y]...]}]}], refine:{smoothing,nib,taper,straighten,spacing}, format }`
→ `HandwritingResponse{ fontBase64, format, fontFamily:"MyHand-xxxx", generatedBy:"handwriting", glyphCount }`.
- 좌표: 셀 0..1(y하향) → 폰트 유닛 UPM 1000(y상향). 윗변=어센더(800), 아랫변=디센더(-200).
- refine 0=날것(개성 100%), 올릴수록 정제. smoothing=RDP+Catmull-Rom, nib=좌우오프셋폭,
  taper=끝 가늘어짐, straighten=회귀선 기반 약한 회전, spacing=사이드베어링/advance(em).
- 가드: 빈 glyphs 422 / 글자수>120 422 / 글자당 점수>4000 422 / refine 범위밖 422 / 잘못된 format 422 / 동시성 포화 503.

## 검증
- `pytest -q` 전체 **66 passed**(손글씨 14 포함, 기존 회귀 없음).
- 라이브 uvicorn: a,b,c 합성 획 → 유효 woff(`wOFF`), 재오픈 OK, cmap에 a/b/c/space 존재, glyphCount=3.
  같은 입력→동일 바이트(head.modified 고정). `/generate`·`/health` 정상.

## 한계 / Warning
- straighten은 **가로 글씨(수평 베이스라인) 가정**의 회귀선 보정이다. 세로쓰기/극단 기울기엔 부정확.
- 외곽선은 좌우 오프셋 + 점별 평균 법선 방식이라 **급격한 꺾임/자기교차**에서 외곽선이 겹칠 수 있다
  (대부분 글자에선 문제 없음). 진짜 펜촉 라운딩/오프셋 부울 연산은 후순위.
- nib 펜은 **균일 원형 펜** 근사(각도 펜촉/contrast 없음). taper는 양 끝 단순 감쇠.
- 안 그린 글자는 폰트에 없음(공백/.notdef). 베이스폰트 폴백은 미구현(계약상 "비움" 선택).
- **Blocker 없음.**

## FE 메모
- `/handwriting`는 `/generate`와 **별도 응답 스키마**(`appliedParams` 없음, `glyphCount` 있음, `script` 없음).
- 프리뷰는 `fontFamily`("MyHand-xxxx")로 @font-face 등록 후 렌더. 정직 라벨: "내가 그린 글씨".
