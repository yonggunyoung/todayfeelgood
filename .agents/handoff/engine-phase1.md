# Engine Phase 1 핸드오프 (폰트 생성 백엔드)

작업 영역: `apps/font/engine/` (Python 3.11 + FastAPI). 비용 0, 비AI "전통" 방식.

---

## [업데이트 v2] 계약 v2 반영 + 검토/보안 견고화

**한 줄 결론:** 계약 v2 응답(`fontBase64`/`format`)·TTF 다운로드·startup 캐시(다운로드 블로킹 제거)·보안 가드(CORS 화이트리스트·동시성·입력검증·에러살균·다운로드 안전화)를 모두 반영. pytest **14건 전부 통과** + uvicorn 실측으로 woff/ttf 매직바이트 확인.

### 반영한 항목
- **계약 v2 (`main.py`)**: 응답 `{ fontBase64, format, fontFamily, generatedBy:"traditional", appliedParams }`. 구 `fontWoffBase64` 폐기. 요청에 `format`(`"woff"`|`"ttf"`, 기본 woff) 추가.
- **TTF 지원 (`generator.py`)**: `generate_font`/`generate_font_base64`로 통합. ttf=플레인 sfnt(flavor 없음), woff=WOFF. 둘 다 라틴 서브셋 유지.
- **Blocker B2 — 다운로드 블로킹 제거**: 폰트는 FastAPI **lifespan startup**에서 1회 로드/캐시. `/generate`는 다운로드 안 함. startup 실패 시 `/health.font_loaded=false`, `/generate`는 **즉시 503**.
- **보안(High/Med 반영)**:
  - 입력검증: pydantic `ge/le`(weight 100~900, slant -15~0, curvature 0~1) + format enum(422), NaN/Inf 거부. 서버 clamp(Inf 방어)도 유지.
  - imagePng 상한 `MAX_IMAGE_PNG_BYTES=2_000_000` 초과 시 **413**.
  - CORS `["*"]` 제거 → `ALLOWED_ORIGINS` 환경변수 화이트리스트, 메서드 `GET/POST`, 헤더 `Content-Type`만.
  - 동시성: `run_in_executor` 스레드풀 + `asyncio.Semaphore(3)`, 포화 시 503.
  - 에러 살균: 전역 exception handler가 내부 예외/스택/경로 숨김.
  - `font_loader.py` 다운로드 안전화: HTTPS만, 리다이렉트 ≤3, 스트리밍 + 10MB 상한, content-type 확인, sfnt 매직+크기 검증, 선택 SHA-256 핀(`EXPECTED_SHA256`).
  - `/health` 전체 파일 read 금지(캐시 boolean).
  - `requirements.txt` `==` 핀.

### 검증 결과 (직접)
- `pytest -q` → **14 passed** (clamp 범위/NaN/Inf, woff/ttf 매직+서브셋+재오픈, v2 응답형태, 422(format/범위밖/문자열), 413(imagePng), /health).
- uvicorn 실측(종료 완료): `/health`=`font_loaded:true`; woff→`wOFF`(15032B); ttf→`\x00\x01\x00\x00`(23716B); 잘못된 format→422; imagePng 초과→413.

### 남은 한계 / 후속(타 에이전트)
- `EXPECTED_SHA256` 기본 None(매직+크기만) — 운영 전 1.085 해시 핀 권장.
- 동시성 거절은 즉시 503(대기 큐 없음).
- 엔진 외부 비노출(loopback) + nginx `/font/engine/` 차단 = **Infra-Agent** (security H2).
- 파라미터 단일 출처화(core↔engine, review W4) = **Shared-Agent** 경유.
- BFF 타임아웃/Abort + 자동호출 imagePng 미전송(B2/B3 프론트측) = **FE-Agent**.

> 아래는 v1 작업 기록(참고용). 응답 필드 `fontWoffBase64`는 v2에서 `fontBase64`로 대체됨.

---

## 완료한 것

- **기본 가변폰트 = Recursive VF** 를 런타임에 다운로드/캐시 (`apps/font/engine/assets/Recursive_VF.ttf`, 약 2.3MB, `.gitignore`로 git 제외).
  - 후보 URL 순차 시도: GitHub raw → jsDelivr 미러. 모두 실패해도 서비스는 뜨고 `/health.font_loaded=false` 보고.
