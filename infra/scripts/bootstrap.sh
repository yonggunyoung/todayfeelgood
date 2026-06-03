#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# webapp 원샷 부트스트랩 (오라클 무료티어 Ubuntu ARM 기준)
#
# 갓 만든 서버에 SSH 접속한 뒤, 이 한 줄만 실행하면 끝:
#   curl -fsSL <이 파일 raw URL> | DOMAIN=내도메인.com bash
# 또는 레포를 이미 clone 했다면:
#   DOMAIN=내도메인.com bash infra/scripts/bootstrap.sh
#
# 하는 일: 도커 설치 → 방화벽(ufw) → 레포 클론/갱신 → .env 작성
#          → docker compose 빌드·기동.  (TLS는 마지막에 안내)
# ──────────────────────────────────────────────────────────────
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/yonggunyoung/todayfeelgood.git}"
BRANCH="${BRANCH:-claude/eager-planck-xAknw}"
APP_DIR="${APP_DIR:-$HOME/webapp}"
DOMAIN="${DOMAIN:-}"   # 예: DOMAIN=example.com

say(){ echo -e "\n\033[1;36m▶ $*\033[0m"; }

if [ -z "$DOMAIN" ]; then
  read -rp "도메인을 입력하세요 (예: example.com, 없으면 엔터=IP로 임시운영): " DOMAIN || true
fi

say "1) 시스템 패키지 + 도커 설치"
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl git ufw
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sudo sh
fi
sudo usermod -aG docker "$USER" || true
# compose plugin 확인
docker compose version >/dev/null 2>&1 || sudo apt-get install -y docker-compose-plugin

say "2) 방화벽(ufw) — 22/80/443 허용  (오라클 '보안 목록'도 콘솔에서 열어야 함!)"
sudo ufw allow 22/tcp || true
sudo ufw allow 80/tcp || true
sudo ufw allow 443/tcp || true
sudo ufw --force enable || true

say "3) 스왑 2GB (무료티어 빌드 OOM 방지, 없을 때만)"
if ! sudo swapon --show | grep -q .; then
  sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
  sudo mkswap /swapfile && sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi

say "4) 레포 클론/갱신 ($APP_DIR, 브랜치 $BRANCH)"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" fetch origin "$BRANCH" && git -C "$APP_DIR" checkout "$BRANCH" && git -C "$APP_DIR" pull origin "$BRANCH"
else
  git clone -b "$BRANCH" "$REPO_URL" "$APP_DIR"
fi
cd "$APP_DIR"

say "5) .env 작성"
if [ ! -f .env ]; then cp .env.example .env; fi
if [ -n "$DOMAIN" ]; then
  SITE="https://$DOMAIN"
  sed -i "s#^NEXT_PUBLIC_SITE_URL=.*#NEXT_PUBLIC_SITE_URL=$SITE#" .env
  sed -i "s#^ALLOWED_ORIGINS=.*#ALLOWED_ORIGINS=$SITE#" .env
  echo "  → NEXT_PUBLIC_SITE_URL / ALLOWED_ORIGINS = $SITE"
else
  echo "  → 도메인 미입력: .env 기본값(localhost)으로 둠. 나중에 수정 권장."
fi

say "6) 빌드 + 기동 (sg docker 로 그룹 즉시 적용)"
sg docker -c "docker compose up -d --build"

say "완료! 상태 확인:"
docker compose ps || true
cat <<EOF

──────────────────────────────────────────────
다음 할 일 (마스터):
 1) DNS: 도메인 A레코드 → 이 서버 공인 IP  (Cloudflare 권장)
    현재 공인 IP: $(curl -s --max-time 5 ifconfig.me 2>/dev/null || echo '확인필요')
 2) 오라클 콘솔 → VCN '보안 목록'에서 80, 443 인그레스 허용 (ufw만으론 부족!)
 3) TLS:
    - Cloudflare 프록시(주황구름) ON → SSL 자동, 가장 쉬움
    - 또는 서버에서: sudo apt install -y certbot && sudo certbot certonly --standalone -d $DOMAIN
      후 nginx에 인증서 연결(docs/deploy.md 참고)
 4) 접속 확인: http://$DOMAIN  (DNS 전파 후)
──────────────────────────────────────────────
EOF
