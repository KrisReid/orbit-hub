"""
Tasks API endpoints.
"""
from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DbSession
from app.core.config import settings
from app.models.project import Project
from app.models.release import Release
from app.models.task import Task, TaskType
from app.models.team import Team
from app.schemas.base import MessageResponse, PaginatedResponse
from app.schemas.task import (
    AddTaskDependencyRequest,
    TaskCreate,
    TaskResponse,
    TaskUpdate,
    TaskWithDetails,
)

router = APIRouter(prefix="/tasks", tags=["Tasks"])


async def generate_display_id(db: AsyncSession, prefix: str = None) -> str:
    """Generate a unique display ID for a task."""
    prefix = prefix or settings.TASK_ID_PREFIX
    
    # Get the highest existing number
    result = await db.execute(
        select(func.max(Task.id))
    )
    max_id = result.scalar() or 0
    
    return f"{prefix}-{max_id + 1}"


@router.get("", response_model=PaginatedResponse[TaskResponse])
async def list_tasks(
    db: DbSession,
    current_user: CurrentUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    team_id: int | None = Query(None),
    project_id: int | None = Query(None),
    release_id: int | None = Query(None),
    task_type_id: int | None = Query(None),
    status: str | None = Query(None),
) -> PaginatedResponse[TaskResponse]:
    """
    List all tasks with optional filters.
    """
    base_query = select(Task)
    count_query = select(func.count()).select_from(Task)
    
    # Apply filters
    if team_id is not None:
        base_query = base_query.where(Task.team_id == team_id)
        count_query = count_query.where(Task.team_id == team_id)
    if project_id is not None:
        base_query = base_query.where(Task.project_id == project_id)
        count_query = count_query.where(Task.project_id == project_id)
    if release_id is not None:
        base_query = base_query.where(Task.release_id == release_id)
        count_query = count_query.where(Task.release_id == release_id)
    if task_type_id is not None:
        base_query = base_query.where(Task.task_type_id == task_type_id)
        count_query = count_query.where(Task.task_type_id == task_type_id)
    if status is not None:
        base_query = base_query.where(Task.status == status)
        count_query = count_query.where(Task.status == status)
    
    total = (await db.execute(count_query)).scalar() or 0
    
    offset = (page - 1) * page_size
    query = (
        base_query
        .offset(offset)
        .limit(page_size)
        .order_by(Task.created_at.desc())
        .options(
            selectinload(Task.team),
            selectinload(Task.task_type),
            selectinload(Task.project),
            selectinload(Task.release),
        )
    )
    result = await db.execute(query)
    tasks = result.scalars().all()
    
    return PaginatedResponse(
        items=[TaskResponse.model_validate(t) for t in tasks],
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size,
    )


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    task_in: TaskCreate,
    db: DbSession,
    current_user: CurrentUser,
) -> TaskResponse:
    """
    Create a new task.
    """
    # Verify team exists
    team_result = await db.execute(select(Team).where(Team.id == task_in.team_id))
    if team_result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Team not found",
        )
    
    # Verify task type exists and belongs to the team
    tt_result = await db.execute(
        select(TaskType).where(
            TaskType.id == task_in.task_type_id,
            TaskType.team_id == task_in.team_id,
        )
    )
    task_type = tt_result.scalar_one_or_none()
    
    if task_type is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid task type for this team",
        )
    
    # Verify project exists if provided
    if task_in.project_id is not None:
        project_result = await db.execute(
            select(Project).where(Project.id == task_in.project_id)
        )
        if project_result.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Project not found",
            )
    
    # Verify release exists if provided
    if task_in.release_id is not None:
        release_result = await db.execute(
            select(Release).where(Release.id == task_in.release_id)
        )
        if release_result.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Release not found",
            )
    
    # Generate display ID
    display_id = await generate_display_id(db)
    
    # Set initial status from workflow
    initial_status = task_type.workflow[0] if task_type.workflow else "Backlog"
    
    task = Task(
        **task_in.model_dump(),
        display_id=display_id,
        status=initial_status,
    )
    db.add(task)
    await db.flush()
    
    # Reload with relationships
    query = (
        select(Task)
        .where(Task.id == task.id)
        .options(
            selectinload(Task.team),
            selectinload(Task.task_type),
            selectinload(Task.project),
            selectinload(Task.release),
        )
    )
    result = await db.execute(query)
    task = result.scalar_one()
    
    return TaskResponse.model_validate(task)


@router.get("/{task_id}", response_model=TaskWithDetails)
async def get_task(
    task_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> TaskWithDetails:
    """
    Get a specific task by ID with full details.
    """
    query = (
        select(Task)
        .where(Task.id == task_id)
        .options(
            selectinload(Task.team),
            selectinload(Task.task_type),
            selectinload(Task.project),
            selectinload(Task.release),
            selectinload(Task.dependencies),
            selectinload(Task.github_links),
        )
    )
    result = await db.execute(query)
    task = result.scalar_one_or_none()
    
    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )
    
    return TaskWithDetails.model_validate(task)


