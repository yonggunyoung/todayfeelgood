output "dns_records" {
  value = {
    root = "${var.domain} → ${var.server_ip} (proxied=${var.proxied})"
    www  = "www.${var.domain} → ${var.server_ip} (proxied=${var.proxied})"
    txt  = var.google_site_verification != "" ? "google-site-verification 설정됨" : "TXT 미설정"
  }
  description = "생성된 DNS 레코드 요약."
}

output "email_routing_next_step" {
  value       = "‼ ${var.forward_email} 메일함에서 Cloudflare 확인 메일의 링크를 1번 클릭해야 contact@${var.domain} 포워딩이 활성화됩니다."
  description = "Email Routing 목적지 검증(사람 1회 클릭 필요)."
}

output "rate_limit" {
  value       = var.enable_rate_limit ? "활성 — 분당 ${var.rate_limit_requests}회/IP, /font·/kit·/sign /api/*" : "비활성"
  description = "Rate limit 규칙 상태."
}
