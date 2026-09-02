# Data Readiness methodology

This document describes how checks, severities and the score are defined in week 1. Everything here is
**deterministic** and implemented in `backend/app/analyzers`.

## 1. Findings model

Every check produces a structured result:

- `check_id` — stable identifier (e.g. `completeness.column_missing_above_threshold`);
- `category` — one of the 8 score categories;
- `status` ∈ {PASS, WARNING, FAIL, NOT_APPLICABLE, NOT_EVALUATED};
- `severity` ∈ {INFO, LOW, MEDIUM, HIGH, CRITICAL} — descriptive, engineering-guidance only;
- observed value, applied threshold, affected columns, small aggregated evidence, risk and recommendation;
- `analyzer_version` for traceability.

## 2. Check inventory (week 1)

| Category | Checks |
|---|---|
| Structure | row/column counts, empty columns, empty rows, duplicate/invalid column names, constant & quasi-constant columns, inferred type distribution, type-incompatible values |
| Completeness | total missing cells, rows with missing values, per-column missing vs. configurable threshold (FAIL ≥ 50%) |
| Duplicates | duplicate rows (WARNING < threshold, FAIL ≥ threshold), duplicate IDs when an ID column is configured |
| Statistical Quality | per-numeric-column profile (min/max/mean/median/std/Q1/Q3/unique/zero ratio), IQR outliers, zero-dominated columns, categorical profile (dominant category, rare categories, high cardinality) |
| Target Quality | evaluated only when a target is set: class distribution/imbalance (categorical), profile/missing/outliers (numeric) |
| Time Quality | evaluated only when a timestamp is set: parseability, ordering, duplicate timestamps, interval regularity, suspicious gaps, coverage |
| Consistency | leakage heuristics (identical/near-identical/name-similar/post-event/unique-id/high-correlation vs target) |
| Traceability | SHA-256 recorded, row-count consistency, natural key guidance |

Rules applied consistently:

- Outliers are described as **possible statistical anomalies** — never as errors.
- Leakage results always carry: *“Potential leakage indicator requiring engineering review.”*
- Categories without data are **not** silently passed: they are marked `NOT_APPLICABLE`/`NOT_EVALUATED` and
  the score coverage reflects that.

## 3. Score

### Formula (method `weighted-penalty v1.0.0`)

- Each of the 8 categories starts at 100.
- Each finding subtracts penalties:

| Status | INFO | LOW | MEDIUM | HIGH | CRITICAL |
|---|---|---|---|---|---|
| WARNING | 1 | 2 | 4 | 7 | 12 |
| FAIL | 0 | 6 | 12 | 20 | 30 |

- Category score = `max(0, 100 − Σ penalties)`; categories with zero evaluated checks get `null`.
- Overall = weighted mean of evaluated categories only:

| Category | Weight |
|---|---|
| Structure | 15% |
| Completeness | 20% |
| Consistency | 12% |
| Duplicates | 8% |
| Statistical Quality | 20% |
| Target Quality | 15% |
| Time Quality | 5% |
| Traceability | 5% |

### Properties

- **Deterministic and reproducible**: same dataset + config + thresholds → identical findings and score.
- **Transparent**: the UI shows per-category score/weight/counts and the coverage share.
- **Configurable**: thresholds (missing %, IQR multiplier, quasi-constant %, imbalance ratio, …) are stored per
  project and used by the checks.
- **Honest about coverage**: if no target/timestamp is configured, Target/Time Quality are not evaluated and
  coverage is < 100%. Never-evaluated categories never award points.

### Disclaimer

> The Data Readiness Score is a decision-support indicator. It does not replace engineering review,
> mission-specific validation, safety analysis or formal certification.

The score is **not** a measure of safety, ECSS compliance or mission suitability.
