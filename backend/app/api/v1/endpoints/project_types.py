"""
Project Types API endpoints (admin configuration).
"""
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, select, update
from sqlalchemy.orm import selectinload

from app.api.deps import AdminUser, CurrentUser, DbSession
from app.models.project import Project, ProjectType, ProjectTypeField
from app.schemas.base import MessageResponse, PaginatedResponse
from app.schemas.project import (
    ProjectTypeCreate,
    ProjectTypeFieldCreate,
    ProjectTypeFieldResponse,
    ProjectTypeFieldUpdate,
    ProjectTypeResponse,
    ProjectTypeUpdate,
    ProjectTypeWithFields,
)


class StatusMigration(BaseModel):
    """Request to migrate projects from old status to new status."""
    old_status: str
    new_status: str


class ProjectTypeMigrationRequest(BaseModel):
    """Request for migrating projects when deleting a project type."""
    target_project_type_id: int
    status_mappings: list[StatusMigration] = []

router = APIRouter(prefix="/project-types", tags=["Project Types"])


@router.get("", response_model=PaginatedResponse[ProjectTypeResponse])
async def list_project_types(
    db: DbSession,
    current_user: CurrentUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
) -> PaginatedResponse[ProjectTypeResponse]:
    """
    List all project types.
    """
    count_query = select(func.count()).select_from(ProjectType)
    total = (await db.execute(count_query)).scalar() or 0
    
    offset = (page - 1) * page_size
    query = select(ProjectType).offset(offset).limit(page_size).order_by(ProjectType.name)
    result = await db.execute(query)
    project_types = result.scalars().all()
    
    return PaginatedResponse(
        items=[ProjectTypeResponse.model_validate(pt) for pt in project_types],
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size,
    )


@router.post("", response_model=ProjectTypeWithFields, status_code=status.HTTP_201_CREATED)
async def create_project_type(
    project_type_in: ProjectTypeCreate,
    db: DbSession,
    current_user: AdminUser,  # Admin only
) -> ProjectTypeWithFields:
    """
    Create a new project type (admin only).
    """
    # Check slug uniqueness
    existing = await db.execute(select(ProjectType).where(ProjectType.slug == project_type_in.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project type slug already exists",
        )
    
    # Create project type
    fields_data = project_type_in.fields
    project_type_data = project_type_in.model_dump(exclude={"fields"})
    
    project_type = ProjectType(**project_type_data)
    db.add(project_type)
    await db.flush()
    
    # Create fields
    for idx, field_data in enumerate(fields_data):
        field = ProjectTypeField(
            project_type_id=project_type.id,
            order=field_data.order or idx,
            **field_data.model_dump(exclude={"order"}),
        )
        db.add(field)
    
    await db.flush()
    
    # Reload with fields
    query = (
        select(ProjectType)
        .where(ProjectType.id == project_type.id)
        .options(selectinload(ProjectType.fields))
    )
    result = await db.execute(query)
    project_type = result.scalar_one()
    
    return ProjectTypeWithFields.model_validate(project_type)


@router.get("/{project_type_id}", response_model=ProjectTypeWithFields)
async def get_project_type(
    project_type_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> ProjectTypeWithFields:
    """
    Get a specific project type by ID with its fields.
    """
    query = (
        select(ProjectType)
        .where(ProjectType.id == project_type_id)
        .options(selectinload(ProjectType.fields))
    )
    result = await db.execute(query)
    project_type = result.scalar_one_or_none()
    
    if project_type is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project type not found",
        )
    
    return ProjectTypeWithFields.model_validate(project_type)


@router.patch("/{project_type_id}", response_model=ProjectTypeResponse)
async def update_project_type(
    project_type_id: int,
    project_type_in: ProjectTypeUpdate,
    db: DbSession,
    current_user: AdminUser,  # Admin only
) -> ProjectTypeResponse:
    """
    Update a project type (admin only).
    """
    result = await db.execute(select(ProjectType).where(ProjectType.id == project_type_id))
    project_type = result.scalar_one_or_none()
    
    if project_type is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project type not found",
        )
    
    update_data = project_type_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project_type, field, value)
    
    await db.flush()
    await db.refresh(project_type)
    
    return ProjectTypeResponse.model_validate(project_type)


