# Data Readiness Review

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

> **Instructions.** Evaluate whether the data are adequate **before** final model selection. Every claim
> must be backed by evidence (`EVID-*`) or explicitly marked as an open action. Where a section does not
> apply (e.g. no temporal data), mark it Not Applicable with a one-line justification.

**Related documents**

| Document | Reference | Relation |
|---|---|---|
| [PROJECT_CHARTER.md](./PROJECT_CHARTER.md) | `REQ-*` | Data must satisfy charter requirements |
| [OPERATIONAL_DESIGN_DOMAIN.md](./OPERATIONAL_DESIGN_DOMAIN.md) | `ODD-*` | Data must represent the ODD |
| [MODEL_CARD.md](./MODEL_CARD.md) | `MODEL-*` | Data versions used by the model |
| [TEST_PLAN.md](./TEST_PLAN.md) | `TEST-*` | Dataset evaluation tests |
| [FMEA.md](./FMEA.md) | `FM-*` | Data-related failure modes |
| [ASSURANCE_CASE.md](./ASSURANCE_CASE.md) | `ARG-*` | Data assurance claims |

---

## 1. Review objective

<State the purpose of this review: which question it answers for which dataset(s), for which ODD and
which decision it supports.>

## 2. Dataset inventory

| ID | Dataset name | Version | Format | Rows/Size | Purpose | Status |
|---|---|---|---|---|---|---|
| DATA-001 | [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] | [train/validation/test/probe] | [TO BE COMPLETED] |

## 3. Governance and provenance

### 3.1 Data ownership

- Owner / organisation: [TO BE COMPLETED]
- Contact: [TO BE COMPLETED]
- Data steward: [TO BE COMPLETED]

### 3.2 Data origin and provenance

- Origin: [TO BE COMPLETED]
- Provenance chain: [TO BE COMPLETED]

### 3.3 Legal, licensing and confidentiality constraints

- License: [TO BE COMPLETED]
- Confidentiality / ITAR/EAR or equivalent classification: [TO BE COMPLETED]
- Handling and storage rules: [TO BE COMPLETED]

## 4. Acquisition

### 4.1 Acquisition method

- Method: [TO BE COMPLETED]
- Equipment / sensor / simulator used: [TO BE COMPLETED]
- Calibration status: [TO BE COMPLETED]
- Responsible team: [TO BE COMPLETED]

### 4.2 Data source classification

| Source type | Used? (Yes/No) | Details | Notes on representativeness |
|---|---|---|---|
| Real data | [ ] | [TO BE COMPLETED] | [TO BE COMPLETED] |
| Simulated data | [ ] | [TO BE COMPLETED] | [TO BE COMPLETED] |
| Synthetic data | [ ] | [TO BE COMPLETED] | [TO BE COMPLETED] |
| Augmented data | [ ] | [TO BE COMPLETED] | [TO BE COMPLETED] |
| Surrogate data | [ ] | [TO BE COMPLETED] | [TO BE COMPLETED] |
| Laboratory data | [ ] | [TO BE COMPLETED] | [TO BE COMPLETED] |

## 5. Metadata and schema

- Metadata availability: [TO BE COMPLETED]
- Data dictionary / schema document: [TO BE COMPLETED]
- Units of measurement: [TO BE COMPLETED]
- Timestamp quality and format: [TO BE COMPLETED]
- Sample frequency: [TO BE COMPLETED]

## 6. Volume, storage and accessibility

- Volume: [TO BE COMPLETED]
- Storage location: [TO BE COMPLETED]
- Accessibility and access control: [TO BE COMPLETED]

## 7. Data quality assessment

> **Instructions.** For each dimension below record the observed state and the evidence. Do not invent
> numbers: write the value or "not assessed — see ACT-xxx".

| Dimension | Finding | Evidence | Severity (if issue) |
|---|---|---|---|
| Accuracy | [TO BE COMPLETED] | `EVID-` | [None/Low/Medium/High] |
| Consistency | [TO BE COMPLETED] | `EVID-` | [None/Low/Medium/High] |
| Relevance / fitness | [TO BE COMPLETED] | `EVID-` | [None/Low/Medium/High] |
| Timeliness | [TO BE COMPLETED] | `EVID-` | [None/Low/Medium/High] |
| Traceability | [TO BE COMPLETED] | `EVID-` | [None/Low/Medium/High] |
| Usability | [TO BE COMPLETED] | `EVID-` | [None/Low/Medium/High] |

### 7.1 Completeness and integrity issues

| Issue | Assessed on | Finding | Evidence |
|---|---|---|---|
| Completeness | [dataset] | [TO BE COMPLETED] | `EVID-` |
| Missing values | [dataset] | [TO BE COMPLETED] | `EVID-` |
| Duplicates | [dataset] | [TO BE COMPLETED] | `EVID-` |
| Outliers | [dataset] | [TO BE COMPLETED] | `EVID-` |
| Corrupted records | [dataset] | [TO BE COMPLETED] | `EVID-` |
| Class balance | [dataset] | [TO BE COMPLETED] | `EVID-` |
| Bias | [dataset] | [TO BE COMPLETED] | `EVID-` |
| Noise | [dataset] | [TO BE COMPLETED] | `EVID-` |

## 8. Labelling

