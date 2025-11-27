"""
Task Types API endpoints (team-specific configuration).
"""
from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.api.deps import AdminUser, CurrentUser, DbSession
from app.models.task import TaskType, TaskTypeField
from app.models.team import Team
from app.schemas.base import MessageResponse, PaginatedResponse
from app.schemas.task import (
    TaskTypeCreate,
    TaskTypeFieldCreate,
    TaskTypeFieldResponse,
    TaskTypeFieldUpdate,
    TaskTypeResponse,
    TaskTypeUpdate,
    TaskTypeWithFields,
)

router = APIRouter(prefix="/task-types", tags=["Task Types"])


@router.get("", response_model=PaginatedResponse[TaskTypeResponse])
async def list_task_types(
    db: DbSession,
    current_user: CurrentUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    team_id: int | None = Query(None),
) -> PaginatedResponse[TaskTypeResponse]:
    """
    List all task types, optionally filtered by team.
    """
    base_query = select(TaskType)
    count_query = select(func.count()).select_from(TaskType)
    
    if team_id is not None:
        base_query = base_query.where(TaskType.team_id == team_id)
        count_query = count_query.where(TaskType.team_id == team_id)
    
    total = (await db.execute(count_query)).scalar() or 0
    
    offset = (page - 1) * page_size
    query = base_query.offset(offset).limit(page_size).order_by(TaskType.team_id, TaskType.name)
    result = await db.execute(query)
    task_types = result.scalars().all()
    
    return PaginatedResponse(
        items=[TaskTypeResponse.model_validate(tt) for tt in task_types],
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size,
    )


@router.post("", response_model=TaskTypeWithFields, status_code=status.HTTP_201_CREATED)
async def create_task_type(
    task_type_in: TaskTypeCreate,
    db: DbSession,
    current_user: AdminUser,  # Admin only
    team_id: int = Query(..., description="Team ID for this task type"),
) -> TaskTypeWithFields:
    """
    Create a new task type for a team (admin only).
    """
    # Verify team exists
    team_result = await db.execute(select(Team).where(Team.id == team_id))
    if team_result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Team not found",
        )
    
    # Check slug uniqueness within team
    existing = await db.execute(
        select(TaskType).where(
            TaskType.team_id == team_id,
            TaskType.slug == task_type_in.slug,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Task type slug already exists for this team",
        )
    
    # Create task type
    fields_data = task_type_in.fields
    task_type_data = task_type_in.model_dump(exclude={"fields"})
    
    task_type = TaskType(team_id=team_id, **task_type_data)
    db.add(task_type)
    await db.flush()
    
    # Create fields
    for idx, field_data in enumerate(fields_data):
        field = TaskTypeField(
            task_type_id=task_type.id,
            order=field_data.order or idx,
            **field_data.model_dump(exclude={"order"}),
        )
        db.add(field)
    
    await db.flush()
    
    # Reload with fields
    query = (
        select(TaskType)
        .where(TaskType.id == task_type.id)
        .options(selectinload(TaskType.fields))
    )
    result = await db.execute(query)
    task_type = result.scalar_one()
    
    return TaskTypeWithFields.model_validate(task_type)


@router.get("/{task_type_id}", response_model=TaskTypeWithFields)
async def get_task_type(
    task_type_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> TaskTypeWithFields:
    """
    Get a specific task type by ID with its fields.
    """
    query = (
        select(TaskType)
        .where(TaskType.id == task_type_id)
        .options(selectinload(TaskType.fields))
    )
    result = await db.execute(query)
    task_type = result.scalar_one_or_none()
    
    if task_type is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task type not found",
        )
    
    return TaskTypeWithFields.model_validate(task_type)


@router.patch("/{task_type_id}", response_model=TaskTypeResponse)
async def update_task_type(
    task_type_id: int,
    task_type_in: TaskTypeUpdate,
    db: DbSession,
    current_user: AdminUser,  # Admin only
) -> TaskTypeResponse:
    """
    Update a task type (admin only).
    """
    result = await db.execute(select(TaskType).where(TaskType.id == task_type_id))
    task_type = result.scalar_one_or_none()
    
    if task_type is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task type not found",
        )
    
    update_data = task_type_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task_type, field, value)
    
    await db.flush()
    await db.refresh(task_type)
    
    return TaskTypeResponse.model_validate(task_type)


@router.delete("/{task_type_id}", response_model=MessageResponse)
async def delete_task_type(
    task_type_id: int,
    db: DbSession,
    current_user: AdminUser,  # Admin only
) -> MessageResponse:
    """
    Delete a task type (admin only).
    
    Note: This will fail if there are tasks using this type.
    """
    result = await db.execute(select(TaskType).where(TaskType.id == task_type_id))
    task_type = result.scalar_one_or_none()
    
    if task_type is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task type not found",
        )
    
    name = task_type.name
    await db.delete(task_type)
    
    return MessageResponse(message=f"Task type '{name}' deleted successfully")


# --- Task Type Fields ---

@router.post("/{task_type_id}/fields", response_model=TaskTypeFieldResponse, status_code=status.HTTP_201_CREATED)
async def add_task_type_field(
    task_type_id: int,
    field_in: TaskTypeFieldCreate,
    db: DbSession,
    current_user: AdminUser,  # Admin only
) -> TaskTypeFieldResponse:
    """
    Add a custom field to a task type (admin only).
    """
    # Verify task type exists
    tt_result = await db.execute(select(TaskType).where(TaskType.id == task_type_id))
    if tt_result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task type not found",
        )
    
    # Check key uniqueness within task type
    existing = await db.execute(
        select(TaskTypeField).where(
            TaskTypeField.task_type_id == task_type_id,
            TaskTypeField.key == field_in.key,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Field key already exists for this task type",
        )
    
    field = TaskTypeField(
        task_type_id=task_type_id,
        **field_in.model_dump(),
    )
    db.add(field)
    await db.flush()
    await db.refresh(field)
    
    return TaskTypeFieldResponse.model_validate(field)


@router.patch("/{task_type_id}/fields/{field_id}", response_model=TaskTypeFieldResponse)
async def update_task_type_field(
    task_type_id: int,
    field_id: int,
    field_in: TaskTypeFieldUpdate,
    db: DbSession,
    current_user: AdminUser,  # Admin only
) -> TaskTypeFieldResponse:
    """
    Update a custom field (admin only).
    """
    result = await db.execute(
        select(TaskTypeField).where(
            TaskTypeField.id == field_id,
            TaskTypeField.task_type_id == task_type_id,
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
    
    return TaskTypeFieldResponse.model_validate(field)


@router.delete("/{task_type_id}/fields/{field_id}", response_model=MessageResponse)
async def delete_task_type_field(
    task_type_id: int,
    field_id: int,
    db: DbSession,
    current_user: AdminUser,  # Admin only
) -> MessageResponse:
    """
    Delete a custom field (admin only).
    """
    result = await db.execute(
        select(TaskTypeField).where(
            TaskTypeField.id == field_id,
            TaskTypeField.task_type_id == task_type_id,
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
