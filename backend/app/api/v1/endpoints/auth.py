"""
Authentication API endpoints.
"""
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.core.security import create_access_token, verify_password
from app.models.user import User
from app.schemas.user import LoginRequest, Token, UserResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=Token)
async def login(
    request: LoginRequest,
    db: DbSession,
) -> Token:
    """
    Authenticate user and return JWT token.
    """
    # Find user by email
    result = await db.execute(select(User).where(User.email == request.email))
    user = result.scalar_one_or_none()
    
    if user is None or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )
    
    # Create access token
    access_token = create_access_token(
        subject=user.id,
        additional_claims={"role": user.role.value},
    )
    
    return Token(access_token=access_token)


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: CurrentUser,
) -> UserResponse:
    """
    Get current authenticated user's information.
    """
    return UserResponse.model_validate(current_user)


@router.post("/logout")
async def logout() -> dict:
    """
    Logout endpoint (client-side token removal).
    
    Note: JWT tokens are stateless, so logout is handled client-side
    by removing the token. This endpoint exists for API completeness.
    """
    return {"message": "Successfully logged out"}
