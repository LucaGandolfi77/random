from __future__ import annotations

from pathlib import Path
import json

import typer
from rich.console import Console
from rich.table import Table

from .orchestrator import WorkspaceOrchestrator
from .shell import HermesSlashShell
from .store import ConfigStore, DEFAULT_ROOT
from .tui import HermesDashboardController, HermesWorkspaceTUI


app = typer.Typer(help="Hermes multi-agent workspace with live-editable YAML configs.")
agent_app = typer.Typer(help="Inspect and update agent configurations.")
memory_app = typer.Typer(help="Manage shared persistent memory.")
skills_app = typer.Typer(help="Inspect the project-local skill catalog.")
system_app = typer.Typer(help="Inspect global workspace settings.")
app.add_typer(agent_app, name="agent")
app.add_typer(memory_app, name="memory")
app.add_typer(skills_app, name="skills")
app.add_typer(system_app, name="system")

console = Console()


def _store(ctx: typer.Context) -> ConfigStore:
    return ConfigStore(ctx.obj["root"])


@app.callback()
def callback(
    ctx: typer.Context,
    root: Path = typer.Option(DEFAULT_ROOT, "--root", exists=True, file_okay=False, dir_okay=True, resolve_path=True),
) -> None:
    ctx.obj = {"root": root}


@system_app.command("show")
def system_show(ctx: typer.Context) -> None:
    console.print_json(json.dumps(_store(ctx).system(), ensure_ascii=False, indent=2))


@skills_app.command("list")
def skills_list(ctx: typer.Context) -> None:
    catalog = _store(ctx).skill_catalog().get("skills", {})
    table = Table(title="Workspace skills")
    table.add_column("Skill")
    table.add_column("Description")
    for name, payload in sorted(catalog.items()):
        table.add_row(name, str(payload.get("description", "")))
    console.print(table)


@agent_app.command("list")
def agent_list(ctx: typer.Context) -> None:
    table = Table(title="Hermes agents")
    table.add_column("Slug")
    table.add_column("Display")
    table.add_column("Role")
    table.add_column("Provider")
    table.add_column("Model")
    for agent in _store(ctx).list_agents():
        table.add_row(agent.slug, agent.display_name, agent.role, agent.provider, agent.model)
    console.print(table)


@agent_app.command("show")
def agent_show(
    ctx: typer.Context,
    agent_name: str,
    reveal_secret: bool = typer.Option(False, "--reveal-secret"),
) -> None:
    store = _store(ctx)
    agent = store.load_agent(agent_name)
    payload = agent.to_public_dict(reveal_secret=reveal_secret)
    payload["prompt_text"] = store.read_prompt(agent_name).strip()
    console.print_json(json.dumps(payload, ensure_ascii=False, indent=2))


@agent_app.command("update")
def agent_update(
    ctx: typer.Context,
    agent_name: str,
    role: str | None = typer.Option(None, "--role"),
    specialty: str | None = typer.Option(None, "--specialty"),
    description: str | None = typer.Option(None, "--description"),
    provider: str | None = typer.Option(None, "--provider"),
    model: str | None = typer.Option(None, "--model"),
    api_key_env: str | None = typer.Option(None, "--api-key-env"),
    api_key: str | None = typer.Option(None, "--api-key"),
    prompt_text: str | None = typer.Option(None, "--prompt-text"),
    prompt_file: str | None = typer.Option(None, "--prompt-file"),
    skill_add: list[str] | None = typer.Option(None, "--skill-add"),
    skill_remove: list[str] | None = typer.Option(None, "--skill-remove"),
    tool_add: list[str] | None = typer.Option(None, "--tool-add"),
    tool_remove: list[str] | None = typer.Option(None, "--tool-remove"),
) -> None:
    agent = _store(ctx).update_agent(
        agent_name,
        role=role,
        specialty=specialty,
        description=description,
        provider=provider,
        model=model,
        api_key_env=api_key_env,
        api_key=api_key,
        prompt_text=prompt_text,
        prompt_file=prompt_file,
        skill_add=skill_add or [],
        skill_remove=skill_remove or [],
        tool_add=tool_add or [],
        tool_remove=tool_remove or [],
    )
    console.print_json(json.dumps(agent.to_public_dict(), ensure_ascii=False, indent=2))


@memory_app.command("list")
def memory_list(ctx: typer.Context, limit: int = typer.Option(10, "--limit")) -> None:
    console.print_json(json.dumps(_store(ctx).shared_memory().list(limit=limit), ensure_ascii=False, indent=2))


@memory_app.command("add")
def memory_add(
    ctx: typer.Context,
    author: str = typer.Option(..., "--author"),
    content: str = typer.Option(..., "--content"),
    category: str = typer.Option("note", "--category"),
) -> None:
    entry = _store(ctx).shared_memory().append(author, content, category=category)
    console.print_json(json.dumps(entry, ensure_ascii=False, indent=2))


@memory_app.command("search")
def memory_search(ctx: typer.Context, query: str, limit: int = typer.Option(10, "--limit")) -> None:
    console.print_json(json.dumps(_store(ctx).shared_memory().search(query, limit=limit), ensure_ascii=False, indent=2))


@app.command("dispatch")
def dispatch(
    ctx: typer.Context,
    task: str,
    live: bool = typer.Option(False, "--live"),
    agent: list[str] | None = typer.Option(None, "--agent"),
    timeout: int = typer.Option(240, "--timeout"),
    json_output: bool = typer.Option(False, "--json"),
) -> None:
    payload = WorkspaceOrchestrator(ctx.obj["root"]).dispatch(task, live=live, target_agents=agent or None, timeout=timeout)
    if json_output:
        console.print_json(json.dumps(payload, ensure_ascii=False, indent=2))
        return

    table = Table(title=f"Dispatch results ({payload['mode']})")
    table.add_column("Agent")
    table.add_column("Status")
    table.add_column("Seconds")
    table.add_column("Output preview")
    for item in payload["results"]:
        preview = item.get("output", "") or item.get("error", "")
        preview = preview.replace("\n", " ")
        if len(preview) > 110:
            preview = f"{preview[:107]}..."
        table.add_row(item["display_name"], item["status"], str(item["duration_seconds"]), preview)
    console.print(table)
    console.print(f"Shared memory: {payload['shared_memory_path']}")


@app.command("shell")
def shell(
    ctx: typer.Context,
    agent: list[str] | None = typer.Option(None, "--agent"),
) -> None:
    HermesSlashShell(ctx.obj["root"], default_targets=agent or []).cmdloop()


@app.command("tui")
def tui(
    ctx: typer.Context,
    refresh: float = typer.Option(1.0, "--refresh", min=0.2),
    live_default: bool = typer.Option(False, "--live-default"),
    snapshot: bool = typer.Option(False, "--snapshot"),
    agent: list[str] | None = typer.Option(None, "--agent"),
) -> None:
    controller = HermesDashboardController(ctx.obj["root"])
    controller.state.live_mode = live_default
    controller.state.active_targets = list(agent or [])
    if snapshot:
        console.print(controller.render_snapshot(), markup=False)
        return
    HermesWorkspaceTUI(controller, refresh_interval=refresh).run()


def main() -> int:
    app()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())