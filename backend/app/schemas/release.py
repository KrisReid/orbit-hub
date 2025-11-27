"""
Release Pydantic schemas.
"""
from datetime import date

from pydantic import Field

from app.models.release import ReleaseStatus
from app.schemas.base import CoreModel, TimestampMixin


class ReleaseBase(CoreModel):
    """Base release schema."""
    
    version: str = Field(..., min_length=1, max_length=50)
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    target_date: date | None = None


class ReleaseCreate(ReleaseBase):
    """Schema for creating a release."""
    
    status: ReleaseStatus = ReleaseStatus.planned


class ReleaseUpdate(CoreModel):
    """Schema for updating a release."""
    
    version: str | None = Field(None, min_length=1, max_length=50)
    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    target_date: date | None = None
    release_date: date | None = None
    status: ReleaseStatus | None = None


class ReleaseBrief(CoreModel):
    """Brief release info for nested responses."""
    
    id: int
    version: str
    title: str
    status: ReleaseStatus


class ReleaseResponse(ReleaseBase, TimestampMixin):
    """Release response schema."""
    
    id: int
    release_date: date | None
    status: ReleaseStatus


class ReleaseWithTasks(ReleaseResponse):
    """Release response with associated tasks."""
    
    tasks: list["TaskBrief"] = []


# Avoid circular imports
from app.schemas.task import TaskBrief
ReleaseWithTasks.model_rebuild()
