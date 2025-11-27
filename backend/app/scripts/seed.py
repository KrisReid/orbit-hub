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
from app.models.project import ProjectType, ProjectTypeField, FieldType
from app.models.task import TaskType, TaskTypeField


async def seed_database():
    """Seed the database with initial data."""
    async with AsyncSessionLocal() as db:
        await seed_admin_user(db)
        await seed_default_project_types(db)
        await seed_default_teams_with_task_types(db)
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
        role=UserRole.admin,
        is_active=True,
    )
    db.add(admin)
    await db.flush()
    print("  ✓ Created admin user (admin@corepm.local / admin123)")


async def seed_default_project_types(db: AsyncSession):
    """Create default project types with fields."""
    project_types_data = [
        {
            "name": "Business",
            "slug": "business",
            "description": "Business initiatives and features",
            "workflow": ["Backlog", "Discovery", "In Progress", "Released", "Cancelled"],
            "color": "#6366f1",
            "fields": [
                {
                    "key": "prd_link",
                    "label": "PRD Link",
                    "field_type": FieldType.url,
                    "required": False,
                    "order": 0,
                },
                {
                    "key": "business_value",
                    "label": "Business Value",
                    "field_type": FieldType.select,
                    "options": ["High", "Med", "Low"],
                    "required": False,
                    "order": 1,
                },
            ],
        },
        {
            "name": "Technical",
            "slug": "technical",
            "description": "Technical debt and infrastructure projects",
            "workflow": ["Backlog", "Discovery", "In Progress", "Released", "Cancelled"],
            "color": "#f59e0b",
            "fields": [
                {
                    "key": "debt_level",
                    "label": "Debt Level",
                    "field_type": FieldType.select,
                    "options": ["High", "Medium", "Low"],
                    "required": False,
                    "order": 0,
                },
            ],
        },
        {
            "name": "Onboarding",
            "slug": "onboard",
            "description": "Customer onboarding projects",
            "workflow": ["Backlog", "In Progress", "Done"],
            "color": "#10b981",
            "fields": [
                {
                    "key": "contract",
                    "label": "Contract URL",
                    "field_type": FieldType.url,
                    "required": False,
                    "order": 0,
                },
            ],
        },
    ]
    
    for pt_data in project_types_data:
        result = await db.execute(select(ProjectType).where(ProjectType.slug == pt_data["slug"]))
        if result.scalar_one_or_none():
            print(f"  Project type '{pt_data['name']}' already exists, skipping...")
            continue
        
        fields_data = pt_data.pop("fields", [])
        project_type = ProjectType(**pt_data)
        db.add(project_type)
        await db.flush()
        
        # Create fields
        for field_data in fields_data:
            field = ProjectTypeField(project_type_id=project_type.id, **field_data)
            db.add(field)
        
        print(f"  ✓ Created project type: {pt_data['name']} with {len(fields_data)} fields")
    
    await db.flush()


async def seed_default_teams_with_task_types(db: AsyncSession):
    """Create default teams with their task types."""
    
    # Define task type templates
    feature_workflow = ["Backlog", "Discovery", "In Progress", "In QA", "Deployed"]
    bug_workflow = ["Triage", "Fixing", "Verified", "Deployed"]
    debt_workflow = ["Backlog", "Discovery", "In Progress", "In QA", "Deployed"]
    
    teams_data = [
        {
            "name": "Product Engineering",
            "slug": "product-engineering",
            "description": "Product engineering team",
            "task_types": [
                {
                    "name": "Feature",
                    "slug": "feature",
                    "description": "New feature development",
                    "workflow": feature_workflow,
                    "color": "#10b981",
                    "fields": [],
                },
                {
                    "name": "Bug",
                    "slug": "bug",
                    "description": "Bug fixes",
                    "workflow": bug_workflow,
                    "color": "#ef4444",
                    "fields": [],
                },
                {
                    "name": "Technical Debt",
                    "slug": "debt",
                    "description": "Technical debt items",
                    "workflow": debt_workflow,
                    "color": "#f59e0b",
                    "fields": [],
                },
            ],
        },
        {
            "name": "Forward Deployed",
            "slug": "forward-deployed",
            "description": "Forward deployed engineering team",
            "task_types": [
                {
                    "name": "Onboarding",
                    "slug": "onboard",
                    "description": "Customer onboarding tasks",
                    "workflow": ["Backlog", "In Progress", "Done"],
                    "color": "#8b5cf6",
                    "fields": [
                        {
                            "key": "contract",
                            "label": "Contract URL",
                            "field_type": FieldType.url,
                            "required": False,
                            "order": 0,
                        },
                    ],
                },
                {
                    "name": "Technical Debt",
                    "slug": "debt",
                    "description": "Technical debt items",
                    "workflow": debt_workflow,
                    "color": "#f59e0b",
                    "fields": [],
                },
                {
                    "name": "Feature",
                    "slug": "feature",
                    "description": "New feature development",
                    "workflow": feature_workflow,
                    "color": "#10b981",
                    "fields": [],
                },
                {
                    "name": "Bug",
                    "slug": "bug",
                    "description": "Bug fixes",
                    "workflow": bug_workflow,
                    "color": "#ef4444",
                    "fields": [],
                },
            ],
        },
        {
            "name": "SRE",
            "slug": "sre",
            "description": "Site reliability engineering team",
            "task_types": [
                {
                    "name": "Feature",
                    "slug": "feature",
                    "description": "New feature development",
                    "workflow": feature_workflow,
                    "color": "#10b981",
                    "fields": [],
                },
                {
                    "name": "Bug",
                    "slug": "bug",
                    "description": "Bug fixes",
                    "workflow": bug_workflow,
                    "color": "#ef4444",
                    "fields": [],
                },
                {
                    "name": "Technical Debt",
                    "slug": "debt",
                    "description": "Technical debt items",
                    "workflow": debt_workflow,
                    "color": "#f59e0b",
                    "fields": [],
                },
                {
                    "name": "Request",
                    "slug": "request",
                    "description": "SRE requests from other teams",
                    "workflow": ["Backlog", "In Progress", "In QA", "Deployed"],
                    "color": "#3b82f6",
                    "fields": [],
                },
            ],
        },
    ]
    
    for team_data in teams_data:
        # Check if team exists
        result = await db.execute(select(Team).where(Team.slug == team_data["slug"]))
        existing_team = result.scalar_one_or_none()
        
        task_types_data = team_data.pop("task_types", [])
        
        if existing_team:
            team = existing_team
            print(f"  Team '{team_data['name']}' already exists, checking task types...")
        else:
            team = Team(**team_data)
            db.add(team)
            await db.flush()
            print(f"  ✓ Created team: {team_data['name']}")
        
        # Create task types for this team
        for tt_data in task_types_data:
            result = await db.execute(
                select(TaskType).where(
                    TaskType.team_id == team.id,
                    TaskType.slug == tt_data["slug"],
                )
            )
            if result.scalar_one_or_none():
                continue
            
            fields_data = tt_data.pop("fields", [])
            task_type = TaskType(team_id=team.id, **tt_data)
            db.add(task_type)
            await db.flush()
            
            # Create fields for this task type
            for field_data in fields_data:
                field = TaskTypeField(task_type_id=task_type.id, **field_data)
                db.add(field)
            
            field_count = len(fields_data)
            if field_count > 0:
                print(f"    ✓ Created task type: {tt_data['name']} with {field_count} fields")
            else:
                print(f"    ✓ Created task type: {tt_data['name']}")
    
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