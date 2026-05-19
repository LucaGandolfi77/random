packer {
  required_plugins {
    amazon = {
      version = ">= 1.3.9"
      source  = "github.com/hashicorp/amazon"
    }
    ansible = {
      version = ">= 1.1.1"
      source  = "github.com/hashicorp/ansible"
    }
  }
}

variable "region" {
  type    = string
  default = "eu-west-1"
}

source "amazon-ebs" "edge_envoy" {
  region        = var.region
  instance_type = "t3.small"
  ssh_username  = "ec2-user"
  ami_name      = "edge-envoy-{{timestamp}}"

  source_ami_filter {
    filters = {
      name                = "al2023-ami-*"
      root-device-type    = "ebs"
      virtualization-type = "hvm"
      architecture        = "x86_64"
    }
    owners      = ["137112412989"]
    most_recent = true
  }
}

build {
  name    = "edge-envoy"
  sources = ["source.amazon-ebs.edge_envoy"]

  provisioner "ansible" {
    playbook_file = "../ansible/playbooks/edge-node.yml"
  }
}
