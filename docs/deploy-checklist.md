# 배포 체크리스트 — "내가 클릭할 것" vs "이미 준비된 것"

> 헷갈리지 않게 **사람만 할 수 있는 것**과 **자동화된 것**을 갈라 둔다.
> 결제·계정·콘솔 클릭·서버 명령은 마스터 몫(AI가 계정 접근 불가). 코드/스크립트/설정은 이미 준비됨.
> **처음부터 끝까지 순서대로 따라 하는 안내는 `docs/deploy-walkthrough.md`** (콘솔 클릭·검색등록·애드센스 포함).

## A. 마스터가 직접 (콘솔/결제, 한 번만)
- [ ] **1. 도메인 구매** — 등록업체에서 결제 (Cloudflare Registrar 권장: 저렴 + DNS·SSL·CDN 무료).
- [ ] **2. 오라클 인스턴스 생성** — Oracle Cloud → Compute → Instance →
      - Shape: **Ampere ARM(A1.Flex)**, OCPU 2~4 / RAM 12~24GB (무료티어). *AMD 마이크로 1GB는 6앱 못 돌림.*
      - Image: **Ubuntu 22.04**. SSH 키 다운로드. → **공인 IP** 메모.
- [ ] **3. 오라클 보안목록 개방** — VCN → Security List → Ingress 규칙에 **TCP 80, 443** 추가(0.0.0.0/0). *(ufw만으론 안 열림)*
- [ ] **4. DNS 연결** — 도메인 관리(Cloudflare)에서 **A 레코드: @ → 공인 IP** (그리고 `www` 또는 `en` 등 필요시). 프록시(주황구름) ON 권장.
- [ ] **5. 서버 접속 + 부트스트랩 1줄** —
      ```bash
      ssh -i 키파일 ubuntu@공인IP
      curl -fsSL https://raw.githubusercontent.com/yonggunyoung/todayfeelgood/claude/eager-planck-xAknw/infra/scripts/bootstrap.sh | DOMAIN=내도메인.com bash
      ```
      (레포가 private면: 먼저 `git clone` 후 `DOMAIN=내도메인.com bash infra/scripts/bootstrap.sh`)
- [ ] **6. TLS 켜기** — Cloudflare 프록시 ON이면 끝. 아니면 `certbot`(부트스트랩 마지막 안내 참고).

## B. 이미 준비됨 (AI가 만든 것 — 손댈 필요 없음)
- ✅ `docker-compose.yml` (엔진 + 6앱 + nginx 한 번에)
- ✅ `Dockerfile.next` / 엔진 Dockerfile, `.dockerignore`
- ✅ `infra/scripts/bootstrap.sh` (도커·방화벽·스왑·클론·.env·기동 원샷)
- ✅ `infra/nginx/webapp.conf` (서브경로 라우팅 /font /sticker /sign /kit /textmoji)
- ✅ `.env.example` (변수 설명), `docs/deploy.md` (상세), 헬스체크 스크립트(허브/nginx 점검 포함)
- ✅ GitHub Actions CI(빌드/린트/테스트), deploy.yml 스켈레톤
- ✅ **개인정보처리방침·이용약관**(한/영, 푸터·sitemap 연결) — 애드센스 심사 요건
- ✅ **검색 소유확인·애드센스·GA4 골격** — `.env` 에 토큰만 넣고 재배포하면 자동 활성(기본 OFF).
      값: `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`/`NEXT_PUBLIC_NAVER_SITE_VERIFICATION`/
      `NEXT_PUBLIC_ADSENSE_CLIENT`(→ `/ads.txt` 자동)/`NEXT_PUBLIC_GA_ID`.

## C. 도메인 정해지면 AI가 해줄 것
- `NEXT_PUBLIC_SITE_URL`, `ALLOWED_ORIGINS`, nginx `server_name`, sitemap/hreflang 절대URL을 **그 도메인으로 박아** 커밋 → 부트스트랩 시 바로 운영값.

## 요약
마스터 실제 작업 = **결제(도메인) + 콘솔 클릭 몇 번(인스턴스·포트·DNS) + 서버에 한 줄 붙여넣기.** 나머지는 자동.
