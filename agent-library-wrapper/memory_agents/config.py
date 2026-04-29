"""Configuration loading helpers for the memory_agents package."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover - exercised only before dependency installation.
    def load_dotenv(dotenv_path: str | Path | None = None, override: bool = False) -> bool:
        """Fallback no-op implementation when python-dotenv is not installed yet."""

        _ = (dotenv_path, override)
        return False


def load_environment(env_file: str | Path | None = None, override: bool = False) -> dict[str, Any]:
    """Load environment variables from a .env file and return a relevant snapshot.

    Parameters
    ----------
    env_file:
        Optional explicit path to a .env file.
    override:
        Whether values from the file should overwrite existing process variables.
    """

    load_dotenv(dotenv_path=env_file, override=override)
    return {
        "OPENROUTER_API_KEY": os.getenv("OPENROUTER_API_KEY"),
        "OPENROUTER_BASE_URL": os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
        "OPENROUTER_APP_NAME": os.getenv("OPENROUTER_APP_NAME", "Memory Agents"),
        "OPENROUTER_HTTP_REFERER": os.getenv("OPENROUTER_HTTP_REFERER", "https://localhost"),
    }
