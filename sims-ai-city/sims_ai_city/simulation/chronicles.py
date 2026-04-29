"""Narrative summaries and family history recaps."""

from __future__ import annotations

from collections import Counter

from sims_ai_city.models import Family, LifeEvent, LifeEventType, WorldState, YearSummary


def build_year_summary(world: WorldState, year: int) -> YearSummary:
    """Build a funny yearly summary from the recorded events."""

    year_events = [event for event in world.events if event.year == year]
    event_counter = Counter(event.type for event in year_events)
    headlines = [event.headline for event in year_events[-8:]]
    gossip_legends = [
        event.description
        for event in year_events
        if event.type in {LifeEventType.GOSSIP, LifeEventType.FEUD, LifeEventType.MARRIAGE}
    ][-4:]

    title = _pick_title(year_events)
    family_spotlights = [
        summarize_family_history(family, world)
        for family in world.families.values()
        if any(event.family_ids and family.id in event.family_ids for event in year_events)
    ][:4]

    return YearSummary(
        year=year,
        title=title,
        highlights=headlines,
        births=event_counter[LifeEventType.BIRTH],
        marriages=event_counter[LifeEventType.MARRIAGE],
        feuds=event_counter[LifeEventType.FEUD],
        reconciliations=event_counter[LifeEventType.RECONCILIATION],
        departures=event_counter[LifeEventType.PASSING],
        gossip_legends=gossip_legends,
        family_spotlights=family_spotlights,
    )


def summarize_family_history(family: Family, world: WorldState) -> str:
    """Create a compact family chronicle for the inspector."""

    member_names = [world.characters[member_id].full_name for member_id in family.member_ids if member_id in world.characters]
    scandal = family.scandals[-1] if family.scandals else "kept its dignity, mostly"
    return f"The {family.surname} clan now counts {len(member_names)} members and recently {scandal}."


def compose_recent_recap(events: list[LifeEvent], limit: int = 5) -> str:
    """Create a readable recap from recent events."""

    selected = events[-limit:]
    if not selected:
        return "The town is briefly calm, which is frankly suspicious."
    return " ".join(event.headline for event in selected)


def _pick_title(events: list[LifeEvent]) -> str:
    if any(event.type == LifeEventType.MARRIAGE for event in events):
        return "A year of vows, whispers, and dramatic cake"
    if any(event.type == LifeEventType.BIRTH for event in events):
        return "A year of babies, blankets, and alarming inherited habits"
    if any(event.type == LifeEventType.FEUD for event in events):
        return "A year of grudges, ladles, and improbable reconciliations"
    return "A year of affectionate chaos"
