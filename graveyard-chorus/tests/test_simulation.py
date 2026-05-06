from __future__ import annotations

from graveyard_chorus.agents.roles import ChronicleDraft, EpitaphDraft
from graveyard_chorus.client import LLMResult, OpenRouterClient
from graveyard_chorus.config import RuntimeSettings
from graveyard_chorus.engine import SimulationEngine


def test_offline_simulation_produces_chronicles_and_epitaphs() -> None:
    settings = RuntimeSettings(openrouter_api_key=None, offline_mode=True)
    engine = SimulationEngine.from_seed(
        settings=settings,
        years=8,
        llm_enabled=False,
        offline_mode=True,
    )

    state = engine.run(8)

    assert state.current_year == 1909
    assert len(state.chronicles) == 8
    assert state.cemetery is not None
    assert len(state.cemetery.epitaphs) >= 1
    assert all(epitaph.text.startswith("I am") for epitaph in state.cemetery.epitaphs)
    assert any(event.event_type == "marriage" for event in state.life_events)


def test_llm_simulation_uses_openrouter_for_yearly_chronicles(monkeypatch) -> None:
    seen_schema_names: list[str] = []

    def fake_complete_json(self, **kwargs):
        schema_model = kwargs["schema_model"]
        seen_schema_names.append(schema_model.__name__)
        if schema_model is ChronicleDraft:
            draft = ChronicleDraft(
                title="Morrowfield Keeps Its Accounts",
                summary="The town spent the year measuring affection against obligation.",
                mood="watchful",
            )
        elif schema_model is EpitaphDraft:
            draft = EpitaphDraft(text="I am still speaking.", mood="haunted")
        else:
            raise AssertionError(f"Unexpected schema model: {schema_model}")
        return draft, LLMResult(text=draft.model_dump_json(), model_used="openrouter/free", raw={})

    monkeypatch.setattr(OpenRouterClient, "complete_json", fake_complete_json)

    settings = RuntimeSettings(openrouter_api_key="test-key", offline_mode=False)
    engine = SimulationEngine.from_seed(
        settings=settings,
        years=1,
        llm_enabled=True,
        offline_mode=False,
    )

    state = engine.run(1)

    assert state.chronicles[0].title == "Morrowfield Keeps Its Accounts"
    assert state.chronicles[0].summary == "The town spent the year measuring affection against obligation."
    assert state.chronicles[0].mood == "watchful"
    assert state.chronicles[0].model_used == "openrouter/free"
    assert seen_schema_names.count("ChronicleDraft") == 1


def test_llm_failures_fall_back_to_deterministic_outputs(monkeypatch) -> None:
    def fail_complete_json(self, **kwargs):
        raise ValueError("truncated response")

    monkeypatch.setattr(OpenRouterClient, "complete_json", fail_complete_json)

    settings = RuntimeSettings(openrouter_api_key="test-key", offline_mode=False)
    engine = SimulationEngine.from_seed(
        settings=settings,
        years=8,
        llm_enabled=True,
        offline_mode=False,
    )

    state = engine.run(8)

    assert len(state.chronicles) == 8
    assert all(entry.model_used is None for entry in state.chronicles)
    assert state.cemetery is not None
    assert len(state.cemetery.epitaphs) >= 1
    assert all(epitaph.text.startswith("I am") for epitaph in state.cemetery.epitaphs)
    assert all(epitaph.actual_model is None for epitaph in state.cemetery.epitaphs)