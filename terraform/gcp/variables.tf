variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP region for resources"
  type        = string
  default     = "europe-west2"  # London
}

variable "environment" {
  description = "Environment name (development, staging, production)"
  type        = string
  default     = "development"
  
  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be development, staging, or production."
  }
}

variable "db_tier" {
  description = "Cloud SQL machine tier"
  type        = string
  default     = "db-f1-micro"  # Use db-custom-2-4096 or higher for production
}

variable "task_id_prefix" {
  description = "Prefix for task IDs (e.g., CORE-123)"
  type        = string
  default     = "CORE"
}

variable "frontend_url" {
  description = "Custom frontend URL for CORS (leave empty to use auto-generated Cloud Run URL)"
  type        = string
  default     = ""
}

variable "github_webhook_secret" {
  description = "Secret for GitHub webhook verification"
  type        = string
  default     = ""
  sensitive   = true
}
