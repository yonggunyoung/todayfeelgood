#!/usr/bin/env bash
# 일일 자동 학습 실행 스크립트
# 사용: bash run_daily.sh [--force]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── API 키 확인 ───────────────────────────────────────────
if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
    if [ -f "$SCRIPT_DIR/.env" ]; then
        # shellcheck disable=SC1091
        source "$SCRIPT_DIR/.env"
    fi
fi

if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
    echo "❌ ANTHROPIC_API_KEY 가 설정되지 않았습니다."
    echo "   방법 1: export ANTHROPIC_API_KEY='sk-ant-...'"
    echo "   방법 2: $SCRIPT_DIR/.env 파일에 ANTHROPIC_API_KEY=sk-ant-... 저장"
    exit 1
fi

# ── 의존 패키지 자동 설치 ────────────────────────────────
if ! python3 -c "import anthropic, requests, bs4" 2>/dev/null; then
    echo "📦 필요 패키지 설치 중..."
    pip3 install -q -r "$SCRIPT_DIR/requirements.txt"
fi

# ── 실행 ─────────────────────────────────────────────────
echo "🚀 일일 자동 학습 시작: $(date '+%Y-%m-%d %H:%M:%S')"
python3 "$SCRIPT_DIR/daily_auto_learn.py" "$@"
