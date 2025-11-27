"""
GitHub integration models for PR and branch linking.
"""
import enum
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.task import Task


class GitHubLinkType(str, enum.Enum):
    """Type of GitHub link."""
    pull_request = "pull_request"
    branch = "branch"
    commit = "commit"


class GitHubPRStatus(str, enum.Enum):
    """Status of a GitHub pull request."""
    open = "open"
    closed = "closed"
    merged = "merged"
    draft = "draft"


class GitHubLink(Base):
    """GitHub link model for connecting PRs/branches to tasks."""
    
    __tablename__ = "github_links"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    
    task_id: Mapped[int] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    
    link_type: Mapped[GitHubLinkType] = mapped_column(
        Enum(GitHubLinkType),
        nullable=False,
    )
    
    # Repository info
    repository_owner: Mapped[str] = mapped_column(String(255), nullable=False)
    repository_name: Mapped[str] = mapped_column(String(255), nullable=False)
    
    # For PRs
    pr_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    pr_title: Mapped[str | None] = mapped_column(String(500), nullable=True)
    pr_status: Mapped[GitHubPRStatus | None] = mapped_column(
        Enum(GitHubPRStatus),
        nullable=True,
    )
    
    # For branches
    branch_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    
    # For commits
    commit_sha: Mapped[str | None] = mapped_column(String(40), nullable=True)
    
    # Full URL for easy access
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    
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
    task: Mapped["Task"] = relationship("Task", back_populates="github_links")
    
    def __repr__(self) -> str:
        return f"<GitHubLink(id={self.id}, task_id={self.task_id}, type={self.link_type})>"
