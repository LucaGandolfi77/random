from __future__ import annotations

import json
import logging

import httpx
from pydantic import BaseModel

from graveyard_chorus.client import OpenRouterClient
from graveyard_chorus.config import RuntimeSettings


class DraftSchema(BaseModel):
    text: str
    mood: str
    hidden_truths: list[str]
    public_contradictions: list[str]
    referenced_character_names: list[str]
    referenced_event_titles: list[str]


def test_openrouter_client_parses_structured_json_and_reports_actual_model() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/api/v1/chat/completions"
        return httpx.Response(
            200,
            json={
                "model": "google/gemma-3-27b-it:free",
                "choices": [
                    {
                        "message": {
                            "content": '{"text":"I confess.","mood":"haunted","hidden_truths":["the ledger lied"],"public_contradictions":["they praised my charity"],"referenced_character_names":["Ruth Vale"],"referenced_event_titles":["The council reopened the sluice dispute"]}'
                        }
                    }
                ],
            },
        )

    client = OpenRouterClient(
        RuntimeSettings(openrouter_api_key="test-key", offline_mode=False),
        http_client=httpx.Client(base_url="https://openrouter.ai/api/v1", transport=httpx.MockTransport(handler)),
    )

    draft, result = client.complete_json(
        system_prompt="Return JSON.",
        user_prompt="Write an epitaph.",
        schema_model=DraftSchema,
        stats_label="chronicle",
    )

    assert draft.text == "I confess."
    assert draft.hidden_truths == ["the ledger lied"]
    assert result.model_used == "google/gemma-3-27b-it:free"
    assert client.stats.chronicle_exact_free_retries == 0


def test_openrouter_client_recovers_markdown_wrapped_partial_json() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/api/v1/chat/completions"
        return httpx.Response(
            200,
            json={
                "model": "openrouter/free",
                "choices": [
                    {
                        "message": {
                            "content": (
                                "I thought through the whole town before answering.\n"
                                "```json\n"
                                '{"text":"I confess.","mood":"haunted","hidden_truths":["the ledger lied"],'
                                '"public_contradictions":["they praised my charity"],'
                                '"referenced_character_names":["Ruth Vale"],'
                                '"referenced_event_titles":["The council reopened the sluice dispute"]\n'
                                "```"
                            )
                        }
                    }
                ],
                "reasoning": "The model supplied analysis before the JSON body.",
            },
        )

    client = OpenRouterClient(
        RuntimeSettings(openrouter_api_key="test-key", offline_mode=False),
        http_client=httpx.Client(base_url="https://openrouter.ai/api/v1", transport=httpx.MockTransport(handler)),
    )

    draft, result = client.complete_json(
        system_prompt="Return JSON.",
        user_prompt="Write an epitaph.",
        schema_model=DraftSchema,
        stats_label="chronicle",
    )

    assert draft.text == "I confess."
    assert draft.mood == "haunted"
    assert draft.referenced_event_titles == ["The council reopened the sluice dispute"]
    assert result.model_used == "openrouter/free"
    assert client.stats.chronicle_exact_free_retries == 0


def test_openrouter_client_retries_exact_free_fallback_after_invalid_200() -> None:
    seen_models: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        payload = json.loads(request.content.decode("utf-8"))
        model = payload["model"]
        seen_models.append(model)
        if model == "openrouter/free":
            return httpx.Response(
                200,
                json={
                    "model": "openrouter/free",
                    "choices": [
                        {
                            "message": {
                                "content": '{"mood":"haunted"}'
                            }
                        }
                    ],
                },
            )
        if model == "inclusionai/ling-2.6-1t-20260423:free":
            return httpx.Response(
                200,
                json={
                    "model": model,
                    "choices": [
                        {
                            "message": {
                                "content": '{"text":"I confess.","mood":"haunted","hidden_truths":["the ledger lied"],"public_contradictions":["they praised my charity"],"referenced_character_names":["Ruth Vale"],"referenced_event_titles":["The council reopened the sluice dispute"]}'
                            }
                        }
                    ],
                },
            )
        return httpx.Response(404, json={"error": {"message": "not found"}})

    client = OpenRouterClient(
        RuntimeSettings(
            openrouter_api_key="test-key",
            offline_mode=False,
            primary_model="openrouter/free",
            fallback_models=("inclusionai/ling-2.6-1t-20260423:free",),
            max_retries=0,
        ),
        http_client=httpx.Client(base_url="https://openrouter.ai/api/v1", transport=httpx.MockTransport(handler)),
    )

    draft, result = client.complete_json(
        system_prompt="Return JSON.",
        user_prompt="Write an epitaph.",
        schema_model=DraftSchema,
        stats_label="chronicle",
    )

    assert seen_models == ["openrouter/free", "inclusionai/ling-2.6-1t-20260423:free"]
    assert draft.text == "I confess."
    assert result.model_used == "inclusionai/ling-2.6-1t-20260423:free"
    assert client.stats.chronicle_exact_free_retries == 1


