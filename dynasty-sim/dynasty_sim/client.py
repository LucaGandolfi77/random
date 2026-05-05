"""OpenRouter client for Dynasty Sim.

Supports:
- Free model IDs  (e.g. ``google/gemini-2.0-flash-exp:free``)
- The ``openrouter/free`` automatic router
- Primary + fallback model chain with retries
- Optional structured JSON output (tries ``response_format`` first,
  falls back to prompt-based JSON extraction)
- Configurable timeout via ``HTTPX``
"""

from __future__ import annotations

import json
import logging
import os
import re
import time
from pathlib import Path
from typing import Any

import httpx
from pydantic import BaseModel

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent.parent / ".env")
except ImportError:
    pass

# Module-level logger — configure with logging.basicConfig() or the
# DYNASTY_LOG_LEVEL env var to see call details.
logger = logging.getLogger("dynasty_sim.client")
_log_level = os.getenv("DYNASTY_LOG_LEVEL", "").upper()
if _log_level:
    logging.basicConfig(
        level=getattr(logging, _log_level, logging.INFO),
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    )


_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
_DEFAULT_TIMEOUT = 45.0  # seconds


# ---------------------------------------------------------------------------
# JSON extraction helpers
# ---------------------------------------------------------------------------


def _extract_json(text: str) -> Any:
    """Try several strategies to extract a JSON object from raw model output."""
    text = text.strip()

    # 1. Direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # 2. Markdown code fence
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text, re.IGNORECASE)
    if fence:
        try:
            return json.loads(fence.group(1).strip())
        except json.JSONDecodeError:
            pass

    # 3. Brace slice
    first = text.find("{")
    last = text.rfind("}")
    if first != -1 and last > first:
        try:
            return json.loads(text[first : last + 1])
        except json.JSONDecodeError:
            pass

    raise ValueError(f"Could not extract JSON from model output:\n{text[:400]}")


# ---------------------------------------------------------------------------
# Client result
# ---------------------------------------------------------------------------


class LLMResult(BaseModel):
    """Normalised result from a single LLM call."""

    model_used: str
    raw: str
    data: Any = None
    attempts: int = 1


# ---------------------------------------------------------------------------
# OpenRouter client
# ---------------------------------------------------------------------------


class OpenRouterClient:
    """Thin, synchronous OpenRouter client with free-model support."""

    def __init__(
        self,
        api_key: str | None = None,
        primary_model: str | None = None,
        fallback_model: str | None = None,
        app_name: str | None = None,
        http_referer: str | None = None,
        timeout: float = _DEFAULT_TIMEOUT,
    ) -> None:
        self.api_key = api_key or os.getenv("OPENROUTER_API_KEY", "")
        self.primary_model = primary_model or os.getenv("DYNASTY_PRIMARY_MODEL", "google/gemini-2.0-flash-exp:free")
        self.fallback_model = fallback_model or os.getenv("DYNASTY_FALLBACK_MODEL", "openrouter/free")
        self.app_name = app_name or os.getenv("OPENROUTER_APP_NAME", "Dynasty Sim")
        self.http_referer = http_referer or os.getenv("OPENROUTER_HTTP_REFERER", "https://localhost")
        self.timeout = timeout
        self._http = httpx.Client(timeout=timeout)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def complete(
        self,
        system: str,
        user: str,
        *,
        json_mode: bool = False,
        max_tokens: int = 1024,
        temperature: float = 0.85,
        models: list[str] | None = None,
    ) -> LLMResult:
        """Call OpenRouter, try primary then fallback model."""
        if not self.api_key:
            raise RuntimeError(
                "OPENROUTER_API_KEY is not set. Copy .env.example to .env and add your key."
            )

        route = models or [self.primary_model, self.fallback_model]
        route = list(dict.fromkeys(m for m in route if m))  # deduplicate, preserve order

        last_error: Exception | None = None
        for attempt, model in enumerate(route, start=1):
            t0 = time.monotonic()
            logger.debug(
                "LLM call attempt %d/%d | model=%s | max_tokens=%d | json=%s | "
                "prompt_chars=%d",
                attempt, len(route), model, max_tokens, json_mode,
                len(system) + len(user),
            )
            try:
                raw, used_model = self._call(
                    model=model,
                    system=system,
                    user=user,
                    json_mode=json_mode,
                    max_tokens=max_tokens,
                    temperature=temperature,
                )
                elapsed = time.monotonic() - t0
                logger.info(
                    "LLM OK | model=%s | attempt=%d | %.2fs | response_chars=%d",
                    used_model, attempt, elapsed, len(raw),
                )
                data: Any = None
                if json_mode:
                    data = _extract_json(raw)
                return LLMResult(model_used=used_model, raw=raw, data=data, attempts=attempt)
            except Exception as exc:  # noqa: BLE001
                elapsed = time.monotonic() - t0
                logger.warning(
                    "LLM FAIL | model=%s | attempt=%d | %.2fs | error=%s",
                    model, attempt, elapsed, exc,
                )
                last_error = exc
                time.sleep(1.0)  # brief back-off before fallback

        raise RuntimeError(f"All models failed. Last error: {last_error}") from last_error

    def close(self) -> None:
        self._http.close()

    def __enter__(self) -> "OpenRouterClient":
        return self

    def __exit__(self, *_: object) -> None:
        self.close()

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _call(
        self,
        *,
        model: str,
        system: str,
        user: str,
        json_mode: bool,
        max_tokens: int,
        temperature: float,
    ) -> tuple[str, str]:
        payload: dict[str, Any] = {
            "model": model,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        response = self._http.post(
            f"{_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": self.http_referer,
                "X-Title": self.app_name,
            },
            json=payload,
        )

        if response.status_code != 200:
            body = response.text[:300]
            logger.debug("HTTP %d for %s: %s", response.status_code, model, body)
            raise RuntimeError(f"OpenRouter {response.status_code} for {model}: {body}")

        result = response.json()
        content = result["choices"][0]["message"]["content"]
        # Normalise content (some models return a list of parts)
        if isinstance(content, list):
            content = " ".join(part.get("text", "") for part in content)
        actual_model = result.get("model", model)
        return str(content), actual_model
