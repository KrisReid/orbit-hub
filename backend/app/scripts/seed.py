"""
Database seed script for initial data.

Run with: python -m app.scripts.seed
"""
import asyncio

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.models.team import Team, TeamMember
from app.models.theme import Theme, ThemeStatus
from app.models.project import ProjectType
from app.models.task import TaskType


async def seed_database():
    """Seed the database with initial data."""
    async with AsyncSessionLocal() as db:
        await seed_admin_user(db)
        await seed_default_teams(db)
        await seed_default_project_types(db)
        await seed_default_task_types(db)
        await seed_sample_theme(db)
        await db.commit()
        print("✅ Database seeded successfully!")


async def seed_admin_user(db: AsyncSession):
    """Create default admin user if not exists."""
    result = await db.execute(select(User).where(User.email == "admin@corepm.local"))
    if result.scalar_one_or_none():
        print("  Admin user already exists, skipping...")
        return
    
    admin = User(
        email="admin@corepm.local",
        full_name="Admin User",
        hashed_password=hash_password("admin123"),
        # Updated to lowercase enum member
        role=UserRole.admin,
        is_active=True,
    )
    db.add(admin)
    await db.flush()
    print("  ✓ Created admin user (admin@corepm.local / admin123)")


async def seed_default_teams(db: AsyncSession):
    """Create default teams if not exists."""
    teams_data = [
        {"name": "Platform", "slug": "platform", "description": "Platform engineering team"},
        {"name": "Frontend", "slug": "frontend", "description": "Frontend development team"},
        {"name": "Backend", "slug": "backend", "description": "Backend development team"},
    ]
    
    for team_data in teams_data:
        result = await db.execute(select(Team).where(Team.slug == team_data["slug"]))
        if result.scalar_one_or_none():
            continue
        
        team = Team(**team_data)
        db.add(team)
        print(f"  ✓ Created team: {team_data['name']}")
    
    await db.flush()


async def seed_default_project_types(db: AsyncSession):
    """Create default project types if not exists."""
    project_types_data = [
        {
            "name": "Initiative",
            "slug": "initiative",
            "description": "Large cross-team initiatives",
            "workflow": ["Discovery", "Planning", "In Progress", "Review", "Done"],
            "color": "#6366f1",
        },
        {
            "name": "Epic",
            "slug": "epic",
            "description": "Medium-sized feature work",
            "workflow": ["Backlog", "Ready", "In Progress", "Review", "Done"],
            "color": "#8b5cf6",
        },
        {
            "name": "Tech Debt",
            "slug": "tech-debt",
            "description": "Technical debt reduction projects",
            "workflow": ["Identified", "Prioritized", "In Progress", "Resolved"],
            "color": "#f59e0b",
        },
    ]
    
    for pt_data in project_types_data:
        result = await db.execute(select(ProjectType).where(ProjectType.slug == pt_data["slug"]))
        if result.scalar_one_or_none():
            continue
        
        project_type = ProjectType(**pt_data)
        db.add(project_type)
        print(f"  ✓ Created project type: {pt_data['name']}")
    
    await db.flush()


async def seed_default_task_types(db: AsyncSession):
    """Create default task types for each team."""
    # Get all teams
    result = await db.execute(select(Team))
    teams = result.scalars().all()
    
    task_types_data = [
        {
            "name": "Feature",
            "slug": "feature",
            "description": "New feature development",
            "workflow": ["Backlog", "Ready", "In Progress", "In Review", "Done"],
            "color": "#10b981",
        },
        {
            "name": "Bug",
            "slug": "bug",
            "description": "Bug fixes",
            "workflow": ["Reported", "Triaged", "In Progress", "In Review", "Fixed"],
            "color": "#ef4444",
        },
        {
            "name": "Tech Debt",
            "slug": "debt",
            "description": "Technical debt items",
            "workflow": ["Backlog", "In Progress", "Done"],
            "color": "#f59e0b",
        },
        {
            "name": "Discovery",
            "slug": "discovery",
            "description": "Research and discovery work",
            "workflow": ["To Do", "In Progress", "Done"],
            "color": "#3b82f6",
        },
    ]
    
    for team in teams:
        for tt_data in task_types_data:
            result = await db.execute(
                select(TaskType).where(
                    TaskType.team_id == team.id,
                    TaskType.slug == tt_data["slug"],
                )
            )
            if result.scalar_one_or_none():
                continue
            
            task_type = TaskType(team_id=team.id, **tt_data)
            db.add(task_type)
        
        print(f"  ✓ Created task types for team: {team.name}")
    
    await db.flush()


async def seed_sample_theme(db: AsyncSession):
    """Create a sample theme."""
    result = await db.execute(select(Theme).where(Theme.title == "Q1 2024 Objectives"))
    if result.scalar_one_or_none():
        print("  Sample theme already exists, skipping...")
        return
    
    theme = Theme(
        title="Q1 2024 Objectives",
        description="Strategic objectives for Q1 2024",
        status=ThemeStatus.active,
    )
    db.add(theme)
    await db.flush()
    print("  ✓ Created sample theme: Q1 2024 Objectives")


if __name__ == "__main__":
    print("🌱 Seeding database...")
    asyncio.run(seed_database())