@router.get("/{project_type_id}/stats", response_model=dict)
async def get_project_type_stats(
    project_type_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> dict:
    """
    Get statistics about a project type (project counts by status, etc.) for deletion planning.
    """
    result = await db.execute(
        select(ProjectType)
        .where(ProjectType.id == project_type_id)
        .options(selectinload(ProjectType.fields))
    )
    project_type = result.scalar_one_or_none()
    
    if project_type is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project type not found",
        )
    
    # Count projects by status
    projects_by_status = {}
    for status_name in project_type.workflow:
        count_result = await db.execute(
            select(func.count()).select_from(Project).where(
                Project.project_type_id == project_type_id,
                Project.status == status_name,
            )
        )
        count = count_result.scalar() or 0
        if count > 0:
            projects_by_status[status_name] = count
    
    total_projects = sum(projects_by_status.values())
    
    return {
        "project_type_id": project_type_id,
        "project_type_name": project_type.name,
        "workflow": project_type.workflow,
        "total_projects": total_projects,
        "projects_by_status": projects_by_status,
    }


@router.post("/{project_type_id}/migrate", response_model=MessageResponse)
async def migrate_projects_to_type(
    project_type_id: int,
    migration: ProjectTypeMigrationRequest,
    db: DbSession,
    current_user: AdminUser,
) -> MessageResponse:
    """
    Migrate all projects from one project type to another (admin only).
    Used before deleting a project type.
    """
    # Verify source project type exists
    source_result = await db.execute(select(ProjectType).where(ProjectType.id == project_type_id))
    source_type = source_result.scalar_one_or_none()
    
    if source_type is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Source project type not found",
        )
    
    # Verify target project type exists
    target_result = await db.execute(select(ProjectType).where(ProjectType.id == migration.target_project_type_id))
    target_type = target_result.scalar_one_or_none()
    
    if target_type is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target project type not found",
        )
    
    if target_type.id == project_type_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot migrate to the same project type",
        )
    
    # Build status mapping
    status_map = {m.old_status: m.new_status for m in migration.status_mappings}
    
    # Validate all target statuses exist in target workflow
    target_workflow_set = set(target_type.workflow)
    for new_status in status_map.values():
        if new_status not in target_workflow_set:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Target status '{new_status}' not in target workflow",
            )
    
    # Get all projects with this type
    projects_result = await db.execute(
        select(Project).where(Project.project_type_id == project_type_id)
    )
    projects = projects_result.scalars().all()
    
    # Default status if no mapping provided
    default_status = target_type.workflow[0] if target_type.workflow else "Backlog"
    
    migrated_count = 0
    for project in projects:
        new_status = status_map.get(project.status, default_status)
        project.project_type_id = target_type.id
        project.status = new_status
        migrated_count += 1
    
    await db.flush()
    
    return MessageResponse(message=f"Migrated {migrated_count} projects to '{target_type.name}'")


@router.delete("/{project_type_id}", response_model=MessageResponse)
async def delete_project_type(
    project_type_id: int,
    db: DbSession,
    current_user: AdminUser,  # Admin only
) -> MessageResponse:
    """
    Delete a project type (admin only).
    
    Note: This will fail if there are projects using this type. Use the migrate endpoint first.
    """
    result = await db.execute(select(ProjectType).where(ProjectType.id == project_type_id))
    project_type = result.scalar_one_or_none()
    
    if project_type is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project type not found",
        )
    
    # Check if there are any projects using this type
    project_count_result = await db.execute(
        select(func.count()).select_from(Project).where(Project.project_type_id == project_type_id)
    )
    project_count = project_count_result.scalar() or 0
    
    if project_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete project type with {project_count} existing projects. Migrate projects first using POST /{project_type_id}/migrate",
        )
    
    name = project_type.name
    await db.delete(project_type)
    
    return MessageResponse(message=f"Project type '{name}' deleted successfully")


