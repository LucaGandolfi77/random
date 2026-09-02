"""CLI demo runner (reproducible). Usage: python -m gnc_safety_cage.run_demo [--fault bias|stuck|ml_bias]"""
import argparse
import json

from .ekf_cage import run_simulation
from .metrics import compute_metrics
from .model import ScenarioFaults, SimConfig


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fault", default="none", choices=["none", "bias", "stuck", "ml_bias", "ml_stale", "ml_nan", "ml_ood", "cov"])
    parser.add_argument("--seed", type=int, default=20260902)
    args = parser.parse_args()
    faults = ScenarioFaults(seed=args.seed)
    if args.fault == "bias":
        faults.altimeter_bias = 15.0
    elif args.fault == "stuck":
        faults.stuck_start = 200
    elif args.fault == "ml_bias":
        faults.ml_bias_from = 300
    elif args.fault == "ml_stale":
        faults.ml_stale_from = 400
    elif args.fault == "ml_nan":
        faults.ml_nan_from = 350
    elif args.fault == "ml_ood":
        faults.ml_ood_from = 350
    elif args.fault == "cov":
        cfg = SimConfig(process_q=__import__("numpy").diag([0.5, 0.2, 1e-3]))
        rec = run_simulation(cfg, faults)
        print(json.dumps({"seed": args.seed, "fault": args.fault,
                          "metrics": compute_metrics(rec)}, indent=2, default=float))
        return 0
    rec = run_simulation(faults=faults)
    print(json.dumps({"seed": args.seed, "fault": args.fault, "metrics": compute_metrics(rec)},
                     indent=2, default=float))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
