from __future__ import annotations

from graveyard_chorus.config import RuntimeSettings
from graveyard_chorus.memory import MemoryStore
from graveyard_chorus.seeds import load_seed_state


def test_memory_retrieval_prioritizes_relevant_and_emotional_records() -> None:
    state = load_seed_state(
        settings=RuntimeSettings(openrouter_api_key=None, offline_mode=True),
        years=1,
        llm_enabled=False,
        offline_mode=True,
    )
    store = MemoryStore()
    eliza = state.characters["char_eliza_harrow"]

    memories = store.retrieve(state, eliza, tags=["ledger", "paternity", "mercy"], limit=3)

    assert memories
    assert "ledger" in memories[0].summary.lower()
    assert memories[0].emotional_weight >= 0.9