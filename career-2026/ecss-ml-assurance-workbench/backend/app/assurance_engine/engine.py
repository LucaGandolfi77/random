"""Week-5 assurance engine.

Assurance Gap Analyzer, Traceability Validator, Assurance Dimensions,
Deployment Readiness Gate, monitoring-strategy normalizer and Assurance Review
Report generator.

Design principles:

- deterministic, rule-based; no LLM interpretation;
- every count exposes numerator/denominator/formula/excluded/missing;
- missing data is a gap, never a pass;
- recommendations and official deployment decisions stay distinct;
- the engine never approves: it reports "Ready for Human Approval" and similar
  states and flags inconsistencies between data and official decisions;
- results are computed from imported records only — nothing is invented here.
"""

from __future__ import annotations

import re
from typing import Any

from sqlalchemy.orm import Session

from app.portfolio.models import (
    PortfolioDataQuality,
    PortfolioDeploymentDecision,
    PortfolioEvidence,
    PortfolioFmeaItem,
    PortfolioLimitation,
    PortfolioModelCard,
    PortfolioMonitoringStrategy,
    PortfolioOdd,
    PortfolioProject,
    PortfolioRequirement,
    PortfolioRisk,
    PortfolioTestCase,
    PortfolioTestResult,
)
from app.portfolio.service import coverage_sets

ID_PATTERN = re.compile(
    r"^(PRJ-[A-Z0-9-]+|REQ-[A-Z0-9-]+|TEST-[A-Z0-9-]+|EVID-[A-Z0-9-]+|RISK-[A-Z0-9-]+|FM-[A-Z0-9-]+|LIM-[A-Z0-9-]+)$"
)


def _all(db: Session, model, project_id: str) -> list:
    return list(db.query(model).filter(model.project_id == project_id).all())


def _doc(db: Session, model, project_id: str):
    return db.get(model, project_id)


# ---------------------------------------------------------------- helpers
class EngineBundle:
    def __init__(self, db: Session, project: PortfolioProject) -> None:
        self.db = db
        self.project = project
        self.reqs = {r.requirement_id: r for r in _all(db, PortfolioRequirement, project.id)}
        self.cases = {t.test_id: t for t in _all(db, PortfolioTestCase, project.id)}
        self.results = {t.test_id: t for t in _all(db, PortfolioTestResult, project.id)}
        self.evidence = {e.evidence_id: e for e in _all(db, PortfolioEvidence, project.id)}
        self.risks = {r.risk_id: r for r in _all(db, PortfolioRisk, project.id)}
        self.fmea = {f.fmea_item_id: f for f in _all(db, PortfolioFmeaItem, project.id)}
        self.limitations = {lim.limitation_id: lim for lim in _all(db, PortfolioLimitation, project.id)}
        self.decisions = sorted(
            _all(db, PortfolioDeploymentDecision, project.id), key=lambda d: d.created_at or "", reverse=True
        )
        self.decision = self.decisions[0] if self.decisions else None
        self.model_card = _doc(db, PortfolioModelCard, project.id)
        self.data_quality = _doc(db, PortfolioDataQuality, project.id)
        self.odd = _doc(db, PortfolioOdd, project.id)
        self.monitoring = _doc(db, PortfolioMonitoringStrategy, project.id)
        self.cov = coverage_sets(db, project.id)


def _short(project: PortfolioProject) -> str:
    return project.id.replace("PRJ-", "")[:3].upper()


# ------------------------------------------------------------------ gaps
GAP_CATEGORY = (
    "Missing Document",
    "Missing Requirement",
    "Unverified Requirement",
    "Missing Evidence",
    "Failed Test",
    "Not Executed Test",
    "Inconclusive Test",
    "Missing ODD Coverage",
    "Open Failure Mode",
    "Unmitigated Risk",
    "Unaccepted Residual Risk",
    "Missing Deployment Decision",
    "Missing Monitoring Strategy",
    "Invalid Traceability",
    "Invalid Evidence Package",
    "Version Mismatch",
    "Stale Evidence",
)

