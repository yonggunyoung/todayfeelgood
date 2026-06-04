# ── 인스턴스: Ampere ARM(A1.Flex) + Ubuntu 22.04 ──

data "oci_identity_availability_domains" "ads" {
  compartment_id = var.tenancy_ocid
}

# Ubuntu 22.04 ARM(aarch64) 최신 이미지 조회. A1.Flex 호환 이미지로 필터.
data "oci_core_images" "ubuntu" {
  compartment_id           = var.compartment_ocid
  operating_system         = "Canonical Ubuntu"
  operating_system_version = "22.04"
  shape                    = "VM.Standard.A1.Flex"
  sort_by                  = "TIMECREATED"
  sort_order               = "DESC"
}

resource "oci_core_instance" "this" {
  compartment_id      = var.compartment_ocid
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[var.availability_domain_index].name
  display_name        = var.instance_display_name
  shape               = "VM.Standard.A1.Flex"

  shape_config {
    ocpus         = var.instance_ocpus
    memory_in_gbs = var.instance_memory_gbs
  }

  source_details {
    source_type             = "image"
    source_id               = data.oci_core_images.ubuntu.images[0].id
    boot_volume_size_in_gbs = var.boot_volume_gbs
  }

  create_vnic_details {
    subnet_id        = oci_core_subnet.this.id
    assign_public_ip = true
  }

  metadata = {
    ssh_authorized_keys = var.ssh_public_key
  }

  # 용량 부족(Out of host capacity)은 ARM 무료티어 흔한 이슈.
  # 그 경우 availability_domain_index 또는 region 을 바꿔 재시도(README 참고).
}
