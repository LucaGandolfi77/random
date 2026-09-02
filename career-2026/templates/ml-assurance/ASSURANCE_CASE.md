# Assurance Case

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

> **Instructions.** Assemble the claims, arguments and evidence that support justified confidence in the
> system. This file uses a Claim–Argument–Evidence structure **without requiring proprietary tools**:
> claims are `ARG-*`, evidence items are `EVID-*` and registered in §15 Evidence Index. This document is
> not a certification: it supports engineering review and decision-making.

**Related documents**

| Document | Reference | Relation |
|---|---|---|
| [PROJECT_CHARTER.md](./PROJECT_CHARTER.md) | `REQ-*`, `RISK-*`, `DEC-*` | Requirements and decisions behind claims |
| [OPERATIONAL_DESIGN_DOMAIN.md](./OPERATIONAL_DESIGN_DOMAIN.md) | `ODD-*` | ODD conditions behind claims |
| [DATA_READINESS_REVIEW.md](./DATA_READINESS_REVIEW.md) | `DATA-*`, `NC-*` | Data assurance evidence |
| [MODEL_CARD.md](./MODEL_CARD.md) | `MODEL-*` | Model performance evidence |
| [TEST_PLAN.md](./TEST_PLAN.md) | `TEST-*` | Verification evidence |
| [FMEA.md](./FMEA.md) | `FM-*` | Failure-mode coverage evidence |

---

## 1. Top-level assurance claim

**Claim**

[TO BE COMPLETED] — <e.g. "The ML-based <function> provides <capability> within the defined ODD with
acceptable risk and residual uncertainty for <intended use>.">

**Context**

[TO BE COMPLETED]

## 2. System context

<Describe the system, the ML constituent, the platform and the intended deployment.>

## 3. Intended use

[TO BE COMPLETED] — reference MODEL_CARD intended use and ODD forbidden scenarios.

## 4. ODD

- Conditions: `ODD-*` [TO BE COMPLETED] (see OPERATIONAL_DESIGN_DOMAIN)
- ODD version: [TO BE COMPLETED]

## 5. Criticality and consequences of failure

- Consequences of failure: [TO BE COMPLETED]
- Severity class considered: [TO BE COMPLETED]
- Reference FMEA rows: `FM-*` [TO BE COMPLETED]

## 6. Assumptions

| ID | Assumption | Status | Evidence/owner |
|---|---|---|---|
| ASM-001 | [TO BE COMPLETED] | [Open/Validated] | [TO BE COMPLETED] |

## 7. Justification for using ML

[TO BE COMPLETED] — summarise PROJECT_CHARTER ML-vs-non-ML decision (`DEC-*`) and why a non-ML
alternative is insufficient.

## 8. Claims register

> **Instructions.** For each claim copy the block below, assign `ARG-XXX`, and complete every field.
> Claims that cannot yet be supported keep `Status: Draft` and an `ACT-*`.

### ARG-XXX: Claim title

**Claim**

[TO BE COMPLETED]

**Context**

[TO BE COMPLETED]

**Argument**

[TO BE COMPLETED]

**Supporting evidence**

- EVID-XXX: [TO BE COMPLETED]

**Assumptions**

- ASM-XXX: [TO BE COMPLETED]

**Potential defeaters**

- [TO BE COMPLETED]

**Residual uncertainty**

[TO BE COMPLETED]

**Status**

Draft

### Suggested claim list (complete the ones applicable; delete or extend as needed)

| Claim | Suggested content source |
|---|---|
| ARG-001 Data assurance claim | DATA_READINESS_REVIEW decision + `EVID-*` |
| ARG-002 Model performance claim | MODEL_CARD metrics within ODD |
| ARG-003 Robustness claim | TEST_PLAN robustness/noise/OOD tests |
| ARG-004 Resilience claim | TEST_PLAN resilience/recovery tests |
| ARG-005 Explainability claim | MODEL_CARD explainability section |
| ARG-006 Implementation claim | Framework/target build evidence |
| ARG-007 Target deployment claim | Target-specific tests, resource measurements |
| ARG-008 System integration claim | Integration tests and interfaces |
| ARG-009 Safety cage claim | FMEA + cage tests |
| ARG-010 Monitoring claim | Drift/logging tests + ODD monitoring |
| ARG-011 Update and rollback claim | MODEL_CARD update/retirement + procedure evidence |
| ARG-012 Configuration management claim | Versioned artefacts, hashes (`DATA-*`, `MODEL-*`) |
| ARG-013 Verification completeness claim | TEST_PLAN traceability matrix coverage |

## 9. Unresolved issues

| ID | Issue | Impact | Open action |
|---|---|---|---|
| LIM-0XX | [TO BE COMPLETED] | [TO BE COMPLETED] | `ACT-` |

## 10. Defeaters and counterarguments

| Defeater | Affected claim | Assessment | Mitigation |
|---|---|---|---|
| [TO BE COMPLETED] | ARG-0XX | [TO BE COMPLETED] | [TO BE COMPLETED] |

## 11. Residual risk

| ID | Residual risk | Basis | Acceptance |
|---|---|---|---|
| RISK-0XX | [TO BE COMPLETED] | [FMEA/FM-*, review] | [Accepted/Not accepted] |

## 12. Traceability

| Claim | Requirements | ODD | Tests | Evidence |
|---|---|---|---|---|
| ARG-0XX | REQ- | ODD- | TEST- | EVID- |

## 13. Review and approval

| Version | Reviewer | Date | Outcome | Comments |
|---|---|---|---|---|
| 0.1.0 | [TO BE COMPLETED] | YYYY-MM-DD | [Draft/In Review/Approved] | [TO BE COMPLETED] |

## 14. Assurance conclusion

[TO BE COMPLETED] — <state, for the intended use and ODD, the overall confidence position, the main
residual uncertainties and the conditions of use. Explicitly state that this conclusion is not an ECSS
certification.>

## 15. Evidence Index

| Evidence ID | Description | Source document | Version | Related claim | Related requirement | Related test | Reviewer | Status | Location |
|---|---|---|---|---|---|---|---|---|---|
| EVID-001 | [TO BE COMPLETED] | [e.g. DATA_READINESS_REVIEW] | [TO BE COMPLETED] | ARG-00X | REQ-0XX | TEST-0XX | [TO BE COMPLETED] | [Draft/Reviewed] | [path/link] |

## 16. Open actions

| ID | Action | Owner | Due | Status |
|---|---|---|---|---|
| ACT-0XX | [TO BE COMPLETED] | [TO BE COMPLETED] | YYYY-MM-DD | [Open/Done] |

## 17. Completion checklist

- [ ] Top-level claim and context are explicit and bounded (ODD + intended use).
- [ ] Every applicable claim in §8 is present with Claim/Context/Argument/Evidence/Assumptions.
- [ ] Potential defeaters and residual uncertainty are recorded — not hidden.
- [ ] Evidence Index entries exist for every `EVID-*` referenced anywhere.
- [ ] Traceability table maps claims to REQ/ODD/TEST.
- [ ] Residual risks reference the FMEA or risk register and record acceptance.
- [ ] Conclusion explicitly states the absence of ECSS certification.
