"""
Team Pydantic schemas.
"""
from datetime import datetime

from pydantic import Field

from app.schemas.base import CoreModel, TimestampMixin


class TeamBase(CoreModel):
    """Base team schema."""
    
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = Field(None, max_length=1000)


class TeamCreate(TeamBase):
    """Schema for creating a team."""
    
    slug: str = Field(..., min_length=1, max_length=100, pattern=r"^[a-z0-9-]+$")


class TeamUpdate(CoreModel):
    """Schema for updating a team."""
    
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = Field(None, max_length=1000)


class TeamBrief(CoreModel):
    """Brief team info for nested responses."""
    
    id: int
    name: str
    slug: str


class TeamResponse(TeamBase, TimestampMixin):
    """Team response schema."""
    
    id: int
    slug: str


class TeamWithMembers(TeamResponse):
    """Team response with member list."""
    
    members: list["TeamMemberResponse"] = []


class TeamMemberResponse(CoreModel):
    """Team member response."""
    
    id: int
    user_id: int
    team_id: int
    joined_at: datetime
    user: "UserBrief"


class UserBrief(CoreModel):
    """Brief user info for nested responses."""
    
    id: int
    email: str
    full_name: str


class AddTeamMemberRequest(CoreModel):
    """Request to add a member to a team."""
    
    user_id: int


TeamWithMembers.model_rebuild()
TeamMemberResponse.model_rebuild()
