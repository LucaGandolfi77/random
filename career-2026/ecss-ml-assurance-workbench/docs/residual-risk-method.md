# Residual risk method (week 3)

## Scales

Severity and likelihood use an integer scale 1–5 (descriptive, project-defined). The risk level is
derived deterministically:

| Rule | Level |
|---|---|
| Severity ≥ 5 and likelihood ≥ 4 | CRITICAL |
| Severity × likelihood ≥ 12 | HIGH |
| Severity × likelihood ≥ 6 | MEDIUM |
| otherwise | LOW |

Thresholds are the same for initial and residual risk and are documented here; the UI shows a legend
instead of colour alone.

## Acceptance

Acceptance statuses: `NOT_ASSESSED`, `ACCEPTABLE`, `ACCEPTABLE_WITH_LIMITATIONS`,
`REQUIRES_MITIGATION`, `NOT_ACCEPTABLE`, `REVIEW_REQUIRED`.

Acceptance is never automatic: each risk row carries a rationale, an owner and a review date. A risk
that stays `NOT_ASSESSED` is treated as an open gap (deployment checklist item "Residual risks
reviewed" fails; package completeness category `residual_risks` becomes PARTIAL).

Example: SEU `RISK-SEU-001` (silent data corruption) is `NOT_ACCEPTABLE` with rationale; the matching
deployment decision is `NO_GO`.
