"""Tests for async client and async agent behavior."""

from __future__ import annotations

import asyncio
import json

import httpx

from memory_agents import AsyncAgent, AsyncOpenRouterClient, InMemoryStore, MemoryConfig, OpenRouterConfig
from memory_agents.client import ClientResult
from memory_agents.models import ChatMessage, RunMetadata, UsageStats


class FakeAsyncClient:
    """Minimal async client double used for AsyncAgent tests."""

    def __init__(self) -> None:
        self.calls: list[dict[str, object]] = []

    async def chat(self, messages, response_model=None, model=None, temperature=None, max_tokens=None):
        await asyncio.sleep(0)
        query = next((message.content for message in reversed(messages) if message.role == "user"), "")
        self.calls.append({"query": query, "messages": list(messages)})
        return ClientResult(
            text="Async response recorded.",
            parsed=None,
            metadata=RunMetadata(model=model or "async-fake-model", usage=UsageStats()),
        )

    async def aclose(self) -> None:
        return None


def test_async_openrouter_client_supports_free_model(monkeypatch) -> None:
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    recorded: dict[str, object] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        recorded["headers"] = dict(request.headers)
        recorded["payload"] = json.loads(request.content.decode("utf-8"))
        return httpx.Response(
            200,
            json={
                "id": "resp-async-1",
                "model": "openrouter/free",
                "choices": [{"message": {"content": "Async hello from the free router."}}],
                "usage": {"prompt_tokens": 7, "completion_tokens": 5, "total_tokens": 12},
            },
        )

    async def exercise() -> tuple[str, dict[str, object]]:
        client = AsyncOpenRouterClient(
            OpenRouterConfig(model="openrouter/free", fallback_model="google/gemini-2.0-flash-exp:free"),
            http_client=httpx.AsyncClient(
                transport=httpx.MockTransport(handler),
                base_url="https://openrouter.ai/api/v1",
            ),
        )
        try:
            result = await client.chat([ChatMessage(role="user", content="Hello")])
            return result.text, recorded
        finally:
            await client.aclose()

    text, observed = asyncio.run(exercise())

    assert text == "Async hello from the free router."
    assert observed["headers"]["authorization"] == "Bearer test-key"
    assert observed["payload"]["model"] == "openrouter/free"


def test_async_agent_handles_concurrent_sessions() -> None:
    async def exercise() -> FakeAsyncClient:
        fake_client = FakeAsyncClient()
        agent = AsyncAgent(
            name="AsyncCompanion",
            system_prompt="You are a helpful assistant.",
            llm=OpenRouterConfig(api_key="test-key"),
            memory=MemoryConfig(auto_store=True, long_term_top_k=5),
            store=InMemoryStore(),
            client=fake_client,
        )

        await asyncio.gather(
            agent.ask("My favorite programming language is Python.", session_id="alpha"),
            agent.ask("My favorite database is SQLite.", session_id="beta"),
        )
        await asyncio.gather(
            agent.ask("What is my favorite programming language?", session_id="alpha"),
            agent.ask("What is my favorite database?", session_id="beta"),
        )

        return fake_client

    fake_client = asyncio.run(exercise())
    alpha_call = next(call for call in fake_client.calls if call["query"] == "What is my favorite programming language?")
    beta_call = next(call for call in fake_client.calls if call["query"] == "What is my favorite database?")
    alpha_system_prompt = alpha_call["messages"][0].content
    beta_system_prompt = beta_call["messages"][0].content

    assert "favorite programming language is Python" in alpha_system_prompt
    assert "favorite database is SQLite" not in alpha_system_prompt
    assert "favorite database is SQLite" in beta_system_prompt
    assert "favorite programming language is Python" not in beta_system_prompt