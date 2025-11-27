"""
GitHub integration Pydantic schemas.
"""
from pydantic import Field, HttpUrl

from app.models.github import GitHubLinkType, GitHubPRStatus
from app.schemas.base import CoreModel, TimestampMixin


class GitHubLinkBase(CoreModel):
    """Base GitHub link schema."""
    
    link_type: GitHubLinkType
    repository_owner: str = Field(..., min_length=1, max_length=255)
    repository_name: str = Field(..., min_length=1, max_length=255)
    url: str = Field(..., max_length=500)


class GitHubLinkCreate(GitHubLinkBase):
    """Schema for creating a GitHub link."""
    
    pr_number: int | None = None
    pr_title: str | None = Field(None, max_length=500)
    branch_name: str | None = Field(None, max_length=255)
    commit_sha: str | None = Field(None, max_length=40)


class GitHubLinkResponse(GitHubLinkBase, TimestampMixin):
    """GitHub link response schema."""
    
    id: int
    task_id: int
    pr_number: int | None
    pr_title: str | None
    pr_status: GitHubPRStatus | None
    branch_name: str | None
    commit_sha: str | None


# --- GitHub Webhook Schemas ---

class GitHubPullRequestEvent(CoreModel):
    """GitHub pull request webhook event."""
    
    action: str
    number: int
    pull_request: "GitHubPullRequest"
    repository: "GitHubRepository"


class GitHubPullRequest(CoreModel):
    """GitHub pull request data from webhook."""
    
    id: int
    number: int
    title: str
    state: str
    merged: bool
    html_url: str
    head: "GitHubBranch"
    base: "GitHubBranch"


class GitHubBranch(CoreModel):
    """GitHub branch data from webhook."""
    
    ref: str
    sha: str


class GitHubRepository(CoreModel):
    """GitHub repository data from webhook."""
    
    id: int
    name: str
    full_name: str
    owner: "GitHubOwner"


class GitHubOwner(CoreModel):
    """GitHub owner data from webhook."""
    
    login: str


# Rebuild models for forward references
GitHubPullRequestEvent.model_rebuild()
GitHubPullRequest.model_rebuild()
GitHubRepository.model_rebuild()
