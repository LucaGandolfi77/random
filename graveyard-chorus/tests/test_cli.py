from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace

from rich.console import Console

from graveyard_chorus import cli
from graveyard_chorus.config import RuntimeSettings
from graveyard_chorus.engine import SimulationEngine


def test_print_summary_includes_chronicle_exact_free_retries(tmp_path, monkeypatch) -> None:
    recording_console = Console(record=True, width=120)
    monkeypatch.setattr(cli, "console", recording_console)

    settings = RuntimeSettings(openrouter_api_key=None, offline_mode=True)
    engine = SimulationEngine.from_seed(
        settings=settings,
        years=1,
        llm_enabled=False,
        offline_mode=True,
    )
    state = engine.run(1)

    fake_client = SimpleNamespace(stats=SimpleNamespace(chronicle_exact_free_retries=7))
    cli._print_summary(
        state,
        tmp_path,
        {"anthology": Path("anthology.md")},
        tmp_path / "graveyard-chorus.log",
        client=fake_client,
        archive_root=tmp_path / "runs",
    )

    output = recording_console.export_text()
    assert "Chronicle exact-free retries" in output
    assert "7" in output
    assert "Run archive:" in output
    assert str(tmp_path / "runs" / "index.html") in output