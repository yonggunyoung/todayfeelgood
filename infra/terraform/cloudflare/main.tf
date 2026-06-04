# ──────────────────────────────────────────────────────────────
# Cloudflare 설정을 코드로 — DNS · Email Routing · SSL · Rate limit.
# 전제: 도메인이 이미 Cloudflare 에 추가되어 "Active" 상태(네임서버 연결 완료).
#       (도메인 구매/네임서버 연결/결제는 사람만 가능 → 그 뒤 이 코드가 나머지를 친다.)
# ──────────────────────────────────────────────────────────────

# ── DNS: 루트(@)·www 를 서버 IP로, 프록시 ON ──
resource "cloudflare_record" "root" {
  zone_id = var.zone_id
  name    = "@"
  type    = "A"
  value   = var.server_ip
  proxied = var.proxied
  ttl     = 1 # proxied 면 자동(1=auto)
  comment = "webapp 허브 — 오라클 인스턴스"
}

resource "cloudflare_record" "www" {
  zone_id = var.zone_id
  name    = "www"
  type    = "A"
  value   = var.server_ip
  proxied = var.proxied
  ttl     = 1
  comment = "webapp 허브 — www"
}

# ── (선택) Google Search Console 도메인 속성 소유확인 TXT ──
resource "cloudflare_record" "google_verification" {
  count   = var.google_site_verification != "" ? 1 : 0
  zone_id = var.zone_id
  name    = "@"
  type    = "TXT"
  value   = "google-site-verification=${var.google_site_verification}"
  ttl     = 3600
  comment = "Google Search Console 도메인 속성 소유확인"
}

# ── SSL/HTTPS: 프록시 뒤에서 안전 기본값 ──
resource "cloudflare_zone_settings_override" "ssl" {
  zone_id = var.zone_id
  settings {
    ssl                      = "full" # 오리진 자체 인증서 없이도 동작(권장: full). 오리진에 유효 인증서면 strict.
    always_use_https         = "on"
    automatic_https_rewrites = "on"
    min_tls_version          = "1.2"
    tls_1_3                  = "on"
    brotli                   = "on"
  }
}

# ── Email Routing: contact@도메인 → 실제 메일함 포워딩 ──
resource "cloudflare_email_routing_settings" "this" {
  zone_id     = var.zone_id
  enabled     = true
  skip_wizard = true
}

# 목적지(수신) 주소 등록 — 적용 후 해당 메일함의 확인 링크를 1번 클릭해야 verified 된다.
resource "cloudflare_email_routing_address" "destination" {
  account_id = var.account_id
  email      = var.forward_email
}

resource "cloudflare_email_routing_rule" "contact" {
  zone_id = var.zone_id
  name    = "contact -> ${var.forward_email}"
  enabled = true

  matcher {
    type  = "literal"
    field = "to"
    value = "contact@${var.domain}"
  }
  action {
    type  = "forward"
    value = [var.forward_email]
  }

  depends_on = [
    cloudflare_email_routing_settings.this,
    cloudflare_email_routing_address.destination,
  ]
}

# ── Rate limit: 생성 API 만 가볍게 제한(무료플랜 1개 규칙) ──
# 레포 실제 BFF 경로: /font/api/*, /kit/api/*, /sign/api/*  (sticker·textmoji 는 서버호출 없음)
resource "cloudflare_ruleset" "rate_limit" {
  count   = var.enable_rate_limit ? 1 : 0
  zone_id = var.zone_id
  name    = "engine-generate-guard"
  kind    = "zone"
  phase   = "http_ratelimit"

  rules {
    description = "생성 API 남용 방지(무료티어 엔진 보호)"
    enabled     = true
    action      = "block"
    expression  = "(starts_with(http.request.uri.path, \"/font/api/\")) or (starts_with(http.request.uri.path, \"/kit/api/\")) or (starts_with(http.request.uri.path, \"/sign/api/\"))"

    ratelimit {
      # ip.src 기준 카운팅. 무료플랜에서 cf.colo.id 동반이 필요한 경우가 있어 함께 둔다.
      characteristics     = ["ip.src", "cf.colo.id"]
      period              = 60
      requests_per_period = var.rate_limit_requests
      mitigation_timeout  = 10
    }
  }
}
