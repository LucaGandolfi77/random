"""CLI module: Typer application for lingua-evolver."""

from __future__ import annotations

import threading
from pathlib import Path
from typing import Optional

import typer
from rich.console import Console
from rich.table import Table

from lingua_evolver.client import OpenRouterClient
from lingua_evolver.config import RuntimeSettings
from lingua_evolver.engine import SimulationEngine
from lingua_evolver.exporters import (
    export_chart,
    export_convergence,
    export_csv,
    export_lexicon,
    export_markdown,
    export_phoneme_overlap,
)
from lingua_evolver.input_queue import InputQueue
from lingua_evolver.models import LanguageWorld
from lingua_evolver.persistence import (
    list_checkpoints,
    load_checkpoint,
    save_checkpoint,
    save_export,
)
from lingua_evolver.ui import LiveDisplay, console

app = typer.Typer(add_completion=False, help="Artificial language evolution simulator")
SAVES_DIR = Path("saves")
EXPORTS_DIR = Path("exports")


@app.command()
def run(
    agents: int = typer.Option(8, help="Number of agents"),
    generations: int = typer.Option(100, help="Number of generations"),
    interactions: int = typer.Option(200, help="Interactions per generation"),
    phonemes: int = typer.Option(8, help="Phonemes per agent"),
    llm: bool = typer.Option(True, "--llm/--no-llm", help="Enable LLM participation"),
    interactive: bool = typer.Option(False, "--interactive", help="Enable interactive input"),
    input_file: Optional[Path] = typer.Option(None, help="Load words from file"),
    resume: Optional[Path] = typer.Option(None, help="Resume from checkpoint file"),
    seed: Optional[int] = typer.Option(None, help="Random seed for reproducibility"),
    verbose: bool = typer.Option(False, help="Verbose output"),
    lenition: float = typer.Option(0.05, help="Lenition rate"),
    assimilation: float = typer.Option(0.08, help="Assimilation rate"),
    vowel_harmony: float = typer.Option(0.03, help="Vowel harmony rate"),
    semantic_drift: float = typer.Option(0.02, help="Semantic drift rate"),
    communities: int = typer.Option(2, help="Number of communities"),
    contact_rate: float = typer.Option(0.1, help="Inter-community contact rate"),
    convergence_threshold: float = typer.Option(0.8, help="Early stop convergence threshold"),
    patience: int = typer.Option(20, help="Early stop patience"),
    temperature: float = typer.Option(0.7, help="LLM temperature"),
    max_tokens: int = typer.Option(150, help="LLM max tokens"),
) -> None:
    """Run a language evolution simulation."""
    import random as _random
    if seed is not None:
        _random.seed(seed)
        console.print(f"[dim]Seed set to {seed}[/dim]")

    settings = RuntimeSettings(
        num_agents=agents,
        generations=generations,
        interactions_per_generation=interactions,
        phonemes_per_agent=phonemes,
        llm_enabled=llm,
        verbose=verbose,
        lenition_rate=lenition,
        assimilation_rate=assimilation,
        vowel_harmony_rate=vowel_harmony,
        semantic_drift_rate=semantic_drift,
        num_communities=communities,
        contact_rate=contact_rate,
        convergence_threshold=convergence_threshold,
        early_stop_patience=patience,
        llm_temperature=temperature,
        llm_max_tokens=max_tokens,
    )

    client: OpenRouterClient | None = None
    if settings.effective_llm_enabled:
        client = OpenRouterClient(settings)

    engine = SimulationEngine(settings, client)

    # Load input file if provided
    if input_file and input_file.exists():
        count = engine.input_queue.load_from_file(input_file, 0)
        console.print(f"[green]Loaded {count} words from {input_file}[/green]")

    # Resume or initialize
    if resume:
        world = load_checkpoint(resume)
        console.print(f"[green]Resumed from {resume} (gen {world.generation})[/green]")
    else:
        world = engine.initialize_world()

    start_gen = world.generation

    console.print(Panel.fit(
        "[bold cyan]LINGUA-EVOLVER[/bold cyan]\n"
        f"[dim]{len(world.agents)} agents, gen {start_gen}-{generations}, "
        f"{'LLM ON' if llm else 'LLM OFF'}"
        f"{f', seed={seed}' if seed else ''}[/dim]",
        border_style="cyan",
    ))

    if interactive:
        _run_interactive(engine, world, generations)
    else:
        _run_headless(engine, world, generations)

    # Final summary
    _print_summary(world)

    # Auto-save final state
    path = save_checkpoint(world, SAVES_DIR)
    console.print(f"\n[green]Checkpoint saved: {path}[/green]")


def _run_interactive(
    engine: SimulationEngine,
    world: LanguageWorld,
    total_generations: int,
) -> None:
    """Run simulation with live UI and interactive input."""
    display = LiveDisplay(total_generations)
    input_queue = engine.input_queue

    # Start input listener in background
    stop_event = threading.Event()

    def input_listener() -> None:
        while not stop_event.is_set():
            try:
                line = input()
                if line.strip().lower() == "q":
                    stop_event.set()
                elif "=" in line:
                    parts = line.split("=", 1)
                    phoneme = parts[0].strip()
                    meaning = parts[1].strip()
                    if phoneme and meaning:
                        input_queue.add(phoneme, meaning, world.generation)
            except EOFError:
                break

    input_thread = threading.Thread(target=input_listener, daemon=True)
    input_thread.start()

    try:
        with display:
            for gen in range(world.generation, total_generations):
                if stop_event.is_set():
                    break
                world = engine.tick_generation(world)
                display.update(world)
    finally:
        stop_event.set()


