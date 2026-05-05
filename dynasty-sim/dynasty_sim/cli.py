"""CLI entry point for Dynasty Sim."""

from __future__ import annotations

import os
import sys
from pathlib import Path

import typer
from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table

from dynasty_sim.engine import run_simulation
from dynasty_sim.models import SimulationConfig
from dynasty_sim.persistence import (
    list_checkpoints,
    load_latest_checkpoint,
    load_world,
    save_checkpoint,
)
from dynasty_sim.reporter import (
    generate_dynasty_chronicle,
    generate_full_report,
    generate_character_bio,
    print_year_ticker,
)
from dynasty_sim.html_export import export_html
from dynasty_sim.seeds import build_seed_world

app = typer.Typer(
    name="dynasty-sim",
    help="Generational family / dynasty simulator powered by LLMs.",
    add_completion=False,
)
console = Console()


def _get_client():
    """Lazy-initialise the OpenRouter client. Returns None if not configured."""
    api_key = os.getenv("OPENROUTER_API_KEY", "")
    if not api_key:
        return None
    try:
        from dynasty_sim.client import OpenRouterClient
        return OpenRouterClient()
    except Exception:
        return None


# ---------------------------------------------------------------------------
# run
# ---------------------------------------------------------------------------


@app.command()
def run(
    years: int = typer.Option(50, "--years", "-y", help="Number of years to simulate."),
    seed_file: Path = typer.Option(None, "--seed-file", "-s", help="Path to a JSON seed world."),
    save_dir: Path = typer.Option(Path("saves"), "--save-dir", help="Directory to write checkpoints."),
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Print a line per simulated year."),
    autosave: int = typer.Option(10, "--autosave", help="Save a checkpoint every N years (0 = off)."),
    report: bool = typer.Option(True, "--report/--no-report", help="Print the full report at the end."),
    llm: bool = typer.Option(False, "--llm/--no-llm", help="Use LLM for narrative generation."),
) -> None:
    """Run a dynasty simulation and (optionally) save checkpoints."""

    console.print(Panel.fit("[bold cyan]Dynasty Sim[/bold cyan] — starting simulation", border_style="cyan"))

    # Build or load world
    if seed_file is not None:
        console.print(f"  Loading seed world from [bold]{seed_file}[/bold]…")
        world = load_world(seed_file)
    else:
        console.print("  Building default seed world (3 founding families)…")
        cfg = SimulationConfig(
            max_years=years,
            use_llm_for_events=llm,
            use_llm_for_bios=llm,
        )
        world = build_seed_world(cfg)

    client = _get_client() if llm else None
    if llm and client is None:
        console.print("[yellow]Warning:[/yellow] OPENROUTER_API_KEY not set — LLM narration disabled.")

    # Simulation loop with optional progress bar
    if verbose:
        console.rule("Simulation Log")
        def _verbose_tick(w, summary):
            print_year_ticker(summary, w)
        run_simulation(world, llm_client=client, on_year_end=_verbose_tick)
    else:
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            transient=True,
            console=console,
        ) as progress:
            task = progress.add_task(f"Simulating {years} years…", total=None)
            run_simulation(world, llm_client=client)
            progress.update(task, description="Done!")

    # Save final checkpoint
    final_path = save_checkpoint(world, save_dir)
    console.print(f"\n[green]✓[/green] Simulation complete. Saved to [bold]{final_path}[/bold]")

    living = len(world.living_characters())
    total = len(world.characters)
    console.print(f"  Characters: {total} total, {living} living")
    console.print(f"  Dynasties: {len(world.dynasties)}")
    console.print(f"  Events logged: {len(world.events)}")

    if report:
        console.rule("Final Report")
        report_text = generate_full_report(world, client=client)
        console.print(report_text)


# ---------------------------------------------------------------------------
# status
# ---------------------------------------------------------------------------


@app.command()
def status(
    save_file: Path = typer.Option(None, "--save-file", "-f", help="Path to a specific save file."),
    save_dir: Path = typer.Option(Path("saves"), "--save-dir", help="Directory to load latest checkpoint from."),
) -> None:
    """Show the status of a saved simulation world."""
    try:
        world = load_world(save_file) if save_file else load_latest_checkpoint(save_dir)
    except FileNotFoundError as exc:
        console.print(f"[red]Error:[/red] {exc}")
        raise typer.Exit(code=1) from exc

    living = world.living_characters()
    table = Table(title=f"World State — Year {world.current_year}")
    table.add_column("Stat", style="cyan")
    table.add_column("Value", justify="right")
    table.add_row("Current year", str(world.current_year))
    table.add_row("Total characters", str(len(world.characters)))
    table.add_row("Living", str(len(living)))
    table.add_row("Dynasties", str(len(world.dynasties)))
    table.add_row("Households", str(len(world.households)))
    table.add_row("Events logged", str(len(world.events)))
    table.add_row("Year summaries", str(len(world.year_summaries)))
    console.print(table)

    for dynasty in world.dynasties.values():
        members_alive = [m for m in dynasty.member_ids if world.characters.get(m, type("", (), {"is_alive": False})()).is_alive]
        console.print(
            f"  [bold]{dynasty.name}[/bold]: "
            f"{len(dynasty.member_ids)} total members, {len(members_alive)} alive"
        )


# ---------------------------------------------------------------------------
# story
# ---------------------------------------------------------------------------


