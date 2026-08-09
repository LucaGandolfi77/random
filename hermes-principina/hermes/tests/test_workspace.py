from pathlib import Path
import json
import shutil

from typer.testing import CliRunner

from hermes_workspace.cli import app
from hermes_workspace.store import ConfigStore
from hermes_workspace.tui import HermesDashboardController


PROJECT_ROOT = Path(__file__).resolve().parent.parent


def scaffold_workspace(tmp_path: Path) -> Path:
    root = tmp_path / "hermes-workspace"
    root.mkdir()
    for name in ["config", "prompts", "skills", "runtime"]:
        shutil.copytree(PROJECT_ROOT / name, root / name)
    for name in ["AGENTS.md", "SOUL.md", "README.md"]:
        shutil.copy2(PROJECT_ROOT / name, root / name)
    return root


def test_agent_update_rewrites_config_and_prompt(tmp_path: Path) -> None:
    root = scaffold_workspace(tmp_path)
    runner = CliRunner()

    result = runner.invoke(
        app,
        [
            "--root",
            str(root),
            "agent",
            "update",
            "ricercatore",
            "--role",
            "Ricerca forense e raccolta evidenze",
            "--skill-add",
            "fact_check",
            "--prompt-text",
            "Sei il Ricercatore. Lavora solo con fonti verificabili.",
        ],
    )

    assert result.exit_code == 0
    store = ConfigStore(root)
    agent = store.load_agent("ricercatore")
    assert agent.role == "Ricerca forense e raccolta evidenze"
    assert "fact_check" in agent.enabled_skills
    assert store.read_prompt("ricercatore").strip() == "Sei il Ricercatore. Lavora solo con fonti verificabili."


def test_preview_dispatch_runs_all_agents_and_writes_shared_memory(tmp_path: Path) -> None:
    root = scaffold_workspace(tmp_path)
    runner = CliRunner()
    store = ConfigStore(root)

    result = runner.invoke(
        app,
        [
            "--root",
            str(root),
            "dispatch",
            "Analizza un backlog tecnico e proponi azioni coordinate",
            "--json",
        ],
    )

    assert result.exit_code == 0
    payload = json.loads(result.stdout)
    expected_slugs = [agent.slug for agent in store.list_agents()]
    assert payload["agent_count"] == len(expected_slugs)
    assert len(payload["results"]) == len(expected_slugs)

    memory_entries = store.shared_memory().list(limit=50)
    authors = {entry["author"] for entry in memory_entries}
    assert {"orchestrator", *expected_slugs}.issubset(authors)


def test_expanded_roster_contains_specialist_agents(tmp_path: Path) -> None:
    root = scaffold_workspace(tmp_path)
    slugs = [agent.slug for agent in ConfigStore(root).list_agents()]

    assert slugs == [
        "ricercatore",
        "sviluppatore",
        "revisore",
        "storico",
        "economista",
        "giurista",
        "statistico",
        "architetto",
        "docente",
    ]


def test_cli_dispatch_can_target_multiple_specific_agents(tmp_path: Path) -> None:
    root = scaffold_workspace(tmp_path)
    runner = CliRunner()

    result = runner.invoke(
        app,
        [
            "--root",
            str(root),
            "dispatch",
            "Esegui solo ricerca e review",
            "--agent",
            "ricercatore",
            "--agent",
            "revisore",
            "--json",
        ],
    )

    assert result.exit_code == 0
    payload = json.loads(result.stdout)
    assert payload["agent_count"] == 2
    assert [item["agent"] for item in payload["results"]] == ["ricercatore", "revisore"]


def test_tui_snapshot_hot_reloads_agent_config(tmp_path: Path) -> None:
    root = scaffold_workspace(tmp_path)
    controller = HermesDashboardController(root)

    before = controller.render_snapshot()
    assert "Selected agent: Ricercatore (ricercatore)" in before

    ConfigStore(root).update_agent("ricercatore", role="Ricerca realtime e analisi forense")
    after = controller.render_snapshot()
    assert "Ricerca realtime e analisi forense" in after


def test_tui_command_updates_prompt_without_restart(tmp_path: Path) -> None:
    root = scaffold_workspace(tmp_path)
    controller = HermesDashboardController(root)

    assert controller.execute('/prompt revisore "Sei il gate finale con hot reload."') is True
    snapshot = controller.render_snapshot()

    assert "Sei il gate finale con hot reload." in snapshot


def test_tui_targets_command_limits_dispatch_scope(tmp_path: Path) -> None:
    root = scaffold_workspace(tmp_path)
    controller = HermesDashboardController(root)

    assert controller.execute("/targets set ricercatore revisore") is True
    assert controller.execute("Analizza e revisiona questo task") is True

    snapshot = controller.snapshot()
    assert snapshot["active_targets"] == ["ricercatore", "revisore"]
    assert snapshot["last_dispatch"] is not None
    assert snapshot["last_dispatch"]["agent_count"] == 2
    assert [item["agent"] for item in snapshot["last_dispatch"]["results"]] == ["ricercatore", "revisore"]