"""
Theme Pydantic schemas.
"""
from pydantic import Field

from app.schemas.base import CoreModel, TimestampMixin


class ThemeBase(CoreModel):
    """Base theme schema."""
    
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = None


class ThemeCreate(ThemeBase):
    """Schema for creating a theme."""
    
    status: str = "active"


class ThemeUpdate(CoreModel):
    """Schema for updating a theme."""
    
    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    status: str | None = None


class ThemeResponse(ThemeBase, TimestampMixin):
    """Theme response schema."""
    
    id: int
    status: str


class ThemeBrief(CoreModel):
    """Brief theme info for nested responses."""
    
    id: int
    title: str
    status: str


class ThemeWithProjects(ThemeResponse):
    """Theme response with associated projects."""
    
    projects: list["ProjectBrief"] = []


# Avoid circular imports
from app.schemas.project import ProjectBrief
ThemeWithProjects.model_rebuild()
