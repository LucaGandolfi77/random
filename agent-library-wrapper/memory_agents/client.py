"""OpenRouter client with retry, fallback, and structured output support."""

from __future__ import annotations

import json
import os
import time
from dataclasses import dataclass
from typing import Any, AsyncIterator, Generic, Iterator, Sequence, TypeVar

import httpx
from pydantic import BaseModel

from memory_agents.models import ChatMessage, OpenRouterConfig, RunMetadata, UsageStats
from memory_agents.utils.json_utils import parse_model_response
from memory_agents.utils.prompts import build_structured_output_instructions
from memory_agents.utils.retry import async_call_with_retry, call_with_retry

SchemaT = TypeVar("SchemaT", bound=BaseModel)


class OpenRouterClientError(RuntimeError):
    """Base error raised by the OpenRouter client."""

    def __init__(self, message: str, status_code: int | None = None, payload: dict[str, Any] | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.payload = payload or {}


class RetryableOpenRouterError(OpenRouterClientError):
    """Error type used when retrying the request is safe."""


@dataclass(slots=True)
class ClientResult(Generic[SchemaT]):
    """Normalized completion result returned by the OpenRouter client."""

    text: str
    parsed: SchemaT | dict[str, Any] | None
    metadata: RunMetadata


class OpenRouterClient:
    """Synchronous OpenRouter chat completions wrapper for agent use cases."""

    def __init__(self, config: OpenRouterConfig, http_client: httpx.Client | None = None) -> None:
        self.config = config
        self._owns_client = http_client is None
        self._client = http_client or httpx.Client(
            base_url=config.base_url.rstrip("/"),
            timeout=config.timeout_seconds,
        )

    def close(self) -> None:
        """Close the underlying HTTP client when owned by this instance."""

        if self._owns_client:
            self._client.close()

    def __enter__(self) -> "OpenRouterClient":
        return self

    def __exit__(self, *_: object) -> None:
        self.close()

    def chat(
        self,
        messages: Sequence[ChatMessage],
        response_model: type[SchemaT] | None = None,
        *,
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> ClientResult[SchemaT]:
        """Run a chat completion against OpenRouter.

        When a ``response_model`` is provided, the client first attempts strict
        JSON Schema mode and falls back to prompt-based JSON generation with
        local validation if strict schema mode fails.
        """

        errors: list[str] = []
        started_at = time.perf_counter()

        for index, model_name in enumerate(self._candidate_models(model)):
            fallback_used = index > 0
            try:
                return self._chat_with_model(
                    messages=messages,
                    response_model=response_model,
                    model=model_name,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    fallback_used=fallback_used,
                    started_at=started_at,
                )
            except OpenRouterClientError as error:
                errors.append(f"{model_name}: {error}")

        raise OpenRouterClientError(
            "All configured models failed. " + " | ".join(errors or ["No models were available."])
        )

    def stream_chat(
        self,
        messages: Sequence[ChatMessage],
        *,
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> Iterator[str]:
        """Stream plain-text content chunks from OpenRouter.

        Structured responses are intentionally not supported in streaming mode.
        """

        request = self._build_request(
            messages=messages,
            model=(model or self.config.model),
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
        )

        with self._client.stream(
            "POST",
            "/chat/completions",
            headers=self._build_headers(),
            json=request,
        ) as response:
            if response.status_code >= 400:
                payload = self._safe_json(response)
                raise OpenRouterClientError(
                    payload.get("error", {}).get("message", response.text),
                    status_code=response.status_code,
                    payload=payload,
                )

            for line in response.iter_lines():
                if not line or not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if data == "[DONE]":
                    break
                payload = json.loads(data)
                delta = payload.get("choices", [{}])[0].get("delta", {})
                content = delta.get("content")
                if isinstance(content, list):
                    yield "".join(str(part.get("text") or part.get("content") or "") for part in content)
                elif content:
                    yield str(content)

    def _chat_with_model(
        self,
        *,
        messages: Sequence[ChatMessage],
        response_model: type[SchemaT] | None,
        model: str,
        temperature: float | None,
        max_tokens: int | None,
        fallback_used: bool,
        started_at: float,
    ) -> ClientResult[SchemaT]:
        strict_schema_error: OpenRouterClientError | None = None

        if response_model and self.config.prefer_json_schema:
            try:
                return self._single_request(
                    messages=messages,
                    response_model=response_model,
                    model=model,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    fallback_used=fallback_used,
                    started_at=started_at,
                    strict_schema=True,
                )
            except OpenRouterClientError as error:
                strict_schema_error = error

        return self._single_request(
            messages=messages,
            response_model=response_model,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            fallback_used=fallback_used,
            started_at=started_at,
            strict_schema=False,
            strict_schema_error=strict_schema_error,
        )

    def _single_request(
        self,
        *,
        messages: Sequence[ChatMessage],
        response_model: type[SchemaT] | None,
        model: str,
        temperature: float | None,
        max_tokens: int | None,
        fallback_used: bool,
        started_at: float,
        strict_schema: bool,
        strict_schema_error: OpenRouterClientError | None = None,
    ) -> ClientResult[SchemaT]:
        retry_count = 0
        prepared_messages = list(messages)

        if response_model and not strict_schema:
            prepared_messages = self._with_fallback_schema_instructions(messages, response_model, strict_schema_error)

        request = self._build_request(
            messages=prepared_messages,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=False,
            response_model=response_model if strict_schema else None,
        )

        def execute() -> dict[str, Any]:
            return self._post_json(request)

        def on_retry(attempt: int, _delay: float, _error: Exception) -> None:
            nonlocal retry_count
            retry_count = attempt

        payload = call_with_retry(
            execute,
            retries=self.config.max_retries,
            backoff_seconds=self.config.backoff_seconds,
            retry_on=(httpx.HTTPError, RetryableOpenRouterError),
            on_retry=on_retry,
        )

        text = self._extract_text(payload)
        usage = self._extract_usage(payload)
        parsed: SchemaT | dict[str, Any] | None = None

        if response_model is not None:
            try:
                parsed = parse_model_response(text, response_model)
            except Exception as error:  # pragma: no cover - covered through integration-style tests.
                raise OpenRouterClientError(f"Structured output validation failed: {error}") from error

        return ClientResult(
            text=text,
            parsed=parsed,
            metadata=RunMetadata(
                request_id=payload.get("id"),
                model=payload.get("model") or model,
                fallback_used=fallback_used,
                structured_output=response_model is not None,
                retries=retry_count,
                duration_ms=int((time.perf_counter() - started_at) * 1000),
                usage=usage,
                raw_response=text,
            ),
        )

    def _candidate_models(self, requested_model: str | None = None) -> list[str]:
        models = [requested_model or self.config.model]
        if self.config.fallback_model and self.config.fallback_model not in models:
            models.append(self.config.fallback_model)
        return [model for model in models if model]

    def _build_request(
        self,
        *,
        messages: Sequence[ChatMessage],
        model: str,
        temperature: float | None,
        max_tokens: int | None,
        stream: bool,
        response_model: type[BaseModel] | None = None,
    ) -> dict[str, Any]:
        request: dict[str, Any] = {
            "model": model,
            "messages": [self._serialize_message(message) for message in messages],
            "temperature": self.config.temperature if temperature is None else temperature,
            "max_tokens": self.config.max_tokens if max_tokens is None else max_tokens,
            "stream": stream,
        }

        if response_model is not None:
            request["response_format"] = {
                "type": "json_schema",
                "json_schema": {
                    "name": response_model.__name__,
                    "strict": True,
                    "schema": response_model.model_json_schema(),
                },
            }

        return request

    def _serialize_message(self, message: ChatMessage) -> dict[str, Any]:
        payload = {
            "role": message.role,
            "content": message.content,
        }
        if message.name:
            payload["name"] = message.name
        return payload

    def _with_fallback_schema_instructions(
        self,
        messages: Sequence[ChatMessage],
        response_model: type[BaseModel],
        strict_schema_error: OpenRouterClientError | None,
    ) -> list[ChatMessage]:
        instruction = build_structured_output_instructions(response_model, strict_schema_error)
        if messages and messages[0].role == "system":
            first = messages[0]
            updated_first = ChatMessage(
                role="system",
                content=f"{first.content.rstrip()}\n\n{instruction}",
                name=first.name,
                metadata=first.metadata,
            )
            return [updated_first, *messages[1:]]
        return [ChatMessage(role="system", content=instruction), *messages]

    def _build_headers(self) -> dict[str, str]:
        api_key = self.config.api_key or os.getenv(self.config.api_key_env)
        if not api_key:
            raise OpenRouterClientError(
                f"Missing OpenRouter API key. Set {self.config.api_key_env} or pass api_key explicitly."
            )

        return {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": self.config.http_referer,
            "X-Title": self.config.app_name,
        }

    def _post_json(self, request_body: dict[str, Any]) -> dict[str, Any]:
        response = self._client.post(
            "/chat/completions",
            headers=self._build_headers(),
            json=request_body,
        )
        payload = self._safe_json(response)

        if response.status_code >= 500:
            raise RetryableOpenRouterError(
                payload.get("error", {}).get("message", response.text or "OpenRouter server error."),
                status_code=response.status_code,
                payload=payload,
            )

        if response.status_code >= 400:
            raise OpenRouterClientError(
                payload.get("error", {}).get("message", response.text or "OpenRouter request failed."),
                status_code=response.status_code,
                payload=payload,
            )

        return payload

    def _safe_json(self, response: httpx.Response) -> dict[str, Any]:
        try:
            payload = response.json()
        except ValueError:
            return {}
        return payload if isinstance(payload, dict) else {"payload": payload}

    def _extract_text(self, payload: dict[str, Any]) -> str:
        message = ((payload.get("choices") or [{}])[0].get("message") or {})
        content = message.get("content", "")
        if isinstance(content, list):
            return "\n".join(str(part.get("text") or part.get("content") or "") for part in content).strip()
        return str(content).strip()

    def _extract_usage(self, payload: dict[str, Any]) -> UsageStats:
        usage = payload.get("usage") or {}
        return UsageStats(
            prompt_tokens=int(usage.get("prompt_tokens") or 0),
            completion_tokens=int(usage.get("completion_tokens") or 0),
            total_tokens=int(usage.get("total_tokens") or 0),
        )


class AsyncOpenRouterClient(OpenRouterClient):
    """Async OpenRouter client for concurrent workloads."""

    def __init__(self, config: OpenRouterConfig, http_client: httpx.AsyncClient | None = None) -> None:
        self.config = config
        self._owns_client = http_client is None
        self._client = http_client or httpx.AsyncClient(
            base_url=config.base_url.rstrip("/"),
            timeout=config.timeout_seconds,
        )

    def close(self) -> None:
        """Prevent accidental sync-style cleanup on the async client."""

        raise RuntimeError("Use 'await aclose()' with AsyncOpenRouterClient.")

    async def aclose(self) -> None:
        """Close the underlying async HTTP client when owned by this instance."""

        if self._owns_client:
            await self._client.aclose()

    def __enter__(self) -> "AsyncOpenRouterClient":
        raise TypeError("Use 'async with AsyncOpenRouterClient(...)' instead of a sync context manager.")

    def __exit__(self, *_: object) -> None:
        return None

    async def __aenter__(self) -> "AsyncOpenRouterClient":
        return self

    async def __aexit__(self, *_: object) -> None:
        await self.aclose()

    async def chat(
        self,
        messages: Sequence[ChatMessage],
        response_model: type[SchemaT] | None = None,
        *,
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> ClientResult[SchemaT]:
        """Run an async chat completion against OpenRouter."""

        errors: list[str] = []
        started_at = time.perf_counter()

        for index, model_name in enumerate(self._candidate_models(model)):
            fallback_used = index > 0
            try:
                return await self._chat_with_model(
                    messages=messages,
                    response_model=response_model,
                    model=model_name,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    fallback_used=fallback_used,
                    started_at=started_at,
                )
            except OpenRouterClientError as error:
                errors.append(f"{model_name}: {error}")

        raise OpenRouterClientError(
            "All configured models failed. " + " | ".join(errors or ["No models were available."])
        )

    async def stream_chat(
        self,
        messages: Sequence[ChatMessage],
        *,
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> AsyncIterator[str]:
        """Stream plain-text content chunks from OpenRouter asynchronously."""

        request = self._build_request(
            messages=messages,
            model=(model or self.config.model),
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
        )

        async with self._client.stream(
            "POST",
            "/chat/completions",
            headers=self._build_headers(),
            json=request,
        ) as response:
            if response.status_code >= 400:
                raw = await response.aread()
                payload = self._safe_json_from_bytes(raw)
                raise OpenRouterClientError(
                    payload.get("error", {}).get("message", raw.decode("utf-8", errors="ignore") or "Request failed."),
                    status_code=response.status_code,
                    payload=payload,
                )

            async for line in response.aiter_lines():
                if not line or not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if data == "[DONE]":
                    break
                payload = json.loads(data)
                delta = payload.get("choices", [{}])[0].get("delta", {})
                content = delta.get("content")
                if isinstance(content, list):
                    yield "".join(str(part.get("text") or part.get("content") or "") for part in content)
                elif content:
                    yield str(content)

    async def _chat_with_model(
        self,
        *,
        messages: Sequence[ChatMessage],
        response_model: type[SchemaT] | None,
        model: str,
        temperature: float | None,
        max_tokens: int | None,
        fallback_used: bool,
        started_at: float,
    ) -> ClientResult[SchemaT]:
        strict_schema_error: OpenRouterClientError | None = None

        if response_model and self.config.prefer_json_schema:
            try:
                return await self._single_request(
                    messages=messages,
                    response_model=response_model,
                    model=model,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    fallback_used=fallback_used,
                    started_at=started_at,
                    strict_schema=True,
                )
            except OpenRouterClientError as error:
                strict_schema_error = error

        return await self._single_request(
            messages=messages,
            response_model=response_model,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            fallback_used=fallback_used,
            started_at=started_at,
            strict_schema=False,
            strict_schema_error=strict_schema_error,
        )

    async def _single_request(
        self,
        *,
        messages: Sequence[ChatMessage],
        response_model: type[SchemaT] | None,
        model: str,
        temperature: float | None,
        max_tokens: int | None,
        fallback_used: bool,
        started_at: float,
        strict_schema: bool,
        strict_schema_error: OpenRouterClientError | None = None,
    ) -> ClientResult[SchemaT]:
        retry_count = 0
        prepared_messages = list(messages)

        if response_model and not strict_schema:
            prepared_messages = self._with_fallback_schema_instructions(messages, response_model, strict_schema_error)

        request = self._build_request(
            messages=prepared_messages,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=False,
            response_model=response_model if strict_schema else None,
        )

        async def execute() -> dict[str, Any]:
            return await self._post_json(request)

        def on_retry(attempt: int, _delay: float, _error: Exception) -> None:
            nonlocal retry_count
            retry_count = attempt

        payload = await async_call_with_retry(
            execute,
            retries=self.config.max_retries,
            backoff_seconds=self.config.backoff_seconds,
            retry_on=(httpx.HTTPError, RetryableOpenRouterError),
            on_retry=on_retry,
        )

        text = self._extract_text(payload)
        usage = self._extract_usage(payload)
        parsed: SchemaT | dict[str, Any] | None = None

        if response_model is not None:
            try:
                parsed = parse_model_response(text, response_model)
            except Exception as error:  # pragma: no cover - covered through integration-style tests.
                raise OpenRouterClientError(f"Structured output validation failed: {error}") from error

        return ClientResult(
            text=text,
            parsed=parsed,
            metadata=RunMetadata(
                request_id=payload.get("id"),
                model=payload.get("model") or model,
                fallback_used=fallback_used,
                structured_output=response_model is not None,
                retries=retry_count,
                duration_ms=int((time.perf_counter() - started_at) * 1000),
                usage=usage,
                raw_response=text,
            ),
        )

    async def _post_json(self, request_body: dict[str, Any]) -> dict[str, Any]:
        response = await self._client.post(
            "/chat/completions",
            headers=self._build_headers(),
            json=request_body,
        )
        payload = self._safe_json(response)

        if response.status_code >= 500:
            raise RetryableOpenRouterError(
                payload.get("error", {}).get("message", response.text or "OpenRouter server error."),
                status_code=response.status_code,
                payload=payload,
            )

        if response.status_code >= 400:
            raise OpenRouterClientError(
                payload.get("error", {}).get("message", response.text or "OpenRouter request failed."),
                status_code=response.status_code,
                payload=payload,
            )

        return payload

    def _safe_json_from_bytes(self, data: bytes) -> dict[str, Any]:
        try:
            payload = json.loads(data.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            return {}
        return payload if isinstance(payload, dict) else {"payload": payload}