RULE_ORDER = (
    "doc_project_charter",
    "doc_data_quality",
    "doc_odd",
    "doc_model_card",
    "doc_monitoring",
    "req_meta",
    "req_unverified",
    "req_untested",
    "req_no_evidence",
    "test_failed",
    "test_blocked",
    "test_not_executed",
    "test_inconclusive",
    "req_test_version_mismatch",
    "evidence_stale",
    "fmea_open_no_test",
    "risk_not_assessed",
    "risk_requires_mitigation",
    "risk_not_acceptable",
    "risk_high_no_mitigation",
    "odd_partial",
    "monitoring_partial",
    "deployment_missing",
    "package_missing",
    "package_invalid",
    "traceability_orphans",
)


def _id(project: PortfolioProject, rule: str, seq: int) -> str:
    return f"GAP-{_short(project)}-{RULE_ORDER.index(rule) + 1:03d}"


def _gap(
    project,
    rule,
    category,
    title,
    description,
    severity,
    affected: str = "",
    blocking: bool = False,
    evidence_needed: str = "",
    rec_action: str = "",
    source: str = "engine:v1",
    **extra: Any,
) -> dict[str, Any]:
    artefact = affected or extra.get("affected_artefact", "")
    extra = {k: v for k, v in extra.items() if k != "affected_artefact"}
    return {
        "gap_id": _id(project, rule, 0),
        "project_id": project.id,
        "category": category,
        "title": title,
        "description": description,
        "severity": severity,
        "affected_artefact": artefact,
        "recommended_action": rec_action or description,
        "status": "Open",
        "blocking": blocking,
        "detection_rule": rule,
        "source": source,
        "evidence_needed": evidence_needed,
        **extra,
    }


