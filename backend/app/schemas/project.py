"""
Project and ProjectType Pydantic schemas.
"""
from typing import Any

from pydantic import Field

from app.models.project import FieldType
from app.schemas.base import CoreModel, TimestampMixin


# --- Project Type Field Schemas ---

class ProjectTypeFieldBase(CoreModel):
    """Base project type field schema."""
    
    key: str = Field(..., min_length=1, max_length=100, pattern=r"^[a-z_][a-z0-9_]*$")
    label: str = Field(..., min_length=1, max_length=255)
    field_type: FieldType
    options: list[str] | None = None
    required: bool = False


class ProjectTypeFieldCreate(ProjectTypeFieldBase):
    """Schema for creating a project type field."""
    
    order: int = 0


class ProjectTypeFieldUpdate(CoreModel):
    """Schema for updating a project type field."""
    
    label: str | None = Field(None, min_length=1, max_length=255)
    options: list[str] | None = None
    required: bool | None = None
    order: int | None = None


class ProjectTypeFieldResponse(ProjectTypeFieldBase):
    """Project type field response schema."""
    
    id: int
    project_type_id: int
    order: int


# --- Project Type Schemas ---

class ProjectTypeBase(CoreModel):
    """Base project type schema."""
    
    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = Field(None, max_length=500)
    workflow: list[str] = Field(..., min_length=1)
    color: str | None = Field(None, max_length=20)


class ProjectTypeCreate(ProjectTypeBase):
    """Schema for creating a project type."""
    
    slug: str = Field(..., min_length=1, max_length=100, pattern=r"^[a-z0-9-]+$")
    fields: list[ProjectTypeFieldCreate] = []


class ProjectTypeUpdate(CoreModel):
    """Schema for updating a project type."""
    
    name: str | None = Field(None, min_length=1, max_length=100)
    description: str | None = Field(None, max_length=500)
    workflow: list[str] | None = None
    color: str | None = Field(None, max_length=20)


class ProjectTypeBrief(CoreModel):
    """Brief project type info for nested responses."""
    
    id: int
    name: str
    slug: str
    color: str | None
    workflow: list[str] = []


class ProjectTypeResponse(ProjectTypeBase, TimestampMixin):
    """Project type response schema."""
    
    id: int
    slug: str


class ProjectTypeWithFields(ProjectTypeResponse):
    """Project type response with fields."""
    
    fields: list[ProjectTypeFieldResponse] = []


# --- Project Schemas ---

class ProjectBase(CoreModel):
    """Base project schema."""
    
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = None


class ProjectCreate(ProjectBase):
    """Schema for creating a project."""
    
    theme_id: int | None = None
    project_type_id: int
    custom_data: dict[str, Any] = {}


class ProjectUpdate(CoreModel):
    """Schema for updating a project."""
    
    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    theme_id: int | None = None
    status: str | None = None
    custom_data: dict[str, Any] | None = None


class ProjectBrief(CoreModel):
    """Brief project info for nested responses."""
    
    id: int
    title: str
    status: str


class ProjectResponse(ProjectBase, TimestampMixin):
    """Project response schema."""
    
    id: int
    theme_id: int | None
    project_type_id: int
    status: str
    custom_data: dict[str, Any]
    
    # Nested brief responses
    theme: "ThemeBrief | None" = None
    project_type: ProjectTypeBrief


class ProjectWithDetails(ProjectResponse):
    """Project response with full details including dependencies."""
    
    dependencies: list[ProjectBrief] = []
    tasks: list["TaskBrief"] = []
    
    # Override project_type to include fields for custom field support
    project_type: ProjectTypeWithFields


class AddProjectDependencyRequest(CoreModel):
    """Request to add a dependency to a project."""
    
    depends_on_id: int


# Avoid circular imports
from app.schemas.theme import ThemeBrief
from app.schemas.task import TaskBrief

ProjectResponse.model_rebuild()
ProjectWithDetails.model_rebuild()
