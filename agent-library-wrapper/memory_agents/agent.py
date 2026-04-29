"""High-level memory-enabled agent interface."""

from __future__ import annotations

from typing import Any, Protocol, Sequence
from uuid import uuid4

from pydantic import BaseModel

from memory_agents.client import ClientResult, OpenRouterClient
from memory_agents.memory import InMemoryStore, MemoryManager, MemoryStore
from memory_agents.models import (
    ChatMessage,
    ConversationSession,
    MemoryConfig,
    MemoryItem,
    OpenRouterConfig,
    StructuredAgentResponse,
)
from memory_agents.utils.prompts import assemble_prompt_messages


class ToolDefinition(Protocol):
    """Minimal tool protocol kept as a future extension point."""

    name: str
    description: str


class Agent:
    """Production-minded memory-enabled agent backed by OpenRouter."""

    def __init__(
        self,
        *,
        name: str,
        system_prompt: str,
        llm: OpenRouterConfig,
        memory: MemoryConfig | None = None,
        store: MemoryStore | None = None,
        client: OpenRouterClient | None = None,
        tools: Sequence[ToolDefinition] | None = None,
    ) -> None:
        self.name = name
        self.system_prompt = system_prompt
        self.llm = llm
        self.memory_config = memory or MemoryConfig()
        self.store = store or InMemoryStore()
        self.client = client or OpenRouterClient(llm)
        self.tools = list(tools or [])
        self.memory_manager = MemoryManager(config=self.memory_config, store=self.store)
        self._sessions: dict[str, ConversationSession] = {}
        self._default_session_id = "default"

    def ask(
        self,
        text: str,
        *,
        session_id: str | None = None,
        response_model: type[BaseModel] | None = None,
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> StructuredAgentResponse:
        """Send a single user message to the agent and return a normalized response."""

        return self.run(
            ChatMessage(role="user", content=text),
            session_id=session_id,
            response_model=response_model,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
        )

    def run(
        self,
        messages: ChatMessage | Sequence[ChatMessage] | str,
        *,
        session_id: str | None = None,
        response_model: type[BaseModel] | None = None,
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> StructuredAgentResponse:
        """Run one agent turn with automatic memory retrieval and persistence."""

        session = self.get_session(session_id)
        pending_messages = self._normalize_messages(messages)
        query_text = self._select_query_text(pending_messages)
        memory_context, retrieved_memories = self.memory_manager.prepare_context(session, query_text)

        request_messages = assemble_prompt_messages(
            system_prompt=self.system_prompt,
            session_messages=session.messages,
            new_messages=pending_messages,
            memory_context=memory_context,
            session_summary=session.summary,
            tools=self.tools,
        )

        result = self.client.chat(
            request_messages,
            response_model=response_model,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
        )

        assistant_text = self._select_response_text(result)
        assistant_message = ChatMessage(
            role="assistant",
            content=assistant_text,
            metadata={
                "model": result.metadata.model,
                "structured_output": result.metadata.structured_output,
            },
        )

        self.memory_manager.record_turn(
            session=session,
            incoming_messages=pending_messages,
            assistant_message=assistant_message,
        )

        return StructuredAgentResponse(
            text=assistant_text,
            data=result.parsed,
            metadata=result.metadata,
            memories_used=retrieved_memories,
        )

    def get_session(self, session_id: str | None = None) -> ConversationSession:
        """Get or create a conversation session."""

        resolved_id = session_id or self._default_session_id
        if resolved_id not in self._sessions:
            self._sessions[resolved_id] = ConversationSession(id=resolved_id, agent_name=self.name)
        return self._sessions[resolved_id]

    def list_sessions(self) -> list[ConversationSession]:
        """Return all in-memory conversation sessions."""

        return sorted(self._sessions.values(), key=lambda session: session.updated_at)

    def reset_session(self, session_id: str) -> None:
        """Clear the in-memory state for a session while preserving long-term memory."""

        self._sessions.pop(session_id, None)

    def remember(
        self,
        text: str,
        *,
        session_id: str | None = None,
        category: str = "note",
        importance: float = 0.75,
        tags: Sequence[str] | None = None,
    ) -> MemoryItem:
        """Manually store a long-term memory item."""

        session = self.get_session(session_id)
        item = MemoryItem(
            session_id=session.id,
            text=text,
            category=category,
            importance=importance,
            tags=list(tags or []),
            source="manual",
        )
        self.store.upsert(item)
        return item

    def retrieve_memories(self, query: str, *, session_id: str | None = None) -> list[MemoryItem]:
        """Expose memory retrieval for inspection or custom flows."""

        session = self.get_session(session_id)
        return self.memory_manager.retrieve(session_id=session.id, query_text=query)

    def _normalize_messages(self, value: ChatMessage | Sequence[ChatMessage] | str) -> list[ChatMessage]:
        if isinstance(value, str):
            return [ChatMessage(role="user", content=value)]
        if isinstance(value, ChatMessage):
            return [value]
        return list(value)

    def _select_query_text(self, messages: Sequence[ChatMessage]) -> str:
        for message in reversed(messages):
            if message.role == "user":
                return message.content
        return messages[-1].content if messages else ""

    def _select_response_text(self, result: ClientResult[Any]) -> str:
        parsed = result.parsed
        if isinstance(parsed, BaseModel):
            for field_name in ("text", "message", "answer", "response", "content"):
                value = getattr(parsed, field_name, None)
                if isinstance(value, str) and value.strip():
                    return value.strip()
            return parsed.model_dump_json(indent=2)
        if isinstance(parsed, dict):
            for field_name in ("text", "message", "answer", "response", "content"):
                value = parsed.get(field_name)
                if isinstance(value, str) and value.strip():
                    return value.strip()
        return result.text
