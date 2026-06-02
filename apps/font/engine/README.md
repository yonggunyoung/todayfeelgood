# Font Engine (Phase 1 · 전통/비AI 방식)

그린 글씨 서비스의 **폰트 생성 백엔드**. 기본 가변폰트(Recursive VF)를
입력 파라미터(weight/slant/curvature)로 변형해 라틴 a–z 폰트(WOFF)를 만든다.

**비용 0**: 외부 유료 API(LLM/이미지 생성 등) 호출이 전혀 없다.
공개 폰트 미러 다운로드 + 로컬 `fontTools` 연산만 사용한다.

## 실행법

```bash
cd apps/font/engine
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

uvicorn main:app --port 8000
# 개발 중 자동 리로드: uvicorn main:app --port 8000 --reload
```

기동 시 기본 가변폰트를 `apps/font/engine/assets/Recursive_VF.ttf`로 다운로드/캐시한다
(이미 있으면 재사용). ttf는 용량이 커서 `.gitignore`로 git에 올라가지 않는다(받는 코드만 커밋).

## 엔드포인트

### `GET /health`
```json
{ "status": "ok", "font_loaded": true }
```
`font_loaded`는 기본 폰트 캐시 확보 여부.

### `POST /generate`
요청 (`GenerateRequest`, `packages/core` 계약과 동일):
```json
{
  "params": { "weight": 700, "slant": -8, "curvature": 0.5 },
  "imagePng": null
}
```
응답 (`GenerateResponse`):
```json
{
  "fontWoffBase64": "<base64 WOFF>",
  "fontFamily": "UserFont-xxxxxxxx",
  "generatedBy": "traditional",
  "appliedParams": { "weight": 700, "slant": -8, "curvature": 0.5 }
}
```

프론트는 `fontWoffBase64`를 `@font-face`에 바로 꽂아 쓰면 된다:
```css
@font-face {
  font-family: "UserFont-xxxxxxxx";
  src: url(data:font/woff;base64,<fontWoffBase64>) format("woff");
}
```

## 파라미터 → 가변폰트 축 매핑

| 우리 파라미터 | 범위        | Recursive 축 | 비고                |
|---------------|-------------|--------------|---------------------|
| weight        | 100~900     | `wght`       | 굵기                |
| slant         | -15~0 (deg) | `slnt`       | 기울임(음수=오른쪽) |
| curvature     | 0~1         | `CASL`       | Casual = 둥글기     |

- 서버에서도 `PARAM_RANGES`와 동일하게 **클램프**(방어적).
- 폰트에 실제 존재하는 축만, 폰트 자체 범위로 한 번 더 클램프해 적용.
- Recursive에는 우리가 매핑하지 않는 축(`MONO`, `CRSV`)도 있다. 이들은 폰트
  **기본값으로 핀(pin)** 한다. 즉 **모든 축을 핀해 완전한 정적 폰트**를 만든 뒤
  서브셋한다(부분 인스턴스의 `gvar` 서브셋 버그 회피 목적).
- 라틴 A–Z a–z 0–9 + 공백/기본 구두점만 **서브셋**해 WOFF 크기를 줄인다.

## imagePng (Phase 1 미사용)
`imagePng`는 선택 입력이며 Phase 1 전통 방식에서는 변형에 쓰지 않는다(받되 무시).
향후 "그린 글씨에서 스타일 추출" 확장을 위한 자리만 마련해 둔 것.

## 테스트
```bash
source .venv/bin/activate
pytest -q
```
- WOFF 매직넘버(`wOFF`) 확인, base64 디코드, fontTools 재오픈, 클램프 동작 검증.
- 폰트 다운로드 실패(오프라인 등) 시 생성 테스트는 자동 **skip**된다.

## 알려진 한계
- 기본 폰트 다운로드가 모든 미러에서 실패하면:
  - 서비스는 **뜨지만**, `/health`가 `font_loaded: false`를 보고하고
  - `POST /generate`는 **503**(폰트 다운로드 실패)을 반환한다.
- `curvature`는 Recursive `CASL` 축으로 근사한다(완벽한 곡률 제어가 아닌, 폰트가 제공하는 Casual 변형 범위 내 근사).
- Phase 1은 라틴 글자셋(A–Z a–z 0–9 + 기본 구두점)만 지원한다.
