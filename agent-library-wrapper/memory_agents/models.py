"""Typed data models used by the memory_agents package."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, Literal
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field, field_validator


def _utc_now() -> datetime:
    return datetime.now(tz=UTC)


class ChatMessage(BaseModel):
    """A normalized chat message compatible with OpenRouter chat completions."""

    model_config = ConfigDict(extra="forbid")

    role: Literal["system", "user", "assistant", "tool"]
    content: str = Field(min_length=1)
    name: str | None = None
    created_at: datetime = Field(default_factory=_utc_now)
    metadata: dict[str, Any] = Field(default_factory=dict)


class MemoryItem(BaseModel):
    """A persistent fact, preference, or event captured from a conversation."""

    model_config = ConfigDict(extra="forbid")

    id: str = Field(default_factory=lambda: str(uuid4()))
    session_id: str | None = None
    text: str = Field(min_length=1)
    category: Literal["fact", "preference", "event", "summary", "note"] = "note"
    importance: float = Field(default=0.5, ge=0.0, le=1.0)
    score: float = Field(default=0.0)
    tags: list[str] = Field(default_factory=list)
    source: str = "agent"
    created_at: datetime = Field(default_factory=_utc_now)
    updated_at: datetime = Field(default_factory=_utc_now)
    metadata: dict[str, Any] = Field(default_factory=dict)


class MemoryQuery(BaseModel):
    """A retrieval query for long-term memory search."""

    model_config = ConfigDict(extra="forbid")

    text: str = Field(min_length=1)
    session_id: str | None = None
    top_k: int = Field(default=5, ge=1, le=50)
    tags: list[str] = Field(default_factory=list)
    min_score: float = Field(default=0.0)


class RetrievalResult(BaseModel):
    """A scored retrieval result from the long-term memory store."""

    model_config = ConfigDict(extra="forbid")

    item: MemoryItem
    score: float = Field(default=0.0)
    reasons: list[str] = Field(default_factory=list)


class UsageStats(BaseModel):
    """Token and request accounting for a model invocation."""

    model_config = ConfigDict(extra="forbid")

    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


class RunMetadata(BaseModel):
    """Execution metadata captured for a single agent run."""

    model_config = ConfigDict(extra="forbid")

    request_id: str | None = None
    model: str
    fallback_used: bool = False
    structured_output: bool = False
    retries: int = 0
    duration_ms: int = 0
    usage: UsageStats = Field(default_factory=UsageStats)
    raw_response: str | None = None


class StructuredAgentResponse(BaseModel):
    """Normalized high-level response returned by the agent."""

    model_config = ConfigDict(extra="forbid", arbitrary_types_allowed=True)

    text: str
    data: BaseModel | dict[str, Any] | None = None
    metadata: RunMetadata
    memories_used: list[MemoryItem] = Field(default_factory=list)


class OpenRouterConfig(BaseModel):
    """Configuration for the OpenRouter client."""

    model_config = ConfigDict(extra="forbid")

    api_key: str | None = None
    api_key_env: str = "OPENROUTER_API_KEY"
    base_url: str = "https://openrouter.ai/api/v1"
    app_name: str = "Memory Agents"
    http_referer: str = "https://localhost"
    model: str = "google/gemini-2.0-flash-exp:free"
    fallback_model: str | None = "openrouter/free"
    temperature: float = Field(default=0.2, ge=0.0, le=2.0)
    max_tokens: int = Field(default=1024, ge=1)
    timeout_seconds: float = Field(default=60.0, gt=0.0)
    max_retries: int = Field(default=3, ge=0)
    backoff_seconds: float = Field(default=1.0, ge=0.0)
    enable_streaming: bool = False
    prefer_json_schema: bool = True

    @field_validator("model", "fallback_model")
    @classmethod
    def validate_model_reference(cls, value: str | None) -> str | None:
        if value is None:
            return value
        if not value.strip():
            raise ValueError("Model identifiers must not be blank.")
        return value.strip()


class MemoryConfig(BaseModel):
    """Configuration for short-term and long-term memory behavior."""

    model_config = ConfigDict(extra="forbid")

    short_term_messages: int = Field(default=12, ge=1)
    short_term_max_characters: int = Field(default=12_000, ge=256)
    long_term_top_k: int = Field(default=5, ge=1, le=50)
    long_term_min_score: float = Field(default=0.05, ge=0.0)
    auto_store: bool = True
    summarize_threshold: int = Field(default=18, ge=2)
    summary_window: int = Field(default=10, ge=2)
    memory_importance_threshold: float = Field(default=0.6, ge=0.0, le=1.0)
    max_injected_memories: int = Field(default=5, ge=1, le=20)
    allow_cross_session_search: bool = False


class AgentConfig(BaseModel):
    """Top-level configuration for an agent instance."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    system_prompt: str = Field(min_length=1)
    llm: OpenRouterConfig
    memory: MemoryConfig = Field(default_factory=MemoryConfig)
    tools_enabled: bool = False
    default_session_id: str | None = None


class ConversationSession(BaseModel):
    """State tracked for a single agent conversation session."""

    model_config = ConfigDict(extra="forbid")

    id: str = Field(default_factory=lambda: str(uuid4()))
    agent_name: str
    messages: list[ChatMessage] = Field(default_factory=list)
    summary: str | None = None
    created_at: datetime = Field(default_factory=_utc_now)
    updated_at: datetime = Field(default_factory=_utc_now)
    metadata: dict[str, Any] = Field(default_factory=dict)
