# ── OCI 인증(콘솔에서 1회 발급) ──
variable "tenancy_ocid" {
  type        = string
  description = "테넌시 OCID."
}
variable "user_ocid" {
  type        = string
  description = "사용자 OCID."
}
variable "fingerprint" {
  type        = string
  description = "API 키 지문(fingerprint)."
}
variable "private_key_path" {
  type        = string
  description = "API 서명 개인키(.pem) 경로. 이 파일은 절대 커밋 금지(.gitignore 처리됨)."
}
variable "region" {
  type        = string
  description = "리전(예: ap-seoul-1, ap-chuncheon-1). ARM 무료 용량이 있는 리전을 선택."
}
variable "compartment_ocid" {
  type        = string
  description = "인스턴스를 만들 컴파트먼트 OCID(보통 루트 테넌시 OCID 사용 가능)."
}

# ── SSH ──
variable "ssh_public_key" {
  type        = string
  description = "인스턴스에 넣을 SSH 공개키 내용(ssh-rsa/ssh-ed25519 ...). 개인키는 본인만 보관."
}
variable "ssh_ingress_cidr" {
  type        = string
  description = <<-EOT
    SSH(22) 를 허용할 CIDR. **안전을 위해 기본값 없음** — 본인 공인 IP/32 를 권장(예: 1.2.3.4/32).
    전체 개방을 원하면 명시적으로 "0.0.0.0/0" 을 넣어야 한다(비권장).
  EOT
  validation {
    condition     = can(cidrhost(var.ssh_ingress_cidr, 0))
    error_message = "유효한 CIDR 이어야 합니다(예: 1.2.3.4/32)."
  }
}

# ── 인스턴스 사양(무료티어: Ampere ARM A1.Flex) ──
variable "instance_display_name" {
  type    = string
  default = "webapp-hub"
}
variable "instance_ocpus" {
  type        = number
  default     = 2
  description = "OCPU 수(무료티어 합산 4 OCPU 한도)."
}
variable "instance_memory_gbs" {
  type        = number
  default     = 12
  description = "메모리 GB(무료티어 합산 24GB 한도). 6앱 빌드 고려 12 이상 권장."
}
variable "availability_domain_index" {
  type        = number
  default     = 0
  description = "가용 도메인 인덱스. 용량 부족(Out of host capacity) 시 1,2 로 바꿔 재시도."
}
variable "boot_volume_gbs" {
  type    = number
  default = 50
}
