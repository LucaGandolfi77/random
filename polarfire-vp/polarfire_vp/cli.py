"""CLI entry point for the PolarFire virtual platform."""

from __future__ import annotations

from pathlib import Path

import typer
from rich.console import Console

from polarfire_vp.console import SimulationConsole, run_script
from polarfire_vp.logging_utils import configure_logging
from polarfire_vp.session import SimulationSession

app = typer.Typer(help="PolarFire virtual platform CLI")


@app.command()
def version() -> None:
    """Print the package version."""
    from polarfire_vp import __version__

    typer.echo(__version__)


@app.command()
def shell(
    platform: Path | None = typer.Option(None, help="Board YAML to preload."),
    elf: Path | None = typer.Option(None, help="ELF to preload."),
    verbose: int = typer.Option(0, "--verbose", "-v", count=True, help="Increase logging verbosity."),
) -> None:
    """Start the interactive simulator shell."""
    configure_logging(verbose)
    console = Console()
    session = SimulationSession(console=console)
    if platform:
        session.load_platform(platform)
    if elf:
        session.load_elf(elf)
    SimulationConsole(session=session, console=console).cmdloop()


@app.command()
def run_script_file(
    script: Path = typer.Argument(..., exists=True, readable=True, help="Command script to execute."),
    verbose: int = typer.Option(0, "--verbose", "-v", count=True, help="Increase logging verbosity."),
) -> None:
    """Execute a Renode-inspired PFVP command script."""
    configure_logging(verbose)
    run_script(script, console=Console())


@app.command()
def run(
    platform: Path = typer.Option(..., exists=True, readable=True, help="Board YAML to load."),
    elf: Path | None = typer.Option(None, exists=True, readable=True, help="Optional ELF to load."),
    max_steps: int = typer.Option(100_000, help="Maximum instructions to execute before stopping."),
    break_at: str | None = typer.Option(None, help="Optional address or symbol breakpoint before execution."),
    gdb_port: int | None = typer.Option(None, help="Optional GDB port to expose before execution."),
    verbose: int = typer.Option(0, "--verbose", "-v", count=True, help="Increase logging verbosity."),
) -> None:
    """Load a board, optionally an ELF, and execute until a stop condition."""
    configure_logging(verbose)
    console = Console()
    session = SimulationSession(console=console)
    session.load_platform(platform)
    if elf:
        session.load_elf(elf)
    if break_at:
        session.add_breakpoint(break_at)
    if gdb_port is not None:
        host, port = session.start_gdb_server(gdb_port)
        console.print(f"GDB server listening on {host}:{port}")
    session.reset()
    result = session.run(max_steps=max_steps)
    console.print(f"Stopped: {result.reason} pc=0x{result.pc:016x} steps={result.steps}")


if __name__ == "__main__":
    app()

