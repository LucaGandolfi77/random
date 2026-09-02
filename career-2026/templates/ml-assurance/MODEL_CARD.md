# Model Card

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

> **Instructions.** Document the selected model and **justify** the selection. Do not assume a more
> complex model is better. Report only real, reproducible numbers — if a value is not measured yet, mark
> it "to be measured" with the planned method.

**Related documents**

| Document | Reference | Relation |
|---|---|---|
| [PROJECT_CHARTER.md](./PROJECT_CHARTER.md) | `REQ-*` | Model targets originate from requirements |
| [OPERATIONAL_DESIGN_DOMAIN.md](./OPERATIONAL_DESIGN_DOMAIN.md) | `ODD-*` | Model validity inside the ODD |
| [DATA_READINESS_REVIEW.md](./DATA_READINESS_REVIEW.md) | `DATA-*` | Dataset versions used |
| [TEST_PLAN.md](./TEST_PLAN.md) | `TEST-*` | How metrics are verified |
| [FMEA.md](./FMEA.md) | `FM-*` | Model-related failure modes |
| [ASSURANCE_CASE.md](./ASSURANCE_CASE.md) | `ARG-*`, `EVID-*` | Model performance claims |

---

## 1. Model overview

| Field | Value |
|---|---|
| Model name / ID | `MODEL-` [TO BE COMPLETED] |
| Version | [TO BE COMPLETED] |
| Date | YYYY-MM-DD |
| Task | [classification / regression / detection / other] |
| Status | [Candidate / Selected / Deployed / Retired] |

## 2. Intended use

- [TO BE COMPLETED]

## 3. Non-intended use

- [TO BE COMPLETED] — <use cases explicitly out of scope; reference the ODD forbidden scenarios>

## 4. Model family and architecture

- Family: [TO BE COMPLETED]
- Architecture: [TO BE COMPLETED]
- Framework and versions: [TO BE COMPLETED]
- Training environment (HW/SW): [TO BE COMPLETED]
- Inference environment (HW/SW): [TO BE COMPLETED]

## 5. Interfaces

### 5.1 Input interface

| Field | Value |
|---|---|
| Input type(s) | [TO BE COMPLETED] |
| Shape / size | [TO BE COMPLETED] |
| Data types | [TO BE COMPLETED] |
| Valid ranges | [TO BE COMPLETED] |

### 5.2 Output interface

| Field | Value |
|---|---|
| Output type(s) | [TO BE COMPLETED] |
| Semantics | [TO BE COMPLETED] |
| Post-processing applied | [TO BE COMPLETED] |

## 6. Preprocessing and post-processing

- Preprocessing: [TO BE COMPLETED]
- Post-processing (thresholding, filtering, NMS…): [TO BE COMPLETED]
- Preprocessing parity between training and inference: [TO BE COMPLETED]

## 7. Training details

| Topic | Value |
|---|---|
| Hyperparameters | [TO BE COMPLETED] |
| Training procedure | [TO BE COMPLETED] |
| Random seed(s) | [TO BE COMPLETED] |
| Dataset versions (train/validation) | `DATA-` [TO BE COMPLETED] |
| Training/validation split | [TO BE COMPLETED] |

## 8. Model selection process

### 8.1 Simplest viable model assessment

<Describe the simplest model family that could meet the requirements and why it was insufficient or
sufficient.>

### 8.2 Non-ML baseline

- Baseline: [TO BE COMPLETED] (reference PROJECT_CHARTER §8)
- Baseline results (real only): [TO BE COMPLETED]

### 8.3 Alternative models evaluated

| Candidate | ID | Dataset(s) | Best real result | Limitation | Status |
|---|---|---|---|---|---|
| [TO BE COMPLETED] | `MODEL-` | `DATA-` | [TO BE COMPLETED] | [TO BE COMPLETED] | [Discarded/Candidate] |

### 8.4 Model choice rationale

- Selection decision: `MODEL-` [TO BE COMPLETED]
- Rationale vs requirements and constraints: [TO BE COMPLETED]
- Decision-log reference: `DEC-` [TO BE COMPLETED]

## 9. Comparison table (selected model vs baseline vs alternatives)

| Criterion | Selected model | Non-ML baseline | Alternative A | Alternative B |
|---|---|---|---|---|
| Name | [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] |
| Technical metric (define) | [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] |
| Latency | [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] |
| Memory footprint | [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] |
| Explainability | [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] |
| Determinism | [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] |
| Verification effort | [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] |

## 10. Quality characteristics of the selected model

