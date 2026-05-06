from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent
PROJECT_ENV_FILE = PROJECT_ROOT / ".env"
DEFAULT_PRIMARY_MODEL = "openrouter/free"
DEFAULT_FALLBACK_MODELS = (
    "inclusionai/ling-2.6-1t-20260423:free",
    "liquid/lfm-2.5-1.2b-instruct-20260120:free",
)
DEFAULT_LOG_LEVEL = "INFO"
DEFAULT_LOG_DIR = "logs"
DEFAULT_LOG_FILE = "graveyard-chorus.log"
DEFAULT_SAVE_DIR = "runs"
SEASONS = ("spring", "summer", "autumn", "winter")


def _parse_bool(value: str | None, *, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _parse_models(value: str | None) -> tuple[str, ...]:
    if not value:
        return DEFAULT_FALLBACK_MODELS
    models = [item.strip() for item in value.split(",") if item.strip()]
    return tuple(models) if models else DEFAULT_FALLBACK_MODELS


@dataclass(slots=True)
class RuntimeSettings:
    openrouter_api_key: str | None
    primary_model: str = DEFAULT_PRIMARY_MODEL
    fallback_models: tuple[str, ...] = DEFAULT_FALLBACK_MODELS
    log_level: str = DEFAULT_LOG_LEVEL
    log_openrouter_traffic: bool = True
    log_dir: Path = Path(DEFAULT_LOG_DIR)
    log_file_name: str = DEFAULT_LOG_FILE
    timeout_seconds: float = 45.0
    max_retries: int = 2
    offline_mode: bool = False
    save_dir: Path = Path(DEFAULT_SAVE_DIR)
    app_name: str = "graveyard-chorus"
    app_url: str | None = None

    @property
    def available_models(self) -> tuple[str, ...]:
        seen: list[str] = []
        for model in (self.primary_model, *self.fallback_models):
            if model not in seen:
                seen.append(model)
        return tuple(seen)


def load_settings(env_path: str | os.PathLike[str] | None = None) -> RuntimeSettings:
    if env_path is not None:
        load_dotenv(env_path)
    elif PROJECT_ENV_FILE.exists():
        load_dotenv(PROJECT_ENV_FILE)
    else:
        load_dotenv()

    return RuntimeSettings(
        openrouter_api_key=os.getenv("OPENROUTER_API_KEY") or None,
        primary_model=os.getenv("GRAVEYARD_PRIMARY_MODEL", DEFAULT_PRIMARY_MODEL),
        fallback_models=_parse_models(os.getenv("GRAVEYARD_FALLBACK_MODELS")),
        log_level=os.getenv("GRAVEYARD_LOG_LEVEL", DEFAULT_LOG_LEVEL),
        log_openrouter_traffic=_parse_bool(os.getenv("GRAVEYARD_LOG_OPENROUTER_TRAFFIC"), default=True),
        log_dir=Path(os.getenv("GRAVEYARD_LOG_DIR", DEFAULT_LOG_DIR)),
        log_file_name=os.getenv("GRAVEYARD_LOG_FILE", DEFAULT_LOG_FILE),
        timeout_seconds=float(os.getenv("GRAVEYARD_TIMEOUT_SECONDS", "45")),
        max_retries=int(os.getenv("GRAVEYARD_MAX_RETRIES", "2")),
        offline_mode=_parse_bool(os.getenv("GRAVEYARD_OFFLINE_MODE"), default=False),
        save_dir=Path(os.getenv("GRAVEYARD_SAVE_DIR", DEFAULT_SAVE_DIR)),
        app_name=os.getenv("GRAVEYARD_APP_NAME", "graveyard-chorus"),
        app_url=os.getenv("GRAVEYARD_APP_URL"),
    )


def configure_logging(settings: RuntimeSettings) -> Path:
    level_name = (settings.log_level or DEFAULT_LOG_LEVEL).upper()
    level = getattr(logging, level_name, logging.INFO)
    log_dir = settings.log_dir.resolve()
    log_dir.mkdir(parents=True, exist_ok=True)
    log_path = log_dir / settings.log_file_name
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)s %(name)s | %(message)s",
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler(log_path, encoding="utf-8"),
        ],
        force=True,
    )
    app_logger = logging.getLogger("graveyard_chorus")
    app_logger.setLevel(level)
    app_logger.info(
        "Logging configured | file=%s | level=%s | openrouter_traffic=%s",
        log_path,
        level_name,
        settings.log_openrouter_traffic,
    )
    return log_path