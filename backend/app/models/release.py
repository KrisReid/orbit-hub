"""
Release model for version management.
"""
import enum
from datetime import date, datetime, timezone
from typing import TYPE_CHECKING, List

from sqlalchemy import Date, DateTime, Enum, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.task import Task


class ReleaseStatus(str, enum.Enum):
    """Release status enumeration."""
    planned = "planned"
    in_progress = "in_progress"
    released = "released"
    cancelled = "cancelled"


class Release(Base):
    """Release model for version management."""
    
    __tablename__ = "releases"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    
    version: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    target_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    release_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    
    status: Mapped[ReleaseStatus] = mapped_column(
        Enum(ReleaseStatus),
        default=ReleaseStatus.planned,
        nullable=False,
    )
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )
    
    # Relationships
    tasks: Mapped[List["Task"]] = relationship("Task", back_populates="release")
    
    def __repr__(self) -> str:
        return f"<Release(id={self.id}, version={self.version}, status={self.status})>"
