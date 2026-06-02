#!/usr/bin/env bash
# 폰트 앱 헬스체크 — 엔진/프론트가 살아있는지 확인.
# 사용: bash infra/scripts/healthcheck.sh
set -u

ENGINE_URL="${ENGINE_URL:-http://127.0.0.1:8000}"
FRONT_URL="${FRONT_URL:-http://127.0.0.1:3001}"

fail=0

echo "▶ 엔진 헬스체크: $ENGINE_URL/health"
if curl -fsS --max-time 5 "$ENGINE_URL/health" >/dev/null; then
  echo "  ✅ 엔진 OK"
else
  echo "  ❌ 엔진 응답 없음"; fail=1
fi

echo "▶ 프론트 헬스체크: $FRONT_URL/"
if curl -fsS --max-time 5 -o /dev/null "$FRONT_URL/"; then
  echo "  ✅ 프론트 OK"
else
  echo "  ❌ 프론트 응답 없음"; fail=1
fi

if [ "$fail" -eq 0 ]; then
  echo "전체 정상"
else
  echo "일부 서비스 비정상 — 로그 확인 필요"
fi
exit $fail
