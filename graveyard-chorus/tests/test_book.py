from __future__ import annotations

import json

from graveyard_chorus.book import BookPoemDraft, PoetryBookBuilder, extract_book_markdown_from_prompt, resolve_book_source
from graveyard_chorus.client import LLMResult
from graveyard_chorus.config import RuntimeSettings
from graveyard_chorus.engine import SimulationEngine
from graveyard_chorus.exporters import export_bundle, export_run_archive


class DummyBookClient:
    def __init__(self) -> None:
        self.enabled = True
        self.settings = RuntimeSettings(openrouter_api_key="test-key", offline_mode=False)
        self.poem_calls = 0

    def complete_json(self, **kwargs):
        self.poem_calls += 1
        draft = BookPoemDraft(
            title=f"Poem {self.poem_calls}",
            text=f"Line one for poem {self.poem_calls}.\nLine two for poem {self.poem_calls}.",
            source_character_names=["Silas Vale"],
            source_event_titles=[f"Situation {self.poem_calls}"],
        )
        return draft, LLMResult(text=draft.model_dump_json(), model_used="openrouter/free", raw={})

    def complete_text(self, **kwargs):
        markdown = extract_book_markdown_from_prompt(kwargs["user_prompt"])
        return LLMResult(text=markdown, model_used="openrouter/free", raw={})


class DummyMessyTitleClient(DummyBookClient):
    def complete_json(self, **kwargs):
        self.poem_calls += 1
        draft = BookPoemDraft(
            title="Cradles, Rumors, and Old Grievances\nA Chronicle in Caustic Light\nBennett Harrow arrived in soot and weather.",
            text="Second stanza begins here.",
            source_character_names=["Bennett Harrow"],
            source_event_titles=["A box of old letters surfaced behind the Blue Lantern"],
        )
        return draft, LLMResult(text=draft.model_dump_json(), model_used="openrouter/free", raw={})


class DummyPlaceholderTitleClient(DummyBookClient):
    def complete_json(self, **kwargs):
        self.poem_calls += 1
        draft = BookPoemDraft(
            title="...",
            text="A real poem body survives here.",
            source_character_names=["Ada Quill"],
            source_event_titles=["Lantern Regatta made the river look forgiving"],
        )
        return draft, LLMResult(text=draft.model_dump_json(), model_used="openrouter/free", raw={})


class DummyRunOnTitleClient(DummyBookClient):
    def complete_json(self, **kwargs):
        self.poem_calls += 1
        draft = BookPoemDraft(
            title="Coda under the lamps of Morrowfield, 1921: nine stones, one row, no undoing of order, lamps keeping their yellow like...",
            text="A real coda body survives here.",
            source_character_names=["Ruth Vale"],
            source_event_titles=["Mercy Bell"],
        )
        return draft, LLMResult(text=draft.model_dump_json(), model_used="openrouter/free", raw={})


class DummyTwoPassCopyeditClient(DummyBookClient):
    def __init__(self) -> None:
        super().__init__()
        self.copyedit_calls = 0

    def complete_text(self, **kwargs):
        self.copyedit_calls += 1
        markdown = extract_book_markdown_from_prompt(kwargs["user_prompt"])
        if self.copyedit_calls == 1:
            updated = markdown.replace("Line one for poem 1.", "Line one for poem 1, still awkward, awkward.")
            return LLMResult(text=updated, model_used="openrouter/proofread", raw={})

        updated = markdown.replace("still awkward, awkward.", "still awkward.")
        return LLMResult(text=f"```markdown\n{updated}\n```", model_used="openrouter/severe", raw={})


class DummyPromptLeakClient(DummyBookClient):
    def complete_json(self, **kwargs):
        self.poem_calls += 1
        draft = BookPoemDraft(
            title="Overture for Morrowfield",
            text=(
                "Source Character Names: Ada Quill, Caleb Vale\n"
                "Source Event Titles: Lantern Regatta made the river look forgiving\n\n"
                "Constraints: English only; 10 to 22 lines\n\n"
                "*Note: The model is echoing prompt scaffolding.*\n\n"
                "— Graveyard Chorus Book Poet Agent, Morrowfield Archive\n\n"
                "#### Overture for Morrowfield\n\n"
                "First real line.\n"
                "Second real line."
            ),
            source_character_names=["Ada Quill"],
            source_event_titles=["Lantern Regatta made the river look forgiving"],
        )
        return draft, LLMResult(text=draft.model_dump_json(), model_used="openrouter/free", raw={})


