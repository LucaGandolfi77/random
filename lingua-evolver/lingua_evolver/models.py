"""Data models for lingua-evolver."""

from __future__ import annotations

from enum import Enum
from typing import Literal
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field


class SemanticCategory(str, Enum):
    """Categories for word meanings."""
    PRONOUN = "pronoun"
    VERB = "verb"
    NOUN = "noun"
    ADJECTIVE = "adjective"
    NUMBER = "number"
    SPATIAL = "spatial"
    TEMPORAL = "temporal"
    UNKNOWN = "unknown"


# Category assignments for known meanings
MEANING_CATEGORIES: dict[str, SemanticCategory] = {
    "io": SemanticCategory.PRONOUN, "tu": SemanticCategory.PRONOUN,
    "lui": SemanticCategory.PRONOUN, "lei": SemanticCategory.PRONOUN,
    "noi": SemanticCategory.PRONOUN, "voi": SemanticCategory.PRONOUN,
    "loro": SemanticCategory.PRONOUN,
    "vedere": SemanticCategory.VERB, "andare": SemanticCategory.VERB,
    "mangiare": SemanticCategory.VERB, "bere": SemanticCategory.VERB,
    "dormire": SemanticCategory.VERB,
    "acqua": SemanticCategory.NOUN, "fuoco": SemanticCategory.NOUN,
    "terra": SemanticCategory.NOUN, "cielo": SemanticCategory.NOUN,
    "sole": SemanticCategory.NOUN, "luna": SemanticCategory.NOUN,
    "amico": SemanticCategory.NOUN, "nemico": SemanticCategory.NOUN,
    "casa": SemanticCategory.NOUN, "via": SemanticCategory.NOUN,
    "monte": SemanticCategory.NOUN, "fiume": SemanticCategory.NOUN,
    "grande": SemanticCategory.ADJECTIVE, "piccolo": SemanticCategory.ADJECTIVE,
    "buono": SemanticCategory.ADJECTIVE, "cattivo": SemanticCategory.ADJECTIVE,
    "caldo": SemanticCategory.ADJECTIVE, "freddo": SemanticCategory.ADJECTIVE,
    "uno": SemanticCategory.NUMBER, "due": SemanticCategory.NUMBER,
    "tre": SemanticCategory.NUMBER, "molti": SemanticCategory.NUMBER,
    "pochi": SemanticCategory.NUMBER,
    "qui": SemanticCategory.SPATIAL, "là": SemanticCategory.SPATIAL,
    "dentro": SemanticCategory.SPATIAL, "fuori": SemanticCategory.SPATIAL,
    "giorno": SemanticCategory.TEMPORAL, "notte": SemanticCategory.TEMPORAL,
    "alba": SemanticCategory.TEMPORAL, "tramonto": SemanticCategory.TEMPORAL,
}


class Phoneme(BaseModel):
    """A single phoneme in the artificial language."""

    model_config = ConfigDict(extra="forbid")

    id: UUID = Field(default_factory=uuid4)
    symbol: str
    frequency: float = Field(default=0.0, ge=0.0, le=1.0)


class Word(BaseModel):
    """A word emerging from phoneme combinations."""

    model_config = ConfigDict(extra="forbid")

    id: UUID = Field(default_factory=uuid4)
    phonemes: list[UUID]
    meaning: str
    category: SemanticCategory = SemanticCategory.UNKNOWN
    frequency: float = Field(default=0.0, ge=0.0, le=1.0)
    coined_generation: int = 0
    source: Literal["emerged", "user_input"] = "emerged"


class GrammarRule(BaseModel):
    """A grammatical rule that has emerged from usage patterns."""

    model_config = ConfigDict(extra="forbid")

    id: UUID = Field(default_factory=uuid4)
    rule_type: str
    pattern: str
    strength: float = Field(default=0.0, ge=0.0, le=1.0)
    emerged_generation: int = 0


class Utterance(BaseModel):
    """A single communication attempt between agents."""

    model_config = ConfigDict(extra="forbid")

    speaker_id: UUID
    listener_id: UUID
    phoneme_sequence: list[UUID]
    intended_meaning: str
    understood: bool
    generation: int


