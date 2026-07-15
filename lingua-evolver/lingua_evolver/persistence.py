"""Persistence module: saving and loading simulation state."""

from __future__ import annotations

from datetime import datetime
from pathlib import Path

from lingua_evolver.models import LanguageWorld


def save_checkpoint(world: LanguageWorld, saves_dir: Path) -> Path:
    """Save the current world state to a timestamped JSON file.

    Returns the path to the saved file.
    """
    saves_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"lingua_gen{world.generation:04d}_{timestamp}.json"
    filepath = saves_dir / filename

    filepath.write_text(world.model_dump_json(indent=2), encoding="utf-8")
    return filepath


def load_checkpoint(filepath: Path) -> LanguageWorld:
    """Load a world state from a JSON file."""
    if not filepath.exists():
        raise FileNotFoundError(f"Checkpoint not found: {filepath}")

    data = filepath.read_text(encoding="utf-8")
    return LanguageWorld.model_validate_json(data)


def list_checkpoints(saves_dir: Path) -> list[Path]:
    """List all checkpoint files in the saves directory, sorted by name."""
    if not saves_dir.exists():
        return []

    checkpoints = sorted(saves_dir.glob("lingua_*.json"))
    return checkpoints


def load_latest_checkpoint(saves_dir: Path) -> LanguageWorld | None:
    """Load the most recent checkpoint. Returns None if no checkpoints exist."""
    checkpoints = list_checkpoints(saves_dir)
    if not checkpoints:
        return None

    return load_checkpoint(checkpoints[-1])


def save_export(data: str, exports_dir: Path, filename: str) -> Path:
    """Save exported content to a file."""
    exports_dir.mkdir(parents=True, exist_ok=True)
    filepath = exports_dir / filename
    filepath.write_text(data, encoding="utf-8")
    return filepath
