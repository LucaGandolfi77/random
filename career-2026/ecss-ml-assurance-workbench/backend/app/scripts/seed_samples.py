"""Seed sample datasets generator (deterministic, fixed seeds).

Run:  python -m app.scripts.seed_samples [--output-dir DIR]
"""

import argparse
import csv
import random
from datetime import UTC, datetime, timedelta
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_OUTPUT = PROJECT_ROOT / "sample-data"

_SEED_NOMINAL = 20260101
_SEED_DEGRADED = 20260202
_SEED_LEAKAGE = 20260303


def _fmt_ts(ts: datetime) -> str:
    return ts.strftime("%Y-%m-%dT%H:%M:%SZ")


def generate_nominal(path: Path) -> None:
    rng = random.Random(_SEED_NOMINAL)
    modes = ["NOMINAL", "STANDBY", "SAFE_HOLD"]
    rows: list[list] = []
    base = datetime(2026, 1, 15, 0, 0, 0, tzinfo=UTC)
    for i in range(3000):
        ts = base + timedelta(seconds=10 * i)
        mode = "NOMINAL" if rng.random() < 0.9 else rng.choice(modes[1:])
        bus = round(rng.gauss(28.0, 0.4), 3)
        batt = round(20.0 + 2 * (i % 100) / 100.0 + rng.gauss(0, 0.3), 2)
        wheel = round(rng.gauss(1500.0, 25.0) + (200 if mode == "SAFE_HOLD" else 0), 1)
        sun = round(rng.uniform(0.6, 1.0), 4)
        label = 1 if (bus > 29.5 and rng.random() < 0.5) or mode == "SAFE_HOLD" else 0
        rows.append([_fmt_ts(ts), f"SAT-{1000 + i % 7}", bus, batt, wheel, sun, mode, label])
    _write(
        path,
        rows,
        [
            "timestamp",
            "satellite_id",
            "bus_voltage",
            "battery_temperature",
            "reaction_wheel_speed",
            "sun_sensor_intensity",
            "operating_mode",
            "anomaly_label",
        ],
    )


def generate_degraded(path: Path) -> None:
    rng = random.Random(_SEED_DEGRADED)
    rows: list[list] = []
    base = datetime(2026, 2, 2, 8, 0, 0, tzinfo=UTC)
    n = 1200
    current = base
    for i in range(n):
        # Irregular timestamps: occasional 300s jump instead of 10s.
        step = 300 if i > 0 and i % 137 == 0 else 10
        current = current + timedelta(seconds=step)
        ts = current
        mode_roll = rng.random()
        mode = "NOMINAL" if mode_roll < 0.9 else ("STANDBY" if mode_roll < 0.95 else "SAFE_HOLD")
        bus = 28.0 + rng.gauss(0, 0.6)
        # occasional outlier spike
        if rng.random() < 0.02:
            bus += rng.choice([-8.0, 9.0])
        # missing values ~12% on bus_voltage
        bus_s = "" if rng.random() < 0.12 else round(bus, 3)
        batt = round(19.0 + rng.gauss(0, 1.0), 2)
        # type-error tokens ~2% on battery_temperature
        batt_s = rng.choice(["ERR", "N/A", "--"]) if rng.random() < 0.02 else batt
        wheel = round(rng.gauss(1500.0, 40.0), 1)
        sun = round(rng.uniform(0.0, 1.0), 4)
        # duplicate rows ~4%
        anomaly = 1 if (i % 40 == 0) else 0
        row = [_fmt_ts(ts), f"SAT-{1000 + i % 5}", bus_s, batt_s, wheel, sun, mode, anomaly]
        if i > 0 and rng.random() < 0.04:
            rows.append(rows[-1][:])
        rows.append(row)
    # constant column: hardware_version
    header = [
        "timestamp",
        "satellite_id",
        "bus_voltage",
        "battery_temperature",
        "reaction_wheel_speed",
        "sun_sensor_intensity",
        "operating_mode",
        "anomaly_label",
        "hardware_version",
    ]
    for row in rows:
        row.append("HW-A2")
    _write(path, rows, header)


def generate_leakage(path: Path) -> None:
    rng = random.Random(_SEED_LEAKAGE)
    rows: list[list] = []
    base = datetime(2026, 3, 1, 0, 0, 0, tzinfo=UTC)
    for i in range(1500):
        ts = base + timedelta(seconds=30 * i)
        sensor_a = round(rng.gauss(50.0, 5.0), 2)
        sensor_b = round(sensor_a * 0.5 + rng.gauss(0, 0.5), 2)
        temp = round(30.0 + rng.gauss(0, 2.0), 1)
        anomaly = 1 if (sensor_a > 60.0 and rng.random() < 0.5) else 0
        # leakage column: outcome known only after the event
        post_diag = anomaly
        # leakage: name-similar column
        anomaly_flag_copy = anomaly
        component_id = f"CMP-{i:05d}"
        rows.append([_fmt_ts(ts), component_id, sensor_a, sensor_b, temp, post_diag, anomaly_flag_copy, anomaly])
    _write(
        path,
        rows,
        [
            "timestamp",
            "component_id",
            "sensor_a",
            "sensor_b",
            "temperature_c",
            "post_event_diagnosis",
            "anomaly_label_copy",
            "anomaly_label",
        ],
    )


def _write(path: Path, rows: list[list], header: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.writer(fh)
        writer.writerow(header)
        writer.writerows(rows)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate deterministic sample datasets.")
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    generate_nominal(args.output_dir / "nominal_telemetry.csv")
    generate_degraded(args.output_dir / "degraded_telemetry.csv")
    generate_leakage(args.output_dir / "leakage_example.csv")
    print(f"sample datasets written to {args.output_dir}")


if __name__ == "__main__":
    main()
