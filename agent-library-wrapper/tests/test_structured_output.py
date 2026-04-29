"""Tests for structured output fallback behavior."""

from __future__ import annotations

import json

import httpx
from pydantic import BaseModel

from memory_agents.client import OpenRouterClient
from memory_agents.models import ChatMessage, OpenRouterConfig


class PersonProfile(BaseModel):
    name: str
    favorite_language: str


def test_structured_output_falls_back_when_strict_schema_fails(monkeypatch) -> None:
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    call_count = {"count": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        payload = json.loads(request.content.decode("utf-8"))
        call_count["count"] += 1

        if "response_format" in payload:
            return httpx.Response(
                400,
                json={"error": {"message": "Strict JSON schema mode is unavailable for this model."}},
            )

        return httpx.Response(
            200,
            json={
                "id": "resp-structured",
                "model": payload["model"],
                "choices": [
                    {
                        "message": {
                            "content": '{"name": "Avery", "favorite_language": "Python"}'
                        }
                    }
                ],
                "usage": {"prompt_tokens": 12, "completion_tokens": 9, "total_tokens": 21},
            },
        )

    client = OpenRouterClient(
        OpenRouterConfig(model="google/gemini-2.0-flash-exp:free", fallback_model="openrouter/free"),
        http_client=httpx.Client(transport=httpx.MockTransport(handler), base_url="https://openrouter.ai/api/v1"),
    )

    result = client.chat([ChatMessage(role="user", content="Return a profile.")], response_model=PersonProfile)

    assert call_count["count"] == 2
    assert isinstance(result.parsed, PersonProfile)
    assert result.parsed.favorite_language == "Python"
    assert result.metadata.structured_output is True
