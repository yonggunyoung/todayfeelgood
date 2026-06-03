# ── 폰트 엔진 (FastAPI) Dockerfile ──
# 전통(비AI) 방식. 무거운 ML 의존성 없음 → 가벼운 슬림 이미지.
# 빌드/런타임 모두 python3.11-slim. 무료티어 메모리 의식(추가 빌드 도구 없음).
FROM python:3.11-slim

# 파이썬 런타임 위생: .pyc 미생성, stdout 즉시 플러시(로그 가시성).
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# 1) 의존성만 먼저 복사 → 레이어 캐시(소스만 바뀌면 pip 재설치 안 함).
COPY requirements.txt ./
RUN pip install --upgrade pip \
    && pip install -r requirements.txt

# 2) 엔진 소스 복사 (.dockerignore가 .venv/__pycache__/tests 등 제외).
COPY . .

# 비루트 사용자로 구동(보안). 폰트 캐시 디렉터리 쓰기 권한 필요.
RUN useradd --create-home --uid 10001 appuser \
    && chown -R appuser:appuser /app
USER appuser

# 엔진은 컨테이너 네트워크 내부에서만 노출(compose network). 호스트 직노출 금지.
EXPOSE 8000

# 컨테이너 내부 0.0.0.0 바인딩(서비스명으로만 접근 — nginx/앱이 같은 네트워크).
# 외부 노출은 compose에서 포트를 publish하지 않음으로써 차단한다.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
