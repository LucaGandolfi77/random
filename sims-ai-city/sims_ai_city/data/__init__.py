"""Data loading helpers for seeded world content."""

from __future__ import annotations

import json
from importlib.resources import files
from typing import Any


def load_seed_json(name: str) -> dict[str, Any] | list[dict[str, Any]]:
    """Load a bundled JSON seed file."""

    data_path = files("sims_ai_city.data.seeds").joinpath(name)
    return json.loads(data_path.read_text(encoding="utf-8"))
