"""Event creation helpers for social drama and family milestones."""

from __future__ import annotations

from sims_ai_city.models import Character, LifeEvent, LifeEventType, Relationship, Season


def create_social_event(
    *,
    day_index: int,
    season: Season,
    year: int,
    action: str,
    actor: Character,
    target: Character,
    location_id: str,
    relationship: Relationship,
    initiator_line: str,
    target_reaction: str,
) -> LifeEvent:
    """Create a logged social event from an interaction."""

    event_type = _event_type_for_action(action)
    headline = _headline_for_action(action, actor, target)
    description = f"{initiator_line} {target_reaction}".strip()
    return LifeEvent(
        day_index=day_index,
        season=season,
        year=year,
        type=event_type,
        headline=headline,
        description=description,
        actor_ids=[actor.id, target.id],
        family_ids=[value for value in [actor.family_id, target.family_id] if value],
        location_id=location_id,
        tags=[action, relationship.status.value],
    )


def create_family_event(
    *,
    day_index: int,
    season: Season,
    year: int,
    event_type: LifeEventType,
    headline: str,
    description: str,
    actor_ids: list[str],
    family_ids: list[str],
    location_id: str | None = None,
) -> LifeEvent:
    """Create a family or milestone event."""

    return LifeEvent(
        day_index=day_index,
        season=season,
        year=year,
        type=event_type,
        headline=headline,
        description=description,
        actor_ids=actor_ids,
        family_ids=family_ids,
        location_id=location_id,
        tags=[event_type.value],
    )


def _event_type_for_action(action: str) -> LifeEventType:
    mapping = {
        "chat": LifeEventType.MEETING,
        "gossip": LifeEventType.GOSSIP,
        "gift": LifeEventType.GIFT,
        "flirt": LifeEventType.FLIRT,
        "argue": LifeEventType.ARGUMENT,
        "soup_feud": LifeEventType.FEUD,
        "reconcile": LifeEventType.RECONCILIATION,
        "confess": LifeEventType.FLIRT,
        "proposal": LifeEventType.MILESTONE,
        "awkward_family_meeting": LifeEventType.FAMILY,
    }
    return mapping.get(action, LifeEventType.MEETING)


def _headline_for_action(action: str, actor: Character, target: Character) -> str:
    mapping = {
        "chat": f"{actor.first_name} and {target.first_name} swap feelings and side-eyes",
        "gossip": f"{actor.first_name} whispers dangerous gossip to {target.first_name}",
        "gift": f"{actor.first_name} offers a peace gift to {target.first_name}",
        "flirt": f"{actor.first_name} flirts with reckless theatrical energy",
        "argue": f"{actor.first_name} and {target.first_name} argue about principles and probably vegetables",
        "soup_feud": f"A soup feud erupts between {actor.first_name} and {target.first_name}",
        "reconcile": f"{actor.first_name} attempts a fragile reconciliation with {target.first_name}",
        "confess": f"{actor.first_name} makes a trembling romantic confession",
        "proposal": f"{actor.first_name} makes a suspiciously heartfelt proposal",
        "awkward_family_meeting": f"{actor.first_name} and {target.first_name} survive an awkward family encounter",
    }
    return mapping.get(action, f"{actor.first_name} causes an event with {target.first_name}")
