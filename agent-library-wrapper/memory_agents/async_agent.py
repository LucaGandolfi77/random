"""Async high-level memory-enabled agent interface."""

from __future__ import annotations

import asyncio
from typing import Sequence

from pydantic import BaseModel

from memory_agents.agent import Agent, ToolDefinition
from memory_agents.client import AsyncOpenRouterClient
from memory_agents.memory import InMemoryStore, MemoryStore
from memory_agents.models import ChatMessage, MemoryConfig, MemoryItem, OpenRouterConfig, StructuredAgentResponse
from memory_agents.utils.prompts import assemble_prompt_messages


class AsyncAgent(Agent):
    """Async variant of Agent for concurrent OpenRouter workloads."""

    def __init__(
        self,
        *,
        name: str,
        system_prompt: str,
        llm: OpenRouterConfig,
        memory: MemoryConfig | None = None,
        store: MemoryStore | None = None,
        client: AsyncOpenRouterClient | None = None,
        tools: Sequence[ToolDefinition] | None = None,
    ) -> None:
        resolved_client = client or AsyncOpenRouterClient(llm)
        super().__init__(
            name=name,
            system_prompt=system_prompt,
            llm=llm,
            memory=memory,
            store=store or InMemoryStore(),
            client=resolved_client,
            tools=tools,
        )
        self.client: AsyncOpenRouterClient = resolved_client
        self._session_locks: dict[str, asyncio.Lock] = {}

    async def ask(
        self,
        text: str,
        *,
        session_id: str | None = None,
        response_model: type[BaseModel] | None = None,
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> StructuredAgentResponse:
        """Send a single user message asynchronously."""

        return await self.run(
            ChatMessage(role="user", content=text),
            session_id=session_id,
            response_model=response_model,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
        )

    async def run(
        self,
        messages: ChatMessage | Sequence[ChatMessage] | str,
        *,
        session_id: str | None = None,
        response_model: type[BaseModel] | None = None,
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> StructuredAgentResponse:
        """Run one async agent turn with per-session serialization."""

        session = self.get_session(session_id)
        lock = self._get_session_lock(session.id)

        async with lock:
            pending_messages = self._normalize_messages(messages)
            query_text = self._select_query_text(pending_messages)
            memory_context, retrieved_memories = await asyncio.to_thread(
                self.memory_manager.prepare_context,
                session,
                query_text,
            )

            request_messages = assemble_prompt_messages(
                system_prompt=self.system_prompt,
                session_messages=session.messages,
                new_messages=pending_messages,
                memory_context=memory_context,
                session_summary=session.summary,
                tools=self.tools,
            )

            result = await self.client.chat(
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

            await asyncio.to_thread(
                self.memory_manager.record_turn,
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

    async def remember(
        self,
        text: str,
        *,
        session_id: str | None = None,
        category: str = "note",
        importance: float = 0.75,
        tags: Sequence[str] | None = None,
    ) -> MemoryItem:
        """Manually store a long-term memory item without blocking the event loop."""

        session = self.get_session(session_id)
        item = MemoryItem(
            session_id=session.id,
            text=text,
            category=category,
            importance=importance,
            tags=list(tags or []),
            source="manual",
        )
        await asyncio.to_thread(self.store.upsert, item)
        return item

    async def retrieve_memories(self, query: str, *, session_id: str | None = None) -> list[MemoryItem]:
        """Retrieve long-term memories asynchronously."""

        session = self.get_session(session_id)
        return await asyncio.to_thread(self.memory_manager.retrieve, session_id=session.id, query_text=query)

    async def aclose(self) -> None:
        """Close the underlying async client if it supports async cleanup."""

        aclose = getattr(self.client, "aclose", None)
        if callable(aclose):
            await aclose()

    async def __aenter__(self) -> "AsyncAgent":
        return self

    async def __aexit__(self, *_: object) -> None:
        await self.aclose()

    def _get_session_lock(self, session_id: str) -> asyncio.Lock:
        lock = self._session_locks.get(session_id)
        if lock is None:
            lock = asyncio.Lock()
            self._session_locks[session_id] = lock
        return lock