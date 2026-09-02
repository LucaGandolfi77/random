# Operational Design Domain (ODD)

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

> **Instructions.** Define, with traceable identifiers (`ODD-*`), every condition under which the ML
> system is **authorised** to operate and every condition under which it must **not** operate. Connect
> each condition to requirements, data, tests and evidence. Where a section is not applicable, mark it
> `Not Applicable` and justify.

**Related documents**

| Document | Reference | Relation |
|---|---|---|
| [PROJECT_CHARTER.md](./PROJECT_CHARTER.md) | `REQ-F-*`, `REQ-NF-*` | ODD refines charter requirements |
| [DATA_READINESS_REVIEW.md](./DATA_READINESS_REVIEW.md) | `DATA-*` | Dataset coverage vs ODD conditions |
| [MODEL_CARD.md](./MODEL_CARD.md) | `MODEL-*` | Model validity boundaries |
| [TEST_PLAN.md](./TEST_PLAN.md) | `TEST-*` | Tests targeting ODD boundaries |
| [FMEA.md](./FMEA.md) | `FM-*` | Failure modes for OOD/monitoring functions |
| [ASSURANCE_CASE.md](./ASSURANCE_CASE.md) | `ARG-*`, `EVID-*` | Claims about ODD enforcement |

---

## 1. ODD purpose

<State why the ODD exists for this project: which operating envelope the ML function is allowed to see,
and the consequence of operating outside it.>

## 2. System context

<Short description of the host system (spacecraft, platform, ground station, vehicle…), the ML function
and its place in the architecture. Reference the charter.>

## 3. Intended function

- Function: [TO BE COMPLETED]
- Inputs: [TO BE COMPLETED]
- Outputs: [TO BE COMPLETED]
- Automation level and human role: [TO BE COMPLETED]

## 4. Operational scenarios

### 4.1 Nominal scenarios

| ODD ID | Scenario | Conditions | Entry/exit |
|---|---|---|---|
| ODD-001 | [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] |

### 4.2 Degraded scenarios

| ODD ID | Scenario | Conditions | Required behaviour |
|---|---|---|---|
| ODD-002 | [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] |

### 4.3 Corner cases

| ODD ID | Corner case | Conditions | Required behaviour |
|---|---|---|---|
| ODD-003 | [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] |

### 4.4 Worst-case scenarios

| ODD ID | Scenario | Conditions | Required behaviour |
|---|---|---|---|
| ODD-004 | [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] |

### 4.5 Forbidden scenarios (outside ODD)

| ODD ID | Scenario | Why forbidden | Action when detected |
|---|---|---|---|
| ODD-005 | [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] |

## 5. Operating conditions

### 5.1 Environmental conditions

| ODD ID | Condition | Range / value | Source reference |
|---|---|---|---|
| ODD-006 | [e.g. temperature, radiation, illumination, vibration] | [TO BE COMPLETED] | [TO BE COMPLETED] |

### 5.2 Platform conditions

| ODD ID | Condition | Range / value | Notes |
|---|---|---|---|
| ODD-007 | [e.g. attitude, orbit, power state, mode] | [TO BE COMPLETED] | [TO BE COMPLETED] |

### 5.3 Sensor conditions

| ODD ID | Condition | Range / value | Notes |
|---|---|---|---|
| ODD-008 | [e.g. field of view, calibration state, health] | [TO BE COMPLETED] | [TO BE COMPLETED] |

### 5.4 Input ranges (continuous)

| ODD ID | Input | Valid range | Units | Data source |
|---|---|---|---|---|
| ODD-009 | [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] | `DATA-` [TO BE COMPLETED] |

### 5.5 Categorical input values

| ODD ID | Input | Allowed values | Not allowed values | Data source |
|---|---|---|---|---|
| ODD-010 | [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] | `DATA-` [TO BE COMPLETED] |

### 5.6 Temporal constraints

| ODD ID | Constraint | Value | Notes |
|---|---|---|---|
| ODD-011 | Sampling frequency | [TO BE COMPLETED] | [TO BE COMPLETED] |
| ODD-012 | Data freshness / max age | [TO BE COMPLETED] | [TO BE COMPLETED] |
| ODD-013 | Latency budget (end-to-end) | [TO BE COMPLETED] | [TO BE COMPLETED] |

### 5.7 Resource constraints

| ODD ID | Resource | Budget | Notes |
|---|---|---|---|
| ODD-014 | CPU / GPU | [TO BE COMPLETED] | [TO BE COMPLETED] |
| ODD-015 | Memory | [TO BE COMPLETED] | [TO BE COMPLETED] |
| ODD-016 | Power | [TO BE COMPLETED] | [TO BE COMPLETED] |

## 6. Model validity boundaries

| ODD ID | Boundary | Justification | Evidence |
|---|---|---|---|
| ODD-017 | [TO BE COMPLETED] | [TO BE COMPLETED] | `EVID-` [TO BE COMPLETED] |

## 7. Acceptable uncertainty

<Describe the maximum acceptable uncertainty / error for the outputs inside the ODD and how it is
measured. Reference the model card metrics where relevant.>