class LanguageAgent(BaseModel):
    """An agent that participates in language evolution."""

    model_config = ConfigDict(extra="forbid")

    id: UUID = Field(default_factory=uuid4)
    name: str
    generation: int = 0
    inventory: list[Phoneme] = Field(default_factory=list)
    lexicon: list[Word] = Field(default_factory=list)
    grammar: list[GrammarRule] = Field(default_factory=list)
    memory: list[Utterance] = Field(default_factory=list)
    fluency_score: float = Field(default=0.0, ge=0.0, le=1.0)


class UserInputWord(BaseModel):
    """A word added by the user via input queue."""

    model_config = ConfigDict(extra="forbid")

    phoneme_symbol: str
    meaning: str
    added_generation: int
    processed: bool = False


class WorldStats(BaseModel):
    """Statistics for the current world state."""

    model_config = ConfigDict(extra="forbid")

    total_words: int = 0
    total_rules: int = 0
    communication_success: float = Field(default=0.0, ge=0.0, le=1.0)
    phoneme_count: int = 0
    avg_fluency: float = Field(default=0.0, ge=0.0, le=1.0)


class LanguageWorld(BaseModel):
    """The complete state of the language simulation world."""

    model_config = ConfigDict(extra="forbid")

    generation: int = 0
    agents: list[LanguageAgent] = Field(default_factory=list)
    shared_lexicon: list[Word] = Field(default_factory=list)
    shared_grammar: list[GrammarRule] = Field(default_factory=list)
    history: list[Utterance] = Field(default_factory=list)
    input_queue: list[UserInputWord] = Field(default_factory=list)
    stats: WorldStats = Field(default_factory=WorldStats)
    semantic_links: list[SemanticLink] = Field(default_factory=list)
    snapshots: list[GenerationSnapshot] = Field(default_factory=list)
    dialogues: list[Dialogue] = Field(default_factory=list)
    communities: list[Community] = Field(default_factory=list)


class LLMResult(BaseModel):
    """Result from an LLM API call."""

    model_config = ConfigDict(extra="forbid")

    content: str
    model_used: str | None = None
    input_tokens: int = 0
    output_tokens: int = 0


class SoundChange(BaseModel):
    """A historical sound change that has occurred."""

    model_config = ConfigDict(extra="forbid")

    id: UUID = Field(default_factory=uuid4)
    change_type: str  # "lenition", "assimilation", "vowel_harmony", "consonant_shift"
    from_phoneme: str
    to_phoneme: str
    generation: int
    frequency: float = Field(default=0.0, ge=0.0, le=1.0)


class SemanticLink(BaseModel):
    """A semantic relationship between two words."""

    model_config = ConfigDict(extra="forbid")

    id: UUID = Field(default_factory=uuid4)
    word1_meaning: str
    word2_meaning: str
    link_type: str  # "synonym", "antonym", "hypernym", "hyponym"
    strength: float = Field(default=0.5, ge=0.0, le=1.0)
    emerged_generation: int = 0


class GenerationSnapshot(BaseModel):
    """Time-series data for a single generation."""

    model_config = ConfigDict(extra="forbid")

    generation: int
    total_words: int
    total_rules: int
    communication_success: float
    phoneme_count: int
    avg_fluency: float
    agent_count: int


class DialogueAct(str, Enum):
    """Types of dialogue acts."""
    STATEMENT = "statement"
    QUESTION = "question"
    CLARIFICATION = "clarification"
    CONFIRMATION = "confirmation"
    DENIAL = "denial"


class DialogueTurn(BaseModel):
    """A single turn in a dialogue."""

    model_config = ConfigDict(extra="forbid")

    agent_id: UUID
    act: DialogueAct
    phoneme_sequence: list[UUID]
    intended_meaning: str
    understood: bool
    generation: int


class Dialogue(BaseModel):
    """A multi-turn conversation between agents."""

    model_config = ConfigDict(extra="forbid")

    id: UUID = Field(default_factory=uuid4)
    participants: list[UUID]
    turns: list[DialogueTurn] = Field(default_factory=list)
    generation: int = 0
    topic: str = ""
    success_rate: float = Field(default=0.0, ge=0.0, le=1.0)


class Community(BaseModel):
    """A sub-population of agents sharing a dialect."""

    model_config = ConfigDict(extra="forbid")

    id: UUID = Field(default_factory=uuid4)
    name: str
    member_ids: list[UUID] = Field(default_factory=list)
    shared_lexicon: list[Word] = Field(default_factory=list)
    shared_grammar: list[GrammarRule] = Field(default_factory=list)
    dialect_divergence: float = Field(default=0.0, ge=0.0, le=1.0)
