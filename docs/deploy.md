# 배포 가이드 (Oracle 무료티어)

webapp 모노레포 배포 문서. 구성은 **엔진(FastAPI) + Next 앱 6개 + nginx 리버스프록시**.
nginx 만 외부(80)로 노출하고, 엔진과 앱은 내부에서만 통신한다(엔진 직노출 금지).

| 서비스 | 경로 | 포트(내부) |
|--------|------|-----------|
| home (메인 홈) | `/` | 3000 |
| font (폰트공방) | `/font` | 3001 |
| sticker (스티커공방) | `/sticker` | 3002 |
| sign (싸인공방) | `/sign` | 3003 |
| kit (브랜드키트) | `/kit` | 3004 |
| textmoji (텍스트모지) | `/textmoji` | 3005 |
| engine (폰트 엔진) | (비노출) | 8000 |

---

## 1) Docker Compose 방식 (권장)

가장 단순. 서버에 Docker + Docker Compose 플러그인만 있으면 된다.

```bash
# 1. 레포 클론/풀
git clone <repo> webapp && cd webapp     # 또는 git pull

# 2. 환경변수 준비
cp .env.example .env
#   .env 에서 최소 아래 둘은 운영 값으로:
#     NEXT_PUBLIC_SITE_URL=https://yourdomain.com
#     ALLOWED_ORIGINS=https://yourdomain.com
#   ENGINE_URL 은 기본값(http://engine:8000) 그대로 두면 됨.

# 3. 빌드 + 기동
docker compose up -d --build

# 4. 상태/로그
docker compose ps
docker compose logs -f nginx
```

- nginx 는 `infra/nginx/webapp.compose.conf` 를 마운트해서 사용한다(서비스명 upstream).
- 엔진은 `expose` 만 하고 호스트 포트를 publish 하지 않는다 → 외부에서 직접 접근 불가.
- 코드 갱신 후 재배포: `git pull && docker compose up -d --build`.

### 무료티어에서 빌드 분리 (중요)
6개 Next 앱을 한 번에 빌드하면 메모리가 터질 수 있다(OOM). 서비스별로 나눠서 빌드:

```bash
docker compose build engine
docker compose build home
docker compose build font
docker compose build sticker
docker compose build sign
docker compose build kit
docker compose build textmoji
docker compose up -d
```

---

## 2) 비도커(프로세스) 방식 — 기존 deploy.sh

Docker 없이 호스트에 직접 node/pnpm/python3.11/nginx 를 설치해 돌리는 방식.

```bash
# 전제: node>=20, pnpm, python3.11, nginx 설치 + 레포 clone/pull 완료
bash infra/scripts/deploy.sh
```

`deploy.sh` 는 ① 프론트 빌드(`pnpm -r build`) ② 엔진 venv 설치 ③ 기동 안내를 출력한다.
출력된 안내대로 각 Next 앱과 엔진을 systemd/pm2 등으로 상시 구동한 뒤:

```bash
# nginx: 프로세스 방식은 127.0.0.1 upstream 인 webapp.conf 를 사용
sudo cp infra/nginx/webapp.conf /etc/nginx/conf.d/webapp.conf
sudo nginx -t && sudo systemctl reload nginx

# 헬스체크
bash infra/scripts/healthcheck.sh
```

> 도커 방식은 `webapp.compose.conf`(서비스명 upstream), 프로세스 방식은 `webapp.conf`(127.0.0.1) 를 쓴다.

---

## 3) 도메인 / TLS (certbot)

1. DNS A 레코드를 오라클 인스턴스 공개 IP 로 지정.
2. `webapp.compose.conf`(또는 `webapp.conf`)의 `server_name _;` 를 실제 도메인으로 교체.
3. 인증서 발급(호스트 nginx 기준):
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com
   ```
4. Docker nginx 를 쓰는 경우엔 `/etc/letsencrypt` 를 컨테이너에 마운트(`docker-compose.yml`
   nginx 서비스의 주석 처리된 volume/443 포트 참고)하고, conf 에 443 server 블록 + 인증서 경로를 추가한다.
5. 발급 후 `NEXT_PUBLIC_SITE_URL` / `ALLOWED_ORIGINS` 를 `https://...` 로 갱신하고 재배포.

---

## 4) 환경변수표

| 변수 | 용도 | 예시 / 기본 |
|------|------|------------|
| `NEXT_PUBLIC_SITE_URL` | SEO·OG·절대 URL 생성 | `https://yourdomain.com` (기본 `http://localhost`) |
| `ENGINE_URL` | 앱 BFF가 호출할 엔진 주소(서버측) | `http://engine:8000` (도커) / `http://127.0.0.1:8000` (프로세스) |
| `ALLOWED_ORIGINS` | 엔진 CORS 화이트리스트(쉼표구분, 와일드카드 금지) | `https://yourdomain.com` |
| `BASE_PATH` | 앱 서브경로(앱별 주입) | `/font`, `/sticker`, … (home 은 `""`) |
| `NEXT_PUBLIC_ENGINE_URL` | 브라우저 직접 호출용(보통 미사용) | `http://127.0.0.1:8000` |
| `ENGINE_HOST` / `ENGINE_PORT` | 프로세스 방식 엔진 바인딩 | `127.0.0.1` / `8000` |
| `AI_ENABLED` | AI 방식 on/off (Phase 2, **기본 OFF**) | `false` |
| `ANTHROPIC_API_KEY` / `GOOGLE_API_KEY` | AI 방식 키(유료, 기본 미설정) | (비움) |

> compose 는 위 값들을 `.env` 에서 읽어 각 서비스에 주입한다. 앱별 `BASE_PATH`/`PORT` 는
> `docker-compose.yml` 의 build args + environment 에서 고정되므로 보통 `.env` 로 건드릴 필요 없다.

---

## 5) 무료티어 메모리 팁

- **스왑 켜기** (빌드 OOM 방지, 최소 2GB 권장):
  ```bash
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  ```
- **빌드 분리**: 위 1)의 "빌드 분리" 처럼 서비스별로 순차 빌드.
- **사전 빌드 산출물 업로드**: 서버 빌드가 너무 무거우면 로컬/CI 에서 이미지 빌드 후
  레지스트리로 push → 서버는 `docker compose pull` 만(빌드 생략).
- **엔진 동시성**: 엔진은 세마포어로 동시 생성 수를 제한(한글은 더 낮게)한다 — 무료티어 메모리 보호.
- **빌드 메모리 상한**: `Dockerfile.next` 와 CI 는 `NODE_OPTIONS=--max-old-space-size` 로 상한을 둔다.
