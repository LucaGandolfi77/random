"""Character generator for Dynasty Sim.

Creates fully-formed characters from scratch or as children of existing
characters by delegating biological inheritance to ``InheritanceEngine``.
"""

from __future__ import annotations

import random
from datetime import date
from typing import TYPE_CHECKING

from dynasty_sim.inheritance import InheritanceEngine
from dynasty_sim.models import (
    Character,
    EducationProfile,
    InheritedTraitSet,
    LearnedTraitSet,
    LifeStage,
    Sex,
    TraitProfile,
)

if TYPE_CHECKING:
    from dynasty_sim.models import WorldState

# ---------------------------------------------------------------------------
# Name banks (intentionally colourful and cross-cultural for a fantasy world)
# ---------------------------------------------------------------------------

_MALE_FIRST_NAMES = [
    "Aldric", "Brennan", "Caius", "Dorian", "Edmund", "Faris", "Galen",
    "Hector", "Isidore", "Jasper", "Kieran", "Luca", "Magnus", "Niall",
    "Oswin", "Percy", "Quillan", "Rowan", "Soren", "Tomas", "Ulric",
    "Vael", "Wren", "Xander", "Yorick", "Zane", "Corwin", "Dermot",
    "Evander", "Flynn", "Godfrey", "Hadrian", "Inigo", "Jovan", "Knox",
]

_FEMALE_FIRST_NAMES = [
    "Acantha", "Briar", "Celeste", "Dalia", "Elara", "Fenna", "Gwynne",
    "Hesta", "Isolde", "Juniper", "Kira", "Lyra", "Maren", "Nessa",
    "Orla", "Petra", "Quintia", "Rowan", "Sidra", "Thea", "Una",
    "Vivaan", "Willa", "Xenia", "Yseult", "Zara", "Calla", "Delwyn",
    "Evaine", "Floryn", "Greta", "Hana", "Imra", "Jorla", "Kaela",
]

_LAST_NAMES = [
    "Ashford", "Blackwood", "Crowley", "Dunmore", "Egerton", "Farrow",
    "Greystone", "Hartwell", "Ireton", "Jarvis", "Kett", "Langley",
    "Marsh", "Neville", "Oxton", "Parrish", "Quincey", "Radcliffe",
    "Stafford", "Trent", "Udall", "Vane", "Westbrook", "Ximenes",
    "Yarrow", "Zennor", "Alden", "Bryce", "Colton", "Drake", "Ember",
    "Flint", "Gorse", "Hewick", "Irwell", "Jory", "Keld", "Lynton",
]

_OCCUPATIONS = [
    "farmer", "blacksmith", "merchant", "scholar", "healer", "soldier",
    "bard", "sailor", "carpenter", "herbalist", "innkeeper", "jeweller",
    "miller", "scribe", "tanner", "weaver", "hunter", "fisherman",
    "glassblower", "astrologer", "poet", "cook", "stonemason",
]

_LIFE_VALUES = [
    "family", "loyalty", "adventure", "knowledge", "beauty", "justice",
    "freedom", "honour", "wealth", "tradition", "creativity", "community",
    "power", "peace", "truth", "piety", "pleasure", "service",
]