@app.command()
def story(
    save_file: Path = typer.Option(None, "--save-file", "-f", help="Path to a specific save file."),
    save_dir: Path = typer.Option(Path("saves"), "--save-dir", help="Directory to load latest checkpoint from."),
    character: str = typer.Option(None, "--character", "-c", help="Filter to a specific character name."),
    dynasty: str = typer.Option(None, "--dynasty", "-d", help="Filter to a specific dynasty name."),
    llm: bool = typer.Option(False, "--llm/--no-llm", help="Use LLM for narrative generation."),
) -> None:
    """Print the story / chronicle of the simulated world or a specific character/dynasty."""
    try:
        world = load_world(save_file) if save_file else load_latest_checkpoint(save_dir)
    except FileNotFoundError as exc:
        console.print(f"[red]Error:[/red] {exc}")
        raise typer.Exit(code=1) from exc

    client = _get_client() if llm else None

    if character:
        matched = [
            c for c in world.characters.values()
            if character.lower() in c.full_name.lower()
        ]
        if not matched:
            console.print(f"[red]No character found matching '{character}'[/red]")
            raise typer.Exit(code=1)
        for char in matched[:3]:
            bio = generate_character_bio(char, world, client)
            console.print(f"\n[bold]{char.full_name}[/bold] (b.{char.birth_year})")
            console.print(f"  {bio}")
            if char.memories:
                console.print("  [dim]Key memories:[/dim]")
                top_mems = sorted(char.memories, key=lambda m: m.importance, reverse=True)[:5]
                for mem in top_mems:
                    console.print(f"    • {mem.description}")
        return

    if dynasty:
        matched_dy = [
            d for d in world.dynasties.values()
            if dynasty.lower() in d.name.lower()
        ]
        if not matched_dy:
            console.print(f"[red]No dynasty found matching '{dynasty}'[/red]")
            raise typer.Exit(code=1)
        for dyn in matched_dy:
            chronicle = generate_dynasty_chronicle(dyn, world, client)
            console.print(chronicle)
        return

    # Full report
    report_text = generate_full_report(world, client=client)
    console.print(report_text)


# ---------------------------------------------------------------------------
# tree
# ---------------------------------------------------------------------------


@app.command()
def tree(
    save_file: Path = typer.Option(None, "--save-file", "-f", help="Path to a specific save file."),
    save_dir: Path = typer.Option(Path("saves"), "--save-dir", help="Directory to load latest checkpoint from."),
    character: str = typer.Argument(..., help="Name of the character whose ancestry to display."),
    depth: int = typer.Option(3, "--depth", "-d", help="Number of generations to show."),
) -> None:
    """Display the family tree of a character as ASCII art."""
    try:
        world = load_world(save_file) if save_file else load_latest_checkpoint(save_dir)
    except FileNotFoundError as exc:
        console.print(f"[red]Error:[/red] {exc}")
        raise typer.Exit(code=1) from exc

    matched = [
        c for c in world.characters.values()
        if character.lower() in c.full_name.lower()
    ]
    if not matched:
        console.print(f"[red]No character found matching '{character}'[/red]")
        raise typer.Exit(code=1)

    subject = matched[0]
    console.print(f"\n[bold]Family Tree: {subject.full_name}[/bold]\n")
    _print_tree(subject.id, world, depth=depth, prefix="", is_last=True)


def _print_tree(char_id: str, world: WorldState, depth: int, prefix: str, is_last: bool) -> None:
    if depth < 0 or char_id not in world.characters:
        return
    char = world.characters[char_id]
    connector = "└── " if is_last else "├── "
    status = "" if char.is_alive else f" †{char.death_year}"
    console.print(f"{prefix}{connector}{char.full_name}{status}")
    new_prefix = prefix + ("    " if is_last else "│   ")
    children = list(char.child_ids)
    for i, child_id in enumerate(children):
        _print_tree(child_id, world, depth - 1, new_prefix, i == len(children) - 1)


# ---------------------------------------------------------------------------
# checkpoints
# ---------------------------------------------------------------------------


@app.command()
def checkpoints(
    save_dir: Path = typer.Option(Path("saves"), "--save-dir", help="Directory to list checkpoints from."),
) -> None:
    """List all available save checkpoints."""
    files = list_checkpoints(save_dir)
    if not files:
        console.print("[yellow]No checkpoints found.[/yellow]")
        return
    table = Table(title=f"Checkpoints in {save_dir}")
    table.add_column("#", justify="right", style="dim")
    table.add_column("File", style="cyan")
    table.add_column("Size", justify="right")
    for i, f in enumerate(files, 1):
        size = f.stat().st_size
        table.add_row(str(i), f.name, f"{size / 1024:.1f} KB")
    console.print(table)


@app.command()
def html(
    save_file: Path = typer.Option(None, "--save-file", "-f", help="Path to a specific save file."),
    save_dir: Path = typer.Option(Path("saves"), "--save-dir", help="Directory to load latest checkpoint from."),
    output: Path = typer.Option(Path("report.html"), "--output", "-o", help="Output HTML file path."),
) -> None:
    """Export a self-contained HTML visualisation of a saved world.

    Opens the file in your default browser when done (if possible).
    """
    try:
        world = load_world(save_file) if save_file else load_latest_checkpoint(save_dir)
    except FileNotFoundError as exc:
        console.print(f"[red]Error:[/red] {exc}")
        raise typer.Exit(code=1) from exc

    dest = export_html(world, output)
    console.print(f"[green]✓[/green] HTML report written to [bold]{dest}[/bold]")

    # Try to open in browser
    import subprocess, sys
    try:
        if sys.platform == "darwin":
            subprocess.run(["open", str(dest)], check=False)
        elif sys.platform.startswith("linux"):
            subprocess.run(["xdg-open", str(dest)], check=False)
        elif sys.platform == "win32":
            subprocess.run(["start", str(dest)], shell=True, check=False)
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def main() -> None:
    app()


if __name__ == "__main__":
    main()
