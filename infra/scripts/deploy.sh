#!/usr/bin/env bash
# Oracle 무료 티어 배포 스크립트 (Phase 1, 단순형).
# 전제: 서버에 node(>=20), pnpm, python3.11, nginx 설치됨. 레포는 이미 clone/pull 됨.
# 사용: bash infra/scripts/deploy.sh
#
# 무료 티어 메모리 제약을 의식할 것. 빌드는 메모리를 많이 먹으므로
# 필요 시 스왑을 켜거나, 로컬에서 빌드한 산출물을 올리는 방식도 고려.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
echo "레포 루트: $ROOT"

echo "── 1) 프론트엔드 빌드 (폰트앱 + 홈) ──"
corepack enable >/dev/null 2>&1 || true
pnpm install --frozen-lockfile
pnpm -r build

echo "── 2) 엔진 의존성 ──"
cd apps/font/engine
python3 -m venv .venv
# shellcheck disable=SC1091
source .venv/bin/activate
pip install --upgrade pip >/dev/null
pip install -r requirements.txt
deactivate
cd "$ROOT"

echo "── 3) 프로세스 기동 안내 ──"
cat <<'EOF'
다음을 (예: systemd 또는 pm2/nohup) 서비스로 등록해 상시 구동하세요:

  # 폰트 엔진 (FastAPI) — loopback 전용(외부 비노출). CORS 허용 출처는 운영 도메인으로.
  cd apps/font/engine && \
    ALLOWED_ORIGINS="https://<도메인>" .venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000

  # 폰트 프론트엔드 (Next, basePath=/font) — 엔진은 서버측에서만 호출
  ENGINE_URL=http://127.0.0.1:8000 \
    pnpm --filter @webapp/font-frontend exec next start -p 3001

  # 메인 홈페이지 (Next)
  pnpm --filter @webapp/home exec next start -p 3000

그리고 infra/nginx/webapp.conf 를 nginx에 반영 후:
  sudo nginx -t && sudo systemctl reload nginx

마지막으로 헬스체크:
  bash infra/scripts/healthcheck.sh
EOF

echo "배포 준비 완료."
