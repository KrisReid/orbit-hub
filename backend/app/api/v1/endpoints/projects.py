"""
Projects API endpoints.
"""
from typing import List

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DbSession
from app.models.project import Project, ProjectType, ProjectTypeField, project_dependencies
from app.models.theme import Theme
from app.schemas.base import MessageResponse, PaginatedResponse
from app.schemas.project import (
    AddProjectDependencyRequest,
    ProjectCreate,
    ProjectResponse,
    ProjectUpdate,
    ProjectWithDetails,
)

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.get("", response_model=PaginatedResponse[ProjectResponse])
async def list_projects(
    db: DbSession,
    current_user: CurrentUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    theme_id: int | None = Query(None),
    project_type_id: int | None = Query(None),
    project_type_ids: List[int] | None = Query(None, description="Filter by multiple project type IDs"),
    status: str | None = Query(None),
    statuses: List[str] | None = Query(None, description="Filter by multiple statuses"),
) -> PaginatedResponse[ProjectResponse]:
    """
    List all projects with optional filters.
    Supports both single filters (project_type_id, status) and multi-select filters (project_type_ids, statuses).
    """
    base_query = select(Project)
    count_query = select(func.count()).select_from(Project)
    
    # Apply filters
    if theme_id is not None:
        base_query = base_query.where(Project.theme_id == theme_id)
        count_query = count_query.where(Project.theme_id == theme_id)
    
    # Support both single and multiple project type filters
    if project_type_ids and len(project_type_ids) > 0:
        base_query = base_query.where(Project.project_type_id.in_(project_type_ids))
        count_query = count_query.where(Project.project_type_id.in_(project_type_ids))
    elif project_type_id is not None:
        base_query = base_query.where(Project.project_type_id == project_type_id)
        count_query = count_query.where(Project.project_type_id == project_type_id)
    
    # Support both single and multiple status filters
    if statuses and len(statuses) > 0:
        base_query = base_query.where(Project.status.in_(statuses))
        count_query = count_query.where(Project.status.in_(statuses))
    elif status is not None:
        base_query = base_query.where(Project.status == status)
        count_query = count_query.where(Project.status == status)
    
    total = (await db.execute(count_query)).scalar() or 0
    
    offset = (page - 1) * page_size
    query = (
        base_query
        .offset(offset)
        .limit(page_size)
        .order_by(Project.created_at.desc())
        .options(
            selectinload(Project.theme),
            selectinload(Project.project_type),
        )
    )
    result = await db.execute(query)
    projects = result.scalars().all()
    
    return PaginatedResponse(
        items=[ProjectResponse.model_validate(p) for p in projects],
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size,
    )


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_in: ProjectCreate,
    db: DbSession,
    current_user: CurrentUser,
) -> ProjectResponse:
    """
    Create a new project.
    """
    # Verify project type exists and get initial status
    pt_result = await db.execute(
        select(ProjectType).where(ProjectType.id == project_in.project_type_id)
    )
    project_type = pt_result.scalar_one_or_none()
    
    if project_type is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid project type",
        )
    
    # Verify theme exists if provided
    if project_in.theme_id is not None:
        theme_result = await db.execute(
            select(Theme).where(Theme.id == project_in.theme_id)
        )
        if theme_result.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid theme",
            )
    
    # Set initial status from workflow
    initial_status = project_type.workflow[0] if project_type.workflow else "Backlog"
    
    project = Project(
        **project_in.model_dump(),
        status=initial_status,
    )
    db.add(project)
    await db.flush()
    
    # Reload with relationships
    query = (
        select(Project)
        .where(Project.id == project.id)
        .options(
            selectinload(Project.theme),
            selectinload(Project.project_type),
        )
    )
    result = await db.execute(query)
    project = result.scalar_one()
    
    return ProjectResponse.model_validate(project)


