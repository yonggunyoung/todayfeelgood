# 배포 따라하기 (처음부터 끝까지) — ddukkit.com

> 콘솔 클릭·결제·서버 명령을 **순서대로** 따라 하면 `https://ddukkit.com` 이 열리고,
> 검색 등록·애드센스까지 이어진다. 코드/설정은 이미 준비돼 있으니 **여기 적힌 것만** 하면 된다.
> 상세 배경은 `docs/deploy.md`, "사람만 할 일 vs 자동" 요약은 `docs/deploy-checklist.md`.

소요: 처음이면 1~2시간(대기 시간 포함). 결제는 도메인값(연 1만원대)뿐, 서버는 오라클 무료티어.

---

## 0. 준비물
- 카드(도메인 결제용), 구글 계정, 이메일.
- 터미널(SSH). Windows면 PowerShell 또는 PuTTY.

---

## 1. 도메인 + Cloudflare
**1-1. Cloudflare 가입** → dash.cloudflare.com.

**1-2. 도메인 구매** — 좌측 **Registrar → Register Domains** 에서 `ddukkit.com` 검색·결제.
(Cloudflare Registrar 는 원가 판매 + DNS·SSL·CDN 무료라 권장. 이미 다른 곳에서 샀다면 1-3.)

**1-3. (외부 등록업체에서 산 경우만) 네임서버 연결** — Cloudflare에 사이트 추가 →
안내된 네임서버 2개를 등록업체 관리페이지에 입력. 전파까지 수십 분~수 시간.

**1-4. Email Routing 켜기 (contact@ddukkit.com 수신)** — 약관/개인정보 페이지의 연락처가
실제로 받아지게 만든다. 좌측 **Email → Email Routing → Enable**:
- "Destination addresses" 에 **본인 Gmail** 추가 → 받은 확인메일의 링크 클릭.
- "Custom addresses" 에 `contact@ddukkit.com` → **Forward to** 본인 Gmail.
- Cloudflare가 MX 레코드를 자동으로 넣어준다(수락).
- 확인: `contact@ddukkit.com` 로 메일 보내 Gmail에 도착하는지 1회 테스트.

> DNS A 레코드 연결은 서버 IP가 나온 **3단계 이후**에 한다(1-5).

---

## 2. 오라클 인스턴스 생성
**2-1. 가입** — cloud.oracle.com → Always Free 가능 지역 선택.

**2-2. 인스턴스 생성** — Compute → Instances → Create:
- **Image**: Ubuntu 22.04.
- **Shape**: Change Shape → **Ampere (ARM)** → `VM.Standard.A1.Flex`, **OCPU 2, RAM 12GB** 이상.
  *AMD Micro(1GB)는 6개 앱을 못 돌린다 — 반드시 Ampere ARM.*
- **SSH 키**: "Generate a key pair" → **개인키 다운로드**(.key) 잘 보관.
- Create → 상태 Running 되면 **Public IP 주소 메모**.

**2-3. 보안목록에서 80·443 열기 (필수)** — 인스턴스의 VCN → **Security Lists** →
default → **Add Ingress Rules**:
- Source `0.0.0.0/0`, IP Protocol **TCP**, Destination Port **80** → 추가.
- 같은 방식으로 **443** 추가.
- *서버 안의 ufw만으론 안 열린다. 이 콘솔 설정이 꼭 필요.*

---

## 1-5. DNS 연결 (IP가 생긴 뒤)
Cloudflare → **DNS → Records → Add record**:
- Type **A**, Name `@`, IPv4 = **오라클 Public IP**, Proxy status **Proxied(주황 구름) ON** → Save.
- 한 번 더: Type **A**, Name `www`, 같은 IP, Proxied ON.

---

## 3. 서버 접속 + 원샷 배포
```bash
# 개인키 권한(맥/리눅스)
chmod 600 ~/Downloads/your-key.key
# 접속 (IP는 2-2에서 메모한 값)
ssh -i ~/Downloads/your-key.key ubuntu@<공인IP>
```
접속됐으면 **한 줄**:
```bash
curl -fsSL https://raw.githubusercontent.com/yonggunyoung/todayfeelgood/claude/eager-planck-xAknw/infra/scripts/bootstrap.sh | DOMAIN=ddukkit.com bash
```
이게 도커 설치 → 방화벽 → 스왑 2GB → 레포 클론 → `.env` 작성(SITE_URL·ALLOWED_ORIGINS를
ddukkit.com으로) → **home·font·전 앱·nginx 빌드·기동** 까지 한다.

> 무료티어에서 6개 동시 빌드가 무거우면(OOM) 끊길 수 있다. 그럴 땐 `docs/deploy.md`의
> **"빌드 분리"** 절대로 서비스별 순차 빌드 후 `docker compose up -d`.