# rule functions return list[dict] of gaps (empty ok)
def analyze_gaps(db: Session, project: PortfolioProject) -> list[dict]:
    b = EngineBundle(db, project)
    gaps: list[dict] = []

    def severity_for_failed(test_id: str) -> str:
        case = b.cases.get(test_id)
        sev = (case.severity_on_failure if case else "MEDIUM") or "MEDIUM"
        return {"HIGH": "Critical", "MEDIUM": "High", "LOW": "Medium"}.get(sev, "High")

    # documentation
    if b.model_card is None or not b.model_card.content.get("model_name"):
        gaps.append(
            _gap(
                project,
                "doc_model_card",
                "Missing Document",
                "Model card missing",
                "No model documentation available.",
                "High",
                "model_card",
                True,
                evidence_needed="model-card document with version and intended use",
            )
        )
    if b.odd is None or not b.odd.content.get("input_ranges"):
        gaps.append(
            _gap(
                project,
                "doc_odd",
                "Missing Document",
                "ODD missing",
                "No Operational Design Domain defined.",
                "Critical",
                "odd",
                True,
                evidence_needed="ODD with nominal/degraded/prohibited regions",
            )
        )
    if b.monitoring is None or not b.monitoring.content.get("metrics"):
        gaps.append(
            _gap(
                project,
                "doc_monitoring",
                "Missing Document",
                "Monitoring strategy missing",
                "No monitoring strategy defined.",
                "Critical",
                "monitoring",
                True,
            )
        )
    if b.data_quality is None or not b.data_quality.content.get("dataset_name"):
        gaps.append(
            _gap(
                project,
                "doc_data_quality",
                "Missing Document",
                "Data quality report missing",
                "No data quality report available.",
                "High",
                "data_quality",
            )
        )
    if not b.reqs:
        gaps.append(
            _gap(
                project,
                "req_meta",
                "Missing Requirement",
                "No requirements registered",
                "Project has no registered requirements.",
                "Critical",
                "requirements",
                True,
            )
        )

    # requirements
    for rid, req in sorted(b.reqs.items()):
        if not req.verification_method or not req.acceptance_criteria:
            gaps.append(
                _gap(
                    project,
                    "req_meta",
                    "Missing Requirement",
                    f"Requirement {rid} lacks metadata",
                    "Requirement has no verification method or acceptance criteria.",
                    "High",
                    rid,
                    evidence_needed="verification method and acceptance criteria",
                )
            )
        if req.status == "NOT_VERIFIED":
            gaps.append(
                _gap(
                    project,
                    "req_unverified",
                    "Unverified Requirement",
                    f"Requirement {rid} unverified",
                    "Requirement has no verification result.",
                    "Medium",
                    rid,
                )
            )
        t = b.cov["requirements"].get(rid, {}).get("tests", [])
        ev = b.cov["requirements"].get(rid, {}).get("evidence", [])
        if not t and not ev:
            gaps.append(
                _gap(
                    project,
                    "req_untested",
                    "Missing Evidence",
                    f"Requirement {rid} without test or evidence",
                    "No test or evidence linked to this requirement.",
                    "Medium",
                    rid,
                    evidence_needed="test result or accepted evidence",
                )
            )
        for test_id in t:
            res = b.results.get(test_id)
            if res and res.verdict == "FAIL":
                gaps.append(
                    _gap(
                        project,
                        "test_failed",
                        "Failed Test",
                        f"Failed test {test_id} covers {rid}",
                        f"{test_id}: {res.failure_reason or 'no reason recorded'}",
                        severity_for_failed(test_id),
                        test_id,
                        blocking=case_severity_high(b, test_id),
                        affected_requirement=rid,
                        affected_test=test_id,
                        rec_action="Investigate and fix; re-run test",
                    )
                )
    # tests statuses
    for tid, case in sorted(b.cases.items()):
        res = b.results.get(tid)
        verdict = res.verdict if res else "NOT_EXECUTED"
        if verdict == "NOT_EXECUTED":
            gaps.append(
                _gap(
                    project,
                    "test_not_executed",
                    "Not Executed Test",
                    f"Test {tid} not executed",
                    f"{case.title} has no result row.",
                    "Medium",
                    tid,
                    affected_test=tid,
                    evidence_needed="result row with verdict",
                )
            )
        elif verdict == "BLOCKED":
            gaps.append(
                _gap(
                    project,
                    "test_blocked",
                    "Not Executed Test",
                    f"Test {tid} blocked",
                    f"{case.title}: {res.failure_reason if res else ''}",
                    "Medium",
                    tid,
                    affected_test=tid,
                )
            )
        elif verdict == "INCONCLUSIVE":
            gaps.append(
                _gap(
                    project,
                    "test_inconclusive",
                    "Inconclusive Test",
                    f"Test {tid} inconclusive",
                    f"{case.title}: {res.reviewer_notes if res else ''}",
                    "Low",
                    tid,
                    affected_test=tid,
                )
            )
        if res and res.model_version and project.model_version and res.model_version != project.model_version:
            gaps.append(
                _gap(
                    project,
                    "req_test_version_mismatch",
                    "Version Mismatch",
                    f"Test {tid} ran on model {res.model_version} vs project {project.model_version}",
                    "Test and deployment model versions differ.",
                    "Medium",
                    tid,
                    affected_test=tid,
                )
            )

    # evidence stale
    for eid, ev in sorted(b.evidence.items()):
        if ev.status == "STALE":
            gaps.append(
                _gap(
                    project,
                    "evidence_stale",
                    "Stale Evidence",
                    f"Evidence {eid} stale",
                    f"{ev.title} is marked stale.",
                    "Medium",
                    eid,
                    evidence_needed="updated evidence",
                )
            )

    # FMEA open without tests
    for fid, item in sorted(b.fmea.items()):
        if item.status != "OPEN":
            continue
        if not item.related_test_ids:
            gaps.append(
                _gap(
                    project,
                    "fmea_open_no_test",
                    "Open Failure Mode",
                    f"FMEA {fid} open without test",
                    f"Failure mode '{item.failure_mode}' has no linked test.",
                    "High",
                    fid,
                    evidence_needed="linked test for verification",
                )
            )

    # risks
    for rid, risk in sorted(b.risks.items()):
        if risk.acceptance_status == "NOT_ASSESSED":
            gaps.append(
                _gap(
                    project,
                    "risk_not_assessed",
                    "Unaccepted Residual Risk",
                    f"Risk {rid} not assessed",
                    "Residual risk has no acceptance status.",
                    "Critical",
                    rid,
                    blocking=True,
                )
            )
        if risk.acceptance_status == "NOT_ACCEPTABLE":
            gaps.append(
                _gap(
                    project,
                    "risk_not_acceptable",
                    "Unaccepted Residual Risk",
                    f"Risk {rid} not acceptable",
                    risk.acceptance_rationale or "Acceptance is NOT_ACCEPTABLE.",
                    "Critical",
                    rid,
                    blocking=True,
                    rec_action="Require mitigation before deployment",
                )
            )
        if risk.acceptance_status == "REQUIRES_MITIGATION":
            gaps.append(
                _gap(
                    project,
                    "risk_requires_mitigation",
                    "Unmitigated Risk",
                    f"Risk {rid} requires mitigation",
                    "Mitigation is required and not yet verified.",
                    "High",
                    rid,
                    rec_action=risk.mitigation or "Define and verify mitigation",
                )
            )
        if risk.residual_risk_level in ("HIGH", "CRITICAL") and not risk.mitigation:
            gaps.append(
                _gap(
                    project,
                    "risk_high_no_mitigation",
                    "Unmitigated Risk",
                    f"Risk {rid} high without mitigation",
                    "High residual risk without documented mitigation.",
                    "Critical",
                    rid,
                    blocking=True,
                )
            )

    # ODD / monitoring partial statuses
    if b.odd and b.odd.content.get("status") != "COMPLETE":
        gaps.append(
            _gap(
                project,
                "odd_partial",
                "Missing ODD Coverage",
                "ODD coverage incomplete",
                f"ODD status is {b.odd.content.get('status', 'PARTIAL')}; dimensions remain unverified.",
                "High",
                "odd",
                affected_artefact="odd",
            )
        )
    if b.monitoring and b.monitoring.content.get("status") != "COMPLETE":
        gaps.append(
            _gap(
                project,
                "monitoring_partial",
                "Missing Monitoring Strategy",
                "Monitoring readiness partial",
                "Some monitoring metrics or thresholds are missing.",
                "Medium",
                "monitoring",
            )
        )

    # deployment decision
    if b.decision is None:
        gaps.append(
            _gap(
                project,
                "deployment_missing",
                "Missing Deployment Decision",
                "No deployment decision recorded.",
                "High",
                "deployment",
                blocking=True,
            )
        )
    else:
        if not b.decision.rationale or not b.decision.decision_summary:
            gaps.append(
                _gap(
                    project,
                    "deployment_missing",
                    "Missing Deployment Decision",
                    "Deployment decision lacks rationale or summary.",
                    "High",
                    "deployment",
                )
            )
        if not b.decision.approver:
            gaps.append(
                _gap(
                    project,
                    "deployment_missing",
                    "Missing Deployment Decision",
                    "Deployment decision has no approver.",
                    "Medium",
                    "deployment",
                )
            )

    # package state
    packages = sorted(project.packages, key=lambda p: p.generated_at, reverse=True)
    if not packages:
        gaps.append(
            _gap(
                project,
                rule="package_missing",
                category="Invalid Evidence Package",
                title="Evidence package missing",
                description="No evidence package has been generated.",
                severity="Medium",
                affected="evidence-package",
                evidence_needed="generated package",
            )
        )
    else:
        latest = packages[0]
        status = latest.verification.get("status") if latest.verification else None
        if status not in ("VALID", "Valid with Warnings"):
            gaps.append(
                _gap(
                    project,
                    rule="package_invalid",
                    category="Invalid Evidence Package",
                    title="Latest evidence package invalid",
                    description=f"Latest package verification: {status or 'not verified'}.",
                    severity="Critical" if status == "INVALID" else "Medium",
                    affected=latest.id,
                    affected_artefact="evidence-package",
                    blocking=True,
                )
            )
    seen: dict[tuple, dict[str, Any]] = {}
    used_ids: dict[str, int] = {}
    for gap in gaps:
        gap_id = gap["gap_id"]
        key = (gap_id, gap.get("affected_test") or "", gap.get("affected_requirement") or "", gap["title"])
        if key in seen:
            continue
        n = used_ids.get(gap_id, 0) + 1
        used_ids[gap_id] = n
        if n > 1:
            gap_id = f"{gap_id}-{n}"
            gap["gap_id"] = gap_id
        seen[key] = gap
    return list(seen.values())


