# Deployment decision method (week 3)

## Principle

A deployment decision is an explicit, dated, motivated engineering statement recorded by an approver.
It is **never derived from a single numeric score**. Missing essential information yields
`REVIEW_REQUIRED` or `DEFERRED`, never `GO`.

Allowed decisions: `GO`, `CONDITIONAL_GO`, `NO_GO`, `DEFERRED`, `REVIEW_REQUIRED`.

## Inputs the decision must be coherent with

- verified critical requirements;
- failed / blocked / not-executed tests;
- blocking findings (high-severity failures);
- residual risks and their acceptance status;
- open limitations;
- evidence-package completeness;
- monitoring strategy availability;
- fallback and rollback availability when applicable.

## Non-binding reviewer checklist (shown in UI and deployment report)

1. All critical requirements verified
2. No blocking failed test
3. Data assessed
4. ODD documented
5. FMEA available
6. Residual risks reviewed
7. Limitations documented
8. Monitoring strategy available
9. Rollback defined
10. Evidence package complete

The checklist helps reviewers; it does not replace human judgement and does not force any decision.

## Project decisions (synthetic)

| Project | Decision | Basis (data in the Workbench) |
|---|---|---|
| Telemetry Anomaly Detector | CONDITIONAL_GO | FPR/recall verified; unseen-anomaly FAIL and drift FAIL open; target latency BLOCKED |
| Vision Quantization Lab | CONDITIONAL_GO (INT8) | INT8 within accuracy budget; low-illumination FAIL; simulator-only hardware |
| SEU Fault Injector | NO_GO | SDC FAIL (4.2%) + NOT_ACCEPTABLE risk; no sanity cage |
| Lunar Landing Safety Cage | CONDITIONAL_GO (sim only) | Cage rejects unsafe commands (MC: 0 violations); common-mode INCONCLUSIVE; simulator-only |

Consistency checks (see `test-plan-week-3.md`) assert no GO coexists with failed blocking tests or
NOT_ACCEPTABLE risks, and NO_GO always has a justification.
