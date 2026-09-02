# Project Charter

| Field | Value |
|---|---|
| Document ID | [TO BE COMPLETED] |
| Project | [TO BE COMPLETED] |
| Version | 0.1.0 |
| Status | Draft |
| Owner | [TO BE COMPLETED] |
| Reviewers | [TO BE COMPLETED] |
| Created | YYYY-MM-DD |
| Last updated | YYYY-MM-DD |

> **Instructions.** This is the anchor document of the assurance set. Complete it before the others.
> Placeholders use `[TO BE COMPLETED]` or `<Describe …>`. Never replace placeholders with invented
> numbers. Where the charter refers to other documents, open them and record their identifiers.

**Related documents**

| Document | Reference | Relation to this charter |
|---|---|---|
| [OPERATIONAL_DESIGN_DOMAIN.md](./OPERATIONAL_DESIGN_DOMAIN.md) | `ODD-*` | Refines REQs into operational conditions |
| [DATA_READINESS_REVIEW.md](./DATA_READINESS_REVIEW.md) | `DATA-*`, `NC-*` | Defines the data needed to satisfy REQs |
| [MODEL_CARD.md](./MODEL_CARD.md) | `MODEL-*` | Documents the selected model for the REQs |
| [TEST_PLAN.md](./TEST_PLAN.md) | `TEST-*` | Verifies the REQs |
| [FMEA.md](./FMEA.md) | `FM-*` | Analyses failures of functions defined here |
| [ASSURANCE_CASE.md](./ASSURANCE_CASE.md) | `ARG-*`, `EVID-*` | Argues that the REQs are satisfied |

---

## 1. Executive summary

<Describe in 5–10 lines: the operational problem, the proposed approach, expected value and the current
stage of the project.>

## 2. Operational problem

<Describe the operational problem in engineering terms: the task, the environment, the users and the
consequences of poor performance.>

## 3. Stakeholders and users

| Stakeholder | Role | Interest | Constraints |
|---|---|---|---|
| [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] |

## 4. Mission / business value

<Describe the mission or business objective this project serves, and how success is measured at mission
level (not at model level).>

## 5. Pain points

- [TO BE COMPLETED] — <e.g. missed anomalies, high false-alarm workload, manual review effort>.

## 6. Expected operational benefit

<Describe the expected benefit quantitatively **as targets to be confirmed**, e.g. "reduce false alarms
from an agreed baseline of X to Y per shift — to be measured in the operational trial". Do not state
measured values that do not exist yet.>

## 7. Motivation for using ML

<Explain why learning from data is considered necessary or beneficial: e.g. no closed-form model, pattern
recognition, sensor fusion, adaptive behaviour. State the hypothesis explicitly.>

## 8. Comparison with a non-ML solution

### 8.1 Baseline (existing)

