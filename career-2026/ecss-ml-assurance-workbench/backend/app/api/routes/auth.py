"""Authentication endpoints."""

from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import (
    get_auth_service,
    get_current_user,
    require_admin,
)
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    RefreshTokenRequest,
    RegisterRequest,
    Token,
    UserCreate,
    UserRead,
    UserUpdate,
)
from app.services.auth import AuthService

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/login", response_model=Token)
def login(payload: LoginRequest, auth_service: Annotated[AuthService, Depends(get_auth_service)]) -> Token:
    """Authenticate user and return JWT tokens."""
    user = auth_service.authenticate_user(payload.username, payload.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is deactivated",
        )
    # Update last login
    user.last_login = datetime.now(UTC)
    auth_service.db.commit()
    return auth_service.create_tokens(user)


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, auth_service: Annotated[AuthService, Depends(get_auth_service)]) -> UserRead:
    """Register a new user."""
    try:
        user = auth_service.create_user(payload)
        return UserRead.model_validate(user)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        ) from e


@router.post("/refresh", response_model=Token)
def refresh_tokens(
    payload: RefreshTokenRequest,
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> Token:
    """Refresh access token using refresh token."""
    tokens = auth_service.refresh_tokens(payload.refresh_token)
    if tokens is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )
    return tokens


@router.get("/me", response_model=UserRead)
def get_current_user_info(
    current_user: Annotated[User, Depends(get_current_user)],
) -> UserRead:
    """Get current authenticated user info."""
    return UserRead.model_validate(current_user)


@router.patch("/me", response_model=UserRead)
def update_current_user(
    payload: UserUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> UserRead:
    """Update current user profile."""
    user = auth_service.update_user(current_user, payload)
    return UserRead.model_validate(user)


@router.post("/me/password")
def change_password(
    current_password: str,
    new_password: str,
    current_user: Annotated[User, Depends(get_current_user)],
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> dict:
    """Change current user password."""
    success = auth_service.change_password(current_user, current_password, new_password)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password",
        )
    return {"message": "Password changed successfully"}


# Admin endpoints


@router.get("/users", response_model=list[UserRead])
def list_users(
    current_user: Annotated[User, Depends(require_admin)],
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
    skip: int = 0,
    limit: int = 100,
) -> list[UserRead]:
    """List all users (admin only)."""
    users = auth_service.list_users(skip=skip, limit=limit)
    return [UserRead.model_validate(u) for u in users]


@router.get("/users/{user_id}", response_model=UserRead)
def get_user(
    user_id: str,
    current_user: Annotated[User, Depends(require_admin)],
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> UserRead:
    """Get user by ID (admin only)."""
    user = auth_service.get_user_by_id(user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return UserRead.model_validate(user)


@router.post("/users", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    current_user: Annotated[User, Depends(require_admin)],
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> UserRead:
    """Create a new user (admin only)."""
    try:
        user = auth_service.create_user(payload)
        return UserRead.model_validate(user)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        ) from e


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: str,
    current_user: Annotated[User, Depends(require_admin)],
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> None:
    """Delete a user (admin only)."""
    user = auth_service.get_user_by_id(user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete yourself",
        )
    auth_service.delete_user(user)
