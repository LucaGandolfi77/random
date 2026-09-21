"""Authentication service - JWT tokens, password hashing, user management."""

from datetime import UTC, datetime, timedelta
from uuid import uuid4

from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.models.user import User
from app.schemas.auth import (
    Token,
    TokenPayload,
    UserCreate,
    UserUpdate,
)

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthService:
    """Service for authentication operations."""

    def __init__(self, db: Session, settings: Settings | None = None) -> None:
        self.db = db
        self.settings = settings or get_settings()

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a plain password against a hash."""
        return pwd_context.verify(plain_password, hashed_password)

    def get_password_hash(self, password: str) -> str:
        """Hash a plain password."""
        return pwd_context.hash(password)

    def get_user_by_id(self, user_id: str) -> User | None:
        """Get user by ID."""
        return self.db.query(User).filter(User.id == user_id).first()

    def get_user_by_email(self, email: str) -> User | None:
        """Get user by email."""
        return self.db.query(User).filter(User.email == email).first()

    def get_user_by_username(self, username: str) -> User | None:
        """Get user by username."""
        return self.db.query(User).filter(User.username == username).first()

    def authenticate_user(self, username: str, password: str) -> User | None:
        """Authenticate user by username/email and password."""
        # Try username first, then email
        user = self.get_user_by_username(username)
        if user is None:
            user = self.get_user_by_email(username)
        if user is None:
            return None
        if not self.verify_password(password, user.hashed_password):
            return None
        return user

    def create_access_token(self, user: User) -> str:
        """Create JWT access token."""
        now = datetime.now(UTC)
        expire = now + timedelta(minutes=self.settings.jwt_access_token_expire_minutes)
        payload = {
            "sub": user.id,
            "exp": expire,
            "iat": now,
            "type": "access",
            "role": user.role,
            "is_superuser": user.is_superuser,
        }
        return jwt.encode(payload, self.settings.jwt_secret_key, algorithm=self.settings.jwt_algorithm)

    def create_refresh_token(self, user: User) -> str:
        """Create JWT refresh token."""
        now = datetime.now(UTC)
        expire = now + timedelta(days=self.settings.jwt_refresh_token_expire_days)
        payload = {
            "sub": user.id,
            "exp": expire,
            "iat": now,
            "type": "refresh",
            "role": user.role,
            "is_superuser": user.is_superuser,
        }
        return jwt.encode(payload, self.settings.jwt_secret_key, algorithm=self.settings.jwt_algorithm)

    def create_tokens(self, user: User) -> Token:
        """Create both access and refresh tokens."""
        access_token = self.create_access_token(user)
        refresh_token = self.create_refresh_token(user)
        expires_in = self.settings.jwt_access_token_expire_minutes * 60
        return Token(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=expires_in,
        )

    def verify_token(self, token: str, token_type: str = "access") -> TokenPayload | None:
        """Verify and decode a JWT token."""
        try:
            payload = jwt.decode(
                token,
                self.settings.jwt_secret_key,
                algorithms=[self.settings.jwt_algorithm],
            )
            token_data = TokenPayload(**payload)
            if token_data.type != token_type:
                return None
            return token_data
        except JWTError:
            return None

    def refresh_tokens(self, refresh_token: str) -> Token | None:
        """Refresh tokens using a valid refresh token."""
        token_data = self.verify_token(refresh_token, token_type="refresh")
        if token_data is None:
            return None
        user = self.get_user_by_id(token_data.sub)
        if user is None or not user.is_active:
            return None
        return self.create_tokens(user)

    def create_user(self, payload: UserCreate) -> User:
        """Create a new user."""
        # Check if username or email already exists
        if self.get_user_by_username(payload.username):
            raise ValueError("Username already exists")
        if self.get_user_by_email(payload.email):
            raise ValueError("Email already exists")

        user = User(
            id=str(uuid4()),
            email=payload.email,
            username=payload.username,
            hashed_password=self.get_password_hash(payload.password),
            full_name=payload.full_name,
            role=payload.role,
            is_active=True,
            is_superuser=payload.is_superuser,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def update_user(self, user: User, payload: UserUpdate) -> User:
        """Update user fields."""
        changes = payload.model_dump(exclude_unset=True, exclude_none=True)
        if not changes:
            return user
        # Merge user into current session if needed
        db_user = self.db.merge(user)
        for field, value in changes.items():
            setattr(db_user, field, value)
        self.db.commit()
        self.db.refresh(db_user)
        return db_user

    def change_password(self, user: User, current_password: str, new_password: str) -> bool:
        """Change user password."""
        if not self.verify_password(current_password, user.hashed_password):
            return False
        user.hashed_password = self.get_password_hash(new_password)
        self.db.commit()
        return True

    def deactivate_user(self, user: User) -> User:
        """Deactivate a user."""
        user.is_active = False
        self.db.commit()
        self.db.refresh(user)
        return user

    def list_users(self, skip: int = 0, limit: int = 100) -> list[User]:
        """List all users."""
        return self.db.query(User).offset(skip).limit(limit).all()

    def delete_user(self, user: User) -> None:
        """Delete a user."""
        self.db.delete(user)
        self.db.commit()
