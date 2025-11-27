# Core PM - GCP Infrastructure
# 
# This Terraform configuration deploys Core PM to Google Cloud Platform
# using Cloud Run for the backend and frontend, and Cloud SQL for PostgreSQL.

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }

  # Uncomment to use GCS backend for state
  # backend "gcs" {
  #   bucket = "your-terraform-state-bucket"
  #   prefix = "core-pm"
  # }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# Enable required APIs
resource "google_project_service" "services" {
  for_each = toset([
    "run.googleapis.com",
    "sqladmin.googleapis.com",
    "secretmanager.googleapis.com",
    "artifactregistry.googleapis.com",
    "cloudbuild.googleapis.com",
    "vpcaccess.googleapis.com",
  ])
  
  project = var.project_id
  service = each.value
  
  disable_on_destroy = false
}

# Random suffix for unique resource names
resource "random_id" "suffix" {
  byte_length = 4
}

# ============================================================================
# NETWORKING
# ============================================================================

# VPC Network for private connectivity
resource "google_compute_network" "vpc" {
  name                    = "corepm-vpc-${random_id.suffix.hex}"
  auto_create_subnetworks = false
  
  depends_on = [google_project_service.services["vpcaccess.googleapis.com"]]
}

resource "google_compute_subnetwork" "subnet" {
  name          = "corepm-subnet-${random_id.suffix.hex}"
  ip_cidr_range = "10.0.0.0/24"
  region        = var.region
  network       = google_compute_network.vpc.id
}

# VPC Connector for Cloud Run to access Cloud SQL
resource "google_vpc_access_connector" "connector" {
  name          = "corepm-connector"
  region        = var.region
  ip_cidr_range = "10.8.0.0/28"
  network       = google_compute_network.vpc.name
  
  depends_on = [google_project_service.services["vpcaccess.googleapis.com"]]
}

# Private IP for Cloud SQL
resource "google_compute_global_address" "private_ip" {
  name          = "corepm-private-ip-${random_id.suffix.hex}"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.vpc.id
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip.name]
}

# ============================================================================
# DATABASE
# ============================================================================

# Cloud SQL PostgreSQL Instance
resource "google_sql_database_instance" "postgres" {
  name             = "corepm-db-${random_id.suffix.hex}"
  database_version = "POSTGRES_16"
  region           = var.region
  
  settings {
    tier              = var.db_tier
    availability_type = var.environment == "production" ? "REGIONAL" : "ZONAL"
    disk_autoresize   = true
    disk_size         = 10
    disk_type         = "PD_SSD"
    
    ip_configuration {
      ipv4_enabled                                  = false
      private_network                               = google_compute_network.vpc.id
      enable_private_path_for_google_cloud_services = true
    }
    
    backup_configuration {
      enabled                        = var.environment == "production"
      point_in_time_recovery_enabled = var.environment == "production"
      start_time                     = "03:00"
    }
    
    maintenance_window {
      day  = 7  # Sunday
      hour = 3
    }
  }
  
  deletion_protection = var.environment == "production"
  
  depends_on = [google_service_networking_connection.private_vpc_connection]
}

# Database
resource "google_sql_database" "database" {
  name     = "corepm"
  instance = google_sql_database_instance.postgres.name
}

# Database User
resource "random_password" "db_password" {
  length  = 32
  special = false
}

resource "google_sql_user" "user" {
  name     = "corepm"
  instance = google_sql_database_instance.postgres.name
  password = random_password.db_password.result
}

# ============================================================================
# SECRETS
# ============================================================================

# JWT Secret Key
resource "random_password" "jwt_secret" {
  length  = 64
  special = false
}

resource "google_secret_manager_secret" "jwt_secret" {
  secret_id = "corepm-jwt-secret-${random_id.suffix.hex}"
  
  replication {
    auto {}
  }
  
  depends_on = [google_project_service.services["secretmanager.googleapis.com"]]
}

