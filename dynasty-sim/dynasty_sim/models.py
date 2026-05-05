"""Core Pydantic data models for Dynasty Sim.

All data in the simulation is represented as Pydantic v2 models so that:
- serialisation/deserialisation is automatic
- validation is strict at the boundary
- the codebase is easy to extend
"""

from __future__ import annotations

import random
from datetime import date
from enum import Enum
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Enumerations
# ---------------------------------------------------------------------------


class Sex(str, Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"


class LifeStage(str, Enum):
    INFANT = "infant"          # 0-3
    CHILD = "child"            # 4-12
    TEENAGER = "teenager"      # 13-17
    YOUNG_ADULT = "young_adult"  # 18-29
    ADULT = "adult"            # 30-59
    ELDER = "elder"            # 60+
    DECEASED = "deceased"


class RelationshipType(str, Enum):
    STRANGER = "stranger"
    ACQUAINTANCE = "acquaintance"
    FRIEND = "friend"
    CLOSE_FRIEND = "close_friend"
    RIVAL = "rival"
    ENEMY = "enemy"
    CRUSH = "crush"
    ROMANTIC_PARTNER = "romantic_partner"
    SPOUSE = "spouse"
    EX_SPOUSE = "ex_spouse"
    PARENT = "parent"
    CHILD = "child"
    SIBLING = "sibling"
    GRANDPARENT = "grandparent"
    GRANDCHILD = "grandchild"
    COUSIN = "cousin"
    MENTOR = "mentor"
    MENTEE = "mentee"


class Season(str, Enum):
    SPRING = "spring"
    SUMMER = "summer"
    AUTUMN = "autumn"
    WINTER = "winter"


class EventType(str, Enum):
    BIRTH = "birth"
    DEATH = "death"
    MARRIAGE = "marriage"
    DIVORCE = "divorce"
    MEETING = "meeting"
    FRIENDSHIP_FORMED = "friendship_formed"
    RIVALRY_FORMED = "rivalry_formed"
    ROMANCE_STARTED = "romance_started"
    ROMANCE_ENDED = "romance_ended"
    CHILD_BORN = "child_born"
    EDUCATION_MILESTONE = "education_milestone"
    LIFE_EVENT = "life_event"
    SCANDAL = "scandal"
    ACHIEVEMENT = "achievement"


# ---------------------------------------------------------------------------
# Trait system
# ---------------------------------------------------------------------------


class TraitGene(BaseModel):
    """A single heritable trait gene with dominant/recessive behaviour."""

    model_config = ConfigDict(extra="forbid")

    name: str
    value: float = Field(ge=0.0, le=1.0, description="0=minimal expression, 1=maximal expression")
    dominant: bool = False
    mutation_rate: float = Field(default=0.02, ge=0.0, le=1.0)

    def mutate(self) -> "TraitGene":
        """Return a (possibly mutated) copy of this gene."""
        if random.random() < self.mutation_rate:
            delta = random.gauss(0, 0.1)
            new_value = max(0.0, min(1.0, self.value + delta))
            return self.model_copy(update={"value": round(new_value, 3)})
        return self


class InheritedTraitSet(BaseModel):
    """Biological predispositions inherited from parents and grandparents."""

    model_config = ConfigDict(extra="forbid")

    height_tendency: float = Field(default=0.5, ge=0.0, le=1.0)
    build_tendency: float = Field(default=0.5, ge=0.0, le=1.0)
    hair_darkness: float = Field(default=0.5, ge=0.0, le=1.0)
    hair_thickness: float = Field(default=0.5, ge=0.0, le=1.0)
    eye_lightness: float = Field(default=0.5, ge=0.0, le=1.0)
    stamina_tendency: float = Field(default=0.5, ge=0.0, le=1.0)
    temperament_baseline: float = Field(default=0.5, ge=0.0, le=1.0, description="0=phlegmatic, 1=choleric")
    sociability_tendency: float = Field(default=0.5, ge=0.0, le=1.0)
    risk_taking_tendency: float = Field(default=0.5, ge=0.0, le=1.0)
    learning_aptitude: float = Field(default=0.5, ge=0.0, le=1.0)
    emotional_reactivity: float = Field(default=0.5, ge=0.0, le=1.0)
    health_resilience: float = Field(default=0.5, ge=0.0, le=1.0)
    raw_genes: list[TraitGene] = Field(default_factory=list)


class LearnedTraitSet(BaseModel):
    """Traits shaped by upbringing, education, and life experience."""

    model_config = ConfigDict(extra="forbid")

    confidence: float = Field(default=0.5, ge=0.0, le=1.0)
    empathy: float = Field(default=0.5, ge=0.0, le=1.0)
    ambition: float = Field(default=0.5, ge=0.0, le=1.0)
    creativity: float = Field(default=0.5, ge=0.0, le=1.0)
    stubbornness: float = Field(default=0.5, ge=0.0, le=1.0)
    loyalty: float = Field(default=0.5, ge=0.0, le=1.0)
    humour: float = Field(default=0.5, ge=0.0, le=1.0)
    work_ethic: float = Field(default=0.5, ge=0.0, le=1.0)
    romanticism: float = Field(default=0.5, ge=0.0, le=1.0)
    curiosity: float = Field(default=0.5, ge=0.0, le=1.0)
    resilience: float = Field(default=0.5, ge=0.0, le=1.0)
    rebelliousness: float = Field(default=0.5, ge=0.0, le=1.0)


class TraitProfile(BaseModel):
    """Full character trait profile combining inherited and learned traits."""

    model_config = ConfigDict(extra="forbid")

    inherited: InheritedTraitSet = Field(default_factory=InheritedTraitSet)
    learned: LearnedTraitSet = Field(default_factory=LearnedTraitSet)

    def summary(self) -> dict[str, float]:
        """Flat dict of all traits for prompt injection."""
        return {**self.inherited.model_dump(exclude={"raw_genes"}), **self.learned.model_dump()}


# ---------------------------------------------------------------------------
# Education
# ---------------------------------------------------------------------------


class EducationProfile(BaseModel):
    model_config = ConfigDict(extra="forbid")

    level: str = "none"
    years_completed: int = 0
    school_performance: float = Field(default=0.5, ge=0.0, le=1.0)
    mentors: list[str] = Field(default_factory=list, description="Character IDs of mentors")
    skills: list[str] = Field(default_factory=list)
    traumas: list[str] = Field(default_factory=list)
    formative_events: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Memory
# ---------------------------------------------------------------------------


class MemoryRecord(BaseModel):
    """A single memory entry for a character."""

    model_config = ConfigDict(extra="forbid")

    id: str = Field(default_factory=lambda: str(uuid4()))
    subject_id: str = Field(description="Character ID this memory is about")
    event_type: str
    description: str
    emotional_valence: float = Field(default=0.0, ge=-1.0, le=1.0, description="-1=very negative, 1=very positive")
    importance: float = Field(default=0.5, ge=0.0, le=1.0)
    year: int
    day_of_year: int = 0
    tags: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


# ---------------------------------------------------------------------------
# Relationships
# ---------------------------------------------------------------------------


class Relationship(BaseModel):
    """The current relationship state between two characters."""

    model_config = ConfigDict(extra="forbid")

    other_id: str
    rel_type: RelationshipType = RelationshipType.STRANGER
    familiarity: float = Field(default=0.0, ge=0.0, le=1.0)
    trust: float = Field(default=0.5, ge=0.0, le=1.0)
    affection: float = Field(default=0.0, ge=-1.0, le=1.0)
    attraction: float = Field(default=0.0, ge=0.0, le=1.0)
    resentment: float = Field(default=0.0, ge=0.0, le=1.0)
    years_known: int = 0
    last_interaction_year: int = 0
    notes: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Household
# ---------------------------------------------------------------------------


class Household(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    dynasty_id: str | None = None
    location: str = "village"
    wealth: float = Field(default=0.5, ge=0.0, le=1.0)
    stability: float = Field(default=0.7, ge=0.0, le=1.0)
    member_ids: list[str] = Field(default_factory=list)
    head_id: str | None = None
    founded_year: int = 0
    reputation: float = Field(default=0.5, ge=0.0, le=1.0)
    traditions: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Character (the core entity)
# ---------------------------------------------------------------------------


class Character(BaseModel):
    """A full character in the simulation — both data and agent state."""

    model_config = ConfigDict(extra="forbid")

    id: str = Field(default_factory=lambda: str(uuid4()))
    first_name: str
    last_name: str
    sex: Sex = Sex.OTHER
    birthday: date
    birth_year: int
    death_year: int | None = None
    life_stage: LifeStage = LifeStage.INFANT

    # Family
    mother_id: str | None = None
    father_id: str | None = None
    sibling_ids: list[str] = Field(default_factory=list)
    child_ids: list[str] = Field(default_factory=list)
    spouse_id: str | None = None
    ex_spouse_ids: list[str] = Field(default_factory=list)
    household_id: str | None = None
    dynasty_id: str | None = None

    # Traits
    traits: TraitProfile = Field(default_factory=TraitProfile)
    education: EducationProfile = Field(default_factory=EducationProfile)

    # Appearance descriptors (derived from inherited traits + name generation)
    appearance: dict[str, str] = Field(default_factory=dict)

    # Goals and ambitions (updated by agent reasoning)
    current_goals: list[str] = Field(default_factory=list)
    life_values: list[str] = Field(default_factory=list)
    occupation: str = "none"

    # Relationships keyed by other character's ID
    relationships: dict[str, Relationship] = Field(default_factory=dict)

    # Memory
    memories: list[MemoryRecord] = Field(default_factory=list)

    # Simulation bookkeeping
    is_alive: bool = True
    last_active_year: int = 0
    biography_notes: list[str] = Field(default_factory=list)

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"

    def age(self, current_year: int) -> int:
        return current_year - self.birth_year

    def update_life_stage(self, current_year: int) -> None:
        """Update life_stage based on current age."""
        age = self.age(current_year)
        if not self.is_alive:
            self.life_stage = LifeStage.DECEASED
        elif age <= 3:
            self.life_stage = LifeStage.INFANT
        elif age <= 12:
            self.life_stage = LifeStage.CHILD
        elif age <= 17:
            self.life_stage = LifeStage.TEENAGER
        elif age <= 29:
            self.life_stage = LifeStage.YOUNG_ADULT
        elif age <= 59:
            self.life_stage = LifeStage.ADULT
        else:
            self.life_stage = LifeStage.ELDER


# ---------------------------------------------------------------------------
# Family tree
# ---------------------------------------------------------------------------


class FamilyTreeNode(BaseModel):
    model_config = ConfigDict(extra="forbid")

    character_id: str
    parent_ids: list[str] = Field(default_factory=list)
    child_ids: list[str] = Field(default_factory=list)
    spouse_ids: list[str] = Field(default_factory=list)
    generation: int = 0
    dynasty_id: str | None = None


class Dynasty(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    founder_id: str
    member_ids: list[str] = Field(default_factory=list)
    household_ids: list[str] = Field(default_factory=list)
    founded_year: int = 0
    motto: str = ""
    reputation: float = Field(default=0.5, ge=0.0, le=1.0)
    known_traits: list[str] = Field(default_factory=list, description="Traits the dynasty is famous for")
    notable_events: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Simulation events
# ---------------------------------------------------------------------------


class SimulationEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(default_factory=lambda: str(uuid4()))
    event_type: EventType
    year: int
    day_of_year: int = 0
    character_ids: list[str] = Field(default_factory=list)
    description: str
    narrative: str = ""
    metadata: dict[str, Any] = Field(default_factory=dict)


class YearSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    year: int
    season_snapshots: dict[str, str] = Field(default_factory=dict)
    births: list[str] = Field(default_factory=list, description="Character IDs born this year")
    deaths: list[str] = Field(default_factory=list)
    marriages: list[str] = Field(default_factory=list, description="Character IDs married this year")
    events: list[SimulationEvent] = Field(default_factory=list)
    population: int = 0
    narrative: str = ""


# ---------------------------------------------------------------------------
# World state
# ---------------------------------------------------------------------------


class SimulationConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    seed: int = 42
    start_year: int = 1200
    max_years: int = 100
    initial_families: int = 3
    max_population: int = 200
    primary_model: str = "google/gemini-2.0-flash-exp:free"
    fallback_model: str = "openrouter/free"
    use_llm_for_events: bool = True
    use_llm_for_bios: bool = True
    narrative_verbosity: int = Field(default=2, ge=1, le=3, description="1=terse, 2=normal, 3=verbose")


class WorldState(BaseModel):
    model_config = ConfigDict(extra="forbid")

    current_year: int = 1200
    current_day: int = 1
    characters: dict[str, Character] = Field(default_factory=dict)
    households: dict[str, Household] = Field(default_factory=dict)
    dynasties: dict[str, Dynasty] = Field(default_factory=dict)
    family_tree: dict[str, FamilyTreeNode] = Field(default_factory=dict)
    events: list[SimulationEvent] = Field(default_factory=list)
    year_summaries: list[YearSummary] = Field(default_factory=list)
    config: SimulationConfig = Field(default_factory=SimulationConfig)

    def living_characters(self) -> list[Character]:
        return [c for c in self.characters.values() if c.is_alive]

    def get_season(self) -> Season:
        day = self.current_day % 365
        if day < 91:
            return Season.SPRING
        if day < 182:
            return Season.SUMMER
        if day < 274:
            return Season.AUTUMN
        return Season.WINTER