@router.get("/{project_id}", response_model=ProjectWithDetails)
async def get_project(
    project_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> ProjectWithDetails:
    """
    Get a specific project by ID with full details.
    """
    query = (
        select(Project)
        .where(Project.id == project_id)
        .options(
            selectinload(Project.theme),
            selectinload(Project.project_type).selectinload(ProjectType.fields),
            selectinload(Project.dependencies),
            selectinload(Project.tasks),
        )
    )
    result = await db.execute(query)
    project = result.scalar_one_or_none()
    
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    
    return ProjectWithDetails.model_validate(project)


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    project_in: ProjectUpdate,
    db: DbSession,
    current_user: CurrentUser,
) -> ProjectResponse:
    """
    Update a project.
    """
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    
    # Validate project_type if being changed
    new_project_type = None
    if project_in.project_type_id is not None and project_in.project_type_id != project.project_type_id:
        pt_result = await db.execute(
            select(ProjectType).where(ProjectType.id == project_in.project_type_id)
        )
        new_project_type = pt_result.scalar_one_or_none()
        if new_project_type is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid project type",
            )
    
    # Validate status against workflow if being changed
    if project_in.status is not None:
        # Use new project type's workflow if project type is being changed, otherwise use current
        if new_project_type is not None:
            workflow = new_project_type.workflow
        else:
            pt_result = await db.execute(
                select(ProjectType).where(ProjectType.id == project.project_type_id)
            )
            project_type = pt_result.scalar_one()
            workflow = project_type.workflow
        
        if project_in.status not in workflow:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status. Must be one of: {workflow}",
            )
    
    # Validate theme if being changed
    if project_in.theme_id is not None:
        theme_result = await db.execute(
            select(Theme).where(Theme.id == project_in.theme_id)
        )
        if theme_result.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid theme",
            )
    
    update_data = project_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)
    
    await db.flush()
    
    # Reload with relationships
    query = (
        select(Project)
        .where(Project.id == project.id)
        .options(
            selectinload(Project.theme),
            selectinload(Project.project_type),
        )
    )
    result = await db.execute(query)
    project = result.scalar_one()
    
    return ProjectResponse.model_validate(project)


@router.delete("/{project_id}", response_model=MessageResponse)
async def delete_project(
    project_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> MessageResponse:
    """
    Delete a project.
    
    Note: Tasks associated with this project will have their project_id set to NULL.
    """
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    
    title = project.title
    await db.delete(project)
    
    return MessageResponse(message=f"Project '{title}' deleted successfully")


# --- Project Dependencies ---

@router.post("/{project_id}/dependencies", response_model=MessageResponse)
async def add_project_dependency(
    project_id: int,
    request: AddProjectDependencyRequest,
    db: DbSession,
    current_user: CurrentUser,
) -> MessageResponse:
    """
    Add a dependency to a project (project depends on another project).
    """
    # Verify project exists
    result = await db.execute(
        select(Project)
        .where(Project.id == project_id)
        .options(selectinload(Project.dependencies))
    )
    project = result.scalar_one_or_none()
    
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    
    # Verify dependency project exists
    dep_result = await db.execute(select(Project).where(Project.id == request.depends_on_id))
    depends_on = dep_result.scalar_one_or_none()
    
    if depends_on is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dependency project not found",
        )
    
    # Prevent self-dependency
    if project_id == request.depends_on_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project cannot depend on itself",
        )
    
    # Check if dependency already exists
    if depends_on in project.dependencies:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dependency already exists",
        )
    
    # Add dependency
    project.dependencies.append(depends_on)
    await db.flush()
    
    return MessageResponse(message=f"Dependency on '{depends_on.title}' added")


@router.delete("/{project_id}/dependencies/{depends_on_id}", response_model=MessageResponse)
async def remove_project_dependency(
    project_id: int,
    depends_on_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> MessageResponse:
    """
    Remove a dependency from a project.
    """
    result = await db.execute(
        select(Project)
        .where(Project.id == project_id)
        .options(selectinload(Project.dependencies))
    )
    project = result.scalar_one_or_none()
    
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    
    # Find and remove dependency
    dependency_to_remove = None
    for dep in project.dependencies:
        if dep.id == depends_on_id:
            dependency_to_remove = dep
            break
    
    if dependency_to_remove is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dependency not found",
        )
    
    project.dependencies.remove(dependency_to_remove)
    await db.flush()
    
    return MessageResponse(message="Dependency removed")
