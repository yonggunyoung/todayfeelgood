# Cloudflare + Oracle Terraform(IaC) — 보고서

**한 줄 결론:** 콘솔 클릭을 대체할 Terraform 2개(Cloudflare·Oracle)를 작성. 비밀값/상태/키는
`.gitignore`로 커밋 차단, SSH는 기본 전체개방 금지(본인 CIDR 강제). 라이브 미검증이라 `plan` 선행 필수로 명시.

## "직접 컨트롤" 질문에 대한 답
- 마스터의 Cloudflare/Oracle 콘솔에 내가 직접 로그인·클릭은 **불가**(이 세션 외부연동=GitHub뿐,
  계정 자격증명 없음, 결제·약관·키발급은 사람 전용). 대신 **IaC로 클릭을 거의 제거** = 토큰 넣고 apply.

## 만든 것 (`infra/terraform/`)
- **cloudflare/** — `cloudflare_record`(A·www·선택 TXT), `cloudflare_zone_settings_override`
  (SSL full·always_https·min TLS 1.2), `cloudflare_email_routing_settings`/`_address`/`_rule`
  (contact@→Gmail), `cloudflare_ruleset`(http_ratelimit, /font·/kit·/sign /api/* 분당 20/IP).
  provider v4.52 고정(v5 호환 깨짐 회피).
- **oracle/** — VCN·IGW·route table·security list(22=본인CIDR, 80·443=전체)·subnet,
  `oci_core_instance`(A1.Flex ARM 2 OCPU/12GB, Ubuntu 22.04 이미지 자동조회, public IP, SSH키).
  output: instance_public_ip → Cloudflare server_ip 로 연결.
- **README.md** — 선작업(토큰/키 발급·권한 스코프)·적용순서(Oracle→Cloudflare→bootstrap)·
  ARM 용량부족 대처·안전 메모.
- 각 모듈 `terraform.tfvars.example`(값 설명), `variables.tf` 검증(CIDR validation).

## 안전 조치(요청: "안전한 걸로")
- `.gitignore`: `*.tfvars`(단 `*.tfvars.example` 허용), `*.tfstate*`, `**/.terraform/*`,
  `*_oci_api_key.pem` 커밋 차단 — `git check-ignore`로 검증 완료(예시파일은 추적됨).
- SSH(22) `ssh_ingress_cidr` **기본값 없음**(본인 IP/32 강제). 전체개방은 명시적 0.0.0.0/0 만.
- Cloudflare 토큰 **최소권한+zone 범위**로 발급 안내. SSL min TLS 1.2.
- 상태파일 비밀 포함 경고 + 원격 백엔드 권장 메모.

## 검증 한계 (정직히)
- 이 환경엔 terraform 바이너리/계정/아웃바운드가 없어 **실 apply·validate 미수행**.
  HCL 괄호 균형만 정적 확인(통과). provider 스키마는 v4.52/oci v5.30 기준으로 작성.
  → 마스터는 반드시 `terraform plan` 으로 먼저 확인 후 apply.
- 자동화 불가 잔여: 도메인 결제, OCI/Cloudflare 계정·키 발급, Email Routing 목적지 확인 클릭 1회,
  ARM "Out of host capacity" 시 AD/리전 변경 재시도.

## 범위
- 추가: `infra/terraform/**`, `.gitignore`(terraform 규칙), docs 포인터. 앱/엔진/compose 미수정.
