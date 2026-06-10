from __future__ import annotations

import argparse
from pathlib import Path

from .examples import RTX_3090_EXAMPLE
from .formatters import banner, format_case_summary, format_full_report, format_history
from .mock_agents import MockAgentProvider
from .models import AGENT_DISPLAY_NAMES, CaseInput
from .orchestrator import TrialEngine
from .storage import CourtroomStorage


CATEGORIES = [
    "Business",
    "Technology purchase",
    "Time investment",
    "Thesis / research",
    "Software architecture",
    "Career",
    "Other",
]


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="ai-courtroom",
        description="Terminal-only AI Courtroom MVP with mocked multi-agent debate.",
    )
    parser.add_argument("--db-path", default=None, help="Custom SQLite path.")
    subparsers = parser.add_subparsers(dest="command")

    new_parser = subparsers.add_parser("new", help="Create and run a new case.")
    _add_case_arguments(new_parser)

    demo_parser = subparsers.add_parser("demo", help="Run the included RTX 3090 example case.")
    demo_parser.add_argument("--export", default=None, help="Optional Markdown export path.")

    subparsers.add_parser("list", help="List saved sessions.")

    show_parser = subparsers.add_parser("show", help="Show a stored case report in the terminal.")
    show_parser.add_argument("case_id", type=int)

    export_parser = subparsers.add_parser("export", help="Export a stored case to Markdown.")
    export_parser.add_argument("case_id", type=int)
    export_parser.add_argument("--output", default=None, help="Output .md path.")

    subparsers.add_parser("settings", help="Show current CLI settings.")
    return parser


