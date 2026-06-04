terraform {
  required_version = ">= 1.5.0"
  required_providers {
    cloudflare = {
      source = "cloudflare/cloudflare"
      # v4 계열로 고정(이 코드의 리소스 스키마 기준). v5는 호환 깨짐이 있어 올리지 말 것.
      version = "~> 4.52"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}
