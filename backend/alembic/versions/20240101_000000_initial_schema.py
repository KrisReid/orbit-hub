"""Initial schema

Revision ID: 001
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enum types
    op.execute("CREATE TYPE userrole AS ENUM ('admin', 'user')")
    op.execute("CREATE TYPE themestatus AS ENUM ('active', 'completed', 'archived')")
    op.execute("CREATE TYPE fieldtype AS ENUM ('text', 'textarea', 'number', 'select', 'multiselect', 'url', 'date', 'checkbox')")
    op.execute("CREATE TYPE releasestatus AS ENUM ('planned', 'in_progress', 'released', 'cancelled')")
    op.execute("CREATE TYPE githublinktype AS ENUM ('pull_request', 'branch', 'commit')")
    op.execute("CREATE TYPE githubprstatus AS ENUM ('open', 'closed', 'merged', 'draft')")

    # Users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('full_name', sa.String(255), nullable=False),
        sa.Column('role', postgresql.ENUM('admin', 'user', name='userrole', create_type=False), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_users_id', 'users', ['id'])
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

    # Teams table
    op.create_table(
        'teams',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('slug', sa.String(100), nullable=False),
        sa.Column('description', sa.String(1000), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_teams_id', 'teams', ['id'])
    op.create_index('ix_teams_slug', 'teams', ['slug'], unique=True)

    # Team members table
    op.create_table(
        'team_members',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('team_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('joined_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['team_id'], ['teams.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('team_id', 'user_id', name='uq_team_member')
    )
    op.create_index('ix_team_members_id', 'team_members', ['id'])
    op.create_index('ix_team_members_team_id', 'team_members', ['team_id'])
    op.create_index('ix_team_members_user_id', 'team_members', ['user_id'])

    # Themes table
    op.create_table(
        'themes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', postgresql.ENUM('active', 'completed', 'archived', name='themestatus', create_type=False), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_themes_id', 'themes', ['id'])

    # Project types table
    op.create_table(
        'project_types',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('slug', sa.String(100), nullable=False),
        sa.Column('description', sa.String(500), nullable=True),
        sa.Column('workflow', postgresql.ARRAY(sa.String()), nullable=False),
        sa.Column('color', sa.String(20), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_project_types_id', 'project_types', ['id'])
    op.create_index('ix_project_types_slug', 'project_types', ['slug'], unique=True)

    # Project type fields table
    op.create_table(
        'project_type_fields',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('project_type_id', sa.Integer(), nullable=False),
        sa.Column('key', sa.String(100), nullable=False),
        sa.Column('label', sa.String(255), nullable=False),
        sa.Column('field_type', postgresql.ENUM('text', 'textarea', 'number', 'select', 'multiselect', 'url', 'date', 'checkbox', name='fieldtype', create_type=False), nullable=False),
        sa.Column('options', postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column('required', sa.Boolean(), nullable=False, default=False),
        sa.Column('order', sa.Integer(), nullable=False, default=0),
        sa.ForeignKeyConstraint(['project_type_id'], ['project_types.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_project_type_fields_id', 'project_type_fields', ['id'])
    op.create_index('ix_project_type_fields_project_type_id', 'project_type_fields', ['project_type_id'])

    # Projects table
    op.create_table(
        'projects',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('theme_id', sa.Integer(), nullable=True),
        sa.Column('project_type_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(100), nullable=False),
        sa.Column('custom_data', postgresql.JSONB(), nullable=False, default={}),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['theme_id'], ['themes.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['project_type_id'], ['project_types.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_projects_id', 'projects', ['id'])
    op.create_index('ix_projects_theme_id', 'projects', ['theme_id'])
    op.create_index('ix_projects_project_type_id', 'projects', ['project_type_id'])
    op.create_index('ix_projects_status', 'projects', ['status'])

    # Project dependencies table
    op.create_table(
        'project_dependencies',
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('depends_on_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['depends_on_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('project_id', 'depends_on_id')
    )

    # Task types table
    op.create_table(
        'task_types',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('team_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('slug', sa.String(100), nullable=False),
        sa.Column('description', sa.String(500), nullable=True),
        sa.Column('workflow', postgresql.ARRAY(sa.String()), nullable=False),
        sa.Column('color', sa.String(20), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['team_id'], ['teams.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_task_types_id', 'task_types', ['id'])
    op.create_index('ix_task_types_team_id', 'task_types', ['team_id'])

    # Task type fields table
    op.create_table(
        'task_type_fields',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('task_type_id', sa.Integer(), nullable=False),
        sa.Column('key', sa.String(100), nullable=False),
        sa.Column('label', sa.String(255), nullable=False),
        sa.Column('field_type', postgresql.ENUM('text', 'textarea', 'number', 'select', 'multiselect', 'url', 'date', 'checkbox', name='fieldtype', create_type=False), nullable=False),
        sa.Column('options', postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column('required', sa.Boolean(), nullable=False, default=False),
        sa.Column('order', sa.Integer(), nullable=False, default=0),
        sa.ForeignKeyConstraint(['task_type_id'], ['task_types.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_task_type_fields_id', 'task_type_fields', ['id'])
    op.create_index('ix_task_type_fields_task_type_id', 'task_type_fields', ['task_type_id'])

    # Releases table
    op.create_table(
        'releases',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('version', sa.String(50), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('target_date', sa.Date(), nullable=True),
        sa.Column('release_date', sa.Date(), nullable=True),
        sa.Column('status', postgresql.ENUM('planned', 'in_progress', 'released', 'cancelled', name='releasestatus', create_type=False), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_releases_id', 'releases', ['id'])
    op.create_index('ix_releases_version', 'releases', ['version'], unique=True)

    # Tasks table
    op.create_table(
        'tasks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('display_id', sa.String(50), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=True),
        sa.Column('team_id', sa.Integer(), nullable=False),
        sa.Column('task_type_id', sa.Integer(), nullable=False),
        sa.Column('release_id', sa.Integer(), nullable=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(100), nullable=False),
        sa.Column('estimation', sa.Float(), nullable=True),
        sa.Column('custom_data', postgresql.JSONB(), nullable=False, default={}),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['team_id'], ['teams.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['task_type_id'], ['task_types.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['release_id'], ['releases.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_tasks_id', 'tasks', ['id'])
    op.create_index('ix_tasks_display_id', 'tasks', ['display_id'], unique=True)
    op.create_index('ix_tasks_project_id', 'tasks', ['project_id'])
    op.create_index('ix_tasks_team_id', 'tasks', ['team_id'])
    op.create_index('ix_tasks_task_type_id', 'tasks', ['task_type_id'])
    op.create_index('ix_tasks_release_id', 'tasks', ['release_id'])
    op.create_index('ix_tasks_status', 'tasks', ['status'])

    # Task dependencies table
    op.create_table(
        'task_dependencies',
        sa.Column('task_id', sa.Integer(), nullable=False),
        sa.Column('depends_on_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['depends_on_id'], ['tasks.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('task_id', 'depends_on_id')
    )

    # GitHub links table
    op.create_table(
        'github_links',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('task_id', sa.Integer(), nullable=False),
        sa.Column('link_type', postgresql.ENUM('pull_request', 'branch', 'commit', name='githublinktype', create_type=False), nullable=False),
        sa.Column('repository_owner', sa.String(255), nullable=False),
        sa.Column('repository_name', sa.String(255), nullable=False),
        sa.Column('pr_number', sa.Integer(), nullable=True),
        sa.Column('pr_title', sa.String(500), nullable=True),
        sa.Column('pr_status', postgresql.ENUM('open', 'closed', 'merged', 'draft', name='githubprstatus', create_type=False), nullable=True),
        sa.Column('branch_name', sa.String(255), nullable=True),
        sa.Column('commit_sha', sa.String(40), nullable=True),
        sa.Column('url', sa.String(500), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_github_links_id', 'github_links', ['id'])
    op.create_index('ix_github_links_task_id', 'github_links', ['task_id'])


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table('github_links')
    op.drop_table('task_dependencies')
    op.drop_table('tasks')
    op.drop_table('releases')
    op.drop_table('task_type_fields')
    op.drop_table('task_types')
    op.drop_table('project_dependencies')
    op.drop_table('projects')
    op.drop_table('project_type_fields')
    op.drop_table('project_types')
    op.drop_table('themes')
    op.drop_table('team_members')
    op.drop_table('teams')
    op.drop_table('users')
    
    # Drop enum types
    op.execute("DROP TYPE githubprstatus")
    op.execute("DROP TYPE githublinktype")
    op.execute("DROP TYPE releasestatus")
    op.execute("DROP TYPE fieldtype")
    op.execute("DROP TYPE themestatus")
    op.execute("DROP TYPE userrole")
