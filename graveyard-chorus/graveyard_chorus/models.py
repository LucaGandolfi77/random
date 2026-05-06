from __future__ import annotations

from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field

SeasonName = Literal["spring", "summer", "autumn", "winter"]
LifeStage = Literal["child", "adolescent", "adult", "elder"]
SocialClass = Literal["working", "middling", "merchant", "gentry"]
RelationshipKind = Literal[
    "parent",
    "child",
    "sibling",
    "spouse",
    "lover",
    "cousin",
    "rival",
    "friend",
    "neighbor",
    "patron",
]
ActionKind = Literal[
    "work",
    "gossip",
    "help",
    "court",
    "reconcile",
    "feud",
    "conceal",
    "reveal",
    "reflect",
    "care",
]


def make_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:10]}"


class ModelBase(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class MemoryRecord(ModelBase):
    id: str = Field(default_factory=lambda: make_id("mem"))
    origin: Literal["self", "family", "town"] = "self"
    year: int
    season: SeasonName
    category: str
    summary: str
    emotional_weight: float = 0.0
    recency_weight: float = 1.0
    participants: list[str] = Field(default_factory=list)
    public: bool = False
    source_event_id: str | None = None
    tags: list[str] = Field(default_factory=list)
    contradictory_to_public_story: bool = False
    reflection: str | None = None


class Secret(ModelBase):
    id: str = Field(default_factory=lambda: make_id("secret"))
    owner_id: str
    summary: str
    truth: str
    severity: int = 5
    target_ids: list[str] = Field(default_factory=list)
    inherited_by: list[str] = Field(default_factory=list)
    public_risk: float = 0.0
    revealed: bool = False
    revealed_year: int | None = None
    tags: list[str] = Field(default_factory=list)


class Relationship(ModelBase):
    id: str = Field(default_factory=lambda: make_id("rel"))
    source_id: str
    target_id: str
    kind: RelationshipKind
    affinity: float = 0.0
    trust: float = 0.0
    intimacy: float = 0.0
    dependency: float = 0.0
    rivalry: float = 0.0
    family_tie: bool = False
    public_label: str = ""
    event_history: list[str] = Field(default_factory=list)


class ReputationProfile(ModelBase):
    admired_for: list[str] = Field(default_factory=list)
    suspected_for: list[str] = Field(default_factory=list)
    social_rank: float = 0.0
    trustworthiness: float = 0.0
    scandal: float = 0.0
    warmth: float = 0.0
    gossip_topics: dict[str, float] = Field(default_factory=dict)
    public_summary: str = ""


class LifeEvent(ModelBase):
    id: str = Field(default_factory=lambda: make_id("life"))
    year: int
    season: SeasonName
    event_type: str
    title: str
    description: str
    participant_ids: list[str] = Field(default_factory=list)
    district: str | None = None
    public: bool = True
    impact: float = 0.0
    tags: list[str] = Field(default_factory=list)
    secret_ids: list[str] = Field(default_factory=list)


class TownEvent(ModelBase):
    id: str = Field(default_factory=lambda: make_id("town"))
    year: int
    season: SeasonName
    title: str
    description: str
    district: str | None = None
    institution: str | None = None
    family_ids: list[str] = Field(default_factory=list)
    public_impact: float = 0.0
    economic_shift: str | None = None
    gossip_theme: str | None = None
    tags: list[str] = Field(default_factory=list)


class ChronicleEntry(ModelBase):
    id: str = Field(default_factory=lambda: make_id("chron"))
    year: int
    season: SeasonName | None = None
    title: str
    summary: str
    mood: str
    linked_event_ids: list[str] = Field(default_factory=list)
    linked_character_ids: list[str] = Field(default_factory=list)
    contradictions: list[str] = Field(default_factory=list)
    model_used: str | None = None


class Household(ModelBase):
    id: str = Field(default_factory=lambda: make_id("household"))
    name: str
    district: str
    member_ids: list[str] = Field(default_factory=list)
    steward_id: str | None = None
    status: str
    assets: list[str] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)


class Family(ModelBase):
    id: str = Field(default_factory=lambda: make_id("family"))
    name: str
    origin: str
    branch: str
    class_status: SocialClass
    motto: str
    member_ids: list[str] = Field(default_factory=list)
    allied_family_ids: list[str] = Field(default_factory=list)
    feud_family_ids: list[str] = Field(default_factory=list)
    inherited_secrets: list[str] = Field(default_factory=list)
    inherited_loyalties: list[str] = Field(default_factory=list)
    collective_memory: list[MemoryRecord] = Field(default_factory=list)
    chronicle_notes: list[str] = Field(default_factory=list)