def _run_headless(
    engine: SimulationEngine,
    world: LanguageWorld,
    total_generations: int,
) -> None:
    """Run simulation without live UI."""
    from rich.progress import Progress, SpinnerColumn, TextColumn

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        task = progress.add_task("Evolving...", total=total_generations)

        for gen in range(world.generation, total_generations):
            world = engine.tick_generation(world)
            progress.update(task, advance=1, description=f"Gen {world.generation}/{total_generations}")


def _print_summary(world: LanguageWorld) -> None:
    """Print final simulation summary."""
    console.rule("[bold cyan]SIMULATION COMPLETE[/bold cyan]")

    table = Table(title="Final Statistics", show_header=False)
    table.add_column("Metric", style="bold")
    table.add_column("Value", style="green")

    table.add_row("Generations", str(world.generation))
    table.add_row("Agents", str(len(world.agents)))
    table.add_row("Shared Words", str(len(world.shared_lexicon)))
    table.add_row("Grammar Rules", str(len(world.shared_grammar)))
    table.add_row("Communication Success", f"{world.stats.communication_success:.1%}")
    table.add_row("Average Fluency", f"{world.stats.avg_fluency:.2f}")

    console.print(table)


@app.command()
def stats(
    save_file: Path = typer.Argument(..., help="Path to checkpoint file"),
) -> None:
    """Display statistics from a saved simulation."""
    world = load_checkpoint(save_file)
    _print_summary(world)


@app.command()
def add_word(
    save_file: Path = typer.Argument(..., help="Path to checkpoint file"),
    phoneme: str = typer.Argument(..., help="Phoneme symbol"),
    meaning: str = typer.Argument(..., help="Word meaning"),
) -> None:
    """Add a word to a saved simulation's lexicon."""
    world = load_checkpoint(save_file)

    queue = InputQueue()
    queue.add(phoneme, meaning, world.generation)

    engine = SimulationEngine(RuntimeSettings(num_agents=0))
    engine._input_queue = queue
    world = engine._process_input_queue(world)

    path = save_checkpoint(world, SAVES_DIR.parent)
    console.print(f"[green]Added '{phoneme}' = '{meaning}' to lexicon[/green]")
    console.print(f"[green]Saved to: {path}[/green]")


@app.command()
def add_words(
    save_file: Path = typer.Argument(..., help="Path to checkpoint file"),
    words_file: Path = typer.Argument(..., help="Path to words file"),
) -> None:
    """Add words from a file to a saved simulation."""
    world = load_checkpoint(save_file)

    queue = InputQueue()
    count = queue.load_from_file(words_file, world.generation)

    engine = SimulationEngine(RuntimeSettings(num_agents=0))
    engine._input_queue = queue
    world = engine._process_input_queue(world)

    path = save_checkpoint(world, SAVES_DIR.parent)
    console.print(f"[green]Added {count} words from {words_file}[/green]")
    console.print(f"[green]Saved to: {path}[/green]")


@app.command()
def export(
    save_file: Path = typer.Argument(..., help="Path to checkpoint file"),
    format: str = typer.Option("markdown", help="Export format (markdown, lexicon, csv)"),
) -> None:
    """Export simulation results."""
    world = load_checkpoint(save_file)

    if format == "markdown":
        content = export_markdown(world)
        filename = f"report_gen{world.generation}.md"
    elif format == "lexicon":
        content = export_lexicon(world)
        filename = f"lexicon_gen{world.generation}.md"
    elif format == "csv":
        content = export_csv(world)
        filename = f"timeseries_gen{world.generation}.csv"
    else:
        console.print(f"[red]Unknown format: {format}[/red]")
        raise typer.Exit(1)

    path = save_export(content, EXPORTS_DIR, filename)
    console.print(f"[green]Exported to: {path}[/green]")


@app.command()
def chart(
    save_file: Path = typer.Argument(..., help="Path to checkpoint file"),
    metric: str = typer.Option("fluency", help="Metric (fluency, words, rules, success, phonemes, agents)"),
) -> None:
    """Display ASCII chart of a metric over generations."""
    world = load_checkpoint(save_file)
    content = export_chart(world, metric)
    console.print(content)


@app.command()
def convergence(
    save_file: Path = typer.Argument(..., help="Path to checkpoint file"),
) -> None:
    """Display language convergence metrics."""
    world = load_checkpoint(save_file)
    content = export_convergence(world)
    console.print(content)


@app.command()
def phonemes(
    save_file: Path = typer.Argument(..., help="Path to checkpoint file"),
) -> None:
    """Display phoneme overlap matrix between agents."""
    world = load_checkpoint(save_file)
    content = export_phoneme_overlap(world)
    console.print(content)


@app.command()
def list_saves() -> None:
    """List all saved checkpoints."""
    checkpoints = list_checkpoints(SAVES_DIR)

    if not checkpoints:
        console.print("[dim]No checkpoints found[/dim]")
        return

    table = Table(title="Saved Checkpoints")
    table.add_column("#", style="dim")
    table.add_column("File", style="bold")
    table.add_column("Path", style="dim")

    for i, path in enumerate(checkpoints, 1):
        table.add_row(str(i), path.name, str(path))

    console.print(table)


if __name__ == "__main__":
    app()