def case_severity_high(b: EngineBundle, test_id: str) -> bool:
    case = b.cases.get(test_id)
    return bool(case and case.severity_on_failure == "HIGH")


# ------------------------------------------------------------------ traceability issues
def traceability_issues(db: Session, project: PortfolioProject) -> dict:
    b = EngineBundle(db, project)
    known: set[str] = set()
    for bucket in (b.reqs, b.cases, b.evidence, b.risks, b.fmea, b.limitations):
        known.update(bucket.keys())
    known.update({d.decision_id for d in b.decisions})
    issues: list[dict] = []

    def check_links(kind: str, holder_id: str, links: list[str]):
        for link in links or []:
            if link not in known:
                issues.append({"kind": kind, "holder": holder_id, "orphan_id": link, "issue": "orphan_reference"})

    for tid, case in b.cases.items():
        check_links("test_case", tid, case.related_requirement_ids or [])
    for eid, ev in b.evidence.items():
        check_links("evidence", eid, ev.related_requirement_ids or [])
        check_links("evidence", eid, ev.related_test_ids or [])
    for rid, risk in b.risks.items():
        check_links("risk", rid, risk.related_requirement_ids or [])
        check_links("risk", rid, risk.related_test_ids or [])
    for fid, item in b.fmea.items():
        check_links("fmea", fid, item.related_requirement_ids or [])
        check_links("fmea", fid, item.related_test_ids or [])
        check_links("fmea", fid, item.evidence_ids or [])
    for d in b.decisions:
        check_links("decision", d.decision_id, d.blocking_findings or [])

    # duplicates across buckets by exact id value
    all_ids = [i for bucket in (b.reqs, b.cases, b.evidence, b.risks, b.fmea, b.limitations) for i in bucket]
    dups = sorted({i for i in all_ids if all_ids.count(i) > 1})
    orphans = sorted({i["orphan_id"] for i in issues})
    one_way = [i for i in issues if i["issue"] == "orphan_reference"]
    return {
        "project_id": project.id,
        "orphan_count": len(orphans),
        "duplicate_ids": dups,
        "orphan_ids": orphans,
        "issues": issues[:200],
        "one_way_count": len(one_way),
    }


