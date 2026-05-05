"""Memory system for Dynasty Sim characters.

Each character holds a list of ``MemoryRecord`` objects. This module:

- Adds new memories with automatic importance scoring
- Retrieves memories relevant to a subject or event type
- Computes summary statistics (trust/affection drift from memories)
- Prunes low-importance memories beyond a configurable cap
"""

from __future__ import annotations

import math
from typing import TYPE_CHECKING

from dynasty_sim.models import Character, MemoryRecord

if TYPE_CHECKING:
    pass

# Maximum number of memories a character retains before pruning low-importance ones
_MEMORY_CAP = 120

# Emotional valence thresholds for classifying memories
_POSITIVE_THRESHOLD = 0.3
_NEGATIVE_THRESHOLD = -0.3

# Decay rate: each year reduces memory importance by this fraction
_IMPORTANCE_DECAY_PER_YEAR = 0.01


def add_memory(
    character: Character,
    subject_id: str,
    event_type: str,
    description: str,
    valence: float,
    year: int,
    importance: float = 0.5,
    tags: list[str] | None = None,
    metadata: dict | None = None,
) -> MemoryRecord:
    """Add a new memory to a character, pruning if over cap.

    Parameters
    ----------
    character:
        The character who experiences and stores this memory.
    subject_id:
        ID of the character this memory is *about* (may be self).
    event_type:
        Short event label (e.g. ``"first_meeting"``, ``"betrayal"``).
    description:
        Human-readable description of what happened.
    valence:
        Emotional valence in ``[-1, 1]``.
    year:
        Simulation year when this happened.
    importance:
        Base importance in ``[0, 1]``.  High-valence events are automatically
        boosted.
    tags:
        Optional list of string tags (e.g. ``["romance", "public"]``).
    metadata:
        Arbitrary extra data.
    """
    # Boost importance for strongly valenced events
    valence = max(-1.0, min(1.0, valence))
    importance = max(0.0, min(1.0, importance + abs(valence) * 0.2))

    record = MemoryRecord(
        subject_id=subject_id,
        event_type=event_type,
        description=description,
        emotional_valence=round(valence, 3),
        importance=round(importance, 3),
        year=year,
        tags=tags or [],
        metadata=metadata or {},
    )
    character.memories.append(record)

    # Prune if over cap
    if len(character.memories) > _MEMORY_CAP:
        _prune_memories(character)

    return record


def recall_about(character: Character, subject_id: str, limit: int = 10) -> list[MemoryRecord]:
    """Return the most important memories about a specific character."""
    relevant = [m for m in character.memories if m.subject_id == subject_id]
    return sorted(relevant, key=lambda m: m.importance, reverse=True)[:limit]


def recall_by_type(character: Character, event_type: str, limit: int = 10) -> list[MemoryRecord]:
    """Return memories of a given event type."""
    relevant = [m for m in character.memories if m.event_type == event_type]
    return sorted(relevant, key=lambda m: m.importance, reverse=True)[:limit]


def recall_recent(character: Character, since_year: int, limit: int = 20) -> list[MemoryRecord]:
    """Return memories from the given year onwards."""
    relevant = [m for m in character.memories if m.year >= since_year]
    return sorted(relevant, key=lambda m: (m.year, m.importance), reverse=True)[:limit]


def summarise_feelings(character: Character, subject_id: str) -> dict[str, float]:
    """Compute approximate trust/affection derived from memories about subject.

    Returns a dict with keys ``trust``, ``affection``, ``resentment``.
    """
    memories = recall_about(character, subject_id, limit=30)
    if not memories:
        return {"trust": 0.5, "affection": 0.0, "resentment": 0.0}

    trust_contrib = 0.0
    affection_contrib = 0.0
    resentment_contrib = 0.0
    total_weight = 0.0

    for m in memories:
        w = m.importance
        total_weight += w
        valence = m.emotional_valence

        if valence >= _POSITIVE_THRESHOLD:
            trust_contrib += w * min(valence, 1.0)
            affection_contrib += w * valence
        elif valence <= _NEGATIVE_THRESHOLD:
            resentment_contrib += w * abs(valence)
            trust_contrib -= w * abs(valence) * 0.5

    if total_weight == 0:
        return {"trust": 0.5, "affection": 0.0, "resentment": 0.0}

    trust = 0.5 + (trust_contrib / total_weight) * 0.5
    affection = affection_contrib / total_weight
    resentment = resentment_contrib / total_weight

    return {
        "trust": max(0.0, min(1.0, round(trust, 3))),
        "affection": max(-1.0, min(1.0, round(affection, 3))),
        "resentment": max(0.0, min(1.0, round(resentment, 3))),
    }


def apply_time_decay(character: Character, current_year: int) -> None:
    """Reduce importance of old memories slightly each simulated year."""
    for m in character.memories:
        age = current_year - m.year
        if age > 0:
            decay = 1.0 - _IMPORTANCE_DECAY_PER_YEAR * age
            m.importance = round(max(0.01, m.importance * decay), 4)


def format_memories_for_prompt(
    character: Character,
    subject_id: str | None = None,
    limit: int = 8,
) -> str:
    """Return a compact memory summary string suitable for LLM prompts."""
    if subject_id:
        memories = recall_about(character, subject_id, limit=limit)
    else:
        memories = sorted(character.memories, key=lambda m: m.importance, reverse=True)[:limit]

    if not memories:
        return "No significant memories."

    lines = []
    for m in memories:
        valence_label = "positive" if m.emotional_valence > 0.1 else ("negative" if m.emotional_valence < -0.1 else "neutral")
        lines.append(f"- Year {m.year}: [{valence_label}] {m.description}")
    return "\n".join(lines)


def _prune_memories(character: Character) -> None:
    """Keep the most important memories, discard excess low-importance ones."""
    # Always keep memories with importance above 0.7
    important = [m for m in character.memories if m.importance >= 0.7]
    rest = sorted(
        [m for m in character.memories if m.importance < 0.7],
        key=lambda m: m.importance,
        reverse=True,
    )
    keep = important + rest
    character.memories = keep[:_MEMORY_CAP]
