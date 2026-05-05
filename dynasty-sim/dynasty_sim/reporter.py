"""Storytelling and report generation for Dynasty Sim.

Provides two modes:
1. **Template-based** — runs without any LLM, uses hand-crafted narrative
   templates to produce readable (and occasionally funny) text.
2. **LLM-enhanced** — uses the OpenRouter client to generate richer, more
   creative prose when ``use_llm_for_events=True``.

The module is the only place that should call the LLM client; everything
else in the engine layer remains LLM-agnostic.
"""

from __future__ import annotations

import random
from typing import TYPE_CHECKING

from dynasty_sim.models import (
    Character,
    Dynasty,
    LifeStage,
    WorldState,
    YearSummary,
)

if TYPE_CHECKING:
    from dynasty_sim.client import OpenRouterClient


# ---------------------------------------------------------------------------
# LLM system prompts
# ---------------------------------------------------------------------------

_NARRATOR_SYSTEM = """\
You are a warm, witty, and occasionally dramatic narrator for a generational dynasty simulator.
Your tone mixes historical chronicle with soap opera flair and a pinch of dry humour.
Always write in English. Keep responses concise (2–4 sentences unless asked for more).
Output plain prose — no bullet points, no headers.
"""

_YEAR_SUMMARY_SYSTEM = """\
You are the official historian of a multi-generational dynasty simulation.
Write a short yearly chronicle entry (3–5 sentences) describing the key events
of the year. Be vivid but not overwrought. English only. Plain prose.
"""

_BIO_SYSTEM = """\
You are a biographer writing short character sketches for a dynasty simulator.
Given the character's traits, relationships, and key memories, write a punchy
2–3 sentence biography. English only. Plain prose.
"""


# ---------------------------------------------------------------------------
# Template-based fallbacks
# ---------------------------------------------------------------------------


_YEAR_TEMPLATES = [
    "Year {year} passed {quietly_or_dramatically}. {population} souls called the land home. {highlight}",
    "The year {year} will be remembered for {highlight}. The population stood at {population}.",
    "By all accounts, {year} was a {adjective} year. {highlight} Population: {population}.",
]

_QUIETS = ["quietly", "uneventfully", "without great ceremony", "with surprising calm"]
_DRAMAS = ["dramatically", "with considerable upheaval", "amid much gossip", "in spectacular fashion"]
_ADJECTIVES = ["remarkable", "trying", "prosperous", "turbulent", "bizarre", "forgettable", "oddly pleasant"]


def _template_year_narrative(summary: YearSummary, world: WorldState) -> str:
    births = len(summary.births)
    deaths = len(summary.deaths)
    marriages = len(summary.marriages) // 2
    scandals = [e for e in summary.events if e.event_type.value == "scandal"]

    if scandals:
        highlight = scandals[0].description
    elif births > deaths:
        highlight = f"{births} child{'ren' if births > 1 else ''} entered the world."
    elif deaths > 0:
        highlight = f"Death came for {deaths} soul{'s' if deaths > 1 else ''}."
    elif marriages > 0:
        highlight = f"{marriages} couple{'s' if marriages > 1 else ''} were united in marriage."
    else:
        highlight = "The seasons turned and life went on."

    quietly_or_dramatically = (
        random.choice(_DRAMAS) if (scandals or deaths > 2)
        else random.choice(_QUIETS)
    )

    template = random.choice(_YEAR_TEMPLATES)
    return template.format(
        year=summary.year,
        population=summary.population,
        highlight=highlight,
        quietly_or_dramatically=quietly_or_dramatically,
        adjective=random.choice(_ADJECTIVES),
    )


def _template_character_bio(char: Character, world: WorldState) -> str:
    age = char.age(world.current_year) if char.is_alive else (
        (char.death_year or world.current_year) - char.birth_year
    )
    status = "lives" if char.is_alive else f"died at age {age}"
    traits_summary = _top_traits(char)
    family = ""
    if char.child_ids:
        family = f" They are a parent of {len(char.child_ids)}."
    return (
        f"{char.full_name} {status} as a {char.occupation}. "
        f"Known for being {traits_summary}.{family}"
    )


def _top_traits(char: Character) -> str:
    learned = char.traits.learned
    # Pick 3 most extreme learned traits (furthest from 0.5)
    scored = sorted(learned.model_dump().items(), key=lambda kv: abs(kv[1] - 0.5), reverse=True)
    names = [k.replace("_", " ") for k, _ in scored[:3]]
    return ", ".join(names) if names else "unremarkable"


# ---------------------------------------------------------------------------
# LLM-enhanced generation
# ---------------------------------------------------------------------------


def _llm_year_narrative(
    summary: YearSummary,
    world: WorldState,
    client: "OpenRouterClient",
) -> str:
    notable = [e.description for e in summary.events[:5]]
    user_msg = (
        f"Year: {summary.year}\n"
        f"Population: {summary.population}\n"
        f"Births: {len(summary.births)}, Deaths: {len(summary.deaths)}, "
        f"Marriages: {len(summary.marriages) // 2}\n"
        f"Notable events: {'; '.join(notable) if notable else 'none'}\n\n"
        "Write a 3–5 sentence yearly chronicle entry."
    )
    try:
        result = client.complete(system=_YEAR_SUMMARY_SYSTEM, user=user_msg, max_tokens=200)
        return result.raw.strip()
    except Exception:  # noqa: BLE001
        return _template_year_narrative(summary, world)


