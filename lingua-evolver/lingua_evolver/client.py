"""OpenRouter client for LLM interactions."""

from __future__ import annotations

import json
import re
from typing import Any

import httpx
from pydantic import BaseModel

from lingua_evolver.config import RuntimeSettings
from lingua_evolver.models import LLMResult


class OpenRouterClient:
    """Client for OpenRouter API with fallback model support."""

    def __init__(self, settings: RuntimeSettings) -> None:
        self._settings = settings
        self._client = httpx.Client(
            base_url="https://openrouter.ai/api/v1",
            timeout=30.0,
        )
        self._models = [settings.primary_model, settings.fallback_model]

    def __enter__(self) -> OpenRouterClient:
        return self

    def __exit__(self, *args: Any) -> None:
        self._client.close()

    def complete_text(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 500,
    ) -> LLMResult:
        """Send a text completion request to OpenRouter."""
        if not self._settings.effective_llm_enabled:
            return LLMResult(content="[LLM disabled]")

        headers = {
            "Authorization": f"Bearer {self._settings.openrouter_api_key}",
            "HTTP-Referer": "https://github.com/lingua-evolver",
            "X-Title": "lingua-evolver",
        }

        payload = {
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        last_error: Exception | None = None
        for model in self._models:
            try:
                response = self._client.post(
                    f"/chat/completions",
                    json={**payload, "model": model},
                    headers=headers,
                )
                response.raise_for_status()
                data = response.json()

                content = data["choices"][0]["message"]["content"]
                usage = data.get("usage", {})

                return LLMResult(
                    content=content,
                    model_used=model,
                    input_tokens=usage.get("prompt_tokens", 0),
                    output_tokens=usage.get("completion_tokens", 0),
                )
            except Exception as e:
                last_error = e
                continue

        raise RuntimeError(
            f"All LLM models failed. Last error: {last_error}"
        )

    def complete_json(
        self,
        system_prompt: str,
        user_prompt: str,
        schema_model: type[BaseModel] | None = None,
        temperature: float = 0.3,
        max_tokens: int = 500,
    ) -> tuple[Any, LLMResult]:
        """Send a JSON completion request.

        Returns a tuple of (parsed_json, llm_result).
        """
        result = self.complete_text(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=temperature,
            max_tokens=max_tokens,
        )

        parsed = self._extract_json(result.content)
        return parsed, result

    def _extract_json(self, text: str) -> Any:
        """Extract JSON from text with multiple fallback strategies."""
        # Strategy 1: Direct parse
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        # Strategy 2: Extract from markdown code fence
        fence_match = re.search(r"```(?:json)?\s*(.*?)```", text, re.DOTALL)
        if fence_match:
            try:
                return json.loads(fence_match.group(1).strip())
            except json.JSONDecodeError:
                pass

        # Strategy 3: Find first { or [ to last } or ]
        for start_char, end_char in [("{", "}"), ("[", "]")]:
            start = text.find(start_char)
            end = text.rfind(end_char)
            if start != -1 and end > start:
                try:
                    return json.loads(text[start : end + 1])
                except json.JSONDecodeError:
                    continue

        return text
