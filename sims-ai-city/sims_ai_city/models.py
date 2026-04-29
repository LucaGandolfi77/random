"""Typed models for characters, relationships, world state, and chronicles."""

from __future__ import annotations

from enum import Enum
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field


class Season(str, Enum):
    SPRING = "spring"
    SUMMER = "summer"
    AUTUMN = "autumn"
    WINTER = "winter"


class AgeStage(str, Enum):
    CHILD = "child"
    TEEN = "teen"
    ADULT = "adult"
    ELDER = "elder"


class LocationKind(str, Enum):
    PLAZA = "plaza"
    CAFE = "cafe"
    PARK = "park"
    MARKET = "market"
    GARDEN = "garden"
    HALL = "hall"
    RIVERBANK = "riverbank"
    HOUSE = "house"


class RelationshipStatus(str, Enum):
    STRANGERS = "strangers"
    ACQUAINTANCES = "acquaintances"
    FRIENDS = "friends"
    RIVALS = "rivals"
    COURTING = "courting"
    SPOUSES = "spouses"
    EXES = "exes"
    FAMILY = "family"


class LifeEventType(str, Enum):
    MEETING = "meeting"
    GOSSIP = "gossip"
    FRIENDSHIP = "friendship"
    ARGUMENT = "argument"
    FEUD = "feud"
    FLIRT = "flirt"
    RECONCILIATION = "reconciliation"
    MARRIAGE = "marriage"
    BIRTH = "birth"
    BIRTHDAY = "birthday"
    FESTIVAL = "festival"
    GIFT = "gift"
    BREAKUP = "breakup"
    FAMILY = "family"
    PASSING = "passing"
    MILESTONE = "milestone"


class SimulationDate(BaseModel):
    """Simulation date expressed as day, season, and year."""

    model_config = ConfigDict(extra="forbid")

    day: int = Field(default=1, ge=1)
    season: Season = Season.SPRING
    year: int = Field(default=1, ge=1)

    @property
    def label(self) -> str:
        return f"Day {self.day} of {self.season.value.capitalize()}, Year {self.year}"


class TraitProfile(BaseModel):
    """Core inherited and expressive traits for a character."""

    model_config = ConfigDict(extra="forbid")

    temperament: str
    social_style: str
    ambition: float = Field(ge=0.0, le=1.0)
    humor: float = Field(ge=0.0, le=1.0)
    patience: float = Field(ge=0.0, le=1.0)
    romance_style: str
    quirks: list[str] = Field(default_factory=list)
    weird_habits: list[str] = Field(default_factory=list)
    values: list[str] = Field(default_factory=list)
    talents: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)
    visual_descriptors: list[str] = Field(default_factory=list)
    hidden_traits: list[str] = Field(default_factory=list)
    inherited_from: list[str] = Field(default_factory=list)
    mutation_notes: list[str] = Field(default_factory=list)


class Character(BaseModel):
    """A living resident of the town."""

    model_config = ConfigDict(extra="forbid")

    id: str = Field(default_factory=lambda: str(uuid4()))
    first_name: str
    last_name: str
    age_years: int = Field(ge=0)
    age_stage: AgeStage
    birthday_day_of_year: int = Field(ge=1)
    traits: TraitProfile
    appearance_descriptors: list[str] = Field(default_factory=list)
    hobbies: list[str] = Field(default_factory=list)
    social_needs: float = Field(default=0.5, ge=0.0, le=1.0)
    romance_preferences: list[str] = Field(default_factory=list)
    friendship_tendency: float = Field(default=0.5, ge=0.0, le=1.0)
    ambition_level: float = Field(default=0.5, ge=0.0, le=1.0)
    weird_habits: list[str] = Field(default_factory=list)
    family_background: str = ""
    home_location_id: str
    favorite_location_id: str | None = None
    family_id: str | None = None
    parent_ids: list[str] = Field(default_factory=list)
    children_ids: list[str] = Field(default_factory=list)
    spouse_id: str | None = None
    mood: str = "curious"
    reputation: str = "mildly suspicious"
    alive: bool = True
    fertility_cooldown: int = Field(default=0, ge=0)
    notable_memories: list[str] = Field(default_factory=list)
    birth_year: int = Field(default=0)

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"


