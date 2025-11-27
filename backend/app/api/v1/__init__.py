"""
API v1 router - aggregates all endpoint routers.
"""
from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    github,
    project_types,
    projects,
    releases,
    task_types,
    tasks,
    teams,
    themes,
    users,
)

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(teams.router)
api_router.include_router(themes.router)
api_router.include_router(project_types.router)
api_router.include_router(projects.router)
api_router.include_router(task_types.router)
api_router.include_router(tasks.router)
api_router.include_router(releases.router)
api_router.include_router(github.router)
