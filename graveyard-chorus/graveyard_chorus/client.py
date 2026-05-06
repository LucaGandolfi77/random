from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass
from typing import Any, TypeVar

import httpx
from pydantic import BaseModel, ValidationError
from pydantic_core import from_json as parse_partial_json

from .config import RuntimeSettings

logger = logging.getLogger(__name__)
SchemaModelT = TypeVar("SchemaModelT", bound=BaseModel)


@dataclass(slots=True)
class LLMResult:
    text: str
    model_used: str
    raw: dict[str, Any]


@dataclass(slots=True)
class ModelProbeResult:
    requested_model: str
    ok: bool
    actual_model: str | None = None
    response_text: str | None = None
    error: str | None = None


@dataclass(slots=True)
class OpenRouterRunStats:
    chronicle_exact_free_retries: int = 0


class OpenRouterClient:
    def __init__(self, settings: RuntimeSettings, *, http_client: httpx.Client | None = None) -> None:
        self.settings = settings
        self._owns_client = http_client is None
        self.stats = OpenRouterRunStats()
        headers = {
            "Authorization": f"Bearer {settings.openrouter_api_key}" if settings.openrouter_api_key else "",
            "Content-Type": "application/json",
        }
        if settings.app_url:
            headers["HTTP-Referer"] = settings.app_url
        headers["X-Title"] = settings.app_name
        self.http_client = http_client or httpx.Client(
            base_url="https://openrouter.ai/api/v1",
            timeout=settings.timeout_seconds,
            headers=headers,
        )

    @property
    def enabled(self) -> bool:
        return bool(self.settings.openrouter_api_key) and not self.settings.offline_mode

    def complete_text(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        model: str | None = None,
        allow_fallback: bool = True,
        temperature: float = 0.8,
        max_tokens: int = 700,
    ) -> LLMResult:
        payload = {
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        return self._request(payload=payload, requested_model=model, allow_fallback=allow_fallback)

    def complete_json(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        schema_model: type[SchemaModelT],
        model: str | None = None,
        allow_fallback: bool = True,
        stats_label: str | None = None,
        temperature: float = 0.3,
        max_tokens: int = 900,
    ) -> tuple[SchemaModelT, LLMResult]:
        schema = schema_model.model_json_schema()
        payload = {
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
            "response_format": {
                "type": "json_schema",
                "json_schema": {
                    "name": "structured_response",
                    "strict": True,
                    "schema": schema,
                },
            },
        }
        errors: list[str] = []
        models = self._candidate_models(model, allow_fallback=allow_fallback)
        exact_free_retry_recorded = False
        for index, model_name in enumerate(models):
            next_model = models[index + 1] if index + 1 < len(models) else None
            try:
                result = self._request(
                    payload=payload,
                    requested_model=model_name,
                    allow_fallback=False,
                    allow_empty_text=True,
                )
            except RuntimeError as exc:
                errors.append(f"{model_name}: {exc}")
                logger.warning(
                    "OpenRouter structured transport failed | requested=%s | retrying_with=%s | error=%s",
                    model_name,
                    next_model or "none",
                    exc,
                )
                if not exact_free_retry_recorded and self._is_exact_free_fallback(next_model):
                    self._record_exact_free_retry(stats_label)
                    exact_free_retry_recorded = True
                if not next_model:
                    break
                continue

            try:
                return self._validate_json_response(schema_model, result)
            except (ValidationError, ValueError) as exc:
                errors.append(f"{model_name} -> {result.model_used}: {exc}")
                logger.warning(
                    "OpenRouter structured output invalid | requested=%s | actual=%s | retrying_with=%s | error=%s",
                    model_name,
                    result.model_used,
                    next_model or "none",
                    exc,
                )
                if not exact_free_retry_recorded and self._is_exact_free_fallback(next_model):
                    self._record_exact_free_retry(stats_label)
                    exact_free_retry_recorded = True
                if not next_model:
                    break
        raise RuntimeError("OpenRouter structured request failed after retries: " + " | ".join(errors))

    def _validate_json_response(
        self,
        schema_model: type[SchemaModelT],
        result: LLMResult,
    ) -> tuple[SchemaModelT, LLMResult]:
        parsed = self._extract_json_payload(result.raw, fallback_text=result.text)
        try:
            return schema_model.model_validate(parsed), result
        except ValidationError:
            logger.debug("Structured validation failed; retrying with local JSON normalization.")
            normalized = json.loads(json.dumps(parsed))
            return schema_model.model_validate(normalized), result

    def close(self) -> None:
        if self._owns_client:
            self.http_client.close()

    def _record_exact_free_retry(self, stats_label: str | None) -> None:
        if stats_label == "chronicle":
            self.stats.chronicle_exact_free_retries += 1

    def _is_exact_free_fallback(self, model_name: str | None) -> bool:
        return bool(model_name and model_name != "openrouter/free" and model_name.endswith(":free"))

    def probe_models(self, models: list[str] | tuple[str, ...] | None = None) -> list[ModelProbeResult]:
        targets = list(models or self.settings.available_models)
        results: list[ModelProbeResult] = []
        for model_name in targets:
            try:
                result = self.complete_text(
                    system_prompt="You are a connectivity probe. Reply with exactly: OK",
                    user_prompt="Reply with exactly: OK",
                    model=model_name,
                    allow_fallback=False,
                    temperature=0.0,
                    max_tokens=8,
                )
                results.append(
                    ModelProbeResult(
                        requested_model=model_name,
                        ok=True,
                        actual_model=result.model_used,
                        response_text=result.text,
                    )
                )
            except Exception as exc:
                results.append(ModelProbeResult(requested_model=model_name, ok=False, error=str(exc)))
        return results

    def _request(
        self,
        *,
        payload: dict[str, Any],
        requested_model: str | None,
        allow_fallback: bool = True,
        allow_empty_text: bool = False,
    ) -> LLMResult:
        if not self.enabled:
            raise RuntimeError("OpenRouter client is unavailable. Set OPENROUTER_API_KEY or disable LLM mode.")

        errors: list[str] = []
        models = self._candidate_models(requested_model, allow_fallback=allow_fallback)
        for attempt in range(1, self.settings.max_retries + 2):
            for model_name in models:
                request_payload = {**payload, "model": model_name}
                try:
                    request = self.http_client.build_request("POST", "/chat/completions", json=request_payload)
                    self._log_request(model_name=model_name, attempt=attempt, request=request, payload=request_payload)
                    response = self.http_client.send(request)
                    self._log_response(model_name=model_name, attempt=attempt, response=response)
                    response.raise_for_status()
                    raw = response.json()
                    text = self._extract_text(raw, allow_empty=allow_empty_text)
                    actual_model = raw.get("model") or model_name
                    logger.info(
                        "OpenRouter OK | requested=%s | actual=%s | attempt=%s | response_chars=%s",
                        model_name,
                        actual_model,
                        attempt,
                        len(text),
                    )
                    return LLMResult(text=text, model_used=actual_model, raw=raw)
                except httpx.HTTPStatusError as exc:
                    errors.append(f"{model_name}: {exc}")
                    logger.warning(
                        "OpenRouter FAIL | model=%s | attempt=%s | status=%s | error=%s",
                        model_name,
                        attempt,
                        exc.response.status_code,
                        exc,
                    )
                except httpx.RequestError as exc:
                    errors.append(f"{model_name}: {exc}")
                    logger.warning("OpenRouter FAIL | model=%s | attempt=%s | error=%s", model_name, attempt, exc)
                except (ValueError, KeyError) as exc:
                    errors.append(f"{model_name}: {exc}")
                    logger.warning("OpenRouter FAIL | model=%s | attempt=%s | error=%s", model_name, attempt, exc)
        raise RuntimeError("OpenRouter request failed after retries: " + " | ".join(errors))

    def _candidate_models(self, requested_model: str | None, *, allow_fallback: bool = True) -> list[str]:
        models: list[str] = []
        if requested_model:
            models.append(requested_model)
            if not allow_fallback:
                return models
        for model in self.settings.available_models:
            if model not in models:
                models.append(model)
        return models

    @classmethod
    def _extract_text(cls, raw: dict[str, Any], *, allow_empty: bool = False) -> str:
        candidates = cls._response_text_candidates(raw)
        if candidates:
            return candidates[0]
        if allow_empty:
            return ""
        raise ValueError("OpenRouter response content had an unsupported format.")

    @classmethod
    def _response_text_candidates(cls, raw: dict[str, Any], *, include_reasoning: bool = False) -> list[str]:
        choices = raw.get("choices", [])
        if not choices:
            raise ValueError("OpenRouter response did not include choices.")
        choice = choices[0]
        candidates: list[str] = []
        message = choice.get("message", {})
        if isinstance(message, dict):
            cls._append_text_candidates(candidates, message.get("content"), include_reasoning=include_reasoning)
            cls._append_text_candidates(candidates, message.get("tool_calls"), include_reasoning=include_reasoning)
            if include_reasoning:
                cls._append_text_candidates(candidates, message.get("reasoning"), include_reasoning=True)
        cls._append_text_candidates(candidates, choice.get("text"), include_reasoning=include_reasoning)
        if include_reasoning:
            cls._append_text_candidates(candidates, choice.get("reasoning"), include_reasoning=True)
            cls._append_text_candidates(candidates, raw.get("reasoning"), include_reasoning=True)

        deduped: list[str] = []
        for candidate in candidates:
            stripped = candidate.strip()
            if stripped and stripped not in deduped:
                deduped.append(stripped)
        return deduped

    @classmethod
    def _extract_json_payload(cls, raw: dict[str, Any], *, fallback_text: str) -> dict[str, Any]:
        last_error: Exception | None = None
        for candidate in cls._json_text_candidates(raw, fallback_text=fallback_text):
            try:
                return cls._extract_json(candidate)
            except ValueError as exc:
                last_error = exc
        raise ValueError("Could not extract valid JSON object from model response.") from last_error

    @classmethod
    def _json_text_candidates(cls, raw: dict[str, Any], *, fallback_text: str) -> list[str]:
        seed_texts: list[str] = []
        if fallback_text.strip():
            seed_texts.append(fallback_text)
        for include_reasoning in (False, True):
            try:
                seed_texts.extend(cls._response_text_candidates(raw, include_reasoning=include_reasoning))
            except ValueError:
                continue

        variants: list[str] = []
        for seed in seed_texts:
            for candidate in cls._candidate_json_variants(seed):
                if candidate not in variants:
                    variants.append(candidate)
        return variants

    @classmethod
    def _candidate_json_variants(cls, text: str) -> list[str]:
        text = text.strip()
        if not text:
            return []

        variants: list[str] = [text]
        for block in re.findall(r"```(?:json)?\s*(.*?)```", text, flags=re.IGNORECASE | re.DOTALL):
            stripped = block.strip()
            if stripped and stripped not in variants:
                variants.append(stripped)

        expanded: list[str] = []
        for candidate in variants:
            if candidate not in expanded:
                expanded.append(candidate)
            start = candidate.find("{")
            if start != -1:
                suffix = candidate[start:].strip()
                if suffix and suffix not in expanded:
                    expanded.append(suffix)
        return expanded

    @classmethod
    def _extract_json(cls, text: str) -> dict[str, Any]:
        text = text.strip()
        if not text:
            raise ValueError("Empty response from model.")

        last_error: Exception | None = None
        decoder = json.JSONDecoder()
        for candidate in cls._candidate_json_variants(text):
            try:
                parsed, _ = decoder.raw_decode(candidate)
                if isinstance(parsed, dict):
                    return parsed
            except json.JSONDecodeError as exc:
                last_error = exc

            balanced = cls._balanced_json_object(candidate)
            if balanced:
                try:
                    parsed, _ = decoder.raw_decode(balanced)
                    if isinstance(parsed, dict):
                        return parsed
                except json.JSONDecodeError as exc:
                    last_error = exc

            try:
                parsed = parse_partial_json(candidate, allow_partial=True)
                if isinstance(parsed, dict) and parsed:
                    logger.warning("Structured JSON recovered from partial model output.")
                    return parsed
            except ValueError as exc:
                last_error = exc

        raise ValueError("Could not extract valid JSON object from model response.") from last_error

    @classmethod
    def _append_text_candidates(cls, target: list[str], value: Any, *, include_reasoning: bool) -> None:
        if value is None:
            return
        if isinstance(value, str):
            target.append(value)
            return
        if isinstance(value, list):
            for item in value:
                cls._append_text_candidates(target, item, include_reasoning=include_reasoning)
            return
        if not isinstance(value, dict):
            target.append(str(value))
            return

        for key in ("text", "content", "arguments"):
            if key in value:
                cls._append_text_candidates(target, value[key], include_reasoning=include_reasoning)
        if include_reasoning and "reasoning" in value:
            cls._append_text_candidates(target, value["reasoning"], include_reasoning=True)

    @staticmethod
    def _balanced_json_object(text: str) -> str | None:
        start = text.find("{")
        if start == -1:
            return None

        depth = 0
        in_string = False
        escaped = False
        for index, char in enumerate(text[start:], start=start):
            if in_string:
                if escaped:
                    escaped = False
                elif char == "\\":
                    escaped = True
                elif char == '"':
                    in_string = False
                continue
            if char == '"':
                in_string = True
            elif char == "{":
                depth += 1
            elif char == "}":
                depth -= 1
                if depth == 0:
                    return text[start : index + 1]
        return None

    def _log_request(
        self,
        *,
        model_name: str,
        attempt: int,
        request: httpx.Request,
        payload: dict[str, Any],
    ) -> None:
        if not self.settings.log_openrouter_traffic:
            return
        logger.info(
            "OpenRouter REQUEST | model=%s | attempt=%s | method=%s | url=%s | headers=%s | payload=%s",
            model_name,
            attempt,
            request.method,
            request.url,
            self._sanitize_headers(request.headers),
            self._dump_json(payload),
        )

    def _log_response(self, *, model_name: str, attempt: int, response: httpx.Response) -> None:
        if not self.settings.log_openrouter_traffic:
            return
        logger.info(
            "OpenRouter RESPONSE | model=%s | attempt=%s | status=%s | headers=%s | body=%s",
            model_name,
            attempt,
            response.status_code,
            self._sanitize_headers(response.headers),
            response.text,
        )

    @staticmethod
    def _sanitize_headers(headers: httpx.Headers) -> dict[str, str]:
        sanitized: dict[str, str] = {}
        for key, value in headers.items():
            if key.lower() == "authorization":
                sanitized[key] = "Bearer ***REDACTED***" if value else "***REDACTED***"
            else:
                sanitized[key] = value
        return sanitized

    @staticmethod
    def _dump_json(payload: dict[str, Any]) -> str:
        return json.dumps(payload, ensure_ascii=False, default=str)