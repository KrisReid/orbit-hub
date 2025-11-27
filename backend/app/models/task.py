"""
Task model with team-specific types, workflows, and custom fields.
"""
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any, List

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String, Table, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.project import FieldType

if TYPE_CHECKING:
    from app.models.team import Team
    from app.models.project import Project
    from app.models.release import Release
    from app.models.github import GitHubLink


class TaskType(Base):
    """Task type definition per team with customizable workflow."""
    
    __tablename__ = "task_types"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    team_id: Mapped[int] = mapped_column(
        ForeignKey("teams.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    
    # Workflow as ordered list of status names
    workflow: Mapped[List[str]] = mapped_column(
        ARRAY(String),
        nullable=False,
        default=list,
    )
    
    # Color for UI
    color: Mapped[str | None] = mapped_column(String(20), nullable=True)
    
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
    team: Mapped["Team"] = relationship("Team", back_populates="task_types")
    fields: Mapped[List["TaskTypeField"]] = relationship(
        "TaskTypeField",
        back_populates="task_type",
        cascade="all, delete-orphan",
        order_by="TaskTypeField.order",
    )
    tasks: Mapped[List["Task"]] = relationship("Task", back_populates="task_type")
    
    def __repr__(self) -> str:
        return f"<TaskType(id={self.id}, name={self.name}, team_id={self.team_id})>"


class TaskTypeField(Base):
    """Custom field definition for a task type."""
    
    __tablename__ = "task_type_fields"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    task_type_id: Mapped[int] = mapped_column(
        ForeignKey("task_types.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    
    key: Mapped[str] = mapped_column(String(100), nullable=False)
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    field_type: Mapped[FieldType] = mapped_column(Enum(FieldType), nullable=False)
    
    # Options for select/multiselect fields
    options: Mapped[List[str] | None] = mapped_column(ARRAY(String), nullable=True)
    
    # Field configuration
    required: Mapped[bool] = mapped_column(default=False, nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    
    # Relationships
    task_type: Mapped["TaskType"] = relationship("TaskType", back_populates="fields")
    
    def __repr__(self) -> str:
        return f"<TaskTypeField(id={self.id}, key={self.key}, type={self.field_type})>"


# Association table for task dependencies
task_dependencies = Table(
    "task_dependencies",
    Base.metadata,
    Column("task_id", Integer, ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True),
    Column("depends_on_id", Integer, ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True),
)


class Task(Base):
    """Task model - team-owned work items."""
    
    __tablename__ = "tasks"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    
    # Display ID (e.g., CORE-123) - unique identifier for humans
    display_id: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        index=True,
        nullable=False,
    )
    
    # Foreign keys
    project_id: Mapped[int | None] = mapped_column(
        ForeignKey("projects.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    team_id: Mapped[int] = mapped_column(
        ForeignKey("teams.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    task_type_id: Mapped[int] = mapped_column(
        ForeignKey("task_types.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    release_id: Mapped[int | None] = mapped_column(
        ForeignKey("releases.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    
    # Core fields
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    
    # Estimation (story points or hours - flexible)
    estimation: Mapped[float | None] = mapped_column(nullable=True)
    
    # Custom field data stored as JSONB
    custom_data: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
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
    project: Mapped["Project | None"] = relationship("Project", back_populates="tasks")
    team: Mapped["Team"] = relationship("Team", back_populates="tasks")
    task_type: Mapped["TaskType"] = relationship("TaskType", back_populates="tasks")
    release: Mapped["Release | None"] = relationship("Release", back_populates="tasks")
    github_links: Mapped[List["GitHubLink"]] = relationship(
        "GitHubLink",
        back_populates="task",
        cascade="all, delete-orphan",
    )
    
    # Dependencies (self-referential many-to-many)
    dependencies: Mapped[List["Task"]] = relationship(
        "Task",
        secondary=task_dependencies,
        primaryjoin="Task.id == task_dependencies.c.task_id",
        secondaryjoin="Task.id == task_dependencies.c.depends_on_id",
        backref="dependents",
    )
    
    def __repr__(self) -> str:
        return f"<Task(id={self.id}, display_id={self.display_id}, title={self.title})>"
