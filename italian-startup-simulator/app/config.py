from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env", override=False)


@dataclass(frozen=True)
class Settings:
    app_name: str
    app_env: str
    database_path: Path
    openrouter_api_key: str | None
    openrouter_profile: str
    openrouter_model: str | None
    openrouter_base_url: str
    openrouter_site_url: str
    openrouter_app_title: str
    openrouter_temperature: float
    openrouter_max_tokens: int
    default_city: str
    default_region: str


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    database_value = os.getenv("DATABASE_PATH", "./data/italian_startup_simulator.db")
    database_path = Path(database_value)
    if not database_path.is_absolute():
        database_path = (BASE_DIR / database_path).resolve()

    return Settings(
        app_name=os.getenv("APP_NAME", "Italian Startup Simulator"),
        app_env=os.getenv("APP_ENV", "development"),
        database_path=database_path,
        openrouter_api_key=os.getenv("OPENROUTER_API_KEY") or None,
        openrouter_profile=os.getenv("OPENROUTER_PROFILE", "free"),
        openrouter_model=os.getenv("OPENROUTER_MODEL") or None,
        openrouter_base_url=os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
        openrouter_site_url=os.getenv("OPENROUTER_SITE_URL", "http://localhost:8010"),
        openrouter_app_title=os.getenv("OPENROUTER_APP_TITLE", "Italian Startup Simulator"),
        openrouter_temperature=float(os.getenv("OPENROUTER_TEMPERATURE", "0.4")),
        openrouter_max_tokens=int(os.getenv("OPENROUTER_MAX_TOKENS", "350")),
        default_city=os.getenv("DEFAULT_CITY", "Milan"),
        default_region=os.getenv("DEFAULT_REGION", "Lombardy"),
    )
