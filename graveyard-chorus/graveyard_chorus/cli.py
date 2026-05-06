from __future__ import annotations

from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import typer
from rich.console import Console
from rich.table import Table

from .book import PoetryBookBuilder
from .client import OpenRouterClient
from .config import configure_logging, load_settings
from .engine import SimulationEngine
from .exporters import export_bundle, export_run_archive
from .persistence import build_run_directory, load_state

app = typer.Typer(add_completion=False, help="Generate linked epitaph anthologies from a small-town literary simulation.")
console = Console()


@app.command()
def run(
    years: int | None = typer.Option(None, help="Override the number of years to simulate."),
    seed_file: Path | None = typer.Option(None, exists=True, file_okay=True, dir_okay=False, help="Optional custom town seed JSON."),
    output_dir: Path | None = typer.Option(None, help="Base output directory for the generated run."),
    random_seed: int | None = typer.Option(None, help="Override the simulation random seed."),
    offline: bool = typer.Option(False, help="Force offline deterministic mode and disable OpenRouter calls."),
    llm: bool = typer.Option(True, help="Enable the OpenRouter literary layer when credentials are present."),
) -> None:
    """Run a production-minded town simulation and export the full literary bundle."""
    settings = load_settings()
    log_path = configure_logging(settings)
    if offline:
        settings.offline_mode = True
    if llm and not settings.offline_mode and not settings.openrouter_api_key:
        console.print("LLM mode requested but OPENROUTER_API_KEY is missing; continuing in deterministic mode.")
    llm_enabled = llm and not settings.offline_mode and bool(settings.openrouter_api_key)
    engine = SimulationEngine.from_seed(
        settings=settings,
        seed_path=seed_file,
        years=years,
        random_seed=random_seed,
        llm_enabled=llm_enabled,
        offline_mode=settings.offline_mode,
    )
    state = engine.run(years)
    destination_root = output_dir or settings.save_dir
    run_dir = build_run_directory(destination_root, state.town_name, state.current_year)
    paths = export_bundle(state, run_dir)
    export_run_archive(destination_root)
    _print_summary(state, run_dir, paths, log_path, client=engine.client, archive_root=destination_root)


@app.command()
def demo(
    years: int = typer.Option(12, help="Number of years for the bundled offline demo."),
    output_dir: Path = typer.Option(Path("examples/sample_run"), help="Directory that will receive the exported demo anthology."),
) -> None:
    """Run the bundled seed in offline mode and export a reproducible sample anthology."""
    settings = load_settings()
    log_path = configure_logging(settings)
    settings.offline_mode = True
    engine = SimulationEngine.from_seed(
        settings=settings,
        years=years,
        llm_enabled=False,
        offline_mode=True,
    )
    state = engine.run(years)
    paths = export_bundle(state, output_dir)
    _print_summary(state, output_dir, paths, log_path, client=engine.client)


@app.command()
def anthology(
    state_file: Path = typer.Argument(..., exists=True, file_okay=True, dir_okay=False, help="Saved town state JSON to export."),
    output_dir: Path = typer.Option(Path("exports"), help="Directory that will receive the anthology bundle."),
) -> None:
    """Export a new anthology bundle from an existing saved town state."""
    log_path = configure_logging(load_settings())
    state = load_state(state_file)
    paths = export_bundle(state, output_dir)
    _print_summary(state, output_dir, paths, log_path)


