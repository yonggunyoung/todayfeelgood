# ── 네트워크: VCN + 인터넷 게이트웨이 + 라우팅 + 보안목록 + 퍼블릭 서브넷 ──
# 보안목록 인그레스: 22(SSH, 본인 CIDR 만) · 80 · 443(웹은 전체). 나머지는 차단.
# ⚠ 오라클은 '보안목록(클라우드)'과 인스턴스 내부 ufw 둘 다 통과해야 한다. 이 코드는 클라우드 쪽.

resource "oci_core_vcn" "this" {
  compartment_id = var.compartment_ocid
  display_name   = "${var.instance_display_name}-vcn"
  cidr_blocks    = ["10.0.0.0/16"]
  dns_label      = "webapp"
}

resource "oci_core_internet_gateway" "this" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.this.id
  display_name   = "${var.instance_display_name}-igw"
  enabled        = true
}

resource "oci_core_route_table" "this" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.this.id
  display_name   = "${var.instance_display_name}-rt"
  route_rules {
    destination       = "0.0.0.0/0"
    network_entity_id = oci_core_internet_gateway.this.id
  }
}

resource "oci_core_security_list" "this" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.this.id
  display_name   = "${var.instance_display_name}-sl"

  egress_security_rules {
    destination = "0.0.0.0/0"
    protocol    = "all"
  }

  # SSH — 본인 CIDR 만(안전).
  ingress_security_rules {
    protocol  = "6" # TCP
    source    = var.ssh_ingress_cidr
    description = "SSH (제한된 CIDR)"
    tcp_options {
      min = 22
      max = 22
    }
  }
  # HTTP
  ingress_security_rules {
    protocol  = "6"
    source    = "0.0.0.0/0"
    description = "HTTP"
    tcp_options {
      min = 80
      max = 80
    }
  }
  # HTTPS
  ingress_security_rules {
    protocol  = "6"
    source    = "0.0.0.0/0"
    description = "HTTPS"
    tcp_options {
      min = 443
      max = 443
    }
  }
}

resource "oci_core_subnet" "this" {
  compartment_id    = var.compartment_ocid
  vcn_id            = oci_core_vcn.this.id
  display_name      = "${var.instance_display_name}-subnet"
  cidr_block        = "10.0.1.0/24"
  route_table_id    = oci_core_route_table.this.id
  security_list_ids = [oci_core_security_list.this.id]
  dns_label         = "pub"
  # 퍼블릭 IP 할당 허용.
  prohibit_public_ip_on_vnic = false
}
