# Case study — Mission Operator AI Decision Console

Problem: decision support where AI recommends but the operator holds authority. Architecture:
recommendation model (rationale, confidence with explanation, evidence, OOD flag, deadline,
consequences, safe default, fallback, mode), authority matrix (AI automatic = log/warn/mode-review;
operator-only = guidance change/abort/veto/mode switch; prohibited automatic actions), actions
accept/reject/defer/veto/request-evidence, timeout safe default, audit trail and non-invasive
workload metrics (alerts, ack/decide times, overrides, deferrals, explanation opens, repeats — no
emotion inference). Scenarios: landing cage divergence and telemetry drift. Results: 8/8 tests PASS.
Limits: synthetic, no real ops. Contribution: HITL + decision authority + audit. CV bullets: (1)
modelled operator authority vs AI automatic actions with explicit veto and timeout safe defaults;
(2) built recommendation + evidence + uncertainty payloads that never masquerade as commands;
(3) implemented audit trail and workload metrics without emotion inference.
