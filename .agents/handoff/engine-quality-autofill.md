# Engine 인수인계 — 한글 모아쓰기 품질↑ + autofill(자동 채우기)

> 작성: Engine-Agent. 범위: `apps/font/engine/` 만. git 미수행.
> 한 줄 결론: **한글 모아쓰기 박스 일관성 개선 + 라틴/한글 autofill(노동↓·정직성) 추가 + autofill 굵기 매칭 개선(그린 글자 실제 획 굵기→채움 wght). 그린 것만(autofill=false)은 동작 불변. `pytest -q` 전체 117 통과, uvicorn e2e(가는 a·e·o→채움도 가늘게) 확인.**

## Blocker
- **없음.** 단, 아래 "프론트/Shared 후속" 1건은 계약 동기화 필요(경계 밖이라 미수정).

## Warning / 후속(경계 밖 — Shared/FE-Agent)
- **`packages/core/src/index.ts` 계약 동기화 필요(미수정 — 내 폴더 밖).**
  - `HandwritingResponse` / `HangulComposeResponse` 에 **`drawnChars: string[]` · `filledChars: string[]`** 추가.
  - (요청 타입 `autofill?: boolean` 은 이미 core에 존재.)
  - 엔진 응답은 이미 두 필드를 반환하며, 미지정 시 기본 `[]` 라 **기존 프론트는 깨지지 않음**(하위호환).
- 프론트는 `filledChars` 가 비지 않으면 **"○○자는 자동 채움(내 글씨 아님)"** 고지를 띄울 것(정직성). drawn=내가 그림, filled=베이스폰트 채움.

---

## 1) 한글 모아쓰기 품질 개선 (`hangul_compose.py`)
관찰된 문제('글' 유독 작음 · '최' 겹침)의 원인과 처방:

- **`_place_ink`** — 균일 스케일 `min(sx,sy)` 만 쓰면 납작/가는 자모(ㅡ/ㅣ/ㅗ)가 단변 기준으로 쪼그라들어 유독 작아짐.
  → **단변 최소 크기 보장**(`MIN_SHORT_FILL=0.34`) 추가: 균일 스케일 후 한 변이 박스 단변 대비 너무 작으면 그 축만 살짝 키움. 단 종횡비 왜곡은 `MAX_ANISO=1.6` 배 이내로 클램프(개성/형태 보존). fill은 `PLACE_FILL=0.84` 로 통일.
- **`_layout_boxes`** — 모임유형(세로/가로/복합)·받침 유무별로 분할 비율이 제각각이라 음절 크기 들쭉날쭉.
  → 공통 상수로 **비율 통일**: 받침 윗블록 `JONG_SPLIT_RATIO=0.62`(전 모임유형 동일), 세로모음 분할 `VJUNG_SPLIT_X=0.62`, 가로모음 `HJUNG_SPLIT_Y=0.56`.
  → **복합모음(ㅘ/ㅚ/ㅝ 등) 칸 겹침 제거**: 윗블록을 상(초성+세로요소 좌우) / 하(가로요소 전폭)로 **겹치지 않게** 분리 → '최' 같은 글자에서 초성과 모음이 포개지지 않음.
- 과도 정규화로 손맛 죽이지 않음(스케일/왜곡 상한, 여백 유지).

## 2) autofill — 자동 채우기 (신규 `autofill.py`)
`autofill:true` 면 안 그린 글자/자모를 **그린 획에서 추출한 스타일**에 맞춘 공개 베이스 폰트로 채움. **AI 미사용·외부 API 0·비용 0.**

- **스타일 추출** `extract_style()`: 그린 획에서
  - `slant_deg`: 세로에 가까운 세그먼트들의 평균 기울기(±20도 클램프, 라틴 slnt 규약=오른쪽 기울임 음수).
  - `nib`: 사용자 refine.nib(=펜 굵기) → 베이스 폰트 `wght` 축으로 매핑(가장 정직한 굵기 추정).
  - `avg_ink_height`: 평균 잉크 높이(폰트 유닛).
- **라틴(/handwriting)** `latin_fill_glyphs()`: Recursive VF를 추출 weight/slant(+CASL 약간)로 instancing → 안 그린 a–z/A–Z/0–9 글리프를 컴포지트까지 분해(`DecomposingRecordingPen`)해 그대로 glyf/cmap에 채움. **사용자 글리프는 절대 덮어쓰지 않음**(skip_chars).
- **한글(/hangul-compose)** `hangul_fill_jamo_strokes()`: text 합성에 필요한데 안 그린 **기본 자모**를 Pretendard(추출 굵기로 instancing)에서 꺼내 곡선 평탄화(`_FlattenPen`) → 셀 정규화(0..1) 폴리라인 획으로 변환 → 기존 `_prepare_jamo_inks`/`_place_ink` 파이프라인이 사용자 자모와 **동일하게** 처리. 더 많은 음절 완성.
- **정직성**: build 함수가 `drawn_chars`/`filled_chars`(한글은 자모) 반환 → API 응답 `drawnChars`/`filledChars`.
- **autofill=false(기본)**: 코드 경로 진입 안 함 → **동작 완전 불변**(filled=[]).
- **graceful**: 베이스 폰트 미로드(503 상황) 또는 채움 중 예외 → 그린 것만으로 폰트 완성(autofill만 조용히 생략).

