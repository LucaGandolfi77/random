"""Relationship storage, compatibility, and social drift."""

from __future__ import annotations

import random

from sims_ai_city.models import Character, Relationship, RelationshipStatus, WorldState


def relationship_key(left_id: str, right_id: str) -> str:
    """Create a stable key for an unordered character pair."""

    ordered = sorted([left_id, right_id])
    return f"{ordered[0]}::{ordered[1]}"


def ensure_relationship(world: WorldState, left: Character, right: Character) -> Relationship:
    """Ensure a relationship object exists for a pair of characters."""

    key = relationship_key(left.id, right.id)
    relationship = world.relationships.get(key)
    if relationship is None:
        relationship = Relationship(
            key=key,
            character_a_id=min(left.id, right.id),
            character_b_id=max(left.id, right.id),
        )
        world.relationships[key] = relationship

    if left.family_id and left.family_id == right.family_id:
        relationship.status = RelationshipStatus.FAMILY
        relationship.familiarity = max(relationship.familiarity, 0.55)
        relationship.trust = max(relationship.trust, 0.3)

    if left.spouse_id == right.id and right.spouse_id == left.id:
        relationship.status = RelationshipStatus.SPOUSES
        relationship.romance = max(relationship.romance, 0.82)
        relationship.friendship = max(relationship.friendship, 0.58)
        relationship.trust = max(relationship.trust, 0.6)

    return relationship


def compatibility(left: Character, right: Character) -> float:
    """Estimate compatibility from traits, values, and preferences."""

    value_overlap = len(set(left.traits.values) & set(right.traits.values)) * 0.12
    hobby_overlap = len(set(left.hobbies) & set(right.hobbies)) * 0.09
    preference_overlap = len(set(left.romance_preferences) & set(right.romance_preferences)) * 0.08
    ambition_gap = 1.0 - min(abs(left.ambition_level - right.ambition_level), 1.0)
    humor_alignment = 1.0 - min(abs(left.traits.humor - right.traits.humor), 1.0)
    patience_alignment = 1.0 - min(abs(left.traits.patience - right.traits.patience), 1.0)
    return min(1.0, 0.18 + value_overlap + hobby_overlap + preference_overlap + ambition_gap * 0.16 + humor_alignment * 0.14 + patience_alignment * 0.11)


def apply_action_to_relationship(
    relationship: Relationship,
    *,
    action: str,
    compatibility_score: float,
    location_romance_bonus: float,
    location_gossip_bonus: float,
    location_drama_bonus: float,
    rng: random.Random,
) -> dict[str, float]:
    """Apply an interaction action to a relationship and return the delta map."""

    delta: dict[str, float] = {
        "familiarity": 0.0,
        "friendship": 0.0,
        "romance": 0.0,
        "resentment": 0.0,
        "trust": 0.0,
        "jealousy": 0.0,
        "spark": 0.0,
    }

    if action == "chat":
        delta.update({"familiarity": 0.06, "friendship": 0.04 + compatibility_score * 0.03, "trust": 0.02})
    elif action == "gossip":
        delta.update({"familiarity": 0.05, "friendship": 0.03, "trust": 0.01, "jealousy": -0.01})
        delta["friendship"] += location_gossip_bonus * 0.03
    elif action == "gift":
        delta.update({"friendship": 0.08, "trust": 0.05, "spark": 0.03})
    elif action == "flirt":
        delta.update({"romance": 0.09 + location_romance_bonus * 0.06, "spark": 0.08, "friendship": 0.03, "jealousy": 0.01})
    elif action == "argue":
        delta.update({"resentment": 0.11 + location_drama_bonus * 0.05, "trust": -0.08, "friendship": -0.06})
    elif action == "soup_feud":
        delta.update({"resentment": 0.14, "trust": -0.06, "friendship": -0.04, "jealousy": 0.04})
    elif action == "reconcile":
        delta.update({"resentment": -0.12, "trust": 0.08, "friendship": 0.05})
    elif action == "confess":
        delta.update({"romance": 0.12, "trust": 0.05, "spark": 0.06, "friendship": 0.02})
    elif action == "proposal":
        delta.update({"romance": 0.06, "trust": 0.09, "spark": 0.03})
    elif action == "awkward_family_meeting":
        delta.update({"familiarity": 0.08, "friendship": 0.02, "resentment": 0.03})

    if rng.random() < 0.08:
        delta["spark"] += 0.03
    if rng.random() < 0.05:
        delta["resentment"] += 0.02

    relationship.familiarity = _clamp(relationship.familiarity + delta["familiarity"])
    relationship.friendship = _clamp_signed(relationship.friendship + delta["friendship"])
    relationship.romance = _clamp_signed(relationship.romance + delta["romance"])
    relationship.resentment = _clamp(relationship.resentment + delta["resentment"])
    relationship.trust = _clamp_signed(relationship.trust + delta["trust"])
    relationship.jealousy = _clamp(relationship.jealousy + delta["jealousy"])
    relationship.spark = _clamp(relationship.spark + delta["spark"])
    relationship.status = infer_relationship_status(relationship)
    return delta


def infer_relationship_status(relationship: Relationship) -> RelationshipStatus:
    """Infer a readable status from the relationship metrics."""

    if relationship.status == RelationshipStatus.SPOUSES:
        return RelationshipStatus.SPOUSES
    if relationship.resentment > 0.62 and relationship.friendship < 0.0:
        return RelationshipStatus.RIVALS
    if relationship.romance > 0.72 and relationship.trust > 0.45:
        return RelationshipStatus.COURTING
    if relationship.friendship > 0.58 and relationship.resentment < 0.25:
        return RelationshipStatus.FRIENDS
    if relationship.familiarity > 0.18:
        return RelationshipStatus.ACQUAINTANCES
    return RelationshipStatus.STRANGERS


def daily_relationship_drift(world: WorldState, rng: random.Random) -> None:
    """Apply slow social drift so old tensions and affections do not freeze forever."""

    for relationship in world.relationships.values():
        relationship.friendship = _clamp_signed(relationship.friendship * 0.995)
        relationship.romance = _clamp_signed(relationship.romance * 0.996)
        relationship.resentment = _clamp(relationship.resentment * 0.993)
        relationship.spark = _clamp(relationship.spark * 0.991)
        if rng.random() < 0.03:
            relationship.jealousy = _clamp(relationship.jealousy * 0.97)
        relationship.status = infer_relationship_status(relationship)


def _clamp(value: float) -> float:
    return max(0.0, min(1.0, round(value, 4)))


def _clamp_signed(value: float) -> float:
    return max(-1.0, min(1.0, round(value, 4)))