@app.command()
def book(
    source: Path = typer.Argument(..., exists=True, help="Export run directory, archive root, or town_state.json file."),
    output_file: Path | None = typer.Option(None, help="Optional markdown output path. Defaults to poetry_book.md inside the selected run directory."),
    title: str | None = typer.Option(None, help="Optional book title override."),
    max_poems: int = typer.Option(6, min=3, help="Maximum number of newly composed poems to generate from exported situations."),
    max_epitaphs: int = typer.Option(8, min=1, help="Maximum number of exported epitaphs to include in the book."),
    offline: bool = typer.Option(False, help="Force deterministic assembly without OpenRouter."),
    llm: bool = typer.Option(True, help="Use OpenRouter free models for poem composition and editorial correction when credentials are present."),
) -> None:
    """Build a poetry-and-epitaph book from an existing export."""
    settings = load_settings()
    log_path = configure_logging(settings)
    if offline:
        settings.offline_mode = True
    if llm and not settings.offline_mode and not settings.openrouter_api_key:
        console.print("LLM book mode requested but OPENROUTER_API_KEY is missing; continuing in deterministic book mode.")

    use_llm = llm and not settings.offline_mode and bool(settings.openrouter_api_key)
    client = OpenRouterClient(settings) if use_llm else None
    builder = PoetryBookBuilder(settings=settings, client=client)
    try:
        result = builder.build_from_source(
            source,
            title=title,
            output_path=output_file,
            max_poems=max_poems,
            max_epitaphs=max_epitaphs,
        )
        archive_root = result.run_dir.parent
        if (archive_root / "index.html").exists() or archive_root == source:
            export_run_archive(archive_root)
    finally:
        if client is not None:
            client.close()

    table = Table(title="Poetry Book Export")
    table.add_column("Metric")
    table.add_column("Value")
    table.add_row("Book title", result.title)
    table.add_row("Source run", str(result.run_dir))
    table.add_row("Source state", str(result.source_state_path))
    table.add_row("Selected from archive root", "yes" if result.selected_run_from_archive_root else "no")
    table.add_row("Poems composed", str(result.poem_count))
    table.add_row("Epitaphs included", str(result.epitaph_count))
    table.add_row("Used OpenRouter", "yes" if result.used_llm else "no")
    table.add_row("Composition models", ", ".join(result.composition_models) if result.composition_models else "deterministic fallback only")
    table.add_row("Editorial model", result.editorial_model or "deterministic fallback only")
    table.add_row("Log file", str(log_path))
    console.print(table)
    console.print(f"Markdown book: {result.markdown_path}")
    console.print(f"Book metadata: {result.metadata_path}")
    if (result.run_dir.parent / "index.html").exists():
        console.print(f"Run archive: {result.run_dir.parent / 'index.html'}")


@app.command()
def serve(
    bundle_dir: Path = typer.Argument(..., exists=True, file_okay=False, dir_okay=True, help="Export directory containing index.html and the JSON bundle."),
    host: str = typer.Option("127.0.0.1", help="Host interface to bind the preview server to."),
    port: int = typer.Option(8000, help="Port for the preview server."),
) -> None:
    """Serve an exported bundle so the PWA explorer and service worker work correctly."""
    log_path = configure_logging(load_settings())
    handler = partial(SimpleHTTPRequestHandler, directory=str(bundle_dir.resolve()))
    server = ThreadingHTTPServer((host, port), handler)
    console.print(f"Serving {bundle_dir} at http://{host}:{port}/")
    console.print(f"Logging to: {log_path}")
    console.print("Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        console.print("Stopping preview server.")
    finally:
        server.server_close()


@app.command("probe-models")
def probe_models(
    models: str | None = typer.Option(None, help="Optional comma-separated model IDs to probe directly. Defaults to primary plus fallbacks."),
) -> None:
    """Probe OpenRouter model availability directly, without fallback contamination."""
    settings = load_settings()
    log_path = configure_logging(settings)
    if not settings.openrouter_api_key or settings.offline_mode:
        raise typer.Exit("OpenRouter is not enabled in the current environment.")

    target_models = [item.strip() for item in models.split(",") if item.strip()] if models else list(settings.available_models)
    client = OpenRouterClient(settings)
    try:
        results = client.probe_models(target_models)
    finally:
        client.close()

    table = Table(title="OpenRouter Model Probe")
    table.add_column("Requested")
    table.add_column("Status")
    table.add_column("Actual")
    table.add_column("Response / Error")
    for result in results:
        table.add_row(
            result.requested_model,
            "OK" if result.ok else "FAIL",
            result.actual_model or "-",
            result.response_text or result.error or "-",
        )
    console.print(table)
    console.print(f"Logging to: {log_path}")


def _print_summary(
    state,
    output_dir: Path,
    paths: dict[str, Path],
    log_path: Path,
    *,
    client: OpenRouterClient | None = None,
    archive_root: Path | None = None,
) -> None:
    table = Table(title=f"{state.town_name} Export Summary")
    table.add_column("Metric")
    table.add_column("Value")
    table.add_row("Current year", str(state.current_year))
    table.add_row("Living characters", str(len(state.alive_characters())))
    table.add_row("Deceased characters", str(len(state.deceased_characters())))
    table.add_row("Epitaphs", str(len(state.cemetery.epitaphs) if state.cemetery else 0))
    table.add_row("Life events", str(len(state.life_events)))
    table.add_row("Town events", str(len(state.town_events)))
    if client is not None:
        table.add_row("Chronicle exact-free retries", str(client.stats.chronicle_exact_free_retries))
    table.add_row("Log file", str(log_path))
    console.print(table)
    console.print(f"Output directory: {output_dir}")
    if archive_root is not None:
        console.print(f"Run archive: {archive_root / 'index.html'}")
    for label, path in paths.items():
        console.print(f"- {label}: {path}")


if __name__ == "__main__":
    app()