@router.get("/by-display-id/{display_id}", response_model=TaskWithDetails)
async def get_task_by_display_id(
    display_id: str,
    db: DbSession,
    current_user: CurrentUser,
) -> TaskWithDetails:
    """
    Get a specific task by display ID (e.g., CORE-123).
    """
    query = (
        select(Task)
        .where(Task.display_id == display_id.upper())
        .options(
            selectinload(Task.team),
            selectinload(Task.task_type),
            selectinload(Task.project),
            selectinload(Task.release),
            selectinload(Task.dependencies),
            selectinload(Task.github_links),
        )
    )
    result = await db.execute(query)
    task = result.scalar_one_or_none()
    
    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )
    
    return TaskWithDetails.model_validate(task)


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: int,
    task_in: TaskUpdate,
    db: DbSession,
    current_user: CurrentUser,
) -> TaskResponse:
    """
    Update a task.
    """
    result = await db.execute(
        select(Task)
        .where(Task.id == task_id)
        .options(selectinload(Task.task_type))
    )
    task = result.scalar_one_or_none()
    
    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )
    
    # Determine the effective team_id and task_type_id
    effective_team_id = task_in.team_id if task_in.team_id is not None else task.team_id
    effective_task_type_id = task_in.task_type_id if task_in.task_type_id is not None else task.task_type_id
    
    # Validate team if being changed
    if task_in.team_id is not None:
        team_result = await db.execute(select(Team).where(Team.id == task_in.team_id))
        if team_result.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Team not found",
            )
    
    # Validate task type if being changed - must belong to the effective team
    task_type_for_validation = task.task_type
    if task_in.task_type_id is not None or task_in.team_id is not None:
        tt_result = await db.execute(
            select(TaskType).where(
                TaskType.id == effective_task_type_id,
                TaskType.team_id == effective_team_id,
            )
        )
        task_type_for_validation = tt_result.scalar_one_or_none()
        
        if task_type_for_validation is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid task type for this team",
            )
    
    # Validate status against the effective task type's workflow
    if task_in.status is not None:
        if task_in.status not in task_type_for_validation.workflow:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status. Must be one of: {task_type_for_validation.workflow}",
            )
    
    # Validate project if being changed
    if task_in.project_id is not None:
        project_result = await db.execute(
            select(Project).where(Project.id == task_in.project_id)
        )
        if project_result.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Project not found",
            )
    
    # Validate release if being changed
    if task_in.release_id is not None:
        release_result = await db.execute(
            select(Release).where(Release.id == task_in.release_id)
        )
        if release_result.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Release not found",
            )
    
    update_data = task_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)
    
    await db.flush()
    
    # Reload with relationships
    query = (
        select(Task)
        .where(Task.id == task.id)
        .options(
            selectinload(Task.team),
            selectinload(Task.task_type),
            selectinload(Task.project),
            selectinload(Task.release),
        )
    )
    result = await db.execute(query)
    task = result.scalar_one()
    
    return TaskResponse.model_validate(task)


@router.delete("/{task_id}", response_model=MessageResponse)
async def delete_task(
    task_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> MessageResponse:
    """
    Delete a task.
    """
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    
    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )
    
    display_id = task.display_id
    await db.delete(task)
    
    return MessageResponse(message=f"Task '{display_id}' deleted successfully")


# --- Task Dependencies ---

@router.post("/{task_id}/dependencies", response_model=MessageResponse)
async def add_task_dependency(
    task_id: int,
    request: AddTaskDependencyRequest,
    db: DbSession,
    current_user: CurrentUser,
) -> MessageResponse:
    """
    Add a dependency to a task (task depends on another task).
    """
    # Get task with dependencies
    result = await db.execute(
        select(Task)
        .where(Task.id == task_id)
        .options(selectinload(Task.dependencies))
    )
    task = result.scalar_one_or_none()
    
    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )
    
    # Verify dependency task exists
    dep_result = await db.execute(select(Task).where(Task.id == request.depends_on_id))
    depends_on = dep_result.scalar_one_or_none()
    
    if depends_on is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dependency task not found",
        )
    
    # Prevent self-dependency
    if task_id == request.depends_on_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Task cannot depend on itself",
        )
    
    # Check if dependency already exists
    if depends_on in task.dependencies:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dependency already exists",
        )
    
    # Add dependency
    task.dependencies.append(depends_on)
    await db.flush()
    
    return MessageResponse(message=f"Dependency on '{depends_on.display_id}' added")


@router.delete("/{task_id}/dependencies/{depends_on_id}", response_model=MessageResponse)
async def remove_task_dependency(
    task_id: int,
    depends_on_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> MessageResponse:
    """
    Remove a dependency from a task.
    """
    result = await db.execute(
        select(Task)
        .where(Task.id == task_id)
        .options(selectinload(Task.dependencies))
    )
    task = result.scalar_one_or_none()
    
    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )
    
    # Find and remove dependency
    dependency_to_remove = None
    for dep in task.dependencies:
        if dep.id == depends_on_id:
            dependency_to_remove = dep
            break
    
    if dependency_to_remove is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dependency not found",
        )
    
    task.dependencies.remove(dependency_to_remove)
    await db.flush()
    
    return MessageResponse(message="Dependency removed")
