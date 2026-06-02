# Engine Phase 1 핸드오프 (폰트 생성 백엔드)

작업 영역: `apps/font/engine/` (Python 3.11 + FastAPI). 비용 0, 비AI "전통" 방식.

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
