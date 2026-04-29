"""Tests for the high-level Agent interface."""

from __future__ import annotations

from pydantic import BaseModel

from memory_agents import Agent, InMemoryStore, MemoryConfig, OpenRouterConfig
from memory_agents.client import ClientResult
from memory_agents.models import ChatMessage, RunMetadata, UsageStats


class FakeClient:
    """Minimal client double used for agent tests."""

    def __init__(self) -> None:
        self.calls: list[list[ChatMessage]] = []

    def chat(self, messages, response_model=None, model=None, temperature=None, max_tokens=None):
        self.calls.append(list(messages))
        parsed = None
        text = "I will remember that."
        if response_model is not None:
            parsed = response_model(message="Structured hello")
            text = '{"message": "Structured hello"}'

        return ClientResult(
            text=text,
            parsed=parsed,
            metadata=RunMetadata(model=model or "fake-model", usage=UsageStats()),
        )


class StructuredReply(BaseModel):
    message: str


def test_agent_stores_and_reuses_memory() -> None:
    fake_client = FakeClient()
    store = InMemoryStore()
    agent = Agent(
        name="Companion",
        system_prompt="You are a helpful assistant.",
        llm=OpenRouterConfig(api_key="test-key"),
        memory=MemoryConfig(auto_store=True, long_term_top_k=5),
        store=store,
        client=fake_client,
    )

    agent.ask("My favorite programming language is Python.")
    agent.ask("What is my favorite programming language?")

    memories = store.list(session_id="default")
    assert memories
    assert any("favorite programming language is Python" in item.text for item in memories)
    assert "Relevant long-term memory" in fake_client.calls[-1][0].content
    assert "favorite programming language is Python" in fake_client.calls[-1][0].content


def test_agent_extracts_text_from_structured_reply() -> None:
    fake_client = FakeClient()
    agent = Agent(
        name="StructuredAssistant",
        system_prompt="You are a structured assistant.",
        llm=OpenRouterConfig(api_key="test-key"),
        client=fake_client,
    )

    response = agent.ask("Say hello.", response_model=StructuredReply)

    assert response.text == "Structured hello"
    assert isinstance(response.data, StructuredReply)
