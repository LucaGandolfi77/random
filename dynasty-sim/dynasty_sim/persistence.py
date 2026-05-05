"""Persistence layer — save and load WorldState to/from disk."""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

from dynasty_sim.models import WorldState


def save_world(world: WorldState, path: str | Path) -> Path:
    """Serialise the entire world to a JSON file.

    Args:
        world: The WorldState to serialise.
        path:  Destination file path (will be created/overwritten).

    Returns:
        The resolved Path that was written.
    """
    dest = Path(path)
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(world.model_dump_json(indent=2), encoding="utf-8")
    return dest


def load_world(path: str | Path) -> WorldState:
    """Deserialise a WorldState from a JSON file.

    Args:
        path: Path to a previously saved world file.

    Returns:
        A reconstructed WorldState instance.

    Raises:
        FileNotFoundError: If the file does not exist.
        ValueError: If the file cannot be parsed.
    """
    src = Path(path)
    if not src.exists():
        raise FileNotFoundError(f"Save file not found: {src}")
    try:
        data = json.loads(src.read_text(encoding="utf-8"))
        return WorldState.model_validate(data)
    except Exception as exc:
        raise ValueError(f"Failed to load world from {src}: {exc}") from exc


def save_checkpoint(world: WorldState, save_dir: str | Path = "saves") -> Path:
    """Save a timestamped checkpoint of the world.

    Checkpoint filename: ``dynasty_sim_YYYY-YYYY_YYYYMMDD_HHMMSS.json``

    Args:
        world:    The WorldState to save.
        save_dir: Directory in which to store checkpoints.

    Returns:
        Path of the checkpoint file that was written.
    """
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = (
        f"dynasty_sim_{world.config.start_year}-{world.current_year}_{stamp}.json"
    )
    return save_world(world, Path(save_dir) / filename)


def list_checkpoints(save_dir: str | Path = "saves") -> list[Path]:
    """Return all checkpoint files in *save_dir* sorted newest-first."""
    d = Path(save_dir)
    if not d.exists():
        return []
    return sorted(d.glob("dynasty_sim_*.json"), reverse=True)


def load_latest_checkpoint(save_dir: str | Path = "saves") -> WorldState:
    """Load the most-recently created checkpoint from *save_dir*.

    Raises:
        FileNotFoundError: If no checkpoints are found.
    """
    checkpoints = list_checkpoints(save_dir)
    if not checkpoints:
        raise FileNotFoundError(f"No checkpoints found in {save_dir}")
    return load_world(checkpoints[0])