## 3) 구불구불 보정
별도 파라미터 추가 불필요. `smoothing` 이 RDP epsilon(`0.0008+0.012*smoothing`)을 키워 손떨림 정점을 정리(smoothing 1 → 정점 수 절반 이하)하고 Catmull-Rom으로 매끈하게 재보간 → "구불구불 정리" 역할 충분. 확인 완료(과도 시 형태 뭉갬은 RDP 상한으로 억제됨).

## 변경 파일 (모두 `apps/font/engine/`)
- **신규** `autofill.py` — 스타일 추출 + 라틴/한글 채움.
- `handwriting.py` — `build_handwriting_font(..., autofill, base_font_path)` → 5-튜플 반환(+drawn,+filled). base64 래퍼 동.
- `hangul_compose.py` — `_place_ink`/`_layout_boxes` 재튜닝, `build_hangul_font(..., autofill, base_font_path)` → 5-튜플 반환. base64 래퍼 동.
- `main.py` — 두 요청 모델에 `autofill: bool=False`, 두 응답 모델에 `drawnChars`/`filledChars`(기본 `[]`), blocking 함수에서 폰트 가용 시에만 base_path 전달.
- `tests/test_handwriting.py` · `tests/test_hangul_compose.py` — 5-튜플 unpack 갱신 + autofill/박스일관성 테스트 추가(오프라인이면 베이스폰트 필요 테스트는 skip).

## 검증
- `pytest -q`: 전체 통과(기존 97 → 신규 테스트 추가). 박스 일관성(자모 최소크기·복합모음 비겹침·음절 높이 편차), autofill(미작성 글자/자모 cmap 추가·drawn/filled 구분), autofill=false 불변, woff/ttf 유효 모두 포함.
- uvicorn e2e: (a) ㄱ·ㅏ만 그림 + autofill → "안녕하세요" 5음절 전부 완성, filled=8자모. (b) h·i만 그림 + autofill → a–z 26/26 + 대문자/숫자 = 62 글리프. 둘 다 drawn/filled 정확 구분.

## 4) autofill 굵기 매칭 개선 (`autofill.py`) — 신규
검증 지적: **가는 획으로 a·e·o를 그렸는데 채운 글자가 더 굵게** 나와 이질감.
원인: 굵기를 사용자 nib 슬라이더(`_nib_to_weight`) 단독으로만 매핑 → 글자를 크게
그려 가늘어 보여도 nib만 보면 굵게 채움. 처방: **그린 글자의 실제 획 굵기를 추정**.

- `extract_style()` 에 **추정 weight 필드 추가**. `_estimate_weight(nib, heights)`:
  - 펜 반폭 `_nib_half_width(nib)`(handwriting.py 재사용) ÷ **평균 잉크 높이** = 사람이
    느끼는 *상대 획 굵기 비율*. `_ratio_to_weight()` 로 UI weight(100~900)에 선형 매핑
    (기준비율 `_REF_THICKNESS_RATIO=0.085`→Regular 400, span ±0.085).
  - 같은 nib라도 **크게 그리면 가벼운 weight**(상대적으로 가늘어 보임), 작게 그리면 무겁게.
  - 합리적 클램프 `_WEIGHT_MIN=130`~`_WEIGHT_MAX=820`(과도 가늘/굵음 방지).
  - 잉크 높이 추정 불가(가로획만 등)면 **nib 단독 폴백**(기존 동작). drawn 1~3자로 적어도 비율 평균이라 안정.
- 라틴/한글 인스턴싱(`_instance_latin`, `hangul_fill_jamo_strokes`) wght 매핑을 `_style_weight(style)`
  (추정 weight, 없으면 nib 폴백 + 클램프)로 교체. slant 매칭은 기존대로 유지.
- 효과(uvicorn e2e, 가는/굵은 a·e·o + autofill):
  - THIN nib=0.2 → est_weight≈150, 채운 m xspan=659 / n=414
  - THICK nib=1.0 → est_weight≈749, 채운 m xspan=755 / n=509
  → 가는 입력은 채움도 가늘게(이질감↓), 굵은 입력은 굵게. drawn/filled 구분 회귀 없음.
- 테스트 추가(`tests/test_handwriting.py`): `_estimate_weight` 상대순서(가는<굵은)·동일 nib
  대형글자가 더 가벼움·폴백, `extract_style` 가는입력 저weight, 가는 vs 굵은 채움 글리프 폭 차이.
  `pytest -q` 전체 **117 passed**.

## 한계 (정직)
- autofill 채움 글자는 "내 톤(굵기/기울기)에 맞춘 공개 폰트 글리프"이지 **내 손글씨가 아님** → 한 단어 안에 그린 글자와 섞이면 톤은 맞아도 형태는 베이스폰트 그대로. 프론트 고지 필수(skeptic G2 위험 — "반쪽 내 글씨"). 곡률/세리프까지 매칭하는 정밀 스타일 전이는 미구현(slant·weight·size만).
- 굵기 추정은 **펜 반폭(nib)÷잉크높이 비율** 기반의 *근사*다. 진짜 외곽선 면적 측정이 아니라 중심선+nib 기반이라, taper나 외곽선 변형이 큰 경우 실제 렌더 굵기와 약간 어긋날 수 있다. 기준비율 상수는 경험적 튜닝값.
- 한글 채움 자모는 Pretendard 자모를 셀 정규화해 조합에 투입 → 사용자 자모와 굵기 톤은 맞으나 손맛은 없음(조합 티 유지). 음절 "완성도↑"가 목적이지 "내 글씨 한글"은 아님.
- 스타일 slant 추출은 세로획 신호 의존 → 가로획만 그린 자모/글자는 slant 0으로 추정.
