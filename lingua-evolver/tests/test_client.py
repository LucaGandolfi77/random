"""Tests for OpenRouter client."""

from __future__ import annotations

import json

import httpx

from lingua_evolver.client import OpenRouterClient
from lingua_evolver.config import RuntimeSettings


class MockTransport(httpx.BaseTransport):
    def __init__(self, response_data: dict, status_code: int = 200) -> None:
        self._response_data = response_data
        self._status_code = status_code
        self._calls: list[dict] = []

    def handle_request(self, request: httpx.Request) -> httpx.Response:
        self._calls.append({"url": str(request.url), "method": request.method})
        content = json.dumps(self._response_data).encode()
        return httpx.Response(
            status_code=self._status_code,
            content=content,
            headers={"content-type": "application/json"},
        )


class TestOpenRouterClient:
    def test_client_disabled_without_key(self) -> None:
        settings = RuntimeSettings(openrouter_api_key="", llm_enabled=True)
        client = OpenRouterClient(settings)
        result = client.complete_text("system", "user")
        assert "LLM disabled" in result.content

    def test_client_disabled_when_flag_off(self) -> None:
        settings = RuntimeSettings(openrouter_api_key="test-key", llm_enabled=False)
        client = OpenRouterClient(settings)
        result = client.complete_text("system", "user")
        assert "LLM disabled" in result.content

    def test_client_success_with_mock(self) -> None:
        mock_response = {
            "choices": [{"message": {"content": "hello world"}}],
            "usage": {"prompt_tokens": 10, "completion_tokens": 5},
        }
        transport = MockTransport(mock_response)

        settings = RuntimeSettings(openrouter_api_key="test-key", llm_enabled=True)
        client = OpenRouterClient(settings)
        client._client = httpx.Client(
            transport=transport,
            base_url="https://openrouter.ai/api/v1",
        )

        result = client.complete_text("system", "user")
        assert result.content == "hello world"
        assert result.model_used is not None
        assert len(transport._calls) == 1

    def test_client_json_extraction(self) -> None:
        mock_response = {
            "choices": [{"message": {"content": '{"phonemes": "ka-mu"}'}}],
            "usage": {"prompt_tokens": 10, "completion_tokens": 5},
        }
        transport = MockTransport(mock_response)

        settings = RuntimeSettings(openrouter_api_key="test-key", llm_enabled=True)
        client = OpenRouterClient(settings)
        client._client = httpx.Client(
            transport=transport,
            base_url="https://openrouter.ai/api/v1",
        )

        parsed, result = client.complete_json("system", "user")
        assert isinstance(parsed, dict)
        assert parsed["phonemes"] == "ka-mu"
