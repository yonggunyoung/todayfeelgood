#!/usr/bin/env bash
# webapp 헬스체크 — 엔진/프론트/허브(nginx 경유)가 살아있는지 확인.
# 사용:
#   비도커(process):  bash infra/scripts/healthcheck.sh
#   도커(nginx만 공개): HUB_URL=http://127.0.0.1 bash infra/scripts/healthcheck.sh
#
# 변수:
#   ENGINE_URL  엔진 직접(프로세스 방식에서만 접근 가능)   기본 http://127.0.0.1:8000
#   FRONT_URL   폰트 프론트 직접(프로세스 방식)             기본 http://127.0.0.1:3001
#   HUB_URL     nginx(:80) 경유 허브 — 도커 배포 확인용     기본 http://127.0.0.1
set -u

ENGINE_URL="${ENGINE_URL:-http://127.0.0.1:8000}"
FRONT_URL="${FRONT_URL:-http://127.0.0.1:3001}"
HUB_URL="${HUB_URL:-http://127.0.0.1}"

fail=0

# 한 경로를 GET 해서 2xx/3xx면 OK. (-o /dev/null, -w 코드)
check() {
  local label="$1" url="$2"
  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$url" 2>/dev/null || echo 000)
  if [ "$code" -ge 200 ] && [ "$code" -lt 400 ]; then
    echo "  ✅ $label OK ($code) — $url"
  else
    echo "  ❌ $label 응답 이상 ($code) — $url"; fail=1
  fi
}

echo "▶ 엔진 헬스체크"
if curl -fsS --max-time 5 "$ENGINE_URL/health" >/dev/null 2>&1; then
  echo "  ✅ 엔진 OK — $ENGINE_URL/health"
else
  echo "  ⚠ 엔진 직접 응답 없음 — $ENGINE_URL (도커 배포면 엔진은 내부 전용이라 정상)"
fi

echo "▶ 폰트 프론트(직접, 프로세스 방식)"
if curl -fsS --max-time 5 -o /dev/null "$FRONT_URL/" 2>/dev/null; then
  echo "  ✅ 프론트 OK — $FRONT_URL/"
else
  echo "  ⚠ 프론트 직접 응답 없음 — $FRONT_URL (도커 배포면 nginx 경유만 열려 정상)"
fi

echo "▶ 허브 헬스체크 (nginx 경유 — 도커/운영 확인)"
check "홈"        "$HUB_URL/"
check "폰트공방"  "$HUB_URL/font"
check "개인정보처리방침" "$HUB_URL/privacy"
check "이용약관"  "$HUB_URL/terms"

if [ "$fail" -eq 0 ]; then
  echo "전체 정상"
else
  echo "일부 서비스 비정상 — docker compose logs / nginx 설정 확인 필요"
fi
exit $fail