@router.patch("/{project_type_id}/workflow", response_model=ProjectTypeResponse)
async def update_project_type_workflow(
    project_type_id: int,
    workflow: list[str],
    status_mappings: list[StatusMigration] = [],
    db: DbSession = None,
    current_user: AdminUser = None,
) -> ProjectTypeResponse:
    """
    Update a project type's workflow with automatic status migration (admin only).
    
    If statuses are removed, provide status_mappings to reassign projects.
    """
    result = await db.execute(select(ProjectType).where(ProjectType.id == project_type_id))
    project_type = result.scalar_one_or_none()
    
    if project_type is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project type not found",
        )
    
    # Find removed statuses
    old_workflow_set = set(project_type.workflow)
    new_workflow_set = set(workflow)
    removed_statuses = old_workflow_set - new_workflow_set
    
    # Build status mapping for removed statuses
    status_map = {m.old_status: m.new_status for m in status_mappings}
    
    # Check if all removed statuses have mappings
    for removed in removed_statuses:
        if removed not in status_map:
            # Check if any projects are in this status
            count_result = await db.execute(
                select(func.count()).select_from(Project).where(
                    Project.project_type_id == project_type_id,
                    Project.status == removed,
                )
            )
            count = count_result.scalar() or 0
            if count > 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Status '{removed}' has {count} projects. Provide a status mapping.",
                )
    
    # Validate all target statuses exist in new workflow
    for new_status in status_map.values():
        if new_status not in new_workflow_set:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Target status '{new_status}' not in new workflow",
            )
    
    # Migrate projects from removed statuses
    for old_status, new_status in status_map.items():
        await db.execute(
            update(Project)
            .where(Project.project_type_id == project_type_id, Project.status == old_status)
            .values(status=new_status)
        )
    
    # Update workflow
    project_type.workflow = workflow
    await db.flush()
    await db.refresh(project_type)
    
    return ProjectTypeResponse.model_validate(project_type)


# --- Project Type Fields ---

@router.post("/{project_type_id}/fields", response_model=ProjectTypeFieldResponse, status_code=status.HTTP_201_CREATED)
async def add_project_type_field(
    project_type_id: int,
    field_in: ProjectTypeFieldCreate,
    db: DbSession,
    current_user: AdminUser,  # Admin only
) -> ProjectTypeFieldResponse:
    """
    Add a custom field to a project type (admin only).
    """
    # Verify project type exists
    pt_result = await db.execute(select(ProjectType).where(ProjectType.id == project_type_id))
    if pt_result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project type not found",
        )
    
    # Check key uniqueness within project type
    existing = await db.execute(
        select(ProjectTypeField).where(
            ProjectTypeField.project_type_id == project_type_id,
            ProjectTypeField.key == field_in.key,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Field key already exists for this project type",
        )
    
    field = ProjectTypeField(
        project_type_id=project_type_id,
        **field_in.model_dump(),
    )
    db.add(field)
    await db.flush()
    await db.refresh(field)
    
    return ProjectTypeFieldResponse.model_validate(field)


@router.patch("/{project_type_id}/fields/{field_id}", response_model=ProjectTypeFieldResponse)
async def update_project_type_field(
    project_type_id: int,
    field_id: int,
    field_in: ProjectTypeFieldUpdate,
    db: DbSession,
    current_user: AdminUser,  # Admin only
) -> ProjectTypeFieldResponse:
    """
    Update a custom field (admin only).
    """
    result = await db.execute(
        select(ProjectTypeField).where(
            ProjectTypeField.id == field_id,
            ProjectTypeField.project_type_id == project_type_id,
        )
    )
    field = result.scalar_one_or_none()
    
    if field is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Field not found",
        )
    
    update_data = field_in.model_dump(exclude_unset=True)
    for attr, value in update_data.items():
        setattr(field, attr, value)
    
    await db.flush()
    await db.refresh(field)
    
    return ProjectTypeFieldResponse.model_validate(field)


@router.delete("/{project_type_id}/fields/{field_id}", response_model=MessageResponse)
async def delete_project_type_field(
    project_type_id: int,
    field_id: int,
    db: DbSession,
    current_user: AdminUser,  # Admin only
) -> MessageResponse:
    """
    Delete a custom field (admin only).
    """
    result = await db.execute(
        select(ProjectTypeField).where(
            ProjectTypeField.id == field_id,
            ProjectTypeField.project_type_id == project_type_id,
        )
    )
    field = result.scalar_one_or_none()
    
    if field is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Field not found",
        )
    
    await db.delete(field)
    
    return MessageResponse(message="Field deleted successfully")