| Characteristic | Assessment | Method | Evidence |
|---|---|---|---|
| Functionality | [TO BE COMPLETED] | [TO BE COMPLETED] | `EVID-` |
| Reliability | [TO BE COMPLETED] | [TO BE COMPLETED] | `EVID-` |
| Local robustness | [TO BE COMPLETED] | [TO BE COMPLETED] | `EVID-` |
| Global robustness | [TO BE COMPLETED] | [TO BE COMPLETED] | `EVID-` |
| Resilience | [TO BE COMPLETED] | [TO BE COMPLETED] | `EVID-` |
| Interpretability | [TO BE COMPLETED] | [TO BE COMPLETED] | `EVID-` |
| Explainability | [TO BE COMPLETED] | [TO BE COMPLETED] | `EVID-` |
| Uncertainty estimation | [TO BE COMPLETED] | [TO BE COMPLETED] | `EVID-` |
| Calibration | [TO BE COMPLETED] | [TO BE COMPLETED] | `EVID-` |

> **Instructions.** These assessments must be reproducible. Each one should point to a `TEST-*` in the
> test plan and to evidence in the assurance case.

## 11. Metrics

### 11.1 Technical metrics

| ID | Metric | Value | Dataset/split | Test | Evidence |
|---|---|---|---|---|---|
| REQ-F-00X → | [TO BE COMPLETED] | [real value or "to be measured"] | `DATA-` | `TEST-` | `EVID-` |

### 11.2 Operational metrics

| ID | Metric | Value | Measurement point | Test | Evidence |
|---|---|---|---|---|---|
| [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] | `TEST-` | `EVID-` |

### 11.3 Per-scenario metrics

| Scenario (ODD) | Metric | Value | Evidence |
|---|---|---|---|
| `ODD-` | [TO BE COMPLETED] | [TO BE COMPLETED] | `EVID-` |

## 12. Known failure conditions and biases

- Known failure conditions: [TO BE COMPLETED]
- Known biases: [TO BE COMPLETED]
- OOD behaviour: [TO BE COMPLETED]

## 13. Resource usage

| Resource | Measured value | Measurement method | Evidence |
|---|---|---|---|
| Latency (per inference) | [TO BE COMPLETED] | [TO BE COMPLETED] | `EVID-` |
| Throughput | [TO BE COMPLETED] | [TO BE COMPLETED] | `EVID-` |
| Memory footprint | [TO BE COMPLETED] | [TO BE COMPLETED] | `EVID-` |
| Power consumption (if measured) | [TO BE COMPLETED] | [TO BE COMPLETED] | `EVID-` |

## 14. Post-training optimization

| Step | Applied? | Details | Regression checked? |
|---|---|---|---|
| Quantization | [ ] | [TO BE COMPLETED] | [ ] |
| Pruning | [ ] | [TO BE COMPLETED] | [ ] |
| Distillation | [ ] | [TO BE COMPLETED] | [ ] |
| Target-specific validation after optimization | [ ] | [TO BE COMPLETED] | [ ] |

## 15. Artefact identification

- Model version: [TO BE COMPLETED]
- Model hash (e.g. SHA-256): [TO BE COMPLETED]
- Reproducibility instructions: [TO BE COMPLETED]

## 16. Limitations

| ID | Limitation | Impact | Mitigation |
|---|---|---|---|
| LIM-0XX | [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] |

## 17. Ethical, legal and security considerations

- [TO BE COMPLETED]

## 18. Update and retirement strategy

- Update triggers and process: [TO BE COMPLETED]
- Retirement criteria: [TO BE COMPLETED]
- Rollback path: [TO BE COMPLETED]

## 19. Assumptions and decisions

| ID | Type | Text | Status |
|---|---|---|---|
| ASM-0XX | Assumption | [TO BE COMPLETED] | [Open/Validated] |
| DEC-0XX | Decision | [TO BE COMPLETED] | [Open/Confirmed] |

## 20. Open actions

| ID | Action | Owner | Due | Status |
|---|---|---|---|---|
| ACT-0XX | [TO BE COMPLETED] | [TO BE COMPLETED] | YYYY-MM-DD | [Open/Done] |

## 21. Approval checklist

- [ ] Selected model identified with `MODEL-*` and version/hash.
- [ ] Selection justified against non-ML baseline and alternatives (no "bigger is better").
- [ ] Metrics are real, reproducible, and linked to `TEST-*`/`EVID-*` (or marked to-be-measured).
- [ ] Resource usage measured on the target or explicitly pending.
- [ ] Post-training optimization recorded with regression checks.
- [ ] Known failure conditions, biases and OOD behaviour described.
- [ ] Limitations and update/retirement strategy present.
- [ ] No ECSS certification claim is made.
