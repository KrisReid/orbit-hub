"""
Project model with type-specific workflows and custom fields.
"""
import enum
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any, List

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.theme import Theme
    from app.models.task import Task


class FieldType(str, enum.Enum):
    """Custom field type enumeration."""
    text = "text"
    textarea = "textarea"
    number = "number"
    select = "select"
    multiselect = "multiselect"
    url = "url"
    date = "date"
    checkbox = "checkbox"


class ProjectType(Base):
    """Project type with customizable workflow and fields."""
    
    __tablename__ = "project_types"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
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
    fields: Mapped[List["ProjectTypeField"]] = relationship(
        "ProjectTypeField",
        back_populates="project_type",
        cascade="all, delete-orphan",
        order_by="ProjectTypeField.order",
    )
    projects: Mapped[List["Project"]] = relationship(
        "Project",
        back_populates="project_type",
    )
    
    def __repr__(self) -> str:
        return f"<ProjectType(id={self.id}, name={self.name}, slug={self.slug})>"


class ProjectTypeField(Base):
    """Custom field definition for a project type."""
    
    __tablename__ = "project_type_fields"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    project_type_id: Mapped[int] = mapped_column(
        ForeignKey("project_types.id", ondelete="CASCADE"),
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
    project_type: Mapped["ProjectType"] = relationship(
        "ProjectType",
        back_populates="fields",
    )
    
    def __repr__(self) -> str:
        return f"<ProjectTypeField(id={self.id}, key={self.key}, type={self.field_type})>"


class Project(Base):
    """Project model - cross-team work items."""
    
    __tablename__ = "projects"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    
    # Foreign keys
    theme_id: Mapped[int | None] = mapped_column(
        ForeignKey("themes.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    project_type_id: Mapped[int] = mapped_column(
        ForeignKey("project_types.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    
    # Core fields
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    
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
    theme: Mapped["Theme | None"] = relationship("Theme", back_populates="projects")
    project_type: Mapped["ProjectType"] = relationship("ProjectType", back_populates="projects")
    tasks: Mapped[List["Task"]] = relationship("Task", back_populates="project")
    
    # Dependencies (self-referential many-to-many)
    dependencies: Mapped[List["Project"]] = relationship(
        "Project",
        secondary="project_dependencies",
        primaryjoin="Project.id == project_dependencies.c.project_id",
        secondaryjoin="Project.id == project_dependencies.c.depends_on_id",
        backref="dependents",
    )
    
    def __repr__(self) -> str:
        return f"<Project(id={self.id}, title={self.title}, status={self.status})>"


# Association table for project dependencies
from sqlalchemy import Table, Column

project_dependencies = Table(
    "project_dependencies",
    Base.metadata,
    Column("project_id", Integer, ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True),
    Column("depends_on_id", Integer, ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True),
)