| Topic | Finding | Evidence |
|---|---|---|
| Labelling process | [TO BE COMPLETED] | `EVID-` |
| Label definition / rules | [TO BE COMPLETED] | `EVID-` |
| Labellers and qualification | [TO BE COMPLETED] | `EVID-` |
| Label consistency (inter/intra) | [TO BE COMPLETED] | `EVID-` |

## 9. Representativeness versus the ODD

| ODD ID | Condition | Represented? | Dataset/subset | Evidence |
|---|---|---|---|---|
| ODD-0XX | [TO BE COMPLETED] | [Yes / Partial / No] | `DATA-` | `EVID-` |

- Corner-case coverage: [TO BE COMPLETED]
- Known underrepresented regions: [TO BE COMPLETED]

## 10. Data leakage risks

> **Instructions.** Check for leakage: duplicated samples across splits, future information, target-derived
> features, identifiers used as features, preprocessing fitted on the test set. Leakage checks here are
> **heuristic** and require engineering review.

| Check | Result | Evidence |
|---|---|---|
| Sample overlap between splits | [TO BE COMPLETED] | `EVID-` |
| Temporal leakage (future info) | [TO BE COMPLETED] | `EVID-` |
| Target-derived features | [TO BE COMPLETED] | `EVID-` |
| Identifiers as features | [TO BE COMPLETED] | `EVID-` |

## 11. Split strategy

- Train / validation / test split: [TO BE COMPLETED]
- Justification of split percentages: [TO BE COMPLETED]
- Hold-out test set protection (no iterative tuning on it): [TO BE COMPLETED]
- Temporal splitting applied: [Yes / No] — if no temporal dependency, justify.
- Stratification strategy: [TO BE COMPLETED]

## 12. Preprocessing

| Step | Applied? | Details | Dataset version |
|---|---|---|---|
| Cleaning / deduplication | [ ] | [TO BE COMPLETED] | [TO BE COMPLETED] |
| Normalization / scaling | [ ] | [TO BE COMPLETED] | [TO BE COMPLETED] |
| Augmentation | [ ] | [TO BE COMPLETED] | [TO BE COMPLETED] |
| Other | [ ] | [TO BE COMPLETED] | [TO BE COMPLETED] |

## 13. Versioning and integrity

- Dataset versioning scheme: [TO BE COMPLETED]
- Integrity checks (hashes): [TO BE COMPLETED]
- Dataset hashes recorded (SHA-256): `DATA-` [TO BE COMPLETED]
- Reproducibility instructions: [TO BE COMPLETED]

## 14. Drift monitoring strategy

- Strategy for monitoring input/target drift after deployment: [TO BE COMPLETED]
- Thresholds and response: [TO BE COMPLETED]
- Linked ODD/monitoring requirement: `ODD-` / `REQ-NF-` [TO BE COMPLETED]

## 15. Gaps and corrective actions

| ID | Gap | Corrective action | Owner | Due | Status |
|---|---|---|---|---|---|
| NC-001 | [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] | YYYY-MM-DD | [Open/Closed] |

## 16. Non-conformities register

| ID | Description | Severity | Affected dataset | Corrective action | Owner | Due date | Status | Evidence |
|---|---|---|---|---|---|---|---|---|
| NC-001 | [TO BE COMPLETED] | [Low/Medium/High] | `DATA-` | [TO BE COMPLETED] | [TO BE COMPLETED] | YYYY-MM-DD | [Open/Closed] | `EVID-` |

> **Instructions.** Do not delete closed non-conformities: keep them with `Status: Closed` for
> traceability.

## 17. Review decision

> **Instructions.** Decision is made by the data owner + model owner against the review objective and the
> ODD. Justify every decision.

- **Decision:** [Ready / Conditionally Ready / Not Ready]
- Justification: [TO BE COMPLETED]
- Conditions (if Conditionally Ready): [TO BE COMPLETED]
- Decision-log reference: `DEC-` [TO BE COMPLETED]

| Decision | Meaning |
|---|---|
| Ready | Data are adequate for model selection/training with no blocking issue. |
| Conditionally Ready | Adequate once listed conditions are met (tracked via `NC-*`/`ACT-*`). |
| Not Ready | Blocking issues exist; model selection must not proceed on this data. |

## 18. Assumptions and decisions

| ID | Type | Text | Status |
|---|---|---|---|
| ASM-0XX | Assumption | [TO BE COMPLETED] | [Open/Validated] |
| DEC-0XX | Decision | [TO BE COMPLETED] | [Open/Confirmed] |

## 19. Open actions

| ID | Action | Owner | Due | Status |
|---|---|---|---|---|
| ACT-0XX | [TO BE COMPLETED] | [TO BE COMPLETED] | YYYY-MM-DD | [Open/Done] |

## 20. Review checklist

- [ ] Dataset inventory complete with versions and purposes.
- [ ] Ownership, provenance, licensing and confidentiality recorded.
- [ ] Quality dimensions assessed with evidence, not invented numbers.
- [ ] Representativeness vs every ODD condition assessed (or gap registered).
- [ ] Leakage checks performed and documented as heuristic.
- [ ] Split strategy justified; hold-out protected.
- [ ] Dataset hashes and reproducibility instructions recorded.
- [ ] Drift monitoring strategy defined (or `ACT-` opened).
- [ ] Non-conformities register populated and decision issued (Ready/Conditionally Ready/Not Ready).
- [ ] No ECSS certification claim is made.
