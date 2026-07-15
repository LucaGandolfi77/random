"""UI module: Rich Live display for real-time simulation visualization."""

from __future__ import annotations

from rich.console import Console
from rich.layout import Layout
from rich.live import Live
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

from lingua_evolver.grammar import format_rule
from lingua_evolver.lexicon import format_word
from lingua_evolver.models import LanguageWorld

console = Console()


def build_layout(world: LanguageWorld, gen: int, total: int) -> Layout:
    """Build the Rich Layout for the live display."""
    layout = Layout()

    layout.split_column(
        Layout(name="header", size=3),
        Layout(name="body"),
        Layout(name="footer", size=3),
    )

    layout["body"].split_row(
        Layout(name="left"),
        Layout(name="right"),
    )

    layout["left"].split_column(
        Layout(name="stats", ratio=1),
        Layout(name="lexicon", ratio=1),
    )

    layout["right"].split_column(
        Layout(name="interactions", ratio=1),
        Layout(name="grammar", ratio=1),
        Layout(name="dialogue", ratio=1),
    )

    # Header
    progress = _build_progress_bar(gen, total)
    header_text = Text()
    header_text.append("LINGUA-EVOLVER", style="bold cyan")
    header_text.append(f"  Gen {gen}/{total}", style="white")
    header_text.append(f"\n{progress}", style="green")
    layout["header"].update(Panel(header_text, border_style="cyan"))

    # Stats panel
    layout["stats"].update(_build_stats_panel(world))

    # Lexicon panel
    layout["lexicon"].update(_build_lexicon_panel(world))

    # Interactions panel
    layout["interactions"].update(_build_interactions_panel(world))

    # Grammar panel
    layout["grammar"].update(_build_grammar_panel(world))

    # Dialogue panel
    layout["dialogue"].update(_build_dialogue_panel(world))

    # Footer
    footer = Text()
    footer.append("[i] Input  ", style="bold yellow")
    footer.append("[p] Pausa  ", style="bold yellow")
    footer.append("[q] Esci  ", style="bold yellow")
    footer.append("[s] Salva", style="bold yellow")
    layout["footer"].update(Panel(footer, border_style="dim"))

    return layout


def _build_progress_bar(current: int, total: int) -> str:
    """Build a progress bar string."""
    if total == 0:
        return "[░░░░░░░░░░░░░░░░░░░░] 0%"
    filled = int(30 * current / total)
    bar = "█" * filled + "░" * (30 - filled)
    percent = int(100 * current / total)
    return f"[{bar}] {percent}%"


def _build_stats_panel(world: LanguageWorld) -> Panel:
    """Build the statistics panel."""
    table = Table(show_header=False, box=None, padding=(0, 2))
    table.add_column("Key", style="dim")
    table.add_column("Value", style="bold")

    table.add_row("Agenti", str(len(world.agents)))
    table.add_row("Parole", str(world.stats.total_words))
    table.add_row("Regole", str(world.stats.total_rules))
    table.add_row("Fluency", f"{world.stats.avg_fluency:.2f}")
    table.add_row("Successo", f"{world.stats.communication_success:.0%}")
    table.add_row("Fonemi", str(world.stats.phoneme_count))

    # Add community info
    if world.communities:
        table.add_row("Comunità", str(len(world.communities)))
        avg_div = sum(c.dialect_divergence for c in world.communities) / len(world.communities)
        table.add_row("Divergenza", f"{avg_div:.0%}")

    return Panel(table, title="STATISTICHE", border_style="green")


def _build_lexicon_panel(world: LanguageWorld) -> Panel:
    """Build the shared lexicon panel."""
    table = Table(show_header=False, box=None, padding=(0, 1))
    table.add_column("Word", style="bold yellow")
    table.add_column("Meaning", style="white")
    table.add_column("Source", style="dim")

    for word in world.shared_lexicon[:8]:
        phoneme_map = {}
        for agent in world.agents:
            for p in agent.inventory:
                phoneme_map[p.id] = p
        formatted = format_word(word, phoneme_map)
        source = "AI" if word.source == "emerged" else "UT"
        table.add_row(formatted, word.meaning, source)

    if not world.shared_lexicon:
        table.add_row("(nessuna)", "", "")

    return Panel(table, title="LESSICO CONDIVISO", border_style="yellow")


