"""
User Pydantic schemas.
"""
from datetime import datetime

from pydantic import BaseModel, Field

from app.models.user import UserRole
from app.schemas.base import CoreModel, TimestampMixin


# --- Auth Schemas ---

class Token(BaseModel):
    """JWT token response."""
    
    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    """JWT token payload."""
    
    sub: str
    exp: datetime


class LoginRequest(BaseModel):
    """Login request body."""
    
    email: str
    password: str


# --- User Schemas ---

class UserBase(CoreModel):
    """Base user schema."""
    
    email: str
    full_name: str = Field(..., min_length=1, max_length=255)


class UserCreate(UserBase):
    """Schema for creating a user."""
    
    password: str = Field(..., min_length=8, max_length=100)
    role: UserRole = UserRole.user


class UserUpdate(CoreModel):
    """Schema for updating a user."""
    
    email: str | None = None
    full_name: str | None = Field(None, min_length=1, max_length=255)
    password: str | None = Field(None, min_length=8, max_length=100)
    role: UserRole | None = None
    is_active: bool | None = None


class UserResponse(UserBase, TimestampMixin):
    """User response schema."""
    
    id: int
    role: UserRole
    is_active: bool


class UserWithTeams(UserResponse):
    """User response with team memberships."""
    
    teams: list["TeamBrief"] = []


# Avoid circular imports
from app.schemas.team import TeamBrief
UserWithTeams.model_rebuild()
