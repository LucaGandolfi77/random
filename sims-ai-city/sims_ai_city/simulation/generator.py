"""Character and family generation for the town."""

from __future__ import annotations

import random
from collections import defaultdict

from sims_ai_city.config import SimulationConfig
from sims_ai_city.models import AgeStage, Character, Family, SimulationDate, TraitProfile, WorldState
from sims_ai_city.simulation.clock import determine_age_stage
from sims_ai_city.simulation.world import build_locations, load_seeded_characters, load_seeded_world

TEMPERAMENT_MUTATIONS = [
    "alarmingly charismatic turnip whisperer",
    "suspiciously serene chaos magnet",
    "tragic jester with excellent timing",
    "determined soup anarchist",
]


def build_seed_world(config: SimulationConfig) -> WorldState:
    """Build a fresh world state from bundled sample data."""

    world_seed = load_seeded_world()
    locations = build_locations(world_seed)
    characters = build_characters(config, list(locations.keys()))
    families = build_families(characters, world_seed.get("traditions", []), list(locations.keys()), random.Random(config.random_seed))

    for family in families.values():
        for member_id in family.member_ids:
            characters[member_id].family_id = family.id

    return WorldState(
        town_name=world_seed.get("town_name", config.town_name),
        town_motto=world_seed.get("town_motto", "No secret survives the pie table."),
        current_date=SimulationDate(day=1, season="spring", year=config.start_year),
        day_index=0,
        random_seed=config.random_seed,
        characters=characters,
        families=families,
        locations=locations,
        active_story_hooks=[
            "Somebody is definitely lying about the lucky spoon.",
            "At least one resident is hiding a spectacular crush behind civic paperwork.",
        ],
    )


def build_characters(config: SimulationConfig, location_ids: list[str]) -> dict[str, Character]:
    """Create initial residents from bundled seed data."""

    rng = random.Random(config.random_seed)
    rows = load_seeded_characters()
    characters: dict[str, Character] = {}

    for index, row in enumerate(rows[: max(config.initial_population, len(rows))]):
        age_years = int(row["age_years"])
        traits = TraitProfile(
            temperament=row["temperament"],
            social_style=row["social_style"],
            ambition=round(rng.uniform(0.35, 0.92), 2),
            humor=round(rng.uniform(0.35, 0.96), 2),
            patience=round(rng.uniform(0.25, 0.88), 2),
            romance_style=row["romance_style"],
            quirks=list(row.get("quirks", [])),
            weird_habits=list(row.get("weird_habits", [])),
            values=list(row.get("values", [])),
            talents=_pick_talents(rng),
            weaknesses=_pick_weaknesses(rng),
            visual_descriptors=list(row.get("visual_descriptors", [])),
            hidden_traits=[rng.choice(TEMPERAMENT_MUTATIONS)] if rng.random() < 0.18 else [],
        )
        character = Character(
            first_name=row["first_name"],
            last_name=row["last_name"],
            age_years=age_years,
            age_stage=determine_age_stage(age_years),
            birthday_day_of_year=rng.randint(1, config.days_per_season * 4),
            traits=traits,
            appearance_descriptors=list(row.get("visual_descriptors", [])),
            hobbies=list(row.get("hobbies", [])),
            social_needs=round(rng.uniform(0.35, 0.95), 2),
            romance_preferences=_pick_romance_preferences(rng),
            friendship_tendency=round(rng.uniform(0.25, 0.92), 2),
            ambition_level=traits.ambition,
            weird_habits=list(row.get("weird_habits", [])),
            family_background=row.get("family_background", ""),
            home_location_id=row.get("home_location_id", rng.choice(location_ids)),
            favorite_location_id=row.get("home_location_id", rng.choice(location_ids)),
            mood=_pick_opening_mood(rng),
            reputation=row.get("reputation", "notable for existing with flair"),
            birth_year=config.start_year - age_years,
        )
        characters[character.id] = character

    _seed_family_links(characters)
    return characters


def build_families(
    characters: dict[str, Character],
    traditions: list[str],
    location_ids: list[str],
    rng: random.Random,
) -> dict[str, Family]:
    """Group residents into starting families by surname."""

    grouped: dict[str, list[Character]] = defaultdict(list)
    for character in characters.values():
        grouped[character.last_name].append(character)

    families: dict[str, Family] = {}
    for surname, members in grouped.items():
        founder_ids = [member.id for member in members if member.age_years >= 24][:2]
        family = Family(
            surname=surname,
            member_ids=[member.id for member in members],
            founder_ids=founder_ids,
            traditions=rng.sample(traditions, k=min(2, len(traditions))) if traditions else [],
            legendary_hook=_pick_family_hook(surname, rng),
            home_location_id=rng.choice(location_ids) if location_ids else None,
        )
        families[family.id] = family

    return families


def _seed_family_links(characters: dict[str, Character]) -> None:
    surname_map: dict[str, list[Character]] = defaultdict(list)
    for character in characters.values():
        surname_map[character.last_name].append(character)

    for members in surname_map.values():
        ordered = sorted(members, key=lambda item: item.age_years, reverse=True)
        adults = [member for member in ordered if member.age_stage in {AgeStage.ADULT, AgeStage.ELDER}]
        younger = [member for member in ordered if member.age_stage in {AgeStage.CHILD, AgeStage.TEEN}]
        if len(adults) >= 2:
            adults[0].spouse_id = adults[1].id if adults[0].age_years - adults[1].age_years < 18 else adults[0].spouse_id
            adults[1].spouse_id = adults[0].id if adults[0].spouse_id == adults[1].id else adults[1].spouse_id
        if len(adults) >= 2:
            parent_ids = [adults[0].id, adults[1].id]
            for child in younger:
                child.parent_ids = parent_ids
                adults[0].children_ids.append(child.id)
                adults[1].children_ids.append(child.id)


def _pick_opening_mood(rng: random.Random) -> str:
    return rng.choice([
        "curious",
        "dramatic",
        "hopeful",
        "nosy",
        "romantically overprepared",
        "mildly offended by the weather",
    ])


def _pick_romance_preferences(rng: random.Random) -> list[str]:
    options = [
        "grand gestures",
        "slow-burn devotion",
        "shared hobbies",
        "witty banter",
        "mutual weirdness",
        "competence in emergencies",
    ]
    return rng.sample(options, k=2)


def _pick_talents(rng: random.Random) -> list[str]:
    talents = [
        "festival singing",
        "pie diplomacy",
        "tiny woodworking",
        "gossip interception",
        "improbable charisma",
        "ornamental soup judging",
    ]
    return rng.sample(talents, k=2)


def _pick_weaknesses(rng: random.Random) -> list[str]:
    weaknesses = [
        "jealous about applause",
        "chronically late to sincere moments",
        "easily distracted by pastries",
        "too proud during soup disputes",
        "dramatic about mild inconveniences",
        "cannot resist a terrible idea with ribbons on it",
    ]
    return rng.sample(weaknesses, k=2)


def _pick_family_hook(surname: str, rng: random.Random) -> str:
    return rng.choice([
        f"The {surname} family is rumored to settle arguments with desserts and thunderous eye contact.",
        f"The {surname} lineage keeps producing suspiciously gifted children and one excellent accordion player.",
        f"Nobody can prove it, but the {surname} family has won every major soup dispute since year three.",
    ])