class Relationship(BaseModel):
    """A social bond between two characters."""

    model_config = ConfigDict(extra="forbid")

    key: str
    character_a_id: str
    character_b_id: str
    familiarity: float = Field(default=0.0, ge=0.0, le=1.0)
    friendship: float = Field(default=0.0, ge=-1.0, le=1.0)
    romance: float = Field(default=0.0, ge=-1.0, le=1.0)
    resentment: float = Field(default=0.0, ge=0.0, le=1.0)
    trust: float = Field(default=0.0, ge=-1.0, le=1.0)
    jealousy: float = Field(default=0.0, ge=0.0, le=1.0)
    spark: float = Field(default=0.0, ge=0.0, le=1.0)
    status: RelationshipStatus = RelationshipStatus.STRANGERS
    last_interaction_day: int = 0
    shared_history: list[str] = Field(default_factory=list)


class Family(BaseModel):
    """A family lineage with traditions and recurring drama."""

    model_config = ConfigDict(extra="forbid")

    id: str = Field(default_factory=lambda: str(uuid4()))
    surname: str
    member_ids: list[str] = Field(default_factory=list)
    founder_ids: list[str] = Field(default_factory=list)
    traditions: list[str] = Field(default_factory=list)
    legendary_hook: str = ""
    scandals: list[str] = Field(default_factory=list)
    home_location_id: str | None = None


class MemoryRecord(BaseModel):
    """Inspector-facing memory record mirrored from agent memory usage."""

    model_config = ConfigDict(extra="forbid")

    id: str = Field(default_factory=lambda: str(uuid4()))
    character_id: str
    about_character_id: str | None = None
    summary: str
    category: str
    intensity: float = Field(default=0.5, ge=0.0, le=1.0)
    created_day_index: int = Field(default=0, ge=0)
    tags: list[str] = Field(default_factory=list)


class LifeEvent(BaseModel):
    """A logged event in the town's social history."""

    model_config = ConfigDict(extra="forbid")

    id: str = Field(default_factory=lambda: str(uuid4()))
    day_index: int = Field(ge=0)
    season: Season
    year: int = Field(ge=1)
    type: LifeEventType
    headline: str
    description: str
    actor_ids: list[str] = Field(default_factory=list)
    family_ids: list[str] = Field(default_factory=list)
    location_id: str | None = None
    relationship_changes: dict[str, dict[str, float]] = Field(default_factory=dict)
    tags: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class InheritanceRule(BaseModel):
    """A simplified inheritance rule used for generating descendants."""

    model_config = ConfigDict(extra="forbid")

    trait_name: str
    inheritance_mode: str
    mutation_chance: float = Field(default=0.05, ge=0.0, le=1.0)
    surprise_pool: list[str] = Field(default_factory=list)
    hidden_pool: list[str] = Field(default_factory=list)


class Location(BaseModel):
    """A town location that shapes social opportunities."""

    model_config = ConfigDict(extra="forbid")

    id: str
    name: str
    kind: LocationKind
    description: str
    mood: str
    gossip_bonus: float = Field(default=0.0, ge=0.0, le=1.0)
    romance_bonus: float = Field(default=0.0, ge=0.0, le=1.0)
    drama_bonus: float = Field(default=0.0, ge=0.0, le=1.0)
    child_friendliness: float = Field(default=0.0, ge=0.0, le=1.0)
    seasonal_events: list[str] = Field(default_factory=list)
    traditions: list[str] = Field(default_factory=list)


class YearSummary(BaseModel):
    """A narrative summary for one simulation year."""

    model_config = ConfigDict(extra="forbid")

    year: int = Field(ge=1)
    title: str
    highlights: list[str] = Field(default_factory=list)
    births: int = 0
    marriages: int = 0
    feuds: int = 0
    reconciliations: int = 0
    departures: int = 0
    gossip_legends: list[str] = Field(default_factory=list)
    family_spotlights: list[str] = Field(default_factory=list)


class WorldState(BaseModel):
    """The full persistent simulation state."""

    model_config = ConfigDict(extra="forbid")

    town_name: str
    town_motto: str
    current_date: SimulationDate
    day_index: int = Field(default=0, ge=0)
    random_seed: int
    characters: dict[str, Character] = Field(default_factory=dict)
    relationships: dict[str, Relationship] = Field(default_factory=dict)
    families: dict[str, Family] = Field(default_factory=dict)
    locations: dict[str, Location] = Field(default_factory=dict)
    events: list[LifeEvent] = Field(default_factory=list)
    year_summaries: list[YearSummary] = Field(default_factory=list)
    memory_records: list[MemoryRecord] = Field(default_factory=list)
    active_story_hooks: list[str] = Field(default_factory=list)
    last_yearly_recap: str = ""
