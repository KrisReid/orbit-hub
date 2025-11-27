"""
Releases API endpoints.
"""
from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DbSession
from app.models.release import Release
from app.schemas.base import MessageResponse, PaginatedResponse
from app.schemas.release import (
    ReleaseCreate,
    ReleaseResponse,
    ReleaseUpdate,
    ReleaseWithTasks,
)

router = APIRouter(prefix="/releases", tags=["Releases"])


@router.get("", response_model=PaginatedResponse[ReleaseResponse])
async def list_releases(
    db: DbSession,
    current_user: CurrentUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    status: str | None = Query(None),
) -> PaginatedResponse[ReleaseResponse]:
    """
    List all releases with optional status filter.
    """
    base_query = select(Release)
    count_query = select(func.count()).select_from(Release)
    
    if status is not None:
        from app.models.release import ReleaseStatus
        try:
            status_enum = ReleaseStatus(status)
            base_query = base_query.where(Release.status == status_enum)
            count_query = count_query.where(Release.status == status_enum)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status. Must be one of: {[s.value for s in ReleaseStatus]}",
            )
    
    total = (await db.execute(count_query)).scalar() or 0
    
    offset = (page - 1) * page_size
    query = base_query.offset(offset).limit(page_size).order_by(Release.created_at.desc())
    result = await db.execute(query)
    releases = result.scalars().all()
    
    return PaginatedResponse(
        items=[ReleaseResponse.model_validate(r) for r in releases],
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size,
    )


@router.post("", response_model=ReleaseResponse, status_code=status.HTTP_201_CREATED)
async def create_release(
    release_in: ReleaseCreate,
    db: DbSession,
    current_user: CurrentUser,
) -> ReleaseResponse:
    """
    Create a new release.
    """
    # Check version uniqueness
    existing = await db.execute(select(Release).where(Release.version == release_in.version))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Release version already exists",
        )
    
    release = Release(**release_in.model_dump())
    db.add(release)
    await db.flush()
    await db.refresh(release)
    
    return ReleaseResponse.model_validate(release)


@router.get("/{release_id}", response_model=ReleaseWithTasks)
async def get_release(
    release_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> ReleaseWithTasks:
    """
    Get a specific release by ID with its tasks.
    """
    query = (
        select(Release)
        .where(Release.id == release_id)
        .options(selectinload(Release.tasks))
    )
    result = await db.execute(query)
    release = result.scalar_one_or_none()
    
    if release is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Release not found",
        )
    
    return ReleaseWithTasks.model_validate(release)


@router.patch("/{release_id}", response_model=ReleaseResponse)
async def update_release(
    release_id: int,
    release_in: ReleaseUpdate,
    db: DbSession,
    current_user: CurrentUser,
) -> ReleaseResponse:
    """
    Update a release.
    """
    result = await db.execute(select(Release).where(Release.id == release_id))
    release = result.scalar_one_or_none()
    
    if release is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Release not found",
        )
    
    # Check version uniqueness if being changed
    if release_in.version and release_in.version != release.version:
        existing = await db.execute(
            select(Release).where(Release.version == release_in.version)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Release version already exists",
            )
    
    update_data = release_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(release, field, value)
    
    await db.flush()
    await db.refresh(release)
    
    return ReleaseResponse.model_validate(release)


@router.delete("/{release_id}", response_model=MessageResponse)
async def delete_release(
    release_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> MessageResponse:
    """
    Delete a release.
    
    Note: Tasks associated with this release will have their release_id set to NULL.
    """
    result = await db.execute(select(Release).where(Release.id == release_id))
    release = result.scalar_one_or_none()
    
    if release is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Release not found",
        )
    
    version = release.version
    await db.delete(release)
    
    return MessageResponse(message=f"Release '{version}' deleted successfully")
