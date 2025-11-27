"""
Teams API endpoints.
"""
from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select, update
from sqlalchemy.orm import selectinload

from app.api.deps import AdminUser, CurrentUser, DbSession
from app.models.team import Team, TeamMember
from app.models.task import Task, TaskType
from app.models.user import User
from app.schemas.base import MessageResponse, PaginatedResponse
from app.schemas.team import (
    AddTeamMemberRequest,
    TeamCreate,
    TeamMemberResponse,
    TeamResponse,
    TeamUpdate,
    TeamWithMembers,
)

# Special slug for unassigned team
UNASSIGNED_TEAM_SLUG = "unassigned"

router = APIRouter(prefix="/teams", tags=["Teams"])


@router.get("", response_model=PaginatedResponse[TeamResponse])
async def list_teams(
    db: DbSession,
    current_user: CurrentUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
) -> PaginatedResponse[TeamResponse]:
    """
    List all teams.
    """
    count_query = select(func.count()).select_from(Team)
    total = (await db.execute(count_query)).scalar() or 0
    
    offset = (page - 1) * page_size
    query = select(Team).offset(offset).limit(page_size).order_by(Team.name)
    result = await db.execute(query)
    teams = result.scalars().all()
    
    return PaginatedResponse(
        items=[TeamResponse.model_validate(t) for t in teams],
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size,
    )


@router.post("", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
async def create_team(
    team_in: TeamCreate,
    db: DbSession,
    current_user: AdminUser,  # Admin only
) -> TeamResponse:
    """
    Create a new team (admin only).
    """
    # Check slug uniqueness
    existing = await db.execute(select(Team).where(Team.slug == team_in.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Team slug already exists",
        )
    
    team = Team(**team_in.model_dump())
    db.add(team)
    await db.flush()
    await db.refresh(team)
    
    return TeamResponse.model_validate(team)


@router.get("/{team_id}", response_model=TeamWithMembers)
async def get_team(
    team_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> TeamWithMembers:
    """
    Get a specific team by ID with its members.
    """
    query = (
        select(Team)
        .where(Team.id == team_id)
        .options(
            selectinload(Team.members).selectinload(TeamMember.user)
        )
    )
    result = await db.execute(query)
    team = result.scalar_one_or_none()
    
    if team is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found",
        )
    
    return TeamWithMembers.model_validate(team)


@router.patch("/{team_id}", response_model=TeamResponse)
async def update_team(
    team_id: int,
    team_in: TeamUpdate,
    db: DbSession,
    current_user: AdminUser,  # Admin only
) -> TeamResponse:
    """
    Update a team (admin only).
    """
    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()
    
    if team is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found",
        )
    
    update_data = team_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(team, field, value)
    
    await db.flush()
    await db.refresh(team)
    
    return TeamResponse.model_validate(team)


async def get_or_create_unassigned_team(db: DbSession) -> Team:
    """Get the Unassigned team, creating it if it doesn't exist."""
    result = await db.execute(select(Team).where(Team.slug == UNASSIGNED_TEAM_SLUG))
    team = result.scalar_one_or_none()
    
    if team is None:
        team = Team(
            name="Unassigned",
            slug=UNASSIGNED_TEAM_SLUG,
            description="Tasks that need to be assigned to a team",
        )
        db.add(team)
        await db.flush()
        await db.refresh(team)
    
    return team


@router.get("/{team_id}/stats", response_model=dict)
async def get_team_stats(
    team_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> dict:
    """
    Get statistics about a team (task counts, etc.) for deletion planning.
    """
    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()
    
    if team is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found",
        )
    
    # Count tasks
    task_count_result = await db.execute(
        select(func.count()).select_from(Task).where(Task.team_id == team_id)
    )
    task_count = task_count_result.scalar() or 0
    
    # Count task types
    task_type_count_result = await db.execute(
        select(func.count()).select_from(TaskType).where(TaskType.team_id == team_id)
    )
    task_type_count = task_type_count_result.scalar() or 0
    
    return {
        "team_id": team_id,
        "team_name": team.name,
        "task_count": task_count,
        "task_type_count": task_type_count,
        "is_unassigned_team": team.slug == UNASSIGNED_TEAM_SLUG,
    }


@router.delete("/{team_id}", response_model=MessageResponse)
async def delete_team(
    team_id: int,
    db: DbSession,
    current_user: AdminUser,  # Admin only
    reassign_tasks_to: int | None = Query(None, description="Team ID to reassign tasks to. If not provided, tasks go to Unassigned team."),
) -> MessageResponse:
    """
    Delete a team (admin only).
    
    Tasks from this team will be reassigned to the specified team or the "Unassigned" team.
    Task types belonging to this team will be deleted (tasks using those types will be migrated first).
    """
    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()
    
    if team is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found",
        )
    
    # Prevent deletion of the Unassigned team
    if team.slug == UNASSIGNED_TEAM_SLUG:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete the Unassigned team",
        )
    
    # Get or create the target team for reassignment
    if reassign_tasks_to is not None:
        target_result = await db.execute(select(Team).where(Team.id == reassign_tasks_to))
        target_team = target_result.scalar_one_or_none()
        if target_team is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Target team for reassignment not found",
            )
        if target_team.id == team_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot reassign tasks to the team being deleted",
            )
    else:
        target_team = await get_or_create_unassigned_team(db)
    
    # Get a task type from the target team (or create a default one)
    target_task_type_result = await db.execute(
        select(TaskType).where(TaskType.team_id == target_team.id).limit(1)
    )
    target_task_type = target_task_type_result.scalar_one_or_none()
    
    if target_task_type is None:
        # Create a default task type for the target team
        target_task_type = TaskType(
            team_id=target_team.id,
            name="Task",
            slug="task",
            workflow=["Backlog", "To Do", "In Progress", "Done"],
        )
        db.add(target_task_type)
        await db.flush()
    
    # Reassign all tasks from this team to the target team
    # Also update task_type_id to the target team's task type
    await db.execute(
        update(Task)
        .where(Task.team_id == team_id)
        .values(team_id=target_team.id, task_type_id=target_task_type.id, status=target_task_type.workflow[0] if target_task_type.workflow else "Backlog")
    )
    
    team_name = team.name
    
    # Delete the team (cascade will delete task_types and team_members)
    await db.delete(team)
    
    return MessageResponse(message=f"Team '{team_name}' deleted successfully. Tasks reassigned to '{target_team.name}'.")


