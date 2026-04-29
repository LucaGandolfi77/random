"""Tests for OpenRouter client configuration and routing behavior."""

from __future__ import annotations

import json

import httpx

from memory_agents.client import OpenRouterClient
from memory_agents.models import ChatMessage, OpenRouterConfig


def test_client_uses_env_api_key_and_free_model(monkeypatch) -> None:
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    recorded: dict[str, object] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        recorded["headers"] = dict(request.headers)
        recorded["payload"] = json.loads(request.content.decode("utf-8"))
        return httpx.Response(
            200,
            json={
                "id": "resp-1",
                "model": "google/gemini-2.0-flash-exp:free",
                "choices": [{"message": {"content": "Hello from a free model."}}],
                "usage": {"prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15},
            },
        )

    client = OpenRouterClient(
        OpenRouterConfig(model="google/gemini-2.0-flash-exp:free", fallback_model="openrouter/free"),
        http_client=httpx.Client(transport=httpx.MockTransport(handler), base_url="https://openrouter.ai/api/v1"),
    )

    result = client.chat([ChatMessage(role="user", content="Hello")])

    assert result.text == "Hello from a free model."
    assert recorded["headers"]["authorization"] == "Bearer test-key"
    assert recorded["payload"]["model"] == "google/gemini-2.0-flash-exp:free"


def test_client_accepts_openrouter_free_router(monkeypatch) -> None:
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    recorded: dict[str, object] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        recorded["payload"] = json.loads(request.content.decode("utf-8"))
        return httpx.Response(
            200,
            json={
                "id": "resp-2",
                "model": "openrouter/free",
                "choices": [{"message": {"content": "Routed through the free router."}}],
                "usage": {"prompt_tokens": 8, "completion_tokens": 4, "total_tokens": 12},
            },
        )

    client = OpenRouterClient(
        OpenRouterConfig(model="openrouter/free", fallback_model="google/gemini-2.0-flash-exp:free"),
        http_client=httpx.Client(transport=httpx.MockTransport(handler), base_url="https://openrouter.ai/api/v1"),
    )

    result = client.chat([ChatMessage(role="user", content="Hello")])

    assert result.text == "Routed through the free router."
    assert recorded["payload"]["model"] == "openrouter/free"
