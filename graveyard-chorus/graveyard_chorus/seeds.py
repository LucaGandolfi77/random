from __future__ import annotations

import json
from importlib.resources import files
from pathlib import Path

from .config import RuntimeSettings
from .models import TownState


def bundled_seed_path() -> Path:
    resource = files("graveyard_chorus.data").joinpath("town_seed.json")
    return Path(str(resource))


def bundled_family_networks_path() -> Path:
    resource = files("graveyard_chorus.data").joinpath("family_networks.json")
    return Path(str(resource))


def load_seed_state(
    seed_path: Path | None = None,
    *,
    settings: RuntimeSettings | None = None,
    years: int | None = None,
    random_seed: int | None = None,
    llm_enabled: bool | None = None,
    offline_mode: bool | None = None,
) -> TownState:
    if seed_path is None:
        payload = json.loads(files("graveyard_chorus.data").joinpath("town_seed.json").read_text(encoding="utf-8"))
    else:
        payload = json.loads(seed_path.read_text(encoding="utf-8"))

    state = TownState.model_validate(payload)
    if settings is not None:
        state.config.primary_model = settings.primary_model
        state.config.fallback_models = list(settings.fallback_models)
        state.config.offline_mode = settings.offline_mode
        if llm_enabled is None:
            state.config.llm_enabled = bool(settings.openrouter_api_key) and not settings.offline_mode
    if years is not None:
        state.config.years_to_simulate = years
    if random_seed is not None:
        state.config.random_seed = random_seed
    if llm_enabled is not None:
        state.config.llm_enabled = llm_enabled
    if offline_mode is not None:
        state.config.offline_mode = offline_mode
    return state


def load_family_networks(seed_path: Path | None = None) -> dict:
    if seed_path is None:
        text = files("graveyard_chorus.data").joinpath("family_networks.json").read_text(encoding="utf-8")
    else:
        text = seed_path.read_text(encoding="utf-8")
    return json.loads(text)