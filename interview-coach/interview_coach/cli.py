"""Interview Coach CLI — interactive REPL backed by OpenRouter."""

from __future__ import annotations

import sys
from pathlib import Path

from rich.console import Console
from rich.markdown import Markdown
from rich.panel import Panel
from rich.prompt import Prompt

from memory_agents import Agent, JsonFileMemoryStore, MemoryConfig, OpenRouterConfig, load_environment

from interview_coach.models import InterviewSession, Message
from interview_coach.prompts import SYSTEM_PROMPT
from interview_coach.session import SessionManager

_BASE_DIR = Path.home() / ".interview-coach"
_SESSIONS_DIR = _BASE_DIR / "sessions"
_MEMORIES_DIR = _BASE_DIR / "memories"

console = Console()

_COMMANDS: dict[str, str] = {
    "/save":   "Save the current transcript to a JSON file",
    "/report": "Ask the coach to generate the evaluation report now",
    "/quit":   "End the session (transcript is auto-saved on exit)",
    "/help":   "Show this help message",
}


def _print_help() -> None:
    lines = "\n".join(
        f"[bold cyan]{cmd}[/]  —  {desc}" for cmd, desc in _COMMANDS.items()
    )
    console.print(Panel(lines, title="[bold]Commands[/]", border_style="dim"))


def _build_agent(session_id: str) -> Agent:
    _MEMORIES_DIR.mkdir(parents=True, exist_ok=True)
    store = JsonFileMemoryStore(_MEMORIES_DIR / f"{session_id}.json")
    return Agent(
        name="InterviewCoach",
        system_prompt=SYSTEM_PROMPT,
        llm=OpenRouterConfig(
            model="google/gemini-2.0-flash-exp:free",
            fallback_model="openrouter/free",
        ),
        # Keep the full interview history in short-term memory;
        # set a high min_score so long-term retrieval never pollutes the prompt.
        memory=MemoryConfig(short_term_messages=60, long_term_top_k=1, auto_store=False),
        store=store,
    )


def main() -> None:
    load_environment()

    session_mgr = SessionManager(_SESSIONS_DIR)
    session: InterviewSession = session_mgr.new_session()
    agent = _build_agent(session.session_id)

    console.print(
        Panel(
            "[bold green]Interview Coach[/]\n"
            "Powered by [bold]OpenRouter[/] · free models\n\n"
            "Type [bold cyan]/help[/] to list commands.",
            border_style="green",
        )
    )

    # Trigger the agent's Phase 1 (setup questions) with a silent bootstrap message.
    try:
        opening = agent.ask(
            "Hello! I'm ready to start my interview preparation session.",
            session_id=session.session_id,
        )
    except Exception as exc:  # noqa: BLE001
        console.print(f"[red]Error connecting to OpenRouter:[/] {exc}")
        sys.exit(1)

    console.print(Markdown(opening.text))
    session.messages.append(Message(role="assistant", content=opening.text))

    while True:
        try:
            user_input = Prompt.ask("\n[bold blue]You[/]").strip()
        except (KeyboardInterrupt, EOFError):
            break

        if not user_input:
            continue

        # --- built-in commands ---
        if user_input == "/help":
            _print_help()
            continue

        if user_input == "/save":
            path = session_mgr.save(session)
            console.print(f"[dim]Transcript saved → {path}[/]")
            continue

        if user_input == "/quit":
            break

        if user_input == "/report":
            user_input = (
                "Please stop the interview now and generate my full evaluation report."
            )

        # --- normal conversation turn ---
        session.messages.append(Message(role="user", content=user_input))

        try:
            response = agent.ask(user_input, session_id=session.session_id)
        except Exception as exc:  # noqa: BLE001
            console.print(f"[red]Error:[/] {exc}")
            continue

        console.print(Markdown(response.text))
        session.messages.append(Message(role="assistant", content=response.text))

    # Auto-save on exit
    path = session_mgr.save(session)
    console.print(f"\n[dim]Session transcript saved → {path}[/]")


if __name__ == "__main__":
    main()
