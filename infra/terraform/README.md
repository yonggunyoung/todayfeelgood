# Terraform — Cloudflare + Oracle 인프라를 코드로

> 콘솔 클릭 대신 **토큰/키 넣고 `terraform apply`** 로 인프라를 만든다.
> 사람만 가능한 선작업(결제·계정·키 발급)만 끝내면, 나머지 리소스는 이 코드가 친다.
>
> ⚠ **검증 한계**: 이 코드는 라이브 계정 없이 작성되어 실 적용 테스트는 못 했다.
> 반드시 **`terraform plan` 으로 먼저 확인**한 뒤 `apply` 할 것. 비밀값/상태파일은 `.gitignore`로 커밋 차단.

```
infra/terraform/
├── cloudflare/   # DNS·Email Routing·SSL·Rate limit  (쉬움, 먼저)
└── oracle/       # VCN·보안목록(22/80/443)·ARM 인스턴스  (선작업 필요)
```

## 사람만 하는 선작업 (한 번)
1. **도메인** 구매 + Cloudflare 에 추가해 **Active**(네임서버 연결)까지.
2. **Cloudflare API 토큰** 발급 — My Profile → API Tokens → Create Token.
   권한: `Zone:DNS:Edit`, `Zone:Zone Settings:Edit`, `Zone:Email Routing:Edit`,
   `Account:Email Routing Addresses:Edit`. **해당 zone/account 로 범위 제한**.
   Account ID·Zone ID 도 메모(도메인 Overview).
3. **OCI** 가입 + **API 키 발급** — Console → My profile → API keys → Add API key →
   키 다운로드(.pem), 표시되는 tenancy/user OCID·fingerprint 메모.
4. **SSH 키쌍** 준비(`ssh-keygen -t ed25519`) — 공개키 내용을 Oracle tfvars 에.

## 적용 순서
오라클로 IP를 먼저 만들고, 그 IP를 Cloudflare DNS에 넣는 흐름.

### 1) Oracle (인스턴스 + 네트워크)
```bash
cd infra/terraform/oracle
cp terraform.tfvars.example terraform.tfvars   # 값 채우기 (ssh_ingress_cidr 는 본인 IP/32 권장)
terraform init
terraform plan      # 먼저 확인!
terraform apply
terraform output instance_public_ip            # → 다음 단계 server_ip
```
> **Out of host capacity** 오류(ARM 무료 흔함): `availability_domain_index` 를 1/2 로,
> 또는 `region` 을 바꿔 재시도. 용량이 풀릴 때까지 시간차로 재시도하기도 한다.

### 2) Cloudflare (DNS·메일·SSL·rate limit)
```bash
cd ../cloudflare
cp terraform.tfvars.example terraform.tfvars   # server_ip = 위 output, forward_email = 본인 Gmail
terraform init
terraform plan
terraform apply
```
적용 후 출력되는 안내대로 **forward_email 메일함에서 Cloudflare 확인 링크 1번 클릭**(자동화 불가).

### 3) 배포 + 검색/광고
```bash
ssh -i <개인키> ubuntu@<instance_public_ip>
curl -fsSL https://raw.githubusercontent.com/yonggunyoung/todayfeelgood/claude/eager-planck-xAknw/infra/scripts/bootstrap.sh | DOMAIN=ddukkit.com bash
```
검색 등록·애드센스·GA 토큰 주입은 `docs/deploy-walkthrough.md` 6~8절 참고.

## 안전 메모
- `terraform.tfvars`·`*.tfstate`·`.pem` 은 **커밋 금지**(`.gitignore` 처리). 상태파일엔 비밀이 들어간다.
- SSH(22)는 기본적으로 **본인 CIDR 만** 열도록 변수 강제(전체개방하려면 명시적으로 0.0.0.0/0).
- Cloudflare 토큰은 **최소 권한 + zone 범위 제한**으로 발급. 노출되면 즉시 폐기·재발급.
- 더 안전하게는 상태를 원격 백엔드(예: OCI Object Storage/S3 호환)로 두고 잠금. 단일 사용자면 로컬도 가능.
