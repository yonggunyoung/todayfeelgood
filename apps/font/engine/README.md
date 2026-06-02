# Font Engine (Phase 1 · 전통/비AI 방식) — 계약 v2

그린 글씨 서비스의 **폰트 생성 백엔드**. 기본 가변폰트(Recursive VF)를
입력 파라미터(weight/slant/curvature)로 변형해 라틴 a–z 폰트를 만든다.
출력 포맷은 **WOFF**(프리뷰) 또는 **TTF**(다운로드) 선택.

**비용 0**: 외부 유료 API(LLM/이미지 생성 등) 호출이 전혀 없다.
공개 폰트 미러 다운로드(앱 시작 시 1회) + 로컬 `fontTools` 연산만 사용한다.

## 실행법

```bash
cd apps/font/engine
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

uvicorn main:app --port 8000
# 개발 중 자동 리로드: uvicorn main:app --port 8000 --reload
```

**앱 시작 시(lifespan)** 기본 가변폰트를 `assets/Recursive_VF.ttf`로 1회
다운로드/캐시한다(이미 있으면 재사용). `/generate`는 요청마다 다운로드하지
않으며, 시작 시 로드에 실패하면 **즉시 503**으로 빠르게 실패한다.

### 환경변수
| 변수 | 기본값 | 설명 |
|------|--------|------|
| `ALLOWED_ORIGINS` | `http://localhost:3000,http://localhost:3001,http://127.0.0.1:3001` | CORS 화이트리스트(쉼표구분). 와일드카드 미사용. |

## 엔드포인트

### `GET /health`
```json
{ "status": "ok", "font_loaded": true }
```
`font_loaded`는 startup이 채운 **캐시된 boolean**(전체 파일 read 안 함).

### `POST /generate`
요청 (`GenerateRequest`, `packages/core` 계약 v2):
```json
{
  "params": { "weight": 700, "slant": -8, "curvature": 0.5 },
  "format": "woff",
  "imagePng": null
}
```
- `format`: `"woff"`(기본) | `"ttf"`. 그 외 값은 **422**.
- `params`: 범위 밖이면 pydantic이 **422**, 통과해도 서버에서 한 번 더 clamp.
- `imagePng`: 선택, Phase 1 미사용. 길이가 2MB(`MAX_IMAGE_PNG_BYTES`) 초과면 **413**.

응답 (`GenerateResponse` v2):
```json
{
  "fontBase64": "<base64 폰트>",
  "format": "woff",
  "fontFamily": "UserFont-xxxxxxxx",
  "generatedBy": "traditional",
  "appliedParams": { "weight": 700, "slant": -8, "curvature": 0.5 }
}
```
> 구 필드 `fontWoffBase64`는 폐기되고 `fontBase64`로 통일됐다.

프론트는 `fontBase64`를 `@font-face`에 바로 꽂아 쓰면 된다:
```css
@font-face {
  font-family: "UserFont-xxxxxxxx";
  src: url(data:font/woff;base64,<fontBase64>) format("woff");
}
```

## 파라미터 → 가변폰트 축 매핑

| 우리 파라미터 | 범위        | Recursive 축 | 비고                |
|---------------|-------------|--------------|---------------------|
| weight        | 100~900     | `wght`       | 굵기                |
| slant         | -15~0 (deg) | `slnt`       | 기울임(음수=오른쪽) |
| curvature     | 0~1         | `CASL`       | Casual = 둥글기     |

- pydantic 범위 제약 + 서버 `clamp_params`(NaN/Inf 거부) 이중 가드.
- 모든 축을 핀해 완전한 정적 폰트를 만든 뒤 서브셋한다(부분 인스턴스 gvar 버그 회피).
- 라틴 A–Z a–z 0–9 + 공백/기본 구두점만 **서브셋**(woff/ttf 둘 다 유지).

## 보안/견고성 (review·security 보고서 반영)
- **CORS**: 와일드카드 제거 → `ALLOWED_ORIGINS` 화이트리스트, 메서드 `GET/POST`, 헤더 `Content-Type`만.
- **동시성/비블로킹**: CPU 집약 생성을 `run_in_executor`(스레드풀)로 처리해 이벤트루프 비블로킹. `asyncio.Semaphore(3)`로 동시 생성 제한, 포화 시 **503**.
- **에러 살균**: 전역 예외 핸들러가 내부 예외/스택/절대경로를 숨기고 일반 메시지만 반환.
- **폰트 다운로드 안전화**(`font_loader.py`): HTTPS만, 리다이렉트 최대 3회, 스트리밍 + 10MB 상한, content-type 확인, sfnt 매직+크기 검증(+선택 SHA-256 핀 `EXPECTED_SHA256`).
- **의존성 핀**: `requirements.txt` `==` 고정.

## imagePng (Phase 1 미사용)
선택 입력이며 변형에 쓰지 않는다(받되 무시). 다만 크기 가드(413)는 둔다.

## 테스트
```bash
source .venv/bin/activate
pytest -q
```
- `test_generator.py`: clamp(범위/NaN/Inf), WOFF/TTF 매직 + 서브셋 + fontTools 재오픈.
- `test_api.py`: v2 응답 형태(`fontBase64`/`format`), woff/ttf, 잘못된 format 422, 범위 밖 422, imagePng 초과 413, /health.
- 폰트 다운로드 실패(오프라인) 시 생성 테스트는 자동 **skip**.

## 알려진 한계
- 기본 폰트 다운로드가 모든 미러에서 실패하면 서비스는 뜨되 `/health=false`, `/generate`는 **즉시 503**.
- `EXPECTED_SHA256`는 기본 `None`(매직+크기 검증만). 운영 전 1.085 해시를 핀하면 공급망 무결성이 강해진다.
- `curvature`는 Recursive `CASL` 축으로 근사(완벽한 곡률 제어 아님).
- Phase 1은 라틴 글자셋(A–Z a–z 0–9 + 기본 구두점)만 지원.
