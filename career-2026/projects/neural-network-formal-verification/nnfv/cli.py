"""CLI: python -m nnfv.cli verify --property <id> [--json]"""
import argparse
import json
import sys
from pathlib import Path

from .model import load_embedded_model
from .verifier import Property, run_and_record

ROOT = Path(__file__).resolve().parents[1]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--property", default="all")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args(argv)
    model = load_embedded_model()
    raw = json.loads((ROOT / "properties/properties.json").read_text())
    keys = [args.property] if args.property != "all" else list(raw)
    out = []
    for key in keys:
        prop = Property.from_dict(raw[key])
        result = run_and_record(model, prop, ROOT / "evidence")
        out.append(result)
        print(json.dumps(result, indent=2, sort_keys=True))
    if not args.json and args.property == "all":
        (ROOT / "results/verification_report.json").write_text(json.dumps(out, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    sys.exit(main())