## 8. Out-of-distribution (OOD) conditions

| ODD ID | OOD condition | Detection mechanism | Required response |
|---|---|---|---|
| ODD-018 | [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] |

## 9. Regions of operation

> **Instructions.** Define the regions used by this project. Mark a region Not Applicable only if the
> concept does not apply to the function.

| Region | Definition | Example conditions | Response |
|---|---|---|---|
| Nominal | [TO BE COMPLETED] | [TO BE COMPLETED] | Nominal output |
| Warning | [TO BE COMPLETED] | [TO BE COMPLETED] | [e.g. degrade output + notify] |
| Unsafe | [TO BE COMPLETED] | [TO BE COMPLETED] | [e.g. block output, trigger fallback] |
| Catastrophic (if applicable) | [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] |

### 9.1 Transition into and out of the ODD

- Entry conditions: [TO BE COMPLETED]
- Exit conditions: [TO BE COMPLETED]
- Hysteresis / debounce: [TO BE COMPLETED]
- Who/what performs the transition: [TO BE COMPLETED]

## 10. Detection and response mechanisms

| Mechanism | What it detects | Response | Test reference |
|---|---|---|---|
| [e.g. OOD detector] | [TO BE COMPLETED] | [TO BE COMPLETED] | `TEST-` [TO BE COMPLETED] |
| [e.g. input range check] | [TO BE COMPLETED] | [TO BE COMPLETED] | `TEST-` [TO BE COMPLETED] |

## 11. Fallback behaviour

- Trigger conditions: [TO BE COMPLETED]
- Fallback behaviour: [TO BE COMPLETED]
- Re-entry conditions after fallback: [TO BE COMPLETED]
- Independence of fallback from the ML constituent: [TO BE COMPLETED]

## 12. Human intervention (if applicable)

- When a human can/must intervene: [TO BE COMPLETED]
- Time budget for intervention: [TO BE COMPLETED]
- Information provided to the human: [TO BE COMPLETED]

## 13. Logging and monitoring requirements

| ODD ID | Requirement | Reference |
|---|---|---|
| ODD-019 | Log ODD-relevant telemetry and mode transitions | `REQ-NF-` [TO BE COMPLETED] |
| ODD-020 | Monitor drift of inputs vs ODD ranges | `REQ-NF-` [TO BE COMPLETED] |

## 14. ODD-to-data coverage matrix

| ODD ID | Condition | Covered in dataset? | Dataset / subset | Coverage evidence | Gap |
|---|---|---|---|---|---|
| ODD-001 | [TO BE COMPLETED] | [Yes / Partial / No] | `DATA-` [TO BE COMPLETED] | `EVID-` [TO BE COMPLETED] | [TO BE COMPLETED] |

## 15. ODD-to-test coverage matrix

| ODD ID | Condition | Test ID | Test method | Status | Evidence |
|---|---|---|---|---|---|
| ODD-001 | [TO BE COMPLETED] | `TEST-` [TO BE COMPLETED] | [TO BE COMPLETED] | [Planned/Run] | `EVID-` [TO BE COMPLETED] |

## 16. Unresolved coverage gaps

| ODD ID | Gap | Impact | Mitigation | Open action |
|---|---|---|---|---|
| ODD-0XX | [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] | `ACT-` [TO BE COMPLETED] |

## 17. Change management

- Process for changing the ODD: [TO BE COMPLETED]
- Impact analysis required when the ODD changes: [Yes — document which artefacts are revisited:
  DATA_READINESS_REVIEW, MODEL_CARD, TEST_PLAN, FMEA, ASSURANCE_CASE]
- Version linkage: ODD version X ↔ dataset version Y ↔ model version Z (fill per release).

## 18. Assumptions and decisions

| ID | Type | Text | Owner | Status |
|---|---|---|---|---|
| ASM-0XX | Assumption | [TO BE COMPLETED] | [TO BE COMPLETED] | [Open / Validated] |
| DEC-0XX | Decision | [TO BE COMPLETED] | [TO BE COMPLETED] | [Open / Confirmed] |

## 19. Open actions

| ID | Action | Owner | Due | Status |
|---|---|---|---|---|
| ACT-0XX | [TO BE COMPLETED] | [TO BE COMPLETED] | YYYY-MM-DD | [Open / Done] |

## 20. Review checklist

- [ ] Every nominal/degraded/corner/worst-case scenario has an `ODD-*` ID.
- [ ] Forbidden scenarios are explicit and have a detection + response.
- [ ] Input ranges, categorical values, temporal and resource constraints are quantified or marked
      "to be confirmed" — never invented.
- [ ] Each ODD condition links to a requirement (`REQ-*`) or is itself traceable.
- [ ] ODD-to-data and ODD-to-test matrices are populated (or a gap is registered with `ACT-`).
- [ ] Warning/unsafe/catastrophic regions and fallback behaviour are defined.
- [ ] Logging and monitoring requirements reference the test plan.
- [ ] No ECSS certification claim is made.
