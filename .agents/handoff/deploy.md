# Handoff — Infra-Agent (배포 준비)

한 줄 결론: **`docker compose up -d --build` 원커맨드 배포 가능** 상태로 마무리. compose 문법 검증 통과, CI/YAML 유효.

## 만든 것
- `apps/font/engine/Dockerfile` — python3.11-slim, requirements 설치, 비루트, uvicorn 0.0.0.0:8000.
- `apps/font/engine/.dockerignore` — .venv/캐시/tests 제외, **assets/*.ttf 는 유지**(시작 시 폰트 다운로드 회피).
- `Dockerfile.next` (루트) — 멀티스테이지(deps→build→runner). build-arg: `WORKSPACE/APP_DIR/BASE_PATH/PORT`. `next start -p $PORT`. standalone 미사용(앱 next.config 미수정 원칙).
- `docker-compose.yml` (루트) — 7개 서비스(engine + home/font/sticker/sign/kit/textmoji + nginx). nginx만 80 공개, 엔진은 expose만(직노출 금지). env 주입(`NEXT_PUBLIC_SITE_URL`/`ENGINE_URL=http://engine:8000`/`ALLOWED_ORIGINS`/`BASE_PATH`). depends_on/restart/network/엔진 healthcheck.
- `infra/nginx/webapp.compose.conf` — 도커용 라우팅(서비스명 upstream + Docker DNS resolver). 기존 `webapp.conf`(127.0.0.1)는 프로세스 방식용으로 유지.
- `.env.example` (루트) — 전체 배포 변수 + 설명.
- `.dockerignore` (루트) — node_modules/.next/.venv/.git/docs 등 제외.
- `.github/workflows/ci.yml` — pnpm install→`pnpm -r build`→`pnpm -r lint` + 엔진 pytest(py3.11). pnpm/pip 캐시.
- `.github/workflows/deploy.yml` — workflow_dispatch SSH 스켈레톤(ORACLE_* 시크릿 placeholder, 가드 포함).
- `docs/deploy.md` — ①compose ②비도커(deploy.sh) ③도메인/TLS(certbot) ④환경변수표 ⑤무료티어 메모리 팁.

## 검증
- `docker compose config --quiet` → OK (Docker 29.3.1 / Compose v5.1.1).
- ci.yml / deploy.yml YAML 유효성 → OK.
- 실제 이미지 빌드는 시간/메모리상 생략(Dockerfile 단계 논리만 점검).

## Warning
- **포트 불일치 주의**: `apps/textmoji/frontend/package.json` 와 `apps/sign/frontend/package.json` 둘 다 `start -p 3003`. compose/Dockerfile.next 는 `start` 스크립트를 쓰지 않고 `next start -p $PORT`(textmoji=3005) 로 띄워 회피함. 비도커 방식 사용 시 textmoji start 스크립트 포트를 3005로 고치는 게 안전(FE-Agent 영역).
- 무료티어에서 6개 Next 동시 빌드는 OOM 위험 → docs의 "빌드 분리/스왑" 절 따를 것.
- 엔진은 startup 시 OFL 폰트를 받지만 assets에 ttf 번들됨(다운로드 회피). 그래도 첫 기동 네트워크 차단 환경이면 확인 필요.

## 비용/정책
- 추가 유료 요소 없음. AI 변수(AI_ENABLED/키)는 기본 OFF로 .env.example에 명시.

## 범위
- 앱 소스(app/components/engine 로직)·packages 미수정(읽기만). git 미실행.
- 참고: 작업 중 다른 에이전트가 `autofill.py`/`test_handwriting.py`/`en.ts`/`ko.ts`를 동시 수정함(내 변경 아님).
