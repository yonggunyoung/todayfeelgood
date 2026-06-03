# Cloudflare 무료플랜 Rate Limit 가이드 (엔진 보호)

> 무료티어(Oracle ARM)의 폰트/이모티콘 생성 엔진은 CPU·메모리를 많이 쓴다.
> 누군가 생성 요청을 반복하면 OOM·다운으로 번질 수 있으므로, **Cloudflare 앞단에서
> 생성 경로에만 가벼운 rate limit** 한 줄을 걸어 둔다. 비용 0(무료플랜 규칙 1개 포함).

## 전제
- 도메인 DNS가 Cloudflare를 향하고, 레코드가 **프록시(주황 구름) ON** 상태일 것.
  (DNS만 쓰고 프록시 OFF면 트래픽이 Cloudflare를 거치지 않아 rate limit이 동작하지 않는다.)
- 앱 구조상 엔진은 외부 비노출이고, 각 앱의 BFF(`/<app>/api/...`)만 엔진을 호출한다.
  따라서 **공개적으로 막아야 할 표적은 각 앱의 생성 API 경로**다.

## 보호 대상 경로 (생성 = 무거운 작업)
실제로 엔진을 호출하는 BFF API만 막는다(레포 기준):

| 앱 | 생성 경로 |
|----|----------|
| font | `/font/api/generate`, `/font/api/handwriting`, `/font/api/hangul-compose` |
| kit | `/kit/api/generate` |
| sign | `/sign/api/generate` |
| sticker | (서버 호출 없음 — 클라이언트 전용, 보호 불필요) |
| textmoji | (서버 호출 없음 — 클라이언트 전용, 보호 불필요) |

> 정적 페이지·`_next/*`·이미지에는 걸지 말 것(정상 사용자 차단 위험). **`/api/` 쓰기 경로만**.

## 설정 (대시보드)
Cloudflare 대시보드 → 도메인 선택 → **Security → WAF → Rate limiting rules → Create rule**.

무료플랜은 rate limiting rule **1개**를 쓸 수 있다. 한 규칙으로 모든 앱 API를 덮는다.

- **Rule name**: `engine-generate-guard`
- **If incoming requests match** (Edit expression 로 직접 입력 권장):
  ```
  (starts_with(http.request.uri.path, "/font/api/")) or
  (starts_with(http.request.uri.path, "/kit/api/")) or
  (starts_with(http.request.uri.path, "/sign/api/"))
  ```
- **When rate exceeds**:
  - Requests: **20**
  - Period: **1 minute**
  - Counting characteristic: **IP**  (무료플랜 기본)
- **Then**: **Block**
  - Duration(차단 유지): **10 seconds** (무료플랜 최소값)
  - Response: 기본 `429 Too Many Requests`

> 권장 시작값은 **분당 20회/IP**. 실제 사용자는 그리고-생성을 반복해도 분당 몇 회 수준이라
> 여유가 크다. 운영 로그를 보고 너무 빡빡하면 30~40으로 올리고, 남용이 보이면 낮춘다.

## 보조 권장(선택, 무료)
- **Security → Settings → Security level**: `Medium` 이상(봇·평판 기반 1차 거름).
- **Bots → Bot Fight Mode**: ON (무료) — 단순 봇 차단.
- **Caching**: `_next/static/*` 등 정적 자산은 Cloudflare가 자동 캐시 → 오리진 부하↓.
  (생성 API는 절대 캐시되면 안 됨 — 기본적으로 `POST`/`no-store`라 캐시 대상 아님.)

## 동작 확인
배포 후 생성 API를 빠르게 반복 호출해 429가 뜨는지 본다(자기 IP로 잠깐만):
```bash
# 30번 빠르게 — 초과분은 429여야 한다. (남용 아님: 동작 확인용 1회 점검)
for i in $(seq 1 30); do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST https://ddukkit.com/font/api/generate
done | sort | uniq -c
```
`200`(또는 정상 코드)과 `429`가 섞여 나오면 규칙이 동작하는 것이다.
점검이 끝나면 잠시 기다렸다가(차단 해제) 정상 이용한다.

## 주의
- rate limit은 **방어선의 일부**일 뿐이다. 엔진 자체의 동시성 제한(세마포어)·요청 크기 상한
  (`client_max_body_size 4m`, 앱/엔진 2MB)과 **함께** 동작해야 무료티어가 안전하다.
- Cloudflare 프록시를 끄면(회색 구름) 이 규칙은 무력화된다 — DNS 변경 시 프록시 상태를 확인할 것.
- IP 기준 카운팅은 공유 IP(회사·학교) 사용자에게 영향을 줄 수 있으니 한도를 과하게 낮추지 말 것.