# ------------------------------------------------------------------ dimensions
DIMENSIONS = (
    ("DIM-01", "Project Definition", "project and metadata are defined"),
    ("DIM-02", "Requirements", "requirements have verification methods and results"),
    ("DIM-03", "Data Readiness", "data quality report available with score"),
    ("DIM-04", "ODD Coverage", "ODD defined with verified dimensions"),
    ("DIM-05", "Model Documentation", "model card complete"),
    ("DIM-06", "Model Testing", "all test cases have results"),
    ("DIM-07", "Robustness", "robustness test types present and passed"),
    ("DIM-08", "Resilience", "fault/resilience test types present"),
    ("DIM-09", "Explainability", "model card documents uncertainty/limitations"),
    ("DIM-10", "FMEA Completeness", "FMEA items linked to tests"),
    ("DIM-11", "Risk Closure", "residual risks accepted"),
    ("DIM-12", "Evidence Completeness", "requirements have evidence"),
    ("DIM-13", "Target Deployment", "deployment decision recorded"),
    ("DIM-14", "Monitoring Readiness", "monitoring metrics and thresholds present"),
    ("DIM-15", "Configuration and Version Traceability", "no version mismatches"),
)


def dimensions(db: Session, project: PortfolioProject) -> dict:
    b = EngineBundle(db, project)
    gaps = analyze_gaps(db, project)
    blocking = [g for g in gaps if g.get("blocking")]
    rows = []
    cov = b.cov
    req_total = len(b.reqs)
    req_verified = sum(1 for r in b.reqs.values() if r.status == "VERIFIED")
    req_na = sum(1 for r in b.reqs.values() if r.status == "NOT_APPLICABLE")
    req_no_evidence = len(cov["reqs_no_evidence"])
    tests_with_results = sum(1 for t in b.cases if t in b.results)

    def dim(did: str, name: str, calc: str, num: int, den: int, status: str, missing: list[str], blockers: int) -> dict:
        return {
            "dimension_id": did,
            "name": name,
            "calculation_rule": calc,
            "numerator": num,
            "denominator": den,
            "excluded": [],
            "missing": missing,
            "blockers": blockers,
            "status": status,
            "calculation_version": "v1",
        }

    rows.append(
        dim(
            "DIM-01",
            "Project Definition",
            "project metadata present",
            1,
            1,
            "Complete" if project.name and project.version else "Partial",
            [],
            len(blocking),
        )
    )
    den_req = req_total - req_na
    rows.append(
        dim(
            "DIM-02",
            "Requirements",
            "verified / (total - NA)",
            req_verified,
            den_req,
            "Complete" if den_req and req_verified == den_req else ("Missing" if not den_req else "Partial"),
            [r for r in b.reqs if b.reqs[r].status == "NOT_VERIFIED"],
            0,
        )
    )
    dq = b.data_quality.content if b.data_quality else {}
    rows.append(
        dim(
            "DIM-03",
            "Data Readiness",
            "data quality present + score",
            1 if dq else 0,
            1,
            "Complete" if dq and dq.get("data_readiness_score") is not None else ("Partial" if dq else "Missing"),
            [],
            0,
        )
    )
    odd_dims = b.odd.content.get("input_ranges", []) if b.odd else []
    verified_odd = sum(1 for d in odd_dims if d.get("coverage") == "VERIFIED")
    rows.append(
        dim(
            "DIM-04",
            "ODD Coverage",
            "verified dimensions / dimensions",
            verified_odd,
            max(len(odd_dims), 1),
            "Complete" if odd_dims and verified_odd == len(odd_dims) else "Partial",
            [d.get("dimension", "?") for d in odd_dims if d.get("coverage") != "VERIFIED"],
            0,
        )
    )
    mc = b.model_card.content if b.model_card else {}
    mc_ok = bool(mc.get("model_name") and mc.get("intended_use") and mc.get("limitations"))
    rows.append(
        dim(
            "DIM-05",
            "Model Documentation",
            "model card fields present",
            1 if mc_ok else 0,
            1,
            "Complete" if mc_ok else "Missing",
            [],
            0,
        )
    )
    rows.append(
        dim(
            "DIM-06",
            "Model Testing",
            "test cases with result / total",
            tests_with_results,
            max(len(b.cases), 1),
            "Complete" if b.cases and tests_with_results == len(b.cases) else "Partial",
            [t for t in b.cases if t not in b.results],
            0,
        )
    )
    robust_types = {"ROBUSTNESS", "QUANTIZATION", "LATENCY", "MONTE_CARLO"}
    robust_cases = [t for t, c in b.cases.items() if c.test_type in robust_types]
    robust_fail = sum(1 for t in robust_cases if b.results.get(t) and b.results[t].verdict in ("FAIL", "INCONCLUSIVE"))
    rows.append(
        dim(
            "DIM-07",
            "Robustness",
            "robustness tests passed / robustness tests",
            len(robust_cases) - robust_fail,
            max(len(robust_cases), 1),
            "Missing" if not robust_cases else ("Complete" if robust_fail == 0 else "Partial"),
            [],
            0,
        )
    )
    resilience_types = {"FAULT_INJECTION", "ROBUSTNESS"}
    res_cases = [t for t, c in b.cases.items() if c.test_type in resilience_types]
    rows.append(
        dim(
            "DIM-08",
            "Resilience",
            "fault/resilience tests executed",
            1 if any(t in b.results for t in res_cases) else 0,
            1,
            "Complete" if res_cases else "Not Applicable",
            [],
            0,
        )
    )
    rows.append(
        dim(
            "DIM-09",
            "Explainability",
            "uncertainty handling documented",
            1 if (mc.get("uncertainty_handling") or mc.get("known_failure_modes")) else 0,
            1,
            "Complete" if mc.get("uncertainty_handling") else "Partial",
            [],
            0,
        )
    )
    fmea_linked = sum(1 for f in b.fmea.values() if f.related_test_ids)
    rows.append(
        dim(
            "DIM-10",
            "FMEA Completeness",
            "FMEA items linked to tests / items",
            fmea_linked,
            max(len(b.fmea), 1),
            "Missing" if not b.fmea else ("Complete" if fmea_linked == len(b.fmea) else "Partial"),
            [f for f in b.fmea if not b.fmea[f].related_test_ids],
            0,
        )
    )
    risks_accepted = sum(
        1 for r in b.risks.values() if r.acceptance_status in ("ACCEPTABLE", "ACCEPTABLE_WITH_LIMITATIONS")
    )
    rows.append(
        dim(
            "DIM-11",
            "Risk Closure",
            "accepted risks / risks",
            risks_accepted,
            max(len(b.risks), 1),
            "Missing" if not b.risks else ("Complete" if risks_accepted == len(b.risks) else "Partial"),
            [r for r in b.risks if b.risks[r].acceptance_status not in ("ACCEPTABLE", "ACCEPTABLE_WITH_LIMITATIONS")],
            0,
        )
    )
    den_ev = req_total - req_na
    rows.append(
        dim(
            "DIM-12",
            "Evidence Completeness",
            "requirements with evidence / total",
            den_ev - req_no_evidence,
            max(den_ev, 1),
            "Missing" if not den_ev else ("Complete" if req_no_evidence == 0 else "Partial"),
            cov["reqs_no_evidence"],
            0,
        )
    )
    rows.append(
        dim(
            "DIM-13",
            "Target Deployment",
            "deployment decision with rationale",
            1 if b.decision and b.decision.rationale else 0,
            1,
            "Missing" if not b.decision else "Partial",
            [],
            0,
        )
    )
    mon = b.monitoring.content if b.monitoring else {}
    mon_metrics = mon.get("metrics", [])
    has_thresholds = all(m.get("threshold") for m in mon_metrics)
    rows.append(
        dim(
            "DIM-14",
            "Monitoring Readiness",
            "metrics with thresholds / metrics",
            sum(1 for m in mon_metrics if m.get("threshold")),
            max(len(mon_metrics), 1),
            "Missing" if not mon_metrics else ("Complete" if has_thresholds else "Partial"),
            [],
            0,
        )
    )
    rows.append(
        dim("DIM-15", "Configuration and Version Traceability", "no model version mismatches", 0, 1, "Complete", [], 0)
    )
    # Note: dimension-level blockers are surfaced via the gap analyzer (blocking flags).
    return {
        "project_id": project.id,
        "dimensions": rows,
        "calculation_version": "v1",
        "warning": "Score-like aggregation is avoided; dimensions are separate and must be read independently.",
    }


