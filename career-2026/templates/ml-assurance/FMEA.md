# FMEA — Functional Failure Mode and Effects Analysis

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

> **Instructions.** Support a **functional** FMEA for a system containing at least one ML constituent.
> The analysis covers functions, inputs/outputs, timing, OOD behaviour, safety cage, fallback, logging
> and resources. Every failure mode gets an `FM-*` ID and is linked to requirements (`REQ-*`) and tests
> (`TEST-*`). If your project has not defined a Risk Priority Number (RPN) method, **do not** invent RPN
> values: use Severity + existing controls + residual risk instead.

**Related documents**

| Document | Reference | Relation |
|---|---|---|
| [PROJECT_CHARTER.md](./PROJECT_CHARTER.md) | `REQ-*` | Functions originate from requirements |
| [OPERATIONAL_DESIGN_DOMAIN.md](./OPERATIONAL_DESIGN_DOMAIN.md) | `ODD-*` | Failure of OOD detection, transitions |
| [DATA_READINESS_REVIEW.md](./DATA_READINESS_REVIEW.md) | `DATA-*` | Data-related failure causes |
| [MODEL_CARD.md](./MODEL_CARD.md) | `MODEL-*` | Model-specific failure conditions |
| [TEST_PLAN.md](./TEST_PLAN.md) | `TEST-*` | Verification of controls/mitigations |
| [ASSURANCE_CASE.md](./ASSURANCE_CASE.md) | `ARG-*`, `EVID-*` | Failure-mode coverage claims |

---

## 1. Purpose

<State why this FMEA exists: which risks it helps identify, and which decision it supports.>

## 2. Scope

### 2.1 In scope

- [TO BE COMPLETED] — <functions, subsystems, ML constituent boundaries>

### 2.2 Out of scope

- [TO BE COMPLETED]

## 3. System breakdown and functional architecture

<Describe the functions of the system and where the ML constituent(s) sit. Reference the architecture
documentation of the project.>

## 4. ML constituent boundaries

- Functions assigned to ML: [TO BE COMPLETED]
- Functions explicitly **not** assigned to ML: [TO BE COMPLETED]
- Interfaces between ML and deterministic parts: [TO BE COMPLETED]

## 5. Interfaces under analysis

| Interface | Type (data/control/power) | Description |
|---|---|---|
| [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] |

## 6. Assumptions for this analysis

| ID | Assumption | Status |
|---|---|---|
| ASM-0XX | [TO BE COMPLETED] | [Open/Validated] |

## 7. Risk evaluation method

- Severity scale:

| Level | Description | Example |
|---|---|---|
| 1 | [TO BE COMPLETED] | [TO BE COMPLETED] |
| 2 | [TO BE COMPLETED] | [TO BE COMPLETED] |
| 3 | [TO BE COMPLETED] | [TO BE COMPLETED] |
| 4 | [TO BE COMPLETED] | [TO BE COMPLETED] |
| 5 | [TO BE COMPLETED] | [TO BE COMPLETED] |

- Occurrence scale (if used):

| Level | Meaning |
|---|---|
| [TO BE COMPLETED] | [TO BE COMPLETED] |

- Detectability scale (if used):

| Level | Meaning |
|---|---|
| [TO BE COMPLETED] | [TO BE COMPLETED] |

- Risk evaluation method: [Severity-based / RPN = S×O×D (only if scales are defined) / other —
  delete as appropriate]. If RPN is used, record the scales above and the acceptance threshold.

## 8. Failure mode taxonomy

| Category | Description | Covered? |
|---|---|---|
| Function not performed | [TO BE COMPLETED] | [ ] |
| Function performed incorrectly | [TO BE COMPLETED] | [ ] |
| Function performed at the wrong time | [TO BE COMPLETED] | [ ] |
| Excessive latency | [TO BE COMPLETED] | [ ] |

### 8.1 Input failure modes

| Failure mode | Description | Example |
|---|---|---|
| Insufficient input | [TO BE COMPLETED] | [TO BE COMPLETED] |
| Excessive input | [TO BE COMPLETED] | [TO BE COMPLETED] |
| Incorrect input value | [TO BE COMPLETED] | [TO BE COMPLETED] |
| Out-of-range input | [TO BE COMPLETED] | [TO BE COMPLETED] |
| Type mismatch | [TO BE COMPLETED] | [TO BE COMPLETED] |
| Missing input | [TO BE COMPLETED] | [TO BE COMPLETED] |
| Stale input | [TO BE COMPLETED] | [TO BE COMPLETED] |

### 8.2 Output and model failure modes

| Failure mode | Description | Example |
|---|---|---|
| Invalid output | [TO BE COMPLETED] | [TO BE COMPLETED] |
| Unstable output | [TO BE COMPLETED] | [TO BE COMPLETED] |
| OOD not detected | [TO BE COMPLETED] | [TO BE COMPLETED] |
| False OOD detection | [TO BE COMPLETED] | [TO BE COMPLETED] |
| Model corruption | [TO BE COMPLETED] | [TO BE COMPLETED] |

### 8.3 System and monitoring failure modes

| Failure mode | Description | Example |
|---|---|---|
| Resource exhaustion | [TO BE COMPLETED] | [TO BE COMPLETED] |
| Safety cage failure | [TO BE COMPLETED] | [TO BE COMPLETED] |
| Fallback failure | [TO BE COMPLETED] | [TO BE COMPLETED] |
| Logging failure | [TO BE COMPLETED] | [TO BE COMPLETED] |

## 9. Effect analysis

| Effect level | Description |
|---|---|
| Local effect | [TO BE COMPLETED] |
| Next-level effect | [TO BE COMPLETED] |
| System-level effect | [TO BE COMPLETED] |

## 10. Main FMEA table

> **Instructions.** One row per failure mode. Columns requiring engineering analysis are placeholders.
> Never leave invented severity/controls.

| FMEA ID | Item | Function | Failure mode | Failure cause | Local effect | System effect | Severity | Existing control | Detection | Mitigation | Requirement ID | Test ID | Residual risk | Owner | Status | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FM-001 | [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] | [1–5] | [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] | REQ- | TEST- | [TO BE COMPLETED] | [TO BE COMPLETED] | [Open / Mitigated / Accepted] | EVID- |

## 11. Architectural recommendation: independence of mitigations

> A second ML constituent should **not** be the only mitigation for another ML constituent. Prefer
> deterministic controls, conventional software, physics-based models, monitors, fallback logic or other
> independent measures where appropriate.

Record here how independence is achieved for each ML failure mode:

| ML failure mode | Mitigation | Independent from ML? | Basis |
|---|---|---|---|
| FM-0XX | [TO BE COMPLETED] | [Yes / No / Partial] | [TO BE COMPLETED] |

## 12. Residual risk and risk acceptance

| FMEA ID | Residual risk | Acceptance rationale | Accepted by | Date |
|---|---|---|---|---|
| FM-001 | [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] | YYYY-MM-DD |

## 13. Review checklist

- [ ] System breakdown and ML boundaries defined.
- [ ] Scales (severity, and occurrence/detectability if used) are defined before analysis.
- [ ] Failure modes cover functions, inputs, outputs, timing, OOD, cage, fallback, logging, resources.
- [ ] Every `FM-*` row links to a requirement (`REQ-*`) and a test (`TEST-*`) or a registered gap.
- [ ] Local/next-level/system effects described.
- [ ] No ML-only mitigation for an ML failure (see §11).
- [ ] RPN used only if the method is defined; otherwise Severity + residual risk.
- [ ] No ECSS certification claim is made.