# --- Team Members ---

@router.get("/{team_id}/members", response_model=list[TeamMemberResponse])
async def list_team_members(
    team_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> list[TeamMemberResponse]:
    """
    List all members of a team.
    """
    # Verify team exists
    team_result = await db.execute(select(Team).where(Team.id == team_id))
    if team_result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found",
        )
    
    query = (
        select(TeamMember)
        .where(TeamMember.team_id == team_id)
        .options(selectinload(TeamMember.user))
    )
    result = await db.execute(query)
    members = result.scalars().all()
    
    return [TeamMemberResponse.model_validate(m) for m in members]


@router.post("/{team_id}/members", response_model=TeamMemberResponse, status_code=status.HTTP_201_CREATED)
async def add_team_member(
    team_id: int,
    request: AddTeamMemberRequest,
    db: DbSession,
    current_user: AdminUser,  # Admin only
) -> TeamMemberResponse:
    """
    Add a member to a team (admin only).
    """
    # Verify team exists
    team_result = await db.execute(select(Team).where(Team.id == team_id))
    if team_result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found",
        )
    
    # Verify user exists
    user_result = await db.execute(select(User).where(User.id == request.user_id))
    if user_result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    # Check if already a member
    existing = await db.execute(
        select(TeamMember).where(
            TeamMember.team_id == team_id,
            TeamMember.user_id == request.user_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member of this team",
        )
    
    member = TeamMember(team_id=team_id, user_id=request.user_id)
    db.add(member)
    await db.flush()
    
    # Reload with user relationship
    query = (
        select(TeamMember)
        .where(TeamMember.id == member.id)
        .options(selectinload(TeamMember.user))
    )
    result = await db.execute(query)
    member = result.scalar_one()
    
    return TeamMemberResponse.model_validate(member)


@router.delete("/{team_id}/members/{user_id}", response_model=MessageResponse)
async def remove_team_member(
    team_id: int,
    user_id: int,
    db: DbSession,
    current_user: AdminUser,  # Admin only
) -> MessageResponse:
    """
    Remove a member from a team (admin only).
    """
    result = await db.execute(
        select(TeamMember).where(
            TeamMember.team_id == team_id,
            TeamMember.user_id == user_id,
        )
    )
    member = result.scalar_one_or_none()
    
    if member is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team membership not found",
        )
    
    await db.delete(member)
    
    return MessageResponse(message="Member removed from team successfully")