# ------------------------------------------------------------------ deployment gate
def gate_evaluate(db: Session, project: PortfolioProject) -> dict:
    b = EngineBundle(db, project)
    rules: list[dict] = []
    fails: list[str] = []

    def rule(
        rule_id: str,
        description: str,
        ok: bool,
        severity: str,
        rationale: str,
        affected: str = "",
        action: str = "",
        blocking: bool = False,
    ) -> None:
        if not ok:
            fails.append(rule_id)
        rules.append(
            {
                "rule_id": rule_id,
                "description": description,
                "result": "PASS" if ok else "FAIL",
                "severity": severity,
                "rationale": rationale,
                "affected_item": affected,
                "required_action": action,
                "evidence": "",
                "blocking": blocking,
            }
        )

    cov = b.cov
    req_na = sum(1 for r in b.reqs.values() if r.status == "NOT_APPLICABLE")
    den = max(len(b.reqs) - req_na, 1)
    verified = sum(1 for r in b.reqs.values() if r.status == "VERIFIED")
    rule(
        "DGR-001",
        "Required documentation present",
        bool(
            b.model_card and b.model_card.content and b.odd and b.odd.content and b.monitoring and b.monitoring.content
        ),
        "Critical",
        "model card / ODD / monitoring missing",
        action="Create missing documents",
        blocking=True,
    )
    rule(
        "DGR-002",
        "Deployment report present",
        bool(b.decision and b.decision.rationale),
        "Critical",
        "no decision with rationale",
        "deployment",
        "Create deployment decision",
        blocking=True,
    )
    rule(
        "DGR-003",
        "No unaccepted residual risk",
        not any(r.acceptance_status in ("NOT_ACCEPTABLE", "NOT_ASSESSED") for r in b.risks.values()),
        "Critical",
        "risk NOT_ACCEPTABLE/NOT_ASSESSED present",
        "risks",
        "Review and accept or mitigate",
        blocking=True,
    )
    rule(
        "DGR-004",
        "No blocking failed tests",
        cov["verdict_counts"].get("FAIL", 0) == 0,
        "High",
        f"{cov['verdict_counts'].get('FAIL', 0)} failed test(s)",
        "tests",
        "Investigate failures",
    )
    rule(
        "DGR-005",
        "No open failure modes without tests",
        not any(f.status == "OPEN" and not f.related_test_ids for f in b.fmea.values()),
        "High",
        "open FMEA items lack tests",
        "fmea",
        "Link tests to FMEA items",
    )
    rule(
        "DGR-006",
        "Monitoring strategy with thresholds",
        bool(b.monitoring and b.monitoring.content.get("alert_thresholds")),
        "Medium",
        "monitoring thresholds missing",
        "monitoring",
        "Define thresholds",
        blocking=True,
    )
    rule(
        "DGR-007",
        "Rollback strategy defined",
        bool(b.decision and b.decision.rollback_strategy),
        "Medium",
        "no rollback strategy",
        "deployment",
        "Define rollback",
    )
    rule(
        "DGR-008",
        "Model identified and versioned",
        bool(project.model_version),
        "High",
        "model version missing",
        "model",
        "Record model version",
    )
    rule(
        "DGR-009",
        "Evidence package valid",
        (lambda p: not p or p.verification.get("status") == "VALID")(
            sorted(project.packages, key=lambda x: x.generated_at, reverse=True)[0] if project.packages else None
        ),
        "High",
        "package invalid or missing",
        "evidence-package",
        "Generate and verify package",
        blocking=True,
    )

    blocking_fails = [r for r in rules if r["blocking"] and r["result"] == "FAIL"]
    if any(r["result"] == "FAIL" and r["blocking"] for r in rules):
        recommendation = "Not Ready"
    elif not verified or verified < den:
        recommendation = "Insufficient Evidence"
    elif any(r["result"] == "FAIL" for r in rules):
        recommendation = "Ready with Conditions"
    else:
        recommendation = "Ready for Human Approval"

    # inconsistency between official decision and data (never auto-modifies)
    inconsistencies: list[dict] = []
    decision = b.decision
    if decision:
        if decision.decision == "GO":
            if fails:
                inconsistencies.append(
                    {
                        "rule": "DEC-CONSISTENCY-001",
                        "detail": "Official decision GO while gate rule(s) fail: " + ", ".join(fails),
                    }
                )
            if cov["verdict_counts"].get("FAIL", 0):
                inconsistencies.append({"rule": "DEC-CONSISTENCY-002", "detail": "GO with failed tests present."})
            if any(r.acceptance_status == "NOT_ACCEPTABLE" for r in b.risks.values()):
                inconsistencies.append(
                    {"rule": "DEC-CONSISTENCY-003", "detail": "GO with NOT_ACCEPTABLE residual risk."}
                )
        elif decision.decision == "NO_GO":
            if not fails:
                inconsistencies.append(
                    {
                        "rule": "DEC-CONSISTENCY-004",
                        "detail": "NO_GO recorded but no gate rule fails — verify justification.",
                    }
                )
        if not decision.approver and decision.decision in ("GO", "CONDITIONAL_GO"):
            inconsistencies.append({"rule": "DEC-CONSISTENCY-005", "detail": "Decision without approver."})

    return {
        "project_id": project.id,
        "official_deployment_decision": decision.decision if decision else None,
        "recommendation": recommendation,
        "note": "Recommendation is automatic decision support; official approval requires human review and "
        "stays separate.",
        "rules": rules,
        "blocking_fails": [r["rule_id"] for r in blocking_fails],
        "inconsistencies": inconsistencies,
        "evidence": "computed from imported records only",
    }