class Character(ModelBase):
    id: str = Field(default_factory=lambda: make_id("char"))
    full_name: str
    given_name: str
    surname: str
    age: int
    birth_year: int
    death_year: int | None = None
    gender: str
    family_id: str
    lineage_branch: str
    household_id: str
    class_status: SocialClass
    occupation: str
    life_stage: LifeStage
    family_origin: str
    alive: bool = True
    desires: list[str] = Field(default_factory=list)
    fears: list[str] = Field(default_factory=list)
    virtues: list[str] = Field(default_factory=list)
    flaws: list[str] = Field(default_factory=list)
    private_voice: str
    public_voice: str
    poetic_voice: str
    biography: str = ""
    health: float = 1.0
    parents: list[str] = Field(default_factory=list)
    children: list[str] = Field(default_factory=list)
    siblings: list[str] = Field(default_factory=list)
    grandparents: list[str] = Field(default_factory=list)
    spouses: list[str] = Field(default_factory=list)
    lovers: list[str] = Field(default_factory=list)
    cousins: list[str] = Field(default_factory=list)
    memories: list[MemoryRecord] = Field(default_factory=list)
    secrets: list[Secret] = Field(default_factory=list)
    relationships: dict[str, Relationship] = Field(default_factory=dict)
    reputation: ReputationProfile = Field(default_factory=ReputationProfile)
    last_reflection: str = ""

    def primary_secret(self) -> Secret | None:
        return sorted(self.secrets, key=lambda item: item.severity, reverse=True)[0] if self.secrets else None

    def is_available_for_courtship(self) -> bool:
        return self.alive and self.life_stage == "adult" and self.age >= 18


class ActionDecision(ModelBase):
    actor_id: str
    kind: ActionKind
    target_id: str | None = None
    intent: str
    urgency: float = 0.0
    supporting_memory_ids: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)


class Epitaph(ModelBase):
    id: str = Field(default_factory=lambda: make_id("epitaph"))
    character_id: str
    character_name: str
    year_written: int
    voice: str
    text: str
    referenced_character_ids: list[str] = Field(default_factory=list)
    referenced_event_ids: list[str] = Field(default_factory=list)
    hidden_truths: list[str] = Field(default_factory=list)
    public_contradictions: list[str] = Field(default_factory=list)
    mood: str
    actual_model: str | None = None


class CemeteryRecord(ModelBase):
    town_name: str
    generated_at_year: int
    epitaphs: list[Epitaph] = Field(default_factory=list)
    shared_motifs: list[str] = Field(default_factory=list)
    cross_references: dict[str, list[str]] = Field(default_factory=dict)


class SimulationConfig(ModelBase):
    start_year: int = 1901
    years_to_simulate: int = 24
    random_seed: int = 7
    llm_enabled: bool = True
    offline_mode: bool = False
    memory_limit: int = 24
    summary_interval_years: int = 6
    birth_base_chance: float = 0.18
    death_base_chance: float = 0.015
    relationship_decay: float = 0.06
    primary_model: str = "openrouter/free"
    fallback_models: list[str] = Field(default_factory=list)
    anthology_title: str = "Graveyard Chorus"


class TownState(ModelBase):
    town_name: str
    current_year: int
    districts: list[str] = Field(default_factory=list)
    social_clusters: list[str] = Field(default_factory=list)
    professions: list[str] = Field(default_factory=list)
    institutions: list[str] = Field(default_factory=list)
    seasonal_rhythms: dict[str, str] = Field(default_factory=dict)
    festivals: list[str] = Field(default_factory=list)
    local_scandals: list[str] = Field(default_factory=list)
    long_running_feuds: list[str] = Field(default_factory=list)
    unwritten_customs: list[str] = Field(default_factory=list)
    collective_memory: list[MemoryRecord] = Field(default_factory=list)
    economic_conditions: list[str] = Field(default_factory=list)
    political_shifts: list[str] = Field(default_factory=list)
    gossip_themes: list[str] = Field(default_factory=list)
    family_alliances: list[str] = Field(default_factory=list)
    characters: dict[str, Character] = Field(default_factory=dict)
    families: dict[str, Family] = Field(default_factory=dict)
    households: dict[str, Household] = Field(default_factory=dict)
    life_events: list[LifeEvent] = Field(default_factory=list)
    town_events: list[TownEvent] = Field(default_factory=list)
    chronicles: list[ChronicleEntry] = Field(default_factory=list)
    cemetery: CemeteryRecord | None = None
    config: SimulationConfig = Field(default_factory=SimulationConfig)

    def alive_characters(self) -> list[Character]:
        return [character for character in self.characters.values() if character.alive]

    def deceased_characters(self) -> list[Character]:
        return [character for character in self.characters.values() if not character.alive]

    def sorted_characters(self) -> list[Character]:
        return sorted(self.characters.values(), key=lambda character: (character.surname, character.given_name))