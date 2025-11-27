# Core PM

An open-source, engineer-friendly project management tool designed for simplicity and flexibility.

## Philosophy

Core PM is built by engineers, for engineers. We believe project management tools should be:
- **Simple**: Only essential features, no bloat
- **Flexible**: Customizable workflows, fields, and processes per team
- **Transparent**: Open source, self-hostable, data sovereignty

## Core Concepts

### Hierarchy
```
Theme (Strategic Initiative)
  └── Project (Cross-team work with type-specific workflow)
        └── Task (Team-owned work item)
```

### Key Principles
- **Projects are collaborative**: No single team owns a project - they span multiple teams
- **Tasks are team-owned**: Each team manages their tasks on their own Kanban board
- **Workflows are flexible**: Each project type and team+task type combination has its own workflow
- **Custom fields everywhere**: Define custom fields at every level of the hierarchy

## Features

- 🎯 **Themes**: Strategic initiatives to organize projects
- 📋 **Projects**: Cross-team work items with customizable types and workflows
- ✅ **Tasks**: Team-level work items with Kanban boards
- 🚀 **Releases**: Version management with task associations
- 🔗 **Dependencies**: Task and project dependency tracking with blocking logic
- 🐙 **GitHub Integration**: Automatic PR linking via ticket IDs
- ⚙️ **Configuration Engine**: Admin-controlled customization of types, workflows, and fields
- 👥 **Role-based Access**: Admin and General User roles

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local frontend development)
- Python 3.11+ (for local backend development)

### Running Locally

```bash
# Clone the repository
git clone https://github.com/your-org/core-pm.git
cd core-pm

# Copy environment files
cp .env.example .env

# Start all services
docker-compose up -d

# Run database migrations
docker-compose exec backend alembic upgrade head

# Seed initial data (optional)
docker-compose exec backend python -m app.scripts.seed

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Development Mode

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

## Project Structure

```
core-pm/
├── backend/                 # FastAPI backend
│   ├── alembic/            # Database migrations
│   ├── app/
│   │   ├── api/            # API routes
│   │   ├── core/           # Core config, security, database
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── services/       # Business logic
│   │   └── main.py
│   ├── tests/
│   └── Dockerfile
├── frontend/               # React frontend
│   ├── src/
│   │   ├── api/           # API client
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom hooks
│   │   ├── pages/         # Page components
│   │   ├── stores/        # Zustand stores
│   │   └── types/         # TypeScript types
│   └── Dockerfile
├── terraform/             # Infrastructure as Code
│   └── gcp/              # GCP-specific configs
├── docker-compose.yml     # Local development
└── docker-compose.prod.yml
```

## API Documentation

Once running, access the interactive API documentation at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` |
| `SECRET_KEY` | JWT signing key | (required) |
| `GITHUB_WEBHOOK_SECRET` | GitHub webhook verification | (optional) |
| `CORS_ORIGINS` | Allowed CORS origins | `http://localhost:3000` |

## GitHub Integration

Core PM integrates with GitHub to automatically link PRs to tasks:

1. Set up a webhook in your GitHub repository pointing to `https://your-domain/api/v1/github/webhook`
2. Include the task ID in your PR title or branch name (e.g., `CORE-123: Fix bug`)
3. Core PM will automatically link the PR to the task

## Deployment

### GCP (Recommended)

```bash
cd terraform/gcp
terraform init
terraform plan
terraform apply
```

See [terraform/gcp/README.md](terraform/gcp/README.md) for detailed instructions.

### Self-Hosted

Use the provided `docker-compose.prod.yml` for self-hosted deployments:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details.
