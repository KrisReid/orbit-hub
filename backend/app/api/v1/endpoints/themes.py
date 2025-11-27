"""
Themes API endpoints.
"""
from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DbSession
from app.models.theme import Theme
from app.schemas.base import MessageResponse, PaginatedResponse
from app.schemas.theme import ThemeCreate, ThemeResponse, ThemeUpdate, ThemeWithProjects

router = APIRouter(prefix="/themes", tags=["Themes"])


@router.get("", response_model=PaginatedResponse[ThemeResponse])
async def list_themes(
    db: DbSession,
    current_user: CurrentUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    include_archived: bool = Query(False),
) -> PaginatedResponse[ThemeResponse]:
    """
    List all themes.
    """
    base_query = select(Theme)
    count_query = select(func.count()).select_from(Theme)
    
    if not include_archived:
        from app.models.theme import ThemeStatus
        base_query = base_query.where(Theme.status != ThemeStatus.archived)
        count_query = count_query.where(Theme.status != ThemeStatus.archived)
    
    total = (await db.execute(count_query)).scalar() or 0
    
    offset = (page - 1) * page_size
    query = base_query.offset(offset).limit(page_size).order_by(Theme.created_at.desc())
    result = await db.execute(query)
    themes = result.scalars().all()
    
    return PaginatedResponse(
        items=[ThemeResponse.model_validate(t) for t in themes],
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size,
    )


@router.post("", response_model=ThemeResponse, status_code=status.HTTP_201_CREATED)
async def create_theme(
    theme_in: ThemeCreate,
    db: DbSession,
    current_user: CurrentUser,
) -> ThemeResponse:
    """
    Create a new theme.
    """
    theme = Theme(**theme_in.model_dump())
    db.add(theme)
    await db.flush()
    await db.refresh(theme)
    
    return ThemeResponse.model_validate(theme)


@router.get("/{theme_id}", response_model=ThemeWithProjects)
async def get_theme(
    theme_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> ThemeWithProjects:
    """
    Get a specific theme by ID with its projects.
    """
    query = (
        select(Theme)
        .where(Theme.id == theme_id)
        .options(selectinload(Theme.projects))
    )
    result = await db.execute(query)
    theme = result.scalar_one_or_none()
    
    if theme is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Theme not found",
        )
    
    return ThemeWithProjects.model_validate(theme)


@router.patch("/{theme_id}", response_model=ThemeResponse)
async def update_theme(
    theme_id: int,
    theme_in: ThemeUpdate,
    db: DbSession,
    current_user: CurrentUser,
) -> ThemeResponse:
    """
    Update a theme.
    """
    result = await db.execute(select(Theme).where(Theme.id == theme_id))
    theme = result.scalar_one_or_none()
    
    if theme is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Theme not found",
        )
    
    update_data = theme_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(theme, field, value)
    
    await db.flush()
    await db.refresh(theme)
    
    return ThemeResponse.model_validate(theme)


@router.delete("/{theme_id}", response_model=MessageResponse)
async def delete_theme(
    theme_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> MessageResponse:
    """
    Delete a theme.
    
    Note: Projects associated with this theme will have their theme_id set to NULL.
    """
    result = await db.execute(select(Theme).where(Theme.id == theme_id))
    theme = result.scalar_one_or_none()
    
    if theme is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Theme not found",
        )
    
    theme_title = theme.title
    await db.delete(theme)
    
    return MessageResponse(message=f"Theme '{theme_title}' deleted successfully")
