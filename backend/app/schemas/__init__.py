"""
Pydantic schemas package.
"""
from app.schemas.base import CoreModel, MessageResponse, PaginatedResponse, TimestampMixin
from app.schemas.user import (
    LoginRequest,
    Token,
    TokenPayload,
    UserCreate,
    UserResponse,
    UserUpdate,
    UserWithTeams,
)
from app.schemas.team import (
    AddTeamMemberRequest,
    TeamBrief,
    TeamCreate,
    TeamMemberResponse,
    TeamResponse,
    TeamUpdate,
    TeamWithMembers,
    UserBrief,
)
from app.schemas.theme import (
    ThemeBrief,
    ThemeCreate,
    ThemeResponse,
    ThemeUpdate,
    ThemeWithProjects,
)
from app.schemas.project import (
    AddProjectDependencyRequest,
    ProjectBrief,
    ProjectCreate,
    ProjectResponse,
    ProjectTypeCreate,
    ProjectTypeFieldCreate,
    ProjectTypeFieldResponse,
    ProjectTypeFieldUpdate,
    ProjectTypeResponse,
    ProjectTypeUpdate,
    ProjectTypeWithFields,
    ProjectUpdate,
    ProjectWithDetails,
)
from app.schemas.task import (
    AddTaskDependencyRequest,
    TaskBrief,
    TaskCreate,
    TaskResponse,
    TaskTypeCreate,
    TaskTypeFieldCreate,
    TaskTypeFieldResponse,
    TaskTypeFieldUpdate,
    TaskTypeResponse,
    TaskTypeUpdate,
    TaskTypeWithFields,
    TaskUpdate,
    TaskWithDetails,
)
from app.schemas.release import (
    ReleaseBrief,
    ReleaseCreate,
    ReleaseResponse,
    ReleaseUpdate,
    ReleaseWithTasks,
)
from app.schemas.github import (
    GitHubLinkCreate,
    GitHubLinkResponse,
    GitHubPullRequestEvent,
)

__all__ = [
    # Base
    "CoreModel",
    "MessageResponse",
    "PaginatedResponse",
    "TimestampMixin",
    # User
    "LoginRequest",
    "Token",
    "TokenPayload",
    "UserCreate",
    "UserResponse",
    "UserUpdate",
    "UserWithTeams",
    # Team
    "AddTeamMemberRequest",
    "TeamBrief",
    "TeamCreate",
    "TeamMemberResponse",
    "TeamResponse",
    "TeamUpdate",
    "TeamWithMembers",
    "UserBrief",
    # Theme
    "ThemeBrief",
    "ThemeCreate",
    "ThemeResponse",
    "ThemeUpdate",
    "ThemeWithProjects",
    # Project
    "AddProjectDependencyRequest",
    "ProjectBrief",
    "ProjectCreate",
    "ProjectResponse",
    "ProjectTypeCreate",
    "ProjectTypeFieldCreate",
    "ProjectTypeFieldResponse",
    "ProjectTypeFieldUpdate",
    "ProjectTypeResponse",
    "ProjectTypeUpdate",
    "ProjectTypeWithFields",
    "ProjectUpdate",
    "ProjectWithDetails",
    # Task
    "AddTaskDependencyRequest",
    "TaskBrief",
    "TaskCreate",
    "TaskResponse",
    "TaskTypeCreate",
    "TaskTypeFieldCreate",
    "TaskTypeFieldResponse",
    "TaskTypeFieldUpdate",
    "TaskTypeResponse",
    "TaskTypeUpdate",
    "TaskTypeWithFields",
    "TaskUpdate",
    "TaskWithDetails",
    # Release
    "ReleaseBrief",
    "ReleaseCreate",
    "ReleaseResponse",
    "ReleaseUpdate",
    "ReleaseWithTasks",
    # GitHub
    "GitHubLinkCreate",
    "GitHubLinkResponse",
    "GitHubPullRequestEvent",
]