def _llm_character_bio(
    char: Character,
    world: WorldState,
    client: "OpenRouterClient",
) -> str:
    key_memories = [
        m.description for m in sorted(char.memories, key=lambda m: m.importance, reverse=True)[:4]
    ]
    traits_dict = char.traits.summary()
    user_msg = (
        f"Name: {char.full_name}\n"
        f"Age: {char.age(world.current_year)}, Sex: {char.sex.value}\n"
        f"Occupation: {char.occupation}\n"
        f"Top traits: {_top_traits(char)}\n"
        f"Life values: {', '.join(char.life_values)}\n"
        f"Key memories: {'; '.join(key_memories) if key_memories else 'none yet'}\n\n"
        "Write a 2–3 sentence biography."
    )
    try:
        result = client.complete(system=_BIO_SYSTEM, user=user_msg, max_tokens=150)
        return result.raw.strip()
    except Exception:  # noqa: BLE001
        return _template_character_bio(char, world)


def _llm_event_narrative(
    event_description: str,
    context: str,
    client: "OpenRouterClient",
) -> str:
    user_msg = f"Event: {event_description}\nContext: {context}\nExpand this into 1–2 vivid narrative sentences."
    try:
        result = client.complete(system=_NARRATOR_SYSTEM, user=user_msg, max_tokens=120)
        return result.raw.strip()
    except Exception:  # noqa: BLE001
        return event_description


# ---------------------------------------------------------------------------
# Public reporting API
# ---------------------------------------------------------------------------


def generate_year_narrative(
    summary: YearSummary,
    world: WorldState,
    client: "OpenRouterClient | None" = None,
) -> str:
    """Produce a narrative paragraph for a single simulated year."""
    if client and world.config.use_llm_for_events:
        narrative = _llm_year_narrative(summary, world, client)
    else:
        narrative = _template_year_narrative(summary, world)
    summary.narrative = narrative
    return narrative


def generate_character_bio(
    char: Character,
    world: WorldState,
    client: "OpenRouterClient | None" = None,
) -> str:
    """Produce a short biography for a single character."""
    if client and world.config.use_llm_for_bios:
        bio = _llm_character_bio(char, world, client)
    else:
        bio = _template_character_bio(char, world)
    return bio


def generate_dynasty_chronicle(
    dynasty: Dynasty,
    world: WorldState,
    client: "OpenRouterClient | None" = None,
) -> str:
    """Generate a multi-paragraph chronicle of a dynasty."""
    members = [world.characters[m] for m in dynasty.member_ids if m in world.characters]
    living = [m for m in members if m.is_alive]
    deceased = [m for m in members if not m.is_alive]
    founder = world.characters.get(dynasty.founder_id)

    lines: list[str] = []
    lines.append(f"=== Chronicle of {dynasty.name} ===")
    lines.append(f"Founded in year {dynasty.founded_year}.")
    if founder:
        lines.append(f"Founder: {founder.full_name} ({founder.occupation}).")
    lines.append(f"Total members across generations: {len(members)}.")
    lines.append(f"Living members: {len(living)}. Deceased: {len(deceased)}.")
    if dynasty.known_traits:
        lines.append(f"The dynasty is known for: {', '.join(dynasty.known_traits)}.")
    if dynasty.notable_events:
        lines.append("Notable events:")
        for ev in dynasty.notable_events[-5:]:
            lines.append(f"  - {ev}")

    lines.append("\n--- Notable Members ---")
    # Sort by importance heuristic: number of children + memories
    sorted_members = sorted(members, key=lambda c: len(c.child_ids) + len(c.memories), reverse=True)
    for char in sorted_members[:8]:
        bio = generate_character_bio(char, world, client)
        lines.append(f"\n{char.full_name} (b.{char.birth_year}):")
        lines.append(f"  {bio}")

    return "\n".join(lines)


def generate_full_report(
    world: WorldState,
    client: "OpenRouterClient | None" = None,
) -> str:
    """Generate a complete simulation report including all dynasties."""
    lines: list[str] = []
    lines.append("╔══════════════════════════════════════════╗")
    lines.append("║      DYNASTY SIM — SIMULATION REPORT     ║")
    lines.append("╚══════════════════════════════════════════╝")
    lines.append(f"\nYears simulated: {world.config.start_year} – {world.current_year - 1}")
    lines.append(f"Total characters ever created: {len(world.characters)}")
    lines.append(f"Living at end: {len(world.living_characters())}")
    lines.append(f"Dynasties: {len(world.dynasties)}")
    lines.append(f"Total events logged: {len(world.events)}")

    lines.append("\n\n=== YEAR BY YEAR SUMMARIES ===\n")
    for ys in world.year_summaries[-20:]:
        narrative = ys.narrative or _template_year_narrative(ys, world)
        lines.append(f"[{ys.year}] {narrative}")

    lines.append("\n\n=== DYNASTY CHRONICLES ===\n")
    for dynasty in world.dynasties.values():
        lines.append(generate_dynasty_chronicle(dynasty, world, client))
        lines.append("")

    lines.append("\n=== FAMILY TREE SUMMARY ===")
    for node in list(world.family_tree.values())[:30]:
        char = world.characters.get(node.character_id)
        if char:
            parent_names = [
                world.characters[p].full_name
                for p in node.parent_ids
                if p in world.characters
            ]
            parent_str = f"  Parents: {', '.join(parent_names)}" if parent_names else ""
            lines.append(f"  Gen {node.generation}: {char.full_name}{parent_str}")

    return "\n".join(lines)


def print_year_ticker(summary: YearSummary, world: WorldState) -> None:
    """Print a compact one-line progress ticker to stdout."""
    births = len(summary.births)
    deaths = len(summary.deaths)
    marriages = len(summary.marriages) // 2
    pop = summary.population
    scandals = sum(1 for e in summary.events if e.event_type.value == "scandal")
    print(
        f"  [{summary.year}] pop={pop:3d} | "
        f"+{births} born -{deaths} died ♥{marriages} married"
        + (f" 🔥{scandals} scandal(s)" if scandals else "")
    )