def test_openrouter_client_retries_exact_free_fallback_after_primary_http_failure() -> None:
    seen_models: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        payload = json.loads(request.content.decode("utf-8"))
        model = payload["model"]
        seen_models.append(model)
        if model == "openrouter/free":
            return httpx.Response(429, json={"error": {"message": "rate limited"}})
        if model == "inclusionai/ling-2.6-1t-20260423:free":
            return httpx.Response(
                200,
                json={
                    "model": model,
                    "choices": [
                        {
                            "message": {
                                "content": '{"text":"I confess.","mood":"haunted","hidden_truths":["the ledger lied"],"public_contradictions":["they praised my charity"],"referenced_character_names":["Ruth Vale"],"referenced_event_titles":["The council reopened the sluice dispute"]}'
                            }
                        }
                    ],
                },
            )
        return httpx.Response(404, json={"error": {"message": "not found"}})

    client = OpenRouterClient(
        RuntimeSettings(
            openrouter_api_key="test-key",
            offline_mode=False,
            primary_model="openrouter/free",
            fallback_models=("inclusionai/ling-2.6-1t-20260423:free",),
            max_retries=0,
        ),
        http_client=httpx.Client(base_url="https://openrouter.ai/api/v1", transport=httpx.MockTransport(handler)),
    )

    draft, result = client.complete_json(
        system_prompt="Return JSON.",
        user_prompt="Write an epitaph.",
        schema_model=DraftSchema,
        stats_label="chronicle",
    )

    assert seen_models == ["openrouter/free", "inclusionai/ling-2.6-1t-20260423:free"]
    assert draft.text == "I confess."
    assert result.model_used == "inclusionai/ling-2.6-1t-20260423:free"
    assert client.stats.chronicle_exact_free_retries == 1


def test_openrouter_client_logs_request_and_response_traffic(caplog) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "model": "openrouter/free",
                "choices": [
                    {
                        "message": {
                            "content": "The dead still argue beautifully."
                        }
                    }
                ],
            },
        )

    client = OpenRouterClient(
        RuntimeSettings(openrouter_api_key="test-key", offline_mode=False, log_openrouter_traffic=True),
        http_client=httpx.Client(
            base_url="https://openrouter.ai/api/v1",
            transport=httpx.MockTransport(handler),
            headers={
                "Authorization": "Bearer test-key",
                "Content-Type": "application/json",
                "X-Title": "graveyard-chorus",
            },
        ),
    )

    with caplog.at_level(logging.INFO, logger="graveyard_chorus.client"):
        result = client.complete_text(system_prompt="System says", user_prompt="User asks")

    messages = "\n".join(record.getMessage() for record in caplog.records)

    assert result.text == "The dead still argue beautifully."
    assert "OpenRouter REQUEST" in messages
    assert "OpenRouter RESPONSE" in messages
    assert "System says" in messages
    assert "User asks" in messages
    assert "The dead still argue beautifully." in messages
    assert "***REDACTED***" in messages
    assert "test-key" not in messages


def test_probe_models_uses_direct_model_without_fallback() -> None:
    seen_models: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        payload = json.loads(request.content.decode("utf-8"))
        model = payload["model"]
        seen_models.append(model)
        if model == "inclusionai/ling-2.6-1t-20260423:free":
            return httpx.Response(
                200,
                json={
                    "model": model,
                    "choices": [{"message": {"content": "OK"}}],
                },
            )
        return httpx.Response(404, json={"error": {"message": "not found"}})

    client = OpenRouterClient(
        RuntimeSettings(
            openrouter_api_key="test-key",
            offline_mode=False,
            primary_model="openrouter/free",
            fallback_models=("liquid/lfm-2.5-1.2b-instruct-20260120:free",),
            max_retries=0,
            log_openrouter_traffic=False,
        ),
        http_client=httpx.Client(
            base_url="https://openrouter.ai/api/v1",
            transport=httpx.MockTransport(handler),
            headers={
                "Authorization": "Bearer test-key",
                "Content-Type": "application/json",
                "X-Title": "graveyard-chorus",
            },
        ),
    )

    results = client.probe_models(["inclusionai/ling-2.6-1t-20260423:free", "missing/model:free"])

    assert seen_models == ["inclusionai/ling-2.6-1t-20260423:free", "missing/model:free"]
    assert results[0].ok is True
    assert results[0].actual_model == "inclusionai/ling-2.6-1t-20260423:free"
    assert results[1].ok is False
    assert "404" in (results[1].error or "")