class DummyCopyeditLeakClient(DummyBookClient):
    def complete_text(self, **kwargs):
        markdown = extract_book_markdown_from_prompt(kwargs["user_prompt"])
        leaked = markdown.replace(
            "### Poem 2",
            "### Poem 2\n\n"
            "Source Character Names: Ada Quill, Caleb Vale\n"
            "Source Event Titles: Lantern Regatta made the river look forgiving\n\n"
            "Constraints: English only; 10 to 22 lines\n\n"
            "*Note: The editor is echoing prompt scaffolding.*\n\n"
            "— Graveyard Chorus Book Poet Agent, Morrowfield Archive\n\n"
            "#### Poem 2\n\n"
            "**Poem 2**",
        )
        return LLMResult(text=leaked, model_used="openrouter/free", raw={})


def test_resolve_book_source_selects_latest_run_from_archive_root(tmp_path) -> None:
    settings = RuntimeSettings(openrouter_api_key=None, offline_mode=True)

    earlier_engine = SimulationEngine.from_seed(settings=settings, years=4, llm_enabled=False, offline_mode=True)
    earlier_state = earlier_engine.run(4)
    export_bundle(earlier_state, tmp_path / "morrowfield-1905")

    later_engine = SimulationEngine.from_seed(settings=settings, years=8, llm_enabled=False, offline_mode=True)
    later_state = later_engine.run(8)
    export_bundle(later_state, tmp_path / "morrowfield-1909")
    export_run_archive(tmp_path)

    state_path, state, run_dir, selected = resolve_book_source(tmp_path)

    assert state_path == tmp_path / "morrowfield-1909" / "town_state.json"
    assert run_dir == tmp_path / "morrowfield-1909"
    assert state.current_year == 1909
    assert selected is True


def test_poetry_book_builder_writes_markdown_and_metadata(tmp_path) -> None:
    settings = RuntimeSettings(openrouter_api_key=None, offline_mode=True)
    engine = SimulationEngine.from_seed(settings=settings, years=6, llm_enabled=False, offline_mode=True)
    state = engine.run(6)
    run_dir = tmp_path / "morrowfield-1907"
    export_bundle(state, run_dir)

    builder = PoetryBookBuilder(RuntimeSettings(openrouter_api_key="test-key", offline_mode=False), client=DummyBookClient())
    result = builder.build_from_source(run_dir, max_poems=4, max_epitaphs=3)

    assert result.markdown_path.exists()
    assert result.metadata_path.exists()
    markdown = result.markdown_path.read_text(encoding="utf-8")
    metadata = json.loads(result.metadata_path.read_text(encoding="utf-8"))

    assert "# Songs from Morrowfield" in markdown
    assert "## Prelude and Situation Poems" in markdown
    assert "## Cemetery Voices" in markdown
    assert "Poem 1" in markdown
    assert result.poem_count == 4
    assert result.epitaph_count == 3
    assert metadata["used_llm"] is True
    assert metadata["composition_models"] == ["openrouter/free"]
    assert metadata["editorial_model"] == "openrouter/free"


def test_poetry_book_builder_normalizes_multiline_poem_titles(tmp_path) -> None:
    settings = RuntimeSettings(openrouter_api_key=None, offline_mode=True)
    engine = SimulationEngine.from_seed(settings=settings, years=4, llm_enabled=False, offline_mode=True)
    state = engine.run(4)
    run_dir = tmp_path / "morrowfield-1905"
    export_bundle(state, run_dir)

    builder = PoetryBookBuilder(RuntimeSettings(openrouter_api_key="test-key", offline_mode=False), client=DummyMessyTitleClient())
    result = builder.build_from_source(run_dir, max_poems=3, max_epitaphs=2)

    markdown = result.markdown_path.read_text(encoding="utf-8")
    metadata = json.loads(result.metadata_path.read_text(encoding="utf-8"))

    assert "### Cradles, Rumors, and Old Grievances" in markdown
    assert "### Cradles, Rumors, and Old Grievances\nA Chronicle" not in markdown
    assert metadata["poems"][0]["title"] == "Cradles, Rumors, and Old Grievances"


def test_poetry_book_builder_replaces_placeholder_titles_with_situation_title(tmp_path) -> None:
    settings = RuntimeSettings(openrouter_api_key=None, offline_mode=True)
    engine = SimulationEngine.from_seed(settings=settings, years=4, llm_enabled=False, offline_mode=True)
    state = engine.run(4)
    run_dir = tmp_path / "morrowfield-1905"
    export_bundle(state, run_dir)

    builder = PoetryBookBuilder(RuntimeSettings(openrouter_api_key="test-key", offline_mode=False), client=DummyPlaceholderTitleClient())
    result = builder.build_from_source(run_dir, max_poems=3, max_epitaphs=2)

    metadata = json.loads(result.metadata_path.read_text(encoding="utf-8"))

    assert metadata["poems"][0]["title"] == "Overture for Morrowfield"


def test_poetry_book_builder_replaces_run_on_titles_with_situation_title(tmp_path) -> None:
    settings = RuntimeSettings(openrouter_api_key=None, offline_mode=True)
    engine = SimulationEngine.from_seed(settings=settings, years=4, llm_enabled=False, offline_mode=True)
    state = engine.run(4)
    run_dir = tmp_path / "morrowfield-1905"
    export_bundle(state, run_dir)

    builder = PoetryBookBuilder(RuntimeSettings(openrouter_api_key="test-key", offline_mode=False), client=DummyRunOnTitleClient())
    result = builder.build_from_source(run_dir, max_poems=3, max_epitaphs=2)

    metadata = json.loads(result.metadata_path.read_text(encoding="utf-8"))

    assert metadata["poems"][0]["title"] == "Overture for Morrowfield"


def test_poetry_book_builder_runs_second_copyedit_pass(tmp_path) -> None:
    settings = RuntimeSettings(openrouter_api_key=None, offline_mode=True)
    engine = SimulationEngine.from_seed(settings=settings, years=4, llm_enabled=False, offline_mode=True)
    state = engine.run(4)
    run_dir = tmp_path / "morrowfield-1905"
    export_bundle(state, run_dir)

    client = DummyTwoPassCopyeditClient()
    builder = PoetryBookBuilder(RuntimeSettings(openrouter_api_key="test-key", offline_mode=False), client=client)
    result = builder.build_from_source(run_dir, max_poems=3, max_epitaphs=2)

    markdown = result.markdown_path.read_text(encoding="utf-8")
    metadata = json.loads(result.metadata_path.read_text(encoding="utf-8"))

    assert client.copyedit_calls == 2
    assert "still awkward." in markdown
    assert "still awkward, awkward." not in markdown
    assert "```markdown" not in markdown
    assert metadata["editorial_model"] == "openrouter/severe"


def test_poetry_book_builder_strips_prompt_leakage_from_poem_text(tmp_path) -> None:
    settings = RuntimeSettings(openrouter_api_key=None, offline_mode=True)
    engine = SimulationEngine.from_seed(settings=settings, years=4, llm_enabled=False, offline_mode=True)
    state = engine.run(4)
    run_dir = tmp_path / "morrowfield-1905"
    export_bundle(state, run_dir)

    builder = PoetryBookBuilder(RuntimeSettings(openrouter_api_key="test-key", offline_mode=False), client=DummyPromptLeakClient())
    result = builder.build_from_source(run_dir, max_poems=3, max_epitaphs=2)

    markdown = result.markdown_path.read_text(encoding="utf-8")

    assert "Source Character Names:" not in markdown
    assert "Source Event Titles:" not in markdown
    assert "Constraints:" not in markdown
    assert "*Note:" not in markdown
    assert "Graveyard Chorus Book Poet Agent" not in markdown
    assert "#### Overture for Morrowfield" not in markdown
    assert "First real line." in markdown
    assert "Second real line." in markdown


def test_poetry_book_builder_strips_copyedit_prompt_leakage_from_markdown(tmp_path) -> None:
    settings = RuntimeSettings(openrouter_api_key=None, offline_mode=True)
    engine = SimulationEngine.from_seed(settings=settings, years=4, llm_enabled=False, offline_mode=True)
    state = engine.run(4)
    run_dir = tmp_path / "morrowfield-1905"
    export_bundle(state, run_dir)

    builder = PoetryBookBuilder(RuntimeSettings(openrouter_api_key="test-key", offline_mode=False), client=DummyCopyeditLeakClient())
    result = builder.build_from_source(run_dir, max_poems=3, max_epitaphs=2)

    markdown = result.markdown_path.read_text(encoding="utf-8")

    assert "Source Character Names:" not in markdown
    assert "Source Event Titles:" not in markdown
    assert "Constraints:" not in markdown
    assert "*Note:" not in markdown
    assert "Graveyard Chorus Book Poet Agent" not in markdown
    assert "#### Poem 2" not in markdown