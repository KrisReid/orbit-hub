"""
Task and TaskType Pydantic schemas.
"""
from typing import Any

from pydantic import Field

from app.models.project import FieldType
from app.schemas.base import CoreModel, TimestampMixin


# --- Task Type Field Schemas ---

class TaskTypeFieldBase(CoreModel):
    """Base task type field schema."""
    
    key: str = Field(..., min_length=1, max_length=100, pattern=r"^[a-z_][a-z0-9_]*$")
    label: str = Field(..., min_length=1, max_length=255)
    field_type: FieldType
    options: list[str] | None = None
    required: bool = False


class TaskTypeFieldCreate(TaskTypeFieldBase):
    """Schema for creating a task type field."""
    
    order: int = 0


class TaskTypeFieldUpdate(CoreModel):
    """Schema for updating a task type field."""
    
    label: str | None = Field(None, min_length=1, max_length=255)
    options: list[str] | None = None
    required: bool | None = None
    order: int | None = None


class TaskTypeFieldResponse(TaskTypeFieldBase):
    """Task type field response schema."""
    
    id: int
    task_type_id: int
    order: int


# --- Task Type Schemas ---

class TaskTypeBase(CoreModel):
    """Base task type schema."""
    
    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = Field(None, max_length=500)
    workflow: list[str] = Field(..., min_length=1)
    color: str | None = Field(None, max_length=20)


class TaskTypeCreate(TaskTypeBase):
    """Schema for creating a task type."""
    
    slug: str = Field(..., min_length=1, max_length=100, pattern=r"^[a-z0-9-]+$")
    fields: list[TaskTypeFieldCreate] = []


class TaskTypeUpdate(CoreModel):
    """Schema for updating a task type."""
    
    name: str | None = Field(None, min_length=1, max_length=100)
    description: str | None = Field(None, max_length=500)
    workflow: list[str] | None = None
    color: str | None = Field(None, max_length=20)


class TaskTypeBrief(CoreModel):
    """Brief task type info for nested responses."""
    
    id: int
    name: str
    slug: str
    color: str | None


class TaskTypeResponse(TaskTypeBase, TimestampMixin):
    """Task type response schema."""
    
    id: int
    team_id: int
    slug: str


class TaskTypeWithFields(TaskTypeResponse):
    """Task type response with fields."""
    
    fields: list[TaskTypeFieldResponse] = []


# --- Task Schemas ---

class TaskBase(CoreModel):
    """Base task schema."""
    
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    estimation: float | None = None


class TaskCreate(TaskBase):
    """Schema for creating a task."""
    
    project_id: int | None = None
    team_id: int
    task_type_id: int
    release_id: int | None = None
    custom_data: dict[str, Any] = {}


class TaskUpdate(CoreModel):
    """Schema for updating a task."""
    
    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    project_id: int | None = None
    team_id: int | None = None
    task_type_id: int | None = None
    release_id: int | None = None
    status: str | None = None
    estimation: float | None = None
    custom_data: dict[str, Any] | None = None


class TaskBrief(CoreModel):
    """Brief task info for nested responses."""
    
    id: int
    display_id: str
    title: str
    status: str


class TaskResponse(TaskBase, TimestampMixin):
    """Task response schema."""
    
    id: int
    display_id: str
    project_id: int | None
    team_id: int
    task_type_id: int
    release_id: int | None
    status: str
    custom_data: dict[str, Any]
    
    # Nested brief responses
    team: "TeamBrief"
    task_type: TaskTypeBrief
    project: "ProjectBrief | None" = None
    release: "ReleaseBrief | None" = None


class TaskWithDetails(TaskResponse):
    """Task response with full details including dependencies and GitHub links."""
    
    dependencies: list[TaskBrief] = []
    dependents: list[TaskBrief] = []
    github_links: list["GitHubLinkResponse"] = []


class AddTaskDependencyRequest(CoreModel):
    """Request to add a dependency to a task."""
    
    depends_on_id: int


# Avoid circular imports
from app.schemas.team import TeamBrief
from app.schemas.project import ProjectBrief
from app.schemas.release import ReleaseBrief
from app.schemas.github import GitHubLinkResponse

TaskResponse.model_rebuild()
TaskWithDetails.model_rebuild()
