"""YAML board-description loader."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

from polarfire_vp.boards.model import BoardConfig
from polarfire_vp.exceptions import ConfigurationError


def load_board_from_mapping(mapping: dict[str, Any], *, source: Path | None = None) -> BoardConfig:
    if not isinstance(mapping, dict):
        raise ConfigurationError("Board description root must be a mapping")
    return BoardConfig.from_mapping(mapping, source=source)


def load_board_from_file(path: str | Path) -> BoardConfig:
    source = Path(path)
    with source.open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle) or {}
    return load_board_from_mapping(data, source=source)
