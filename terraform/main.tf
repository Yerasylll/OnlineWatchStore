terraform {
  required_version = ">= 1.6.0"
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
  }
}

provider "docker" {}

# --- Network ---
resource "docker_network" "watch_net" {
  name = "watch-net"
}

# --- Volumes ---
resource "docker_volume" "grafana_data"    { name = "watchstore-grafana-data" }
resource "docker_volume" "prometheus_data" { name = "watchstore-prometheus-data" }

# --- Backend ---
resource "docker_image" "backend" {
  name = "watchstore-backend:latest"
  build {
    context    = "${path.module}/.."
    dockerfile = "Dockerfile.backend"
  }
}

resource "docker_container" "backend" {
  name    = "watchstore-backend"
  image   = docker_image.backend.image_id
  restart = "unless-stopped"

  networks_advanced { name = docker_network.watch_net.name }
  
  ports {
    internal = 3000
    external = 3000
  }

  env = [
    "PORT=3000",
    "MONGODB_URI=${var.mongodb_uri}",
    "JWT_SECRET=${var.jwt_secret}",
    "DB_NAME=${var.db_name}",
    "NODE_ENV=production"
  ]
}

# --- Frontend ---
resource "docker_image" "frontend" {
  name = "watchstore-frontend:latest"
  build {
    context    = "${path.module}/.."
    dockerfile = "Dockerfile.frontend"
  }
}

resource "docker_container" "frontend" {
  name    = "watchstore-frontend"
  image   = docker_image.frontend.image_id
  restart = "unless-stopped"

  networks_advanced { name = docker_network.watch_net.name }
  
  ports {
    internal = 80
    external = 80
  }

  depends_on = [docker_container.backend]
}

# --- Prometheus ---
resource "docker_image" "prometheus" {
  name = "prom/prometheus:v2.51.0"
}

resource "docker_container" "prometheus" {
  name    = "watchstore-prometheus"
  image   = docker_image.prometheus.image_id
  restart = "unless-stopped"

  networks_advanced { name = docker_network.watch_net.name }
  
  ports {
    internal = 9090
    external = 9090
  }

  volumes {
    host_path      = abspath("${path.module}/../observability/prometheus/prometheus.yml")
    container_path = "/etc/prometheus/prometheus.yml"
    read_only      = true
  }
  volumes {
    host_path      = abspath("${path.module}/../observability/prometheus/alert_rules.yml")
    container_path = "/etc/prometheus/alert_rules.yml"
    read_only      = true
  }
  volumes {
    volume_name    = docker_volume.prometheus_data.name
    container_path = "/prometheus"
  }

  command = [
    "--config.file=/etc/prometheus/prometheus.yml",
    "--storage.tsdb.retention.time=15d",
    "--web.enable-lifecycle"
  ]
}

# --- Grafana ---
resource "docker_image" "grafana" {
  name = "grafana/grafana:10.3.0"
}

resource "docker_container" "grafana" {
  name    = "watchstore-grafana"
  image   = docker_image.grafana.image_id
  restart = "unless-stopped"

  networks_advanced { name = docker_network.watch_net.name }
  
  ports {
    internal = 3000
    external = 3001
  }

  env = [
    "GF_SECURITY_ADMIN_USER=admin",
    "GF_SECURITY_ADMIN_PASSWORD=admin",
    "GF_PATHS_PROVISIONING=/etc/grafana/provisioning"
  ]

  volumes {
    host_path      = abspath("${path.module}/../observability/grafana/provisioning")
    container_path = "/etc/grafana/provisioning"
    read_only      = true
  }
  volumes {
    volume_name    = docker_volume.grafana_data.name
    container_path = "/var/lib/grafana"
  }

  depends_on = [docker_container.prometheus]
}

# --- Alertmanager ---
resource "docker_image" "alertmanager" {
  name = "prom/alertmanager:v0.27.0"
}

resource "docker_container" "alertmanager" {
  name    = "watchstore-alertmanager"
  image   = docker_image.alertmanager.image_id
  restart = "unless-stopped"

  networks_advanced { name = docker_network.watch_net.name }
  
  ports {
    internal = 9093
    external = 9093
  }

  volumes {
    host_path      = abspath("${path.module}/../observability/alertmanager/alertmanager.yml")
    container_path = "/etc/alertmanager/alertmanager.yml"
    read_only      = true
  }

  command = ["--config.file=/etc/alertmanager/alertmanager.yml"]
}

# --- Node Exporter ---
resource "docker_image" "node_exporter" {
  name = "prom/node-exporter:v1.7.0"
}

resource "docker_container" "node_exporter" {
  name     = "watchstore-node-exporter"
  image    = docker_image.node_exporter.image_id
  restart  = "unless-stopped"
  pid_mode = "host"

  networks_advanced { name = docker_network.watch_net.name }
  
  ports {
    internal = 9100
    external = 9100
  }

  volumes {
    host_path      = "/proc"
    container_path = "/host/proc"
    read_only      = true
  }
  volumes {
    host_path      = "/sys"
    container_path = "/host/sys"
    read_only      = true
  }
  volumes {
    host_path      = "/"
    container_path = "/rootfs"
    read_only      = true
  }

  command = [
    "--path.procfs=/host/proc",
    "--path.sysfs=/host/sys",
    "--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)"
  ]
}