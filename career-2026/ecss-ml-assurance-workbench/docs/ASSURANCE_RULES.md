# Assurance rules (week 5)

Deterministic, testable rules power the gap analyzer and deployment gate. They are documented here,
run independent of the UI, and never use LLM interpretation.

## Gap rules (GAP-*)

Severity mapping (documented): a FAIL on a HIGH-severity test → Critical; HIGH → High; MEDIUM→Medium;
unacceptable/not-assessed residual risk → Critical; missing monitoring thresholds → Medium; stale
evidence → Medium; ODD dimensions unverified → High; missing document categories as listed in
`backend/app/assurance_engine/engine.py::RULE_ORDER` and `GAP_CATEGORY`.

Rules implemented (abridged, see engine.py for full predicates):
- Missing Document (model card, ODD, monitoring, data quality);
- Missing / Unverified Requirement (no verification method, NOT_VERIFIED, no test and no evidence);
- Failed Test (per requirement), Not Executed Test, Blocked Test, Inconclusive Test;
- Missing Evidence (stale evidence, requirement without evidence);
- Missing ODD Coverage (ODD status PARTIAL or dimensions unverified);
- Open Failure Mode without linked test;
- Unaccepted / Unmitigated Residual Risk (NOT_ASSESSED, NOT_ACCEPTABLE, REQUIRES_MITIGATION,
  HIGH/CRITICAL without mitigation);
- Missing Deployment Decision (absent, no rationale, no approver);
- Missing / Invalid Monitoring Strategy;
- Invalid Evidence Package (missing or failing verification);
- Version Mismatch (test model version ≠ project model version);
- Invalid Traceability (orphan identifiers).

Blocking gaps are flagged explicitly; severity is assigned only by the rules above.

## Deployment gate rules (DGR-001…)

- DGR-001 required documentation present (blocking);
- DGR-002 deployment report present (blocking);
- DGR-003 no unaccepted residual risk (blocking);
- DGR-004 no blocking failed tests;
- DGR-005 no open failure modes without tests;
- DGR-006 monitoring strategy with thresholds (blocking);
- DGR-007 rollback defined;
- DGR-008 model identified and versioned;
- DGR-009 evidence package valid (blocking).

Recommendation states: Ready for Human Approval · Ready with Conditions · Not Ready · Insufficient
Evidence · Review Required. The engine never approves; official decisions stay human and separate.
Inconsistencies (e.g., official GO with blockers, NO_GO with no failing rule, missing approver) are
reported and require review — decisions are never auto-modified.
