from __future__ import annotations

import logging

from graveyard_chorus import config
from graveyard_chorus.config import RuntimeSettings, configure_logging, load_settings


def test_configure_logging_writes_to_default_file_location(tmp_path) -> None:
    root_logger = logging.getLogger()
    original_handlers = list(root_logger.handlers)
    original_level = root_logger.level

    try:
        settings = RuntimeSettings(
            openrouter_api_key=None,
            log_dir=tmp_path,
            log_file_name="graveyard-chorus.log",
        )
        log_path = configure_logging(settings)

        logging.getLogger("graveyard_chorus.test").info("the town kept a written memory")
        for handler in logging.getLogger().handlers:
            handler.flush()

        assert log_path == (tmp_path.resolve() / "graveyard-chorus.log")
        assert log_path.exists()
        assert "the town kept a written memory" in log_path.read_text(encoding="utf-8")
    finally:
        for handler in list(root_logger.handlers):
            try:
                handler.flush()
            except Exception:
                pass
            try:
                handler.close()
            except Exception:
                pass
        root_logger.handlers.clear()
        for handler in original_handlers:
            root_logger.addHandler(handler)
        root_logger.setLevel(original_level)


def test_load_settings_prefers_project_local_env_file(tmp_path, monkeypatch) -> None:
    env_file = tmp_path / ".env"
    env_file.write_text(
        "OPENROUTER_API_KEY=test-project-key\nGRAVEYARD_PRIMARY_MODEL=inclusionai/ling-2.6-1t-20260423:free\n",
        encoding="utf-8",
    )
    monkeypatch.setattr(config, "PROJECT_ENV_FILE", env_file)
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    monkeypatch.delenv("GRAVEYARD_PRIMARY_MODEL", raising=False)

    settings = load_settings()

    assert settings.openrouter_api_key == "test-project-key"
    assert settings.primary_model == "inclusionai/ling-2.6-1t-20260423:free"