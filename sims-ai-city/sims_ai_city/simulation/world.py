"""World loading and daily opportunity helpers."""

from __future__ import annotations

import random
from pathlib import Path
from typing import Any

from sims_ai_city.data import load_seed_json
from sims_ai_city.models import Location, LocationKind, Season


def load_seeded_world() -> dict[str, Any]:
    """Load the bundled sample world seed."""

    return load_seed_json("sample_world.json")


def load_seeded_characters() -> list[dict[str, Any]]:
    """Load the bundled sample character seed list."""

    raw = load_seed_json("sample_characters.json")
    return raw if isinstance(raw, list) else []


def build_locations(seed_data: dict[str, Any]) -> dict[str, Location]:
    """Convert location seed data into typed location models."""

    locations: dict[str, Location] = {}
    for row in seed_data.get("locations", []):
        locations[row["id"]] = Location(
            id=row["id"],
            name=row["name"],
            kind=LocationKind(row["kind"]),
            description=row["description"],
            mood=row["mood"],
            gossip_bonus=row.get("gossip_bonus", 0.0),
            romance_bonus=row.get("romance_bonus", 0.0),
            drama_bonus=row.get("drama_bonus", 0.0),
            child_friendliness=row.get("child_friendliness", 0.0),
            seasonal_events=list(row.get("seasonal_events", [])),
            traditions=list(row.get("traditions", [])),
        )
    return locations


def choose_daily_location(location_ids: list[str], season: Season, rng: random.Random) -> str:
    """Pick a daily interaction location with gentle seasonal bias."""

    if not location_ids:
        raise ValueError("At least one location is required.")

    weights: list[float] = []
    for location_id in location_ids:
        weight = 1.0
        if season == Season.SPRING and location_id in {"garden", "plaza"}:
            weight += 0.7
        if season == Season.SUMMER and location_id in {"market", "riverbank"}:
            weight += 0.6
        if season == Season.AUTUMN and location_id in {"cafe", "market"}:
            weight += 0.5
        if season == Season.WINTER and location_id in {"hall", "cafe"}:
            weight += 0.8
        weights.append(weight)

    return rng.choices(location_ids, weights=weights, k=1)[0]


def maybe_daily_incident(seed_data: dict[str, Any], rng: random.Random, chance: float) -> str | None:
    """Pick a funny daily incident when the town feels dramatic."""

    if rng.random() > chance:
        return None
    incidents = list(seed_data.get("incidents", []))
    if not incidents:
        return None
    return rng.choice(incidents)