- Existing approach: [TO BE COMPLETED]
- Known limitations of the baseline: [TO BE COMPLETED]
- Baseline performance data: [TO BE COMPLETED] (only real measurements; otherwise state "to be
  measured").

### 8.2 Alternatives considered

| Alternative | Type | Description | Why considered / discarded |
|---|---|---|---|
| [TO BE COMPLETED] | e.g. rules, physics model, classic ML, deep ML, hybrid | [TO BE COMPLETED] | [TO BE COMPLETED] |

### 8.3 ML versus non-ML decision matrix

> **Instructions.** Fill one row per criterion. Use descriptive ratings such as Low/Medium/High or
> Better/Equal/Worse, never invented numbers. If a value is unknown, write "unknown — to be assessed".

| Criterion | ML solution | Non-ML solution | Evidence / basis |
|---|---|---|---|
| Expected performance | [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] |
| Explainability | [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] |
| Determinism | [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] |
| Data dependency | [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] |
| Implementation complexity | [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] |
| Verification complexity | [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] |
| Target resource usage | [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] |
| Maintainability | [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] |
| Operational risk | [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] |
| Expected value | [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] |

### 8.4 ML decision

> **Instructions.** ML is not automatically the best solution. Record the actual decision and its basis.

- Decision: [ML / non-ML / hybrid — to be decided]
- Rationale: [TO BE COMPLETED]
- Decision-log reference: `DEC-` [TO BE COMPLETED]

## 9. Project scope

### 9.1 In scope

- [TO BE COMPLETED]

### 9.2 Out of scope

- [TO BE COMPLETED]
- [TO BE COMPLETED] — if a future iteration covers it, add an `ACT-` item.

## 10. Concept of Operations (synthetic)

<Describe, in a few paragraphs, how the ML function will be used in operations: operator roles, data flow,
automation level, fallback, monitoring and lifecycle (updates, rollback). Link the ODD.>

## 11. Requirements

> **Instructions.** Requirements are written as verifiable statements, each with a stable identifier.
> Requirements are owned by this document and referenced by the others. Leave values that must still be
> negotiated as targets with a clear status (e.g. "to be confirmed").

### 11.1 Functional requirements

| ID | Requirement | Verification method | Status |
|---|---|---|---|
| REQ-F-001 | [TO BE COMPLETED] | [Inspection / Analysis / Test / Demonstration] | [Draft / Confirmed] |

### 11.2 Non-functional requirements

| ID | Requirement | Verification method | Status |
|---|---|---|---|
| REQ-NF-001 | [TO BE COMPLETED] | [TO BE COMPLETED] | [Draft / Confirmed] |

### 11.3 Interface requirements

| ID | Requirement | Interface | Status |
|---|---|---|---|
| REQ-I-001 | [TO BE COMPLETED] | [TO BE COMPLETED] | [Draft / Confirmed] |

## 12. Constraints

### 12.1 Safety and mission constraints

- [TO BE COMPLETED]

### 12.2 Computing constraints

- [TO BE COMPLETED] — <platform, CPU, memory envelope>

### 12.3 Latency / timing constraints

- [TO BE COMPLETED]

### 12.4 Power constraints

- [TO BE COMPLETED] — <include "to be measured on target" where not yet known>

## 13. Assumptions

| ID | Assumption | Owner | Validation status |
|---|---|---|---|
| ASM-001 | [TO BE COMPLETED] | [TO BE COMPLETED] | [Open / Validated / Invalidated] |

## 14. Dependencies

- [TO BE COMPLETED] — <datasets, sensors, simulators, teams, external suppliers>

## 15. Success criteria

### 15.1 Technical metrics (targets)

| ID | Metric | Target | Verification reference |
|---|---|---|---|
| REQ-F-001 → | [TO BE COMPLETED] | [TO BE COMPLETED] | `TEST-` [TO BE COMPLETED] |

### 15.2 Operational metrics (targets)

| ID | Metric | Target | Measurement point |
|---|---|---|---|
| [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] |

## 16. Project risks

| ID | Risk | Likelihood | Impact | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|
| RISK-001 | [TO BE COMPLETED] | [Low/Med/High] | [Low/Med/High] | [TO BE COMPLETED] | [TO BE COMPLETED] | [Open/Mitigated/Accepted] |

## 17. Deliverables

- [TO BE COMPLETED] — <e.g. dataset + review report, model artefact + model card, test report,
  integration package>

## 18. Deployment target

- Platform: [TO BE COMPLETED]
- Environment: [onboard / ground / edge / cloud — delete as appropriate]
- Constraints: [TO BE COMPLETED]
- Related ODD section: [OPERATIONAL_DESIGN_DOMAIN.md](./OPERATIONAL_DESIGN_DOMAIN.md) `ODD-` [TO BE
  COMPLETED]

## 19. Limitations

| ID | Limitation | Impact | Planned mitigation |
|---|---|---|---|
| LIM-001 | [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] |

## 20. Future developments

- [TO BE COMPLETED] — <planned next iterations and their value>

## 21. Approval criteria

This charter is approved when:

- [ ] Owner and reviewers are named and agree on scope.
- [ ] The ML vs non-ML decision matrix is completed (or explicitly deferred with an `ACT-` item).
- [ ] Requirements use stable identifiers and have a verification method.
- [ ] The related documents (ODD, data, model, test, FMEA) are open and their identifiers referenced.
- [ ] Open actions are registered.

## 22. Decision log

| ID | Date | Decision | Rationale | Affected IDs | Status |
|---|---|---|---|---|---|
| DEC-001 | YYYY-MM-DD | [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] | [Open / Confirmed / Superseded] |

## 23. Open actions

| ID | Action | Owner | Due | Status |
|---|---|---|---|---|
| ACT-001 | [TO BE COMPLETED] | [TO BE COMPLETED] | YYYY-MM-DD | [Open / Done] |

## 24. Completion checklist

- [ ] Document Control complete.
- [ ] Executive summary and operational problem written.
- [ ] ML vs non-ML matrix completed without assuming ML is better.
- [ ] Functional, non-functional and interface requirements identified (`REQ-F-*`, `REQ-NF-*`, `REQ-I-*`).
- [ ] Constraints (safety, computing, latency, power) recorded.
- [ ] Risks (`RISK-*`) and limitations (`LIM-*`) registered.
- [ ] Assumptions (`ASM-*`), decisions (`DEC-*`) and open actions (`ACT-*`) are maintained.
- [ ] Success criteria and metrics (technical and operational) are targets, not invented results.
- [ ] References to the six related documents exist and point to real IDs.
- [ ] No ECSS certification claim is made anywhere in this document.