_GOALS = [
    "build a prosperous household",
    "become respected in the community",
    "raise skilled and happy children",
    "travel to distant lands",
    "master a craft or art",
    "accumulate enough wealth to never worry",
    "find a great love",
    "uncover a family secret",
    "write something memorable",
    "outlive their rivals",
    "earn the nickname 'the Wise' — or at least 'the Adequate'",
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _random_sex() -> Sex:
    return random.choice([Sex.MALE, Sex.FEMALE])


def _random_name(sex: Sex, last_name: str | None = None) -> tuple[str, str]:
    pool = _MALE_FIRST_NAMES if sex == Sex.MALE else _FEMALE_FIRST_NAMES
    first = random.choice(pool)
    last = last_name or random.choice(_LAST_NAMES)
    return first, last


def _random_birthday(current_year: int, age: int) -> date:
    birth_year = current_year - age
    day = random.randint(1, 365)
    try:
        return date.fromordinal(date(birth_year, 1, 1).toordinal() + day - 1)
    except ValueError:
        return date(birth_year, 6, 1)


def _random_base_traits(seed_traits: dict | None = None) -> TraitProfile:
    """Generate a random trait profile with optional seed biases."""
    seed = seed_traits or {}

    def r(name: str, lo: float = 0.2, hi: float = 0.8) -> float:
        base = seed.get(name, random.uniform(lo, hi))
        return round(max(0.0, min(1.0, base + random.gauss(0, 0.08))), 3)

    inherited = InheritedTraitSet(
        height_tendency=r("height_tendency"),
        build_tendency=r("build_tendency"),
        hair_darkness=r("hair_darkness"),
        hair_thickness=r("hair_thickness"),
        eye_lightness=r("eye_lightness"),
        stamina_tendency=r("stamina_tendency"),
        temperament_baseline=r("temperament_baseline"),
        sociability_tendency=r("sociability_tendency"),
        risk_taking_tendency=r("risk_taking_tendency"),
        learning_aptitude=r("learning_aptitude"),
        emotional_reactivity=r("emotional_reactivity"),
        health_resilience=r("health_resilience"),
    )
    learned = LearnedTraitSet(
        confidence=r("confidence"),
        empathy=r("empathy"),
        ambition=r("ambition"),
        creativity=r("creativity"),
        stubbornness=r("stubbornness"),
        loyalty=r("loyalty"),
        humour=r("humour"),
        work_ethic=r("work_ethic"),
        romanticism=r("romanticism"),
        curiosity=r("curiosity"),
        resilience=r("resilience"),
        rebelliousness=r("rebelliousness"),
    )
    return TraitProfile(inherited=inherited, learned=learned)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def generate_character(
    *,
    current_year: int,
    age: int | None = None,
    sex: Sex | None = None,
    last_name: str | None = None,
    seed_traits: dict | None = None,
) -> Character:
    """Generate a brand-new character with no parents."""
    if sex is None:
        sex = _random_sex()
    if age is None:
        age = random.randint(18, 45)

    first, last = _random_name(sex, last_name)
    birthday = _random_birthday(current_year, age)
    traits = _random_base_traits(seed_traits)
    appearance = InheritanceEngine.derive_appearance(traits.inherited, sex.value)

    char = Character(
        first_name=first,
        last_name=last,
        sex=sex,
        birthday=birthday,
        birth_year=current_year - age,
        traits=traits,
        appearance=appearance,
        occupation=random.choice(_OCCUPATIONS),
        life_values=random.sample(_LIFE_VALUES, k=random.randint(2, 4)),
        current_goals=random.sample(_GOALS, k=random.randint(1, 3)),
        education=EducationProfile(
            level=random.choice(["basic", "basic", "intermediate", "advanced"]),
            years_completed=min(age - 6, random.randint(4, 12)) if age > 6 else 0,
            school_performance=round(random.uniform(0.3, 0.9), 2),
        ),
    )
    char.update_life_stage(current_year)
    return char


def generate_child(
    mother: Character,
    father: Character,
    world: "WorldState",
) -> Character:
    """Generate a child from two parents, inheriting biological traits."""
    sex = _random_sex()
    last_name = father.last_name  # patrilineal by default for now

    # Collect grandparent trait sets
    grandparents: list[InheritedTraitSet] = []
    for gp_id in [father.mother_id, father.father_id, mother.mother_id, mother.father_id]:
        if gp_id and gp_id in world.characters:
            grandparents.append(world.characters[gp_id].traits.inherited)

    child_inherited = InheritanceEngine.combine(
        parent_a=mother.traits.inherited,
        parent_b=father.traits.inherited,
        grandparents=grandparents,
    )

    # Learned traits start near zero / midpoint and develop via upbringing
    child_learned = _initial_learned_from_parents(mother, father)

    traits = TraitProfile(inherited=child_inherited, learned=child_learned)
    appearance = InheritanceEngine.derive_appearance(child_inherited, sex.value)

    first, _ = _random_name(sex, last_name)

    child = Character(
        first_name=first,
        last_name=last_name,
        sex=sex,
        birthday=_random_birthday(world.current_year, 0),
        birth_year=world.current_year,
        traits=traits,
        appearance=appearance,
        mother_id=mother.id,
        father_id=father.id,
        dynasty_id=father.dynasty_id or mother.dynasty_id,
        household_id=mother.household_id or father.household_id,
        life_stage=LifeStage.INFANT,
    )
    return child


def _initial_learned_from_parents(
    mother: Character, father: Character
) -> LearnedTraitSet:
    """Children's learned traits start as a blended low-weight parental average."""
    ml = mother.traits.learned
    fl = father.traits.learned

    def blend(a: float, b: float) -> float:
        """Blend two parental values with noise — child hasn't developed yet."""
        return round(max(0.0, min(1.0, (a + b) / 2.0 * 0.5 + random.gauss(0.25, 0.08))), 3)

    return LearnedTraitSet(
        confidence=blend(ml.confidence, fl.confidence),
        empathy=blend(ml.empathy, fl.empathy),
        ambition=blend(ml.ambition, fl.ambition),
        creativity=blend(ml.creativity, fl.creativity),
        stubbornness=blend(ml.stubbornness, fl.stubbornness),
        loyalty=blend(ml.loyalty, fl.loyalty),
        humour=blend(ml.humour, fl.humour),
        work_ethic=blend(ml.work_ethic, fl.work_ethic),
        romanticism=blend(ml.romanticism, fl.romanticism),
        curiosity=blend(ml.curiosity, fl.curiosity),
        resilience=blend(ml.resilience, fl.resilience),
        rebelliousness=blend(ml.rebelliousness, fl.rebelliousness),
    )


def apply_upbringing(character: Character, world: "WorldState") -> None:
    """Update learned traits based on household environment and life stage.

    Called once per year for children and teenagers.
    """
    if character.life_stage not in {LifeStage.CHILD, LifeStage.TEENAGER, LifeStage.INFANT}:
        return

    household = (
        world.households.get(character.household_id)
        if character.household_id
        else None
    )

    stability = household.stability if household else 0.5
    wealth = household.wealth if household else 0.5

    learned = character.traits.learned

    # Stable, wealthy households grow confidence and reduce rebelliousness
    confidence_delta = (stability - 0.5) * 0.04 + (wealth - 0.5) * 0.02
    rebellion_delta = -(stability - 0.5) * 0.05

    # Parental empathy shapes child empathy
    parent_empathy = 0.5
    for p_id in [character.mother_id, character.father_id]:
        if p_id and p_id in world.characters:
            parent_empathy = (parent_empathy + world.characters[p_id].traits.learned.empathy) / 2.0

    def update(current: float, delta: float) -> float:
        return round(max(0.0, min(1.0, current + delta + random.gauss(0, 0.015))), 3)

    character.traits.learned = LearnedTraitSet(
        confidence=update(learned.confidence, confidence_delta),
        empathy=update(learned.empathy, (parent_empathy - learned.empathy) * 0.08),
        ambition=update(learned.ambition, 0.01),
        creativity=update(learned.creativity, random.gauss(0, 0.01)),
        stubbornness=update(learned.stubbornness, random.gauss(0, 0.01)),
        loyalty=update(learned.loyalty, (stability - 0.5) * 0.03),
        humour=update(learned.humour, random.gauss(0, 0.01)),
        work_ethic=update(learned.work_ethic, (wealth - 0.5) * -0.02 + 0.005),
        romanticism=update(learned.romanticism, random.gauss(0, 0.01)),
        curiosity=update(learned.curiosity, 0.01),
        resilience=update(learned.resilience, (stability - 0.5) * -0.03 + 0.01),
        rebelliousness=update(learned.rebelliousness, rebellion_delta),
    )