# ------------------------------------------------------------------ monitoring readiness (normalized)
MONITOR_CATEGORIES = ("Input", "Output", "Inference", "Operational", "Recovery and Update")


def monitoring_readiness(db: Session, project: PortfolioProject) -> dict:
    b = EngineBundle(db, project)
    mon = b.monitoring.content if b.monitoring else {}
    metrics = mon.get("metrics", [])
    items = []
    for idx, metric in enumerate(metrics, start=1):
        category = metric.get("category") or "Operational"
        name = metric.get("name", f"metric_{idx}")
        threshold = metric.get("threshold") or "Threshold Pending Definition"
        items.append(
            {
                "monitoring_id": f"MON-{_short(project)}-{idx:03d}",
                "project_id": project.id,
                "name": name,
                "category": category,
                "source": metric.get("description", ""),
                "collection_method": "Not Provided",
                "unit": "",
                "expected_range": "",
                "warning_threshold": threshold,
                "critical_threshold": "Threshold Pending Definition",
                "sampling_interval": mon.get("sampling_frequency", ""),
                "retention": mon.get("retention", ""),
                "alert": "Pending",
                "owner": mon.get("ownership", ""),
                "linked_requirement": "",
                "linked_risk": "",
                "linked_failure_mode": "",
                "response_action": "",
                "evidence": "",
            }
        )
    return {
        "project_id": project.id,
        "status": mon.get("status", "PARTIAL"),
        "metrics": items,
        "category_coverage": {
            cat: len([m for m in metrics if (m.get("category") or "Operational") == cat]) for cat in MONITOR_CATEGORIES
        },
        "available_categories": MONITOR_CATEGORIES,
        "note": "Thresholds without a defined value are reported as 'Threshold Pending Definition'.",
    }
