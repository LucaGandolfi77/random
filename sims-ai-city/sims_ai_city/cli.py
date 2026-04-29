"""CLI entry point for running and inspecting the simulation."""

from __future__ import annotations

import argparse
import json

from sims_ai_city.config import SimulationConfig
from sims_ai_city.simulation.chronicles import compose_recent_recap
from sims_ai_city.simulation.engine import SimulationEngine, boot_engine


def build_parser() -> argparse.ArgumentParser:
    """Build the command line parser."""

    parser = argparse.ArgumentParser(description="Run the Sims AI City generational social simulator.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    new_parser = subparsers.add_parser("new", help="Create a fresh seeded simulation and save it.")
    new_parser.add_argument("--seed", type=int, default=17, help="Random seed for the simulation.")

    run_parser = subparsers.add_parser("run", help="Advance the simulation by a number of days.")
    run_parser.add_argument("--days", type=int, default=30, help="Number of days to simulate.")

    summary_parser = subparsers.add_parser("summary", help="Print a compact summary of the current city state.")
    summary_parser.add_argument("--json", action="store_true", help="Print the summary as JSON.")

    serve_parser = subparsers.add_parser("serve", help="Launch the lightweight web inspector.")
    serve_parser.add_argument("--port", type=int, default=8123, help="Port for the inspector server.")

    return parser


def main() -> None:
    """CLI entry point."""

    parser = build_parser()
    args = parser.parse_args()

    if args.command == "new":
        engine = SimulationEngine(SimulationConfig(random_seed=args.seed))
        engine.save()
        print(f"Created a fresh simulation for {engine.world.town_name} with seed {engine.config.random_seed}.")
        print(compose_recent_recap(engine.world.events))
        return

    if args.command == "run":
        engine = boot_engine()
        events = engine.simulate_days(args.days)
        engine.save()
        print(f"Simulated {args.days} days in {engine.world.town_name}.")
        for event in events[-12:]:
            print(f"- {event.headline}")
        return

    if args.command == "summary":
        engine = boot_engine()
        snapshot = engine.inspector_snapshot()
        if args.json:
            print(json.dumps(snapshot, indent=2, ensure_ascii=False))
        else:
            print(f"{snapshot['town_name']} :: {snapshot['date']}")
            print(f"Population: {snapshot['population']} | Families: {snapshot['families']}")
            print(snapshot['last_yearly_recap'] or compose_recent_recap(engine.world.events))
        return

    if args.command == "serve":
        from sims_ai_city.web.api import serve_app

        serve_app(port=args.port)


if __name__ == "__main__":
    main()
