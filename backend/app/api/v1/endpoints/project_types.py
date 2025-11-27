"""
Project Types API endpoints (admin configuration).
"""
from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.api.deps import AdminUser, CurrentUser, DbSession
from app.models.project import ProjectType, ProjectTypeField
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


@router.delete("/{project_type_id}", response_model=MessageResponse)
async def delete_project_type(
    project_type_id: int,
    db: DbSession,
    current_user: AdminUser,  # Admin only
) -> MessageResponse:
    """
    Delete a project type (admin only).
    
    Note: This will fail if there are projects using this type.
    """
    result = await db.execute(select(ProjectType).where(ProjectType.id == project_type_id))
    project_type = result.scalar_one_or_none()
    
    if project_type is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project type not found",
        )
    
    name = project_type.name
    await db.delete(project_type)
    
    return MessageResponse(message=f"Project type '{name}' deleted successfully")


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
