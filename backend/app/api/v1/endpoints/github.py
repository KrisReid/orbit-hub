"""
GitHub integration API endpoints.

Handles:
1. Webhook events from GitHub (automatic PR linking)
2. Manual GitHub link management
"""
import hashlib
import hmac
import re
from typing import Any

from fastapi import APIRouter, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DbSession
from app.core.config import settings
from app.models.github import GitHubLink, GitHubLinkType, GitHubPRStatus
from app.models.task import Task
from app.schemas.base import MessageResponse
from app.schemas.github import GitHubLinkCreate, GitHubLinkResponse

router = APIRouter(prefix="/github", tags=["GitHub"])


# Regex pattern to find task IDs in PR titles/branch names
# Matches patterns like: CORE-123, CORE-1, etc.
TASK_ID_PATTERN = re.compile(
    rf"({re.escape(settings.TASK_ID_PREFIX)}-\d+)",
    re.IGNORECASE
)


def verify_github_signature(payload: bytes, signature: str, secret: str) -> bool:
    """Verify GitHub webhook signature."""
    if not signature or not secret:
        return False
    
    expected = "sha256=" + hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(expected, signature)


def extract_task_ids(text: str) -> list[str]:
    """Extract task IDs from text (PR title, branch name, etc.)."""
    matches = TASK_ID_PATTERN.findall(text)
    return [m.upper() for m in matches]


def map_pr_status(state: str, merged: bool) -> GitHubPRStatus:
    """Map GitHub PR state to our status enum."""
    if merged:
        return GitHubPRStatus.merged
    if state == "open":
        return GitHubPRStatus.open
    return GitHubPRStatus.closed


@router.post("/webhook")
async def github_webhook(
    request: Request,
    db: DbSession,
    x_github_event: str = Header(..., alias="X-GitHub-Event"),
    x_hub_signature_256: str = Header(None, alias="X-Hub-Signature-256"),
) -> dict[str, Any]:
    """
    Handle GitHub webhook events.
    
    Currently handles:
    - pull_request: Links PRs to tasks based on task ID in title/branch
    
    GitHub Setup:
    1. Create a webhook at: https://github.com/{owner}/{repo}/settings/hooks
    2. Payload URL: https://your-domain/api/v1/github/webhook
    3. Content type: application/json
    4. Secret: (match GITHUB_WEBHOOK_SECRET env var)
    5. Events: Pull requests
    """
    payload = await request.body()
    
    # Verify signature if secret is configured
    if settings.GITHUB_WEBHOOK_SECRET:
        if not verify_github_signature(
            payload, 
            x_hub_signature_256 or "", 
            settings.GITHUB_WEBHOOK_SECRET
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid signature",
            )
    
    # Parse payload
    data = await request.json()
    
    # Handle pull request events
    if x_github_event == "pull_request":
        return await handle_pull_request_event(db, data)
    
    # Acknowledge other events
    return {"message": f"Event '{x_github_event}' acknowledged"}


async def handle_pull_request_event(
    db: DbSession,
    data: dict[str, Any],
) -> dict[str, Any]:
    """Handle pull_request webhook events."""
    action = data.get("action")
    pr = data.get("pull_request", {})
    repo = data.get("repository", {})
    
    # Only process relevant actions
    if action not in ["opened", "edited", "closed", "reopened", "synchronize"]:
        return {"message": f"Action '{action}' ignored"}
    
    pr_number = pr.get("number")
    pr_title = pr.get("title", "")
    pr_state = pr.get("state", "open")
    pr_merged = pr.get("merged", False)
    pr_url = pr.get("html_url", "")
    branch_name = pr.get("head", {}).get("ref", "")
    
    repo_owner = repo.get("owner", {}).get("login", "")
    repo_name = repo.get("name", "")
    
    # Extract task IDs from PR title and branch name
    task_ids = set()
    task_ids.update(extract_task_ids(pr_title))
    task_ids.update(extract_task_ids(branch_name))
    
    if not task_ids:
        return {"message": "No task IDs found in PR title or branch name"}
    
    # Find and link tasks
    linked_tasks = []
    for task_display_id in task_ids:
        # Find task by display ID
        result = await db.execute(
            select(Task).where(Task.display_id == task_display_id)
        )
        task = result.scalar_one_or_none()
        
        if task is None:
            continue
        
        # Check if link already exists
        existing = await db.execute(
            select(GitHubLink).where(
                GitHubLink.task_id == task.id,
                GitHubLink.link_type == GitHubLinkType.pull_request,
                GitHubLink.repository_owner == repo_owner,
                GitHubLink.repository_name == repo_name,
                GitHubLink.pr_number == pr_number,
            )
        )
        link = existing.scalar_one_or_none()
        
        if link:
            # Update existing link
            link.pr_title = pr_title
            link.pr_status = map_pr_status(pr_state, pr_merged)
        else:
            # Create new link
            link = GitHubLink(
                task_id=task.id,
                link_type=GitHubLinkType.pull_request,
                repository_owner=repo_owner,
                repository_name=repo_name,
                pr_number=pr_number,
                pr_title=pr_title,
                pr_status=map_pr_status(pr_state, pr_merged),
                branch_name=branch_name,
                url=pr_url,
            )
            db.add(link)
        
        linked_tasks.append(task_display_id)
    
    await db.flush()
    
    return {
        "message": f"PR #{pr_number} processed",
        "linked_tasks": linked_tasks,
    }


# --- Manual GitHub Link Management ---

@router.get("/links/{task_id}", response_model=list[GitHubLinkResponse])
async def get_task_github_links(
    task_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> list[GitHubLinkResponse]:
    """
    Get all GitHub links for a task.
    """
    # Verify task exists
    task_result = await db.execute(select(Task).where(Task.id == task_id))
    if task_result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )
    
    result = await db.execute(
        select(GitHubLink)
        .where(GitHubLink.task_id == task_id)
        .order_by(GitHubLink.created_at.desc())
    )
    links = result.scalars().all()
    
    return [GitHubLinkResponse.model_validate(link) for link in links]


@router.post("/links/{task_id}", response_model=GitHubLinkResponse, status_code=status.HTTP_201_CREATED)
async def add_github_link(
    task_id: int,
    link_in: GitHubLinkCreate,
    db: DbSession,
    current_user: CurrentUser,
) -> GitHubLinkResponse:
    """
    Manually add a GitHub link to a task.
    """
    # Verify task exists
    task_result = await db.execute(select(Task).where(Task.id == task_id))
    if task_result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )
    
    link = GitHubLink(
        task_id=task_id,
        **link_in.model_dump(),
    )
    db.add(link)
    await db.flush()
    await db.refresh(link)
    
    return GitHubLinkResponse.model_validate(link)


@router.delete("/links/{task_id}/{link_id}", response_model=MessageResponse)
async def remove_github_link(
    task_id: int,
    link_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> MessageResponse:
    """
    Remove a GitHub link from a task.
    """
    result = await db.execute(
        select(GitHubLink).where(
            GitHubLink.id == link_id,
            GitHubLink.task_id == task_id,
        )
    )
    link = result.scalar_one_or_none()
    
    if link is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="GitHub link not found",
        )
    
    await db.delete(link)
    
    return MessageResponse(message="GitHub link removed")
