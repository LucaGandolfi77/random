from __future__ import annotations

import hashlib
import json
from typing import Protocol

import httpx

from app.config import Settings

OPENROUTER_MODEL_PROFILES = {
    "free": "meta-llama/llama-3.3-8b-instruct:free",
    "reasoning-free": "deepseek/deepseek-r1-0528:free",
    "general-free": "mistralai/mistral-7b-instruct:free",
}


class CacheProtocol(Protocol):
    def get_cached_response(self, cache_key: str) -> str | None: ...
    def set_cached_response(self, cache_key: str, response_text: str) -> None: ...


class LLMProvider:
    def generate(self, system_prompt: str, user_prompt: str, cache_key: str | None = None) -> str | None:
        raise NotImplementedError


class NullLLMProvider(LLMProvider):
    model = "rules-only"

    def generate(self, system_prompt: str, user_prompt: str, cache_key: str | None = None) -> str | None:
        return None


class OpenRouterProvider(LLMProvider):
    def __init__(self, settings: Settings, cache: CacheProtocol | None = None) -> None:
        self.settings = settings
        self.cache = cache
        requested_model = settings.openrouter_model or OPENROUTER_MODEL_PROFILES.get(settings.openrouter_profile, OPENROUTER_MODEL_PROFILES["free"])
        self.model = requested_model if requested_model.endswith(":free") else OPENROUTER_MODEL_PROFILES["free"]

    def _cache_key(self, system_prompt: str, user_prompt: str, explicit_key: str | None) -> str:
        if explicit_key:
            return explicit_key
        payload = json.dumps({"system": system_prompt, "user": user_prompt, "model": self.model}, sort_keys=True)
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()

    def generate(self, system_prompt: str, user_prompt: str, cache_key: str | None = None) -> str | None:
        if not self.settings.openrouter_api_key:
            return None

        resolved_cache_key = self._cache_key(system_prompt, user_prompt, cache_key)
        if self.cache:
            cached = self.cache.get_cached_response(resolved_cache_key)
            if cached:
                return cached

        try:
            response = httpx.post(
                f"{self.settings.openrouter_base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.settings.openrouter_api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": self.settings.openrouter_site_url,
                    "X-Title": self.settings.openrouter_app_title,
                },
                json={
                    "model": self.model,
                    "temperature": self.settings.openrouter_temperature,
                    "max_tokens": self.settings.openrouter_max_tokens,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                },
                timeout=20.0,
            )
            response.raise_for_status()
            text = response.json()["choices"][0]["message"]["content"].strip()
            if self.cache and text:
                self.cache.set_cached_response(resolved_cache_key, text)
            return text or None
        except Exception:
            return None


def build_llm_provider(settings: Settings, cache: CacheProtocol | None = None) -> LLMProvider:
    if settings.openrouter_api_key:
        return OpenRouterProvider(settings, cache)
    return NullLLMProvider()
