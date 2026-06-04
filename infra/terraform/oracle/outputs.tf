output "instance_public_ip" {
  value       = oci_core_instance.this.public_ip
  description = "인스턴스 공인 IP. 이 값을 Cloudflare Terraform 의 server_ip 에 넣는다."
}

output "ssh_command" {
  value       = "ssh -i <개인키> ubuntu@${oci_core_instance.this.public_ip}"
  description = "SSH 접속 명령(Ubuntu 기본 사용자=ubuntu)."
}

output "next_steps" {
  value = <<-EOT
    1) Cloudflare TF 의 server_ip 에 ${oci_core_instance.this.public_ip} 적용 → apply.
    2) SSH 접속 후 원샷 배포:
       curl -fsSL https://raw.githubusercontent.com/yonggunyoung/todayfeelgood/claude/eager-planck-xAknw/infra/scripts/bootstrap.sh | DOMAIN=ddukkit.com bash
    3) 확인: HUB_URL=http://127.0.0.1 bash infra/scripts/healthcheck.sh
  EOT
  description = "배포 이어가기."
}