def _build_interactions_panel(world: LanguageWorld) -> Panel:
    """Build the recent interactions panel."""
    table = Table(show_header=False, box=None, padding=(0, 1))
    table.add_column("Gen", style="dim", width=4)
    table.add_column("Utterance", style="white")
    table.add_column("Result", width=3)

    recent = world.history[-6:] if world.history else []
    for utt in recent:
        # Find agent names
        speaker_name = "?"
        listener_name = "?"
        for agent in world.agents:
            if agent.id == utt.speaker_id:
                speaker_name = agent.name
            if agent.id == utt.listener_id:
                listener_name = agent.name

        # Format phoneme sequence
        phoneme_map = {}
        for agent in world.agents:
            for p in agent.inventory:
                phoneme_map[p.id] = p
        symbols = []
        for pid in utt.phoneme_sequence:
            if pid in phoneme_map:
                symbols.append(phoneme_map[pid].symbol)
        utterance_str = "-".join(symbols) if symbols else "?"

        result = "[green]V[/green]" if utt.understood else "[red]X[/red]"
        table.add_row(str(utt.generation), utterance_str, result)

    if not recent:
        table.add_row("-", "(nessuna interazione)", "-")

    return Panel(table, title="ULTIME INTERAZIONI", border_style="blue")


def _build_grammar_panel(world: LanguageWorld) -> Panel:
    """Build the grammar rules panel."""
    table = Table(show_header=False, box=None, padding=(0, 1))
    table.add_column("Rule", style="bold magenta")
    table.add_column("Strength", style="dim")

    for rule in world.shared_grammar[:5]:
        formatted = format_rule(rule)
        table.add_row(formatted, f"{rule.strength:.0%}")

    if not world.shared_grammar:
        table.add_row("(nessuna regola)", "")

    return Panel(table, title="GRAMMATICA", border_style="magenta")


def _build_dialogue_panel(world: LanguageWorld) -> Panel:
    """Build the dialogue statistics panel."""
    table = Table(show_header=False, box=None, padding=(0, 1))
    table.add_column("Metric", style="dim")
    table.add_column("Value", style="bold")

    if world.dialogues:
        total_dialogues = len(world.dialogues)
        successful = sum(1 for d in world.dialogues if d.success_rate > 0.5)
        avg_success = sum(d.success_rate for d in world.dialogues) / total_dialogues

        table.add_row("Dialoghi", str(total_dialogues))
        table.add_row("Successo", f"{avg_success:.0%}")
        table.add_row("Conferme", str(successful))

        # Recent dialogue topic
        if world.dialogues:
            last = world.dialogues[-1]
            table.add_row("Ultimo topic", last.topic)
    else:
        table.add_row("(nessun dialogo)", "")

    return Panel(table, title="DIALOGHI", border_style="cyan")


class LiveDisplay:
    """Manages the Rich Live display during simulation."""

    def __init__(self, total_generations: int) -> None:
        self._total = total_generations
        self._live: Live | None = None

    def start(self) -> None:
        """Start the live display."""
        self._live = Live(
            console=console,
            refresh_per_second=4,
            screen=True,
        )
        self._live.start()

    def stop(self) -> None:
        """Stop the live display."""
        if self._live:
            self._live.stop()
            self._live = None

    def update(self, world: LanguageWorld) -> None:
        """Update the display with current world state."""
        if self._live:
            layout = build_layout(world, world.generation, self._total)
            self._live.update(layout)

    def __enter__(self) -> LiveDisplay:
        self.start()
        return self

    def __exit__(self, *args: object) -> None:
        self.stop()
