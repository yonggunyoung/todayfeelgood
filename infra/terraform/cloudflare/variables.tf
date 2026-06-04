variable "cloudflare_api_token" {
  type        = string
  sensitive   = true
  description = <<-EOT
    Cloudflare API 토큰. 대시보드 → My Profile → API Tokens → Create Token.
    필요한 권한(최소): Zone:DNS:Edit, Zone:Zone Settings:Edit, Zone:Email Routing:Edit,
    Account:Email Routing Addresses:Edit. 특정 zone/account 로만 범위를 좁혀 발급할 것.
  EOT
}

variable "account_id" {
  type        = string
  description = "Cloudflare Account ID(대시보드 우측 또는 도메인 Overview 하단)."
}

variable "zone_id" {
  type        = string
  description = "도메인의 Zone ID(도메인 Overview 우측 하단). 도메인이 이미 Cloudflare에 추가·활성 상태여야 함."
}

variable "domain" {
  type        = string
  default     = "ddukkit.com"
  description = "루트 도메인."
}

variable "server_ip" {
  type        = string
  description = "오라클 인스턴스 공인 IP. (Oracle Terraform 산출물 instance_public_ip 를 넣으면 됨.)"
}

variable "forward_email" {
  type        = string
  description = <<-EOT
    contact@도메인 으로 온 메일을 포워딩할 실제 수신 주소(예: 본인 Gmail).
    적용 후 해당 메일함에 도착하는 Cloudflare 확인 메일의 링크를 1번 클릭해야 활성화된다(자동화 불가).
  EOT
}

variable "google_site_verification" {
  type        = string
  default     = ""
  description = "Google Search Console 도메인 속성용 TXT 값(google-site-verification=... 의 값 부분). 비우면 TXT 미생성."
}

variable "proxied" {
  type        = bool
  default     = true
  description = "A 레코드 Cloudflare 프록시(주황 구름). true 면 무료 SSL/CDN/rate limit 적용."
}

variable "enable_rate_limit" {
  type        = bool
  default     = true
  description = "생성 API(/font·/kit·/sign /api/*) 보호용 rate limit 규칙 생성 여부(무료플랜 1개)."
}

variable "rate_limit_requests" {
  type        = number
  default     = 20
  description = "분당 허용 요청 수(IP 기준). 너무 빡빡하면 30~40으로."
}
