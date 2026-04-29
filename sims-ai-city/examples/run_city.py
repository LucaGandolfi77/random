"""Small programmatic example for running the simulation without the web UI."""

from __future__ import annotations

from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sims_ai_city import SimulationConfig, boot_engine


def main() -> None:
    config = SimulationConfig(runtime_dir=Path("runtime/example_run"), autosave_every_days=7, random_seed=17)
    engine = boot_engine(config)
    events = engine.simulate_days(21)
    engine.save()

    print(engine.world.town_name)
    print(engine.world.current_date.label)
    print(f"Events generated: {len(events)}")
    if events:
        print(events[-1].headline)


if __name__ == "__main__":
    main()
