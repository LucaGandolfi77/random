"""Central configuration loaded from environment variables.

All runtime settings live here so components never read os.environ directly.
"""

from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_STORAGE_DIR = PROJECT_ROOT / "storage"
DEFAULT_DATABASE_URL = f"sqlite:///{PROJECT_ROOT / 'storage' / 'workbench.db'}"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT / ".env",
        env_prefix="",
        extra="ignore",
    )

    app_name: str = "ECSS ML Assurance Workbench"
    app_version: str = "0.1.0"
    environment: str = Field(default="development")
    log_level: str = Field(default="INFO")

    # Storage / database
    storage_dir: Path = Field(default=DEFAULT_STORAGE_DIR)
    database_url: str = Field(default=DEFAULT_DATABASE_URL)
    database_echo: bool = Field(default=False)

    # Upload constraints
    max_upload_size_mb: int = Field(default=50, ge=1, le=1024)
    allowed_upload_extensions: str = Field(default=".csv")

    # CORS: comma separated list of allowed origins (empty = allow all in dev)
    cors_origins: str = Field(default="*")

    # Analysis defaults (server side safety caps; per-project config may be stricter)
    default_missing_threshold_pct: float = Field(default=10.0, ge=0, le=100)
    iqr_multiplier: float = Field(default=1.5, ge=0.1, le=10)

    @field_validator("storage_dir", mode="before")
    @classmethod
    def _absolute_storage(cls, value: object) -> object:
        path = Path(str(value))
        if not path.is_absolute():
            return PROJECT_ROOT / path
        return path

    @property
    def allowed_upload_extensions_set(self) -> set[str]:
        return {ext.strip().lower().lstrip(".") for ext in self.allowed_upload_extensions.split(",") if ext.strip()}

    @property
    def cors_origins_list(self) -> list[str]:
        origins = [o.strip() for o in self.cors_origins.split(",") if o.strip()]
        return origins or ["*"]

    @property
    def datasets_dir(self) -> Path:
        return self.storage_dir / "datasets"

    @property
    def reports_dir(self) -> Path:
        return self.storage_dir / "reports"

    def ensure_directories(self) -> None:
        self.datasets_dir.mkdir(parents=True, exist_ok=True)
        self.reports_dir.mkdir(parents=True, exist_ok=True)


@lru_cache
def get_settings() -> Settings:
    return Settings()