- **변형 로직** (`generator.py`):
  - 입력 `FontParams`를 `PARAM_RANGES`와 동일하게 서버에서도 클램프(NaN/None/문자열 방어 포함).
  - 축 매핑: `weight→wght`, `slant→slnt`, `curvature→CASL`. 폰트 실제 범위로 한 번 더 클램프.
  - Recursive의 비매핑 축(`MONO`, `CRSV`)은 폰트 기본값으로 핀 → **모든 축을 핀한 완전한 정적 폰트** 생성. (부분 인스턴스 상태에서 서브셋하면 fontTools `gvar` 서브셋 버그 `KeyError: 'uni0307'`가 나서, 전 축 핀으로 회피.)
  - 라틴 `A–Z a–z 0–9` + 공백/기본 구두점만 서브셋(`fontTools.subset`) → WOFF(flavor="woff") → base64.
  - `fontFamily`는 파라미터 해시로 고유 생성(`UserFont-<sha1 8자>`).
  - `imagePng`는 Phase 1에서 받되 무시(향후 확장 자리, 주석으로 명시).
- **API** (`main.py`): `POST /generate`(GenerateRequest→GenerateResponse), `GET /health`. 개발용 CORS 전체 허용. 파일 상단에 "외부 유료 API 호출 없음(비용 0)" 비용 가드 주석.
- **requirements.txt**: fastapi, uvicorn[standard], fonttools, brotli, requests. (pytest는 개발용으로 별도 설치)
- **테스트** (`tests/test_generator.py`, `tests/conftest.py`): WOFF 매직넘버/ base64 디코드/ fontTools 재오픈/ 클램프/ imagePng 무시 검증. 폰트 미확보 시 생성 테스트 자동 skip.
- **README.md**: 실행법·엔드포인트·축 매핑·한계.

## 동작 확인 결과 (직접 검증)

- `pip install -r requirements.txt` 성공 (fonttools 4.63, fastapi 0.136, uvicorn 0.48, brotli 1.2, requests 2.34).
- **폰트 다운로드: 성공** (첫 번째 GitHub raw URL에서 2.3MB TTF 캐시됨).
- `pytest`: **5 passed**.
- uvicorn 실측:
  - `GET /health` → `{"status":"ok","font_loaded":true}`
  - `POST /generate`(weight=700, slant=-8, curvature=0.5) → WOFF **15032 bytes**, base64 디코드 첫 4바이트 **`wOFF` 확인 OK**, fontFamily=`UserFont-eedaf217`, appliedParams 그대로 반영.
  - 클램프 실측: `{weight:9999, slant:-99, curvature:5}` → applied `{weight:900, slant:-15, curvature:1}`.
  - 확인 후 서버 종료 완료.

## 알려진 한계

- 기본 폰트 다운로드가 모든 미러에서 실패하면: 서비스는 뜨지만 `/health.font_loaded=false`, `POST /generate`는 **503** 반환.
- `curvature`는 Recursive `CASL`(Casual) 축 근사 — 완벽한 곡률 제어가 아니라 폰트가 제공하는 둥글기 변형 범위 내 근사.
- `slant` 범위가 폰트와 동일(-15~0)하지만, 실제 시각 기울기는 Recursive `slnt` 정의를 따른다.
- Phase 1은 라틴 글자셋(A–Z a–z 0–9 + 기본 구두점)만 지원. 한글/기타 문자 없음.
- `imagePng`는 현재 무시(스타일 추출 미구현).

## 프론트가 호출할 정확한 요청/응답 예시

요청 `POST http://localhost:8000/generate` (Content-Type: application/json):
```json
{
  "params": { "weight": 700, "slant": -8, "curvature": 0.5 },
  "imagePng": null
}
```

응답 (`GenerateResponse`):
```json
{
  "fontWoffBase64": "<base64 인코딩된 WOFF>",
  "fontFamily": "UserFont-eedaf217",
  "generatedBy": "traditional",
  "appliedParams": { "weight": 700.0, "slant": -8.0, "curvature": 0.5 }
}
```

프론트 사용 (`@font-face`):
```css
@font-face {
  font-family: "UserFont-eedaf217";
  src: url("data:font/woff;base64,<fontWoffBase64>") format("woff");
}
```

## 서버 실행

```bash
cd apps/font/engine
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --port 8000
```