resource "google_secret_manager_secret_version" "jwt_secret" {
  secret      = google_secret_manager_secret.jwt_secret.id
  secret_data = random_password.jwt_secret.result
}

# Database URL Secret
resource "google_secret_manager_secret" "db_url" {
  secret_id = "corepm-db-url-${random_id.suffix.hex}"
  
  replication {
    auto {}
  }
  
  depends_on = [google_project_service.services["secretmanager.googleapis.com"]]
}

resource "google_secret_manager_secret_version" "db_url" {
  secret      = google_secret_manager_secret.db_url.id
  secret_data = "postgresql+asyncpg://${google_sql_user.user.name}:${random_password.db_password.result}@${google_sql_database_instance.postgres.private_ip_address}:5432/${google_sql_database.database.name}"
}

# ============================================================================
# ARTIFACT REGISTRY
# ============================================================================

resource "google_artifact_registry_repository" "repo" {
  location      = var.region
  repository_id = "corepm-${random_id.suffix.hex}"
  format        = "DOCKER"
  
  depends_on = [google_project_service.services["artifactregistry.googleapis.com"]]
}

# ============================================================================
# CLOUD RUN - BACKEND
# ============================================================================

resource "google_service_account" "backend" {
  account_id   = "corepm-backend-${random_id.suffix.hex}"
  display_name = "Core PM Backend Service Account"
}

# Grant secret access
resource "google_secret_manager_secret_iam_member" "backend_jwt" {
  secret_id = google_secret_manager_secret.jwt_secret.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.backend.email}"
}

resource "google_secret_manager_secret_iam_member" "backend_db" {
  secret_id = google_secret_manager_secret.db_url.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.backend.email}"
}

# Grant Cloud SQL access
resource "google_project_iam_member" "backend_sql" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.backend.email}"
}

resource "google_cloud_run_v2_service" "backend" {
  name     = "corepm-backend"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"
  
  template {
    service_account = google_service_account.backend.email
    
    scaling {
      min_instance_count = var.environment == "production" ? 1 : 0
      max_instance_count = 10
    }
    
    vpc_access {
      connector = google_vpc_access_connector.connector.id
      egress    = "PRIVATE_RANGES_ONLY"
    }
    
    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.repo.repository_id}/backend:latest"
      
      ports {
        container_port = 8000
      }
      
      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_url.secret_id
            version = "latest"
          }
        }
      }
      
      env {
        name = "SECRET_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.jwt_secret.secret_id
            version = "latest"
          }
        }
      }
      
      env {
        name  = "CORS_ORIGINS"
        value = var.frontend_url != "" ? var.frontend_url : "https://corepm-frontend-${random_id.suffix.hex}.run.app"
      }
      
      env {
        name  = "TASK_ID_PREFIX"
        value = var.task_id_prefix
      }
      
      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }
    }
  }
  
  depends_on = [
    google_project_service.services["run.googleapis.com"],
    google_secret_manager_secret_version.jwt_secret,
    google_secret_manager_secret_version.db_url,
  ]
}

# Allow unauthenticated access to backend
resource "google_cloud_run_v2_service_iam_member" "backend_public" {
  location = google_cloud_run_v2_service.backend.location
  name     = google_cloud_run_v2_service.backend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ============================================================================
# CLOUD RUN - FRONTEND
# ============================================================================

resource "google_cloud_run_v2_service" "frontend" {
  name     = "corepm-frontend"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"
  
  template {
    scaling {
      min_instance_count = var.environment == "production" ? 1 : 0
      max_instance_count = 10
    }
    
    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.repo.repository_id}/frontend:latest"
      
      ports {
        container_port = 80
      }
      
      resources {
        limits = {
          cpu    = "1"
          memory = "256Mi"
        }
      }
    }
  }
  
  depends_on = [google_project_service.services["run.googleapis.com"]]
}

# Allow unauthenticated access to frontend
resource "google_cloud_run_v2_service_iam_member" "frontend_public" {
  location = google_cloud_run_v2_service.frontend.location
  name     = google_cloud_run_v2_service.frontend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