---

## 4. TLS(https)
- **Cloudflare 프록시 ON(1-5에서 했음)이면 https 자동.** Cloudflare → SSL/TLS →
  Overview 에서 모드 **Full** 권장.
- (프록시를 안 쓸 때만) 서버에서 certbot — `docs/deploy.md` 3절 참고.

---

## 5. 동작 확인
```bash
# 서버 안에서
cd ~/webapp
HUB_URL=http://127.0.0.1 bash infra/scripts/healthcheck.sh   # 홈/폰트/약관 2xx 확인
docker compose ps                                            # 모든 서비스 Up
```
브라우저에서 `https://ddukkit.com`, `https://ddukkit.com/font`(직접 그려 폰트 생성),
`https://ddukkit.com/privacy` 확인.

---

## 6. 검색 등록 (배포 후)
sitemap은 이미 있다: `https://ddukkit.com/sitemap.xml`, `https://ddukkit.com/font/sitemap.xml`.

**6-1. Google Search Console** — search.google.com/search-console →
- **도메인 속성** 추가(`ddukkit.com`) → 표시되는 **TXT 레코드**를 Cloudflare DNS에 추가(Type TXT, Name `@`, 값 붙여넣기) → 확인.
  *(이 방식이면 코드/토큰 불필요 — 가장 깔끔.)*
- 확인되면 **Sitemaps** 메뉴에 `sitemap.xml` 제출.

**6-2. 네이버 서치어드바이저 (한국 타깃 필수)** — searchadvisor.naver.com →
- 사이트 등록 `https://ddukkit.com` → 소유확인. **HTML 태그** 방식이면 발급 토큰을
  서버 `.env`의 `NEXT_PUBLIC_NAVER_SITE_VERIFICATION=` 에 넣고 **재배포**(아래 8-재배포).
  *(또는 HTML 파일 방식 대신 위 메타태그 방식 권장 — 코드에 이미 지원.)*
- 등록 후 **사이트맵 제출** + **수집요청**.

**6-3. (선택) Bing** — bing.com/webmasters → Search Console에서 가져오기(import)가 가장 쉬움.
직접 하려면 토큰을 `.env`의 `NEXT_PUBLIC_BING_SITE_VERIFICATION=` 에 넣고 재배포.

---

## 7. 애드센스
**7-1. 가입/사이트 추가** — adsense.google.com 가입(본인 Gmail) → 사이트 `ddukkit.com` 추가.
- 정책 페이지(개인정보처리방침·이용약관)는 이미 있고 푸터에 링크돼 있어 심사 요건 충족.

**7-2. 게재 코드 켜기** — 승인(또는 코드 발급) 후, 서버 `.env` 에:
```
NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-0000000000000000   # 발급받은 본인 값
```
→ **재배포**(8). 그러면 광고 로더 스크립트가 전 페이지에 들어가고,
`https://ddukkit.com/ads.txt` 가 자동으로 `google.com, pub-..., DIRECT, f08c47fec0942fa0` 를 낸다.
(개별 광고 단위 배치는 승인 후 단계 — 필요하면 코드로 도와줄 수 있음.)

> 정책 메모: 외부 광고망 직접삽입은 **토스 미니앱**에서 금지(CLAUDE.md §6). **웹 배포 한정**이며,
> 토스 빌드에선 이 env 를 비워 두면 자동으로 꺼진다.

---

## 8. 분석(GA4) + 재배포
- **GA4**: analytics.google.com → 속성 만들기 → 측정 ID(`G-XXXX`) → 서버 `.env`:
  ```
  NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
  ```
- **재배포(값 바꾼 뒤 공통)** — `NEXT_PUBLIC_*` 는 빌드 때 구워지므로 **재빌드** 필요:
  ```bash
  cd ~/webapp && git pull && docker compose up -d --build
  ```

---

## 9. (선택) 남용 방지
생성 API가 무료티어를 흔들지 않게 Cloudflare rate limit 한 규칙 — `docs/cloudflare-rate-limit.md`.

---

## 트러블슈팅
- **사이트가 안 열림** → ① 오라클 보안목록 80/443(2-3) ② Cloudflare A레코드/프록시(1-5)
  ③ `docker compose ps` 로 서비스 상태 ④ `docker compose logs nginx`.
- **빌드 중 멈춤/Killed** → OOM. 스왑 확인(`swapon --show`) + `docs/deploy.md` 빌드 분리.
- **canonical/검증 토큰이 안 박힘** → `.env` 값 넣고 **`--build`로 재배포**했는지(런타임만으론 안 됨).
- **contact 메일이 안 옴** → Cloudflare Email Routing(1-4)의 Destination 확인 메일 수락 여부.
