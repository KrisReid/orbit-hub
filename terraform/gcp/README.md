# Core PM - GCP Infrastructure

This Terraform configuration deploys Core PM to Google Cloud Platform using:

- **Cloud Run** - Serverless containers for backend and frontend
- **Cloud SQL** - Managed PostgreSQL database
- **Secret Manager** - Secure storage for secrets
- **Artifact Registry** - Docker image storage
- **VPC** - Private networking between services

## Prerequisites

1. [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) installed
2. [Terraform](https://www.terraform.io/downloads) >= 1.0
3. A GCP project with billing enabled
4. Docker for building images

## Quick Start

### 1. Authenticate with GCP

```bash
gcloud auth login
gcloud auth application-default login
gcloud config set project YOUR_PROJECT_ID
```

### 2. Initialize Terraform

```bash
cd terraform/gcp
terraform init
```

### 3. Create a `terraform.tfvars` file

```hcl
project_id      = "your-gcp-project-id"
region          = "europe-west2"  # London
environment     = "development"
task_id_prefix  = "CORE"
```

### 4. Plan and Apply

```bash
terraform plan
terraform apply
```

### 5. Build and Push Docker Images

After Terraform creates the infrastructure, build and push the Docker images:

```bash
# Get the Artifact Registry URL
AR_URL=$(terraform output -raw artifact_registry)

# Configure Docker to use GCP credentials
gcloud auth configure-docker europe-west2-docker.pkg.dev

# Build and push backend
cd ../../backend
docker build -t $AR_URL/backend:latest .
docker push $AR_URL/backend:latest

# Build and push frontend
cd ../frontend
VITE_API_URL=$(terraform output -raw api_url)
docker build --build-arg VITE_API_URL=$VITE_API_URL -t $AR_URL/frontend:latest .
docker push $AR_URL/frontend:latest
```

### 6. Deploy the Services

After pushing images, redeploy the Cloud Run services:

```bash
# Backend
gcloud run services update corepm-backend \
  --region europe-west2 \
  --image $AR_URL/backend:latest

# Frontend
gcloud run services update corepm-frontend \
  --region europe-west2 \
  --image $AR_URL/frontend:latest
```

### 7. Run Database Migrations

```bash
# Connect to Cloud SQL via Cloud Run
gcloud run jobs execute corepm-migrate --region europe-west2
```

Or use the Cloud SQL Auth Proxy for local access:

```bash
cloud_sql_proxy -instances=PROJECT:REGION:INSTANCE=tcp:5432 &
alembic upgrade head
```

## Configuration

### Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `project_id` | GCP Project ID | (required) |
| `region` | GCP region | `europe-west2` |
| `environment` | Environment (development/staging/production) | `development` |
| `db_tier` | Cloud SQL machine tier | `db-f1-micro` |
| `task_id_prefix` | Prefix for task IDs | `CORE` |
| `frontend_url` | Custom frontend URL for CORS | (auto) |
| `github_webhook_secret` | GitHub webhook secret | (optional) |

### Environment-Specific Settings

For production, consider:

```hcl
environment = "production"
db_tier     = "db-custom-2-4096"  # 2 vCPU, 4GB RAM
```

## Outputs

After applying, Terraform outputs:

- `backend_url` - Backend Cloud Run URL
- `frontend_url` - Frontend Cloud Run URL
- `api_url` - API URL for frontend
- `github_webhook_url` - URL for GitHub webhook configuration

## GitHub Integration

To enable automatic PR linking:

1. Get the webhook URL: `terraform output github_webhook_url`
2. In your GitHub repository, go to Settings → Webhooks → Add webhook
3. Configure:
   - Payload URL: (webhook URL from step 1)
   - Content type: `application/json`
   - Secret: (optional, set `github_webhook_secret` in tfvars)
   - Events: Select "Pull requests"

## Cost Optimization

For development environments:

- Cloud Run scales to zero when not in use
- Use `db-f1-micro` for Cloud SQL
- Database backup is disabled

For production:

- Enable always-on instances (`min_instance_count = 1`)
- Use regional availability for Cloud SQL
- Enable automated backups

## Cleanup

```bash
terraform destroy
```

**Note:** If `deletion_protection` is enabled on the database, disable it first:

```bash
terraform apply -var="environment=development"
terraform destroy
```
