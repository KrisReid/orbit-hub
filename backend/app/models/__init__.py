"""
Database models package.

All models are imported here to ensure they are registered with SQLAlchemy
and available for Alembic migrations.
"""
from app.models.user import User, UserRole
from app.models.team import Team, TeamMember
from app.models.theme import Theme, ThemeStatus
from app.models.project import (
    Project,
    ProjectType,
    ProjectTypeField,
    FieldType,
    project_dependencies,
)
from app.models.task import (
    Task,
    TaskType,
    TaskTypeField,
    task_dependencies,
)
from app.models.release import Release, ReleaseStatus
from app.models.github import GitHubLink, GitHubLinkType, GitHubPRStatus

__all__ = [
    # User
    "User",
    "UserRole",
    # Team
    "Team",
    "TeamMember",
    # Theme
    "Theme",
    "ThemeStatus",
    # Project
    "Project",
    "ProjectType",
    "ProjectTypeField",
    "FieldType",
    "project_dependencies",
    # Task
    "Task",
    "TaskType",
    "TaskTypeField",
    "task_dependencies",
    # Release
    "Release",
    "ReleaseStatus",
    # GitHub
    "GitHubLink",
    "GitHubLinkType",
    "GitHubPRStatus",
]
