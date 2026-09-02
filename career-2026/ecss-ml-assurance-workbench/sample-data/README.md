# Sample data

Three **synthetic** CSV datasets used for demonstration and testing. They are generated with fixed random
seeds — none of them come from a real mission.

| File | Purpose |
|---|---|
| `nominal_telemetry.csv` | Mostly clean simulated telemetry for happy-path checks. |
| `degraded_telemetry.csv` | Intentionally degraded: missing values, duplicates, outliers, type tokens, irregular timestamps, constant column, imbalanced target. |
| `leakage_example.csv` | Contains an obviously leaky feature (`post_event_diagnosis` == target) plus a name-similar column and unique row IDs. |

Regenerate deterministically with `make seed` or:

```bash
cd backend && python -m app.scripts.seed_samples
```
