"""Authentication schemas for request/response validation."""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    """Base user schema."""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=100)
    full_name: str = Field(default="", max_length=200)


class UserCreate(UserBase):
    """Schema for creating a new user."""
    password: str = Field(..., min_length=8, max_length=128)
    role: str = Field(default="viewer", pattern="^(admin|editor|viewer)$")
    is_superuser: bool = Field(default=False)


class UserUpdate(BaseModel):
    """Schema for updating user fields."""
    email: EmailStr | None = None
    full_name: str | None = Field(None, max_length=200)
    role: str | None = Field(None, pattern="^(admin|editor|viewer)$")
    is_active: bool | None = None


class UserRead(UserBase):
    """Schema for reading user data."""
    id: str
    role: str
    is_active: bool
    is_superuser: bool
    created_at: datetime | None = None
    updated_at: datetime | None = None
    last_login: datetime | None = None

    model_config = {"from_attributes": True}


class Token(BaseModel):
    """JWT token response."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class TokenPayload(BaseModel):
    """JWT token payload."""
    sub: str  # user_id
    exp: int  # expiration timestamp
    iat: int  # issued at timestamp
    type: str  # "access" or "refresh"
    role: str
    is_superuser: bool = False


class LoginRequest(BaseModel):
    """Login request schema."""
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)


class RefreshTokenRequest(BaseModel):
    """Refresh token request schema."""
    refresh_token: str


class PasswordChange(BaseModel):
    """Password change schema."""
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=128)


class RegisterRequest(UserCreate):
    """Registration request schema (same as UserCreate)."""
    pass
