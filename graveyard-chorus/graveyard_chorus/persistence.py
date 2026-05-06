from __future__ import annotations

from pathlib import Path
import json

from .models import TownState


def slugify(value: str) -> str:
    return "".join(character.lower() if character.isalnum() else "-" for character in value).strip("-")


def ensure_directory(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def build_run_directory(base_dir: Path, town_name: str, current_year: int) -> Path:
    return ensure_directory(base_dir / f"{slugify(town_name)}-{current_year}")


def save_state(state: TownState, path: Path) -> Path:
    ensure_directory(path.parent)
    path.write_text(state.model_dump_json(indent=2), encoding="utf-8")
    return path


def load_state(path: Path) -> TownState:
    return TownState.model_validate_json(path.read_text(encoding="utf-8"))


def save_json(data: dict, path: Path) -> Path:
    ensure_directory(path.parent)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    return path