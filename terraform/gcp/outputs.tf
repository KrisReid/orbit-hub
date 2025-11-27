output "backend_url" {
  description = "URL of the backend Cloud Run service"
  value       = google_cloud_run_v2_service.backend.uri
}

output "frontend_url" {
  description = "URL of the frontend Cloud Run service"
  value       = google_cloud_run_v2_service.frontend.uri
}

output "api_url" {
  description = "API URL for frontend configuration"
  value       = "${google_cloud_run_v2_service.backend.uri}/api/v1"
}

output "database_instance" {
  description = "Cloud SQL instance name"
  value       = google_sql_database_instance.postgres.name
}

output "database_private_ip" {
  description = "Private IP of the Cloud SQL instance"
  value       = google_sql_database_instance.postgres.private_ip_address
  sensitive   = true
}

output "artifact_registry" {
  description = "Artifact Registry repository for Docker images"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.repo.repository_id}"
}

output "backend_service_account" {
  description = "Service account email for the backend"
  value       = google_service_account.backend.email
}

output "github_webhook_url" {
  description = "URL to configure in GitHub for webhooks"
  value       = "${google_cloud_run_v2_service.backend.uri}/api/v1/github/webhook"
}