def _add_case_arguments(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--title", default=None)
    parser.add_argument("--dilemma", default=None)
    parser.add_argument("--category", default=None)
    parser.add_argument("--budget", default=None)
    parser.add_argument("--time-horizon", default=None)
    parser.add_argument("--constraints", default=None)
    parser.add_argument("--risk-tolerance", type=int, default=None)
    parser.add_argument("--context", default=None)
    parser.add_argument(
        "--alternatives",
        default=None,
        help="Comma-separated alternatives already considered.",
    )


def parse_case_from_args(args: argparse.Namespace) -> CaseInput:
    if args.dilemma:
        return CaseInput(
            title=args.title or _default_title(args.dilemma),
            dilemma=args.dilemma,
            category=args.category or "Other",
            budget=args.budget,
            time_horizon=args.time_horizon,
            constraints=args.constraints or "",
            risk_tolerance=args.risk_tolerance if args.risk_tolerance is not None else 50,
            existing_context=args.context or "",
            alternatives=_split_csv(args.alternatives),
        )
    return prompt_for_case()


def prompt_for_case() -> CaseInput:
    print(banner())
    print("NEW CASE\n")
    dilemma = _prompt_required("Dilemma or decision question")
    title = input(f"Case title [{_default_title(dilemma)}]: ").strip() or _default_title(dilemma)
    category = _prompt_category()
    budget = _prompt_optional("Budget")
    time_horizon = _prompt_optional("Time horizon")
    constraints = _prompt_optional("Constraints") or ""
    risk_tolerance = _prompt_risk_tolerance()
    context = _prompt_optional("Existing context") or ""
    alternatives_text = _prompt_optional("Alternatives already considered (comma separated)")
    return CaseInput(
        title=title,
        dilemma=dilemma,
        category=category,
        budget=budget,
        time_horizon=time_horizon,
        constraints=constraints,
        risk_tolerance=risk_tolerance,
        existing_context=context,
        alternatives=_split_csv(alternatives_text),
    )


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    storage = CourtroomStorage(Path(args.db_path) if args.db_path else None)
    engine = TrialEngine(storage=storage, provider=MockAgentProvider())

    if args.command is None:
        run_interactive_menu(engine)
        return

    if args.command == "new":
        case_input = parse_case_from_args(args)
        run_case(engine, case_input)
        return

    if args.command == "demo":
        _case, _messages, _verdict, report = run_case(engine, RTX_3090_EXAMPLE)
        if args.export:
            output = write_report(Path(args.export), report)
            print(f"\nReport exported to {output}")
        return

    if args.command == "list":
        print(format_history(storage.list_cases()))
        return

    if args.command == "show":
        show_case(engine, args.case_id)
        return

    if args.command == "export":
        export_case(engine, args.case_id, args.output)
        return

    if args.command == "settings":
        print("Provider: MockAgentProvider")
        print(f"Database: {storage.db_path}")
        return

    parser.print_help()


def run_interactive_menu(engine: TrialEngine) -> None:
    while True:
        print(banner())
        print("1) New case")
        print("2) Demo case")
        print("3) Session history")
        print("4) Show stored case")
        print("5) Export report")
        print("6) Settings")
        print("0) Exit")
        choice = input("\nSelect an option: ").strip()

        if choice == "1":
            run_case(engine, prompt_for_case())
        elif choice == "2":
            run_case(engine, RTX_3090_EXAMPLE)
        elif choice == "3":
            print(format_history(engine.storage.list_cases()))
            input("Press Enter to continue...")
        elif choice == "4":
            case_id = int(_prompt_required("Case ID"))
            show_case(engine, case_id)
            input("Press Enter to continue...")
        elif choice == "5":
            case_id = int(_prompt_required("Case ID"))
            export_case(engine, case_id, None)
            input("Press Enter to continue...")
        elif choice == "6":
            print(f"Database: {engine.storage.db_path}")
            print("Provider: MockAgentProvider")
            input("Press Enter to continue...")
        elif choice == "0":
            print("Exiting AI Courtroom CLI.")
            return
        else:
            print("Invalid option. Try again.")


def run_case(engine: TrialEngine, case_input: CaseInput):
    print("\nInitializing case...\n")
    case, messages, verdict, report = engine.run_trial(case_input, progress=_progress)
    print("\n" + format_case_summary(case))
    print(format_full_report(case, messages, verdict))
    default_export = default_export_path(case.id, case.title)
    output = write_report(default_export, report)
    print(f"\nMarkdown report saved to {output}\n")
    return case, messages, verdict, report


def show_case(engine: TrialEngine, case_id: int) -> None:
    case, messages, verdict, _report = engine.load_case_bundle(case_id)
    if not case or not verdict:
        print(f"Case #{case_id} not found or not completed yet.")
        return
    print(format_full_report(case, messages, verdict))


def export_case(engine: TrialEngine, case_id: int, output: str | None) -> None:
    case, _messages, _verdict, report = engine.load_case_bundle(case_id)
    if not case or not report:
        print(f"Case #{case_id} not found or report unavailable.")
        return
    path = write_report(Path(output) if output else default_export_path(case.id, case.title), report)
    print(f"Report exported to {path}")


def _progress(role: str, stage: str) -> None:
    name = AGENT_DISPLAY_NAMES.get(role, role)
    print(f"[deliberating] {name} -> {stage}")


def _prompt_required(label: str) -> str:
    while True:
        value = input(f"{label}: ").strip()
        if value:
            return value
        print("This field is required.")


def _prompt_optional(label: str) -> str | None:
    value = input(f"{label} [optional]: ").strip()
    return value or None


def _prompt_category() -> str:
    print("Category:")
    for index, category in enumerate(CATEGORIES, start=1):
        print(f"  {index}) {category}")
    while True:
        raw = input("Select category [1-7]: ").strip() or "7"
        if raw.isdigit() and 1 <= int(raw) <= len(CATEGORIES):
            return CATEGORIES[int(raw) - 1]
        print("Please enter a valid number.")


def _prompt_risk_tolerance() -> int:
    while True:
        raw = input("Risk tolerance [0-100, default 50]: ").strip() or "50"
        if raw.isdigit() and 0 <= int(raw) <= 100:
            return int(raw)
        print("Please enter an integer between 0 and 100.")


def _split_csv(value: str | None) -> list[str]:
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


def _default_title(dilemma: str) -> str:
    cleaned = dilemma.strip().rstrip("?")
    return cleaned[:70] if len(cleaned) > 70 else cleaned


def default_export_path(case_id: int, title: str) -> Path:
    export_dir = Path.cwd() / "exports"
    export_dir.mkdir(parents=True, exist_ok=True)
    slug = "-".join(title.lower().split())[:60]
    return export_dir / f"case-{case_id}-{slug}.md"


def write_report(path: Path, content: str) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    return path
