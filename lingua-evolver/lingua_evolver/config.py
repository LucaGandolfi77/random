"""Configuration module: runtime settings loaded from environment."""

from __future__ import annotations

import os
from dataclasses import dataclass, field

from dotenv import load_dotenv

load_dotenv()


@dataclass(slots=True)
class RuntimeSettings:
    """Runtime configuration for lingua-evolver."""

    openrouter_api_key: str = field(
        default_factory=lambda: os.getenv("OPENROUTER_API_KEY", "")
    )
    primary_model: str = field(
        default_factory=lambda: os.getenv(
            "LINGUA_PRIMARY_MODEL", "meta-llama/llama-3.2-3b-instruct:free"
        )
    )
    fallback_model: str = field(
        default_factory=lambda: os.getenv(
            "LINGUA_FALLBACK_MODEL", "google/gemma-2-9b-it:free"
        )
    )
    num_agents: int = 8
    generations: int = 100
    interactions_per_generation: int = 200
    phonemes_per_agent: int = 8
    llm_enabled: bool = True
    verbose: bool = False
    auto_save_interval: int = 10

    # Sound change rates
    lenition_rate: float = 0.05
    assimilation_rate: float = 0.08
    vowel_harmony_rate: float = 0.03

    # Semantic parameters
    semantic_drift_rate: float = 0.02
    semantic_link_threshold: float = 0.3

    # Sociolinguistics
    num_communities: int = 2
    contact_rate: float = 0.1

    # Dialogue parameters
    clarification_rate: float = 0.15
    negotiation_rate: float = 0.10

    # Early stopping
    convergence_threshold: float = 0.8
    early_stop_patience: int = 20

    # LLM parameters
    llm_temperature: float = 0.7
    llm_max_tokens: int = 150

    @property
    def has_api_key(self) -> bool:
        """Check if an API key is configured."""
        return bool(self.openrouter_api_key)

    @property
    def effective_llm_enabled(self) -> bool:
        """LLM is enabled only if both flag and API key are present."""
        return self.llm_enabled and self.has_api_key
