terraform {
  required_version = ">= 1.5.0"
  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 5.30"
    }
  }
}

# 인증: OCI API 서명 키(사람이 콘솔에서 1회 생성).
#   콘솔 → Profile → My profile → API keys → Add API key → 키 생성·다운로드 →
#   표시되는 fingerprint/tenancy/user OCID 를 tfvars 에 넣는다.
provider "oci" {
  tenancy_ocid     = var.tenancy_ocid
  user_ocid        = var.user_ocid
  fingerprint      = var.fingerprint
  private_key_path = var.private_key_path
  region           = var.region
}
