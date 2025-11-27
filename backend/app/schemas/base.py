"""
Base Pydantic schemas with common patterns.
"""
from datetime import datetime
from typing import Generic, List, TypeVar

from pydantic import BaseModel, ConfigDict


class CoreModel(BaseModel):
    """Base model with common configuration."""
    
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
    )


class TimestampMixin(BaseModel):
    """Mixin for models with timestamp fields."""
    
    created_at: datetime
    updated_at: datetime


DataT = TypeVar("DataT")


class PaginatedResponse(BaseModel, Generic[DataT]):
    """Generic paginated response."""
    
    items: List[DataT]
    total: int
    page: int
    page_size: int
    pages: int


class MessageResponse(BaseModel):
    """Simple message response."""
    
    message: str
    success: bool = True
