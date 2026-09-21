"""FastAPI dependency providers."""

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.database.session import get_db
from app.models.user import User
from app.services.auth import AuthService

DbSession = Annotated[Session, Depends(get_db)]
AppSettings = Annotated[Settings, Depends(get_settings)]

# HTTP Bearer scheme for JWT tokens
security = HTTPBearer(auto_error=False)


def get_auth_service(db: DbSession, settings: AppSettings) -> AuthService:
    """Get authentication service."""
    return AuthService(db, settings)


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> User:
    """Get current user from JWT token."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token_data = auth_service.verify_token(credentials.credentials, token_type="access")
    if token_data is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = auth_service.get_user_by_id(token_data.sub)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is deactivated",
        )
    return user


def _require_roles(current_user: User, *roles: str) -> User:
    """Check if user has one of the required roles."""
    if current_user.role not in roles and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{current_user.role}' not in required roles: {', '.join(roles)}",
        )
    return current_user


def require_admin(current_user: Annotated[User, Depends(get_current_user)]) -> User:
    """Require admin role."""
    return _require_roles(current_user, "admin")


def require_editor(current_user: Annotated[User, Depends(get_current_user)]) -> User:
    """Require editor or admin role."""
    return _require_roles(current_user, "admin", "editor")


def require_viewer(current_user: Annotated[User, Depends(get_current_user)]) -> User:
    """Require viewer, editor, or admin role."""
    return _require_roles(current_user, "admin", "editor", "viewer")


# Type aliases for common role requirements
RequireAdmin = Annotated[User, Depends(require_admin)]
RequireEditor = Annotated[User, Depends(require_editor)]
RequireViewer = Annotated[User, Depends(require_viewer)]
