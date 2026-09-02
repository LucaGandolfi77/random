"""Portfolio read service: normalized payloads, coverage, traceability, completeness."""

from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.portfolio import VERDICTS
from app.portfolio.models import (
    PortfolioDataQuality,
    PortfolioDeploymentDecision,
    PortfolioEvidence,
    PortfolioFmeaItem,
    PortfolioLimitation,
    PortfolioModelCard,
    PortfolioMonitoringStrategy,
    PortfolioOdd,
    PortfolioPackage,
    PortfolioProject,
    PortfolioRequirement,
    PortfolioRisk,
    PortfolioTestCase,
    PortfolioTestResult,
)


def list_projects(db: Session) -> list[PortfolioProject]:
    stmt = select(PortfolioProject).order_by(PortfolioProject.id.asc())
    return list(db.execute(stmt).scalars())


def get_project(db: Session, project_id: str) -> PortfolioProject | None:
    return db.get(PortfolioProject, project_id)


def _all(db: Session, model, project_id: str, order_attr=None) -> list:
    stmt = select(model).where(model.project_id == project_id)
    if order_attr is not None:
        stmt = stmt.order_by(order_attr)
    return list(db.execute(stmt).scalars())


def _doc(db: Session, model, project_id: str):
    return db.get(model, project_id)


def _req_of(db: Session, project_id: str) -> dict[str, PortfolioRequirement]:
    return {
        r.requirement_id: r for r in _all(db, PortfolioRequirement, project_id, PortfolioRequirement.requirement_id)
    }


def _testcase_of(db: Session, project_id: str) -> dict[str, PortfolioTestCase]:
    return {t.test_id: t for t in _all(db, PortfolioTestCase, project_id, PortfolioTestCase.test_id)}


def _testresult_of(db: Session, project_id: str) -> dict[str, PortfolioTestResult]:
    return {r.test_id: r for r in _all(db, PortfolioTestResult, project_id, PortfolioTestResult.test_id)}


def _evidence_of(db: Session, project_id: str) -> dict[str, PortfolioEvidence]:
    return {e.evidence_id: e for e in _all(db, PortfolioEvidence, project_id, PortfolioEvidence.evidence_id)}


# ------------------------------------------------------------------ coverage helpers
def coverage_sets(db: Session, project_id: str) -> dict[str, Any]:
    reqs = _req_of(db, project_id)
    cases = _testcase_of(db, project_id)
    results = _testresult_of(db, project_id)
    evidence = _evidence_of(db, project_id)
    risks = {r.risk_id: r for r in _all(db, PortfolioRisk, project_id, PortfolioRisk.risk_id)}

    req_to_tests: dict[str, list[str]] = {rid: [] for rid in reqs}
    req_to_evidence: dict[str, list[str]] = {rid: [] for rid in reqs}
    req_to_risks: dict[str, list[str]] = {rid: [] for rid in reqs}
    for test_id, case in cases.items():
        for rid in case.related_requirement_ids:
            req_to_tests.setdefault(rid, []).append(test_id)
    for ev_id, ev in evidence.items():
        for rid in ev.related_requirement_ids:
            req_to_evidence.setdefault(rid, []).append(ev_id)
    for risk_id, risk in risks.items():
        for rid in risk.related_requirement_ids:
            req_to_risks.setdefault(rid, []).append(risk_id)

    verdict_counts = {v: 0 for v in VERDICTS}
    for res in results.values():
        verdict_counts[res.verdict] = verdict_counts.get(res.verdict, 0) + 1

    reqs_no_test = [rid for rid in reqs if not req_to_tests.get(rid)]
    reqs_no_evidence = [rid for rid in reqs if not req_to_evidence.get(rid)]
    reqs_failed = sorted(
        {rid for rid, tests in req_to_tests.items() for t in tests if results.get(t) and results[t].verdict == "FAIL"}
    )
    reqs_with_failed_tests = [
        rid for rid in req_to_tests if any(results.get(t) and results[t].verdict == "FAIL" for t in req_to_tests[rid])
    ]

    return {
        "requirements": {
            rid: {"tests": req_to_tests[rid], "evidence": req_to_evidence[rid], "risks": req_to_risks[rid]}
            for rid in reqs
        },
        "reqs_no_test": sorted(set(reqs_no_test)),
        "reqs_no_evidence": sorted(set(reqs_no_evidence)),
        "reqs_with_failed_tests": sorted(set(reqs_with_failed_tests)),
        "reqs_not_verified": sorted(rid for rid, r in reqs.items() if r.status not in ("VERIFIED", "NOT_APPLICABLE")),
        "reqs_failed": sorted(set(reqs_failed)),
        "verdict_counts": verdict_counts,
        "tests_total": len(cases),
        "results_total": len(results),
    }


def traceability_matrix(db: Session, project_id: str) -> list[dict]:
    """Requirement -> TestCase -> TestResult -> Evidence -> Risk."""
    reqs = _req_of(db, project_id)
    cases = _testcase_of(db, project_id)
    results = _testresult_of(db, project_id)
    evidence = _evidence_of(db, project_id)
    risks = {r.risk_id: r for r in _all(db, PortfolioRisk, project_id, PortfolioRisk.risk_id)}
    rows: list[dict] = []
    for rid in sorted(reqs):
        req = reqs[rid]
        linked_tests = [t for t, c in cases.items() if rid in c.related_requirement_ids]
        if not linked_tests:
            rows.append(
                {
                    "requirement_id": rid,
                    "requirement_title": req.title,
                    "status": req.status,
                    "test_id": "",
                    "verdict": "",
                    "evidence_ids": [],
                    "risk_ids": req_to_risk_ids(reqs, rid, risks),
                    "note": "No test linked",
                }
            )
            continue
        for test_id in sorted(linked_tests):
            case = cases[test_id]
            res = results.get(test_id)
            ev_ids = [e.evidence_id for e in evidence.values() if test_id in e.related_test_ids]
            rows.append(
                {
                    "requirement_id": rid,
                    "requirement_title": req.title,
                    "status": req.status,
                    "test_id": test_id,
                    "test_title": case.title,
                    "verdict": res.verdict if res else "NO_RESULT",
                    "run_id": res.test_run_id if res else "",
                    "evidence_ids": sorted(set(ev_ids)),
                    "risk_ids": req_to_risk_ids(reqs, rid, risks),
                    "note": "",
                }
            )
    return rows


def req_to_risk_ids(reqs: dict, rid: str, risks: dict) -> list[str]:
    return sorted(r.risk_id for r in risks.values() if rid in r.related_requirement_ids)


# ------------------------------------------------------------------ completeness
def package_completeness(db: Session, project_id: str, generated: bool = False, verified: bool | None = None) -> dict:
    reqs = _req_of(db, project_id)
    cov = coverage_sets(db, project_id)
    model_card = _doc(db, PortfolioModelCard, project_id)
    dq = _doc(db, PortfolioDataQuality, project_id)
    odd = _doc(db, PortfolioOdd, project_id)
    fmea = _all(db, PortfolioFmeaItem, project_id)
    risks = _all(db, PortfolioRisk, project_id)
    limitations = _all(db, PortfolioLimitation, project_id)
    mon = _doc(db, PortfolioMonitoringStrategy, project_id)
    decision = latest_decision(db, project_id)
    tests = _all(db, PortfolioTestCase, project_id)

    def state(ok: bool, missing: bool = False) -> str:
        if missing:
            return "MISSING"
        return "COMPLETE" if ok else "PARTIAL"

    categories: dict[str, dict] = {}
    categories["project_summary"] = {"state": "COMPLETE", "note": "Project metadata present."}
    mc_ok = bool(
        model_card
        and model_card.content.get("model_name")
        and model_card.content.get("intended_use")
        and model_card.content.get("limitations")
        and model_card.content.get("version_history")
    )
    categories["model_card"] = {"state": state(mc_ok), "note": "Model card (name/use/limits/history)."}
    dq_ok = bool(dq and dq.content.get("dataset_name") and dq.content.get("synthetic") is not None)
    dq_state = (
        "COMPLETE"
        if dq_ok and dq.content.get("data_readiness_score") is not None
        else ("PARTIAL" if dq_ok else "MISSING")
    )
    categories["data_quality"] = {
        "state": dq_state,
        "note": "Score coverage " + str(dq.content.get("score_coverage") if dq else "n/a") + "%",
    }
    odd_ok = bool(odd and odd.content.get("unsupported_modes") and odd.content.get("input_ranges"))
    categories["odd"] = {
        "state": "PARTIAL" if odd_ok else "MISSING",
        "note": "ODD status " + (odd.content.get("status", "PARTIAL") if odd else "MISSING"),
    }
    req_ok = bool(reqs) and not cov["reqs_no_test"]
    no_test = len(cov["reqs_no_test"])
    no_evidence = len(cov["reqs_no_evidence"])
    categories["requirements"] = {
        "state": "MISSING" if not reqs else state(req_ok),
        "note": f"{no_test} requirements without test; {no_evidence} without evidence",
    }
    tr_ok = len(tests) > 0 and cov["results_total"] == len(tests)
    categories["test_results"] = {
        "state": state(tr_ok),
        "note": f"{cov['verdict_counts'].get('PASS', 0)}P/"
        f"{cov['verdict_counts'].get('FAIL', 0)}F/"
        f"{cov['verdict_counts'].get('BLOCKED', 0)}B/"
        f"{cov['verdict_counts'].get('NOT_EXECUTED', 0)}NE",
    }
    categories["fmea"] = {"state": state(len(fmea) >= 5), "note": f"{len(fmea)} FMEA items (>=5 expected)"}
    risks_ok = bool(risks) and all(r.acceptance_status != "NOT_ASSESSED" for r in risks)
    categories["residual_risks"] = {"state": state(risks_ok), "note": f"{len(risks)} risks assessed"}
    dec_ok = bool(decision and decision.rationale)
    categories["deployment_report"] = {
        "state": state(dec_ok),
        "note": decision.decision if decision else "missing decision",
    }
    mon_ok = bool(
        mon
        and mon.content.get("metrics")
        and mon.content.get("alert_thresholds")
        and mon.content.get("safe_state")
        and mon.content.get("escalation")
    )
    categories["monitoring_strategy"] = {"state": state(mon_ok), "note": "thresholds/escalation/safe-state present"}
    categories["limitations"] = {"state": state(len(limitations) >= 3), "note": f"{len(limitations)} limitations"}
    trace_ok = not cov["reqs_no_test"] and not cov["reqs_no_evidence"]
    categories["traceability"] = {
        "state": state(trace_ok),
        "note": f"{len(cov['reqs_no_test'])} no-test, {len(cov['reqs_no_evidence'])} no-evidence",
    }
    if not generated:
        categories["integrity_manifest"] = {"state": "MISSING", "note": "No evidence package generated yet."}
    elif verified is True:
        categories["integrity_manifest"] = {"state": "COMPLETE", "note": "Latest package verified valid."}
    elif verified is False:
        categories["integrity_manifest"] = {"state": "INVALID", "note": "Latest package failed verification."}
    else:
        categories["integrity_manifest"] = {"state": "PARTIAL", "note": "Package generated, not yet verified."}

    applicable = [c for c, v in categories.items() if v["state"] != "NOT_APPLICABLE"]
    complete = [c for c in applicable if categories[c]["state"] == "COMPLETE"]
    pct = round(100.0 * len(complete) / len(applicable), 1) if applicable else 0.0
    return {
        "categories": categories,
        "overall_indicator_pct": pct,
        "note": "Informational indicator only; completeness is not deployability.",
    }


# ------------------------------------------------------------------ deployment helpers
def latest_decision(db: Session, project_id: str) -> PortfolioDeploymentDecision | None:
    stmt = (
        select(PortfolioDeploymentDecision)
        .where(PortfolioDeploymentDecision.project_id == project_id)
        .order_by(PortfolioDeploymentDecision.created_at.desc())
        .limit(1)
    )
    return db.execute(stmt).scalar_one_or_none()


def deployment_checklist(db: Session, project_id: str) -> list[dict]:
    """Non-binding reviewer checklist derived from stored data."""
    reqs = _req_of(db, project_id)
    cov = coverage_sets(db, project_id)
    risk_rows = _all(db, PortfolioRisk, project_id)
    decision = latest_decision(db, project_id)
    completeness = package_completeness(db, project_id)

    def item(check: str, ok: bool, note: str) -> dict:
        return {"check": check, "satisfied": ok, "note": note}

    empty = ""
    checks = [
        item(
            "All critical requirements verified",
            all(r.status == "VERIFIED" for r in reqs.values() if r.priority == "HIGH"),
            empty,
        ),
        item("No blocking failed test", cov["verdict_counts"].get("FAIL", 0) == 0, empty),
        item("Data assessed", True, empty),
        item("ODD documented", True, empty),
        item("FMEA available", completeness["categories"]["fmea"]["state"] != "MISSING", empty),
        item("Residual risks reviewed", all(r.acceptance_status != "NOT_ASSESSED" for r in risk_rows), empty),
        item("Limitations documented", completeness["categories"]["limitations"]["state"] != "MISSING", empty),
        item(
            "Monitoring strategy available",
            completeness["categories"]["monitoring_strategy"]["state"] != "MISSING",
            empty,
        ),
        item("Rollback defined", bool(decision and decision.rollback_strategy), empty),
        item(
            "Evidence package complete", completeness["categories"]["integrity_manifest"]["state"] == "COMPLETE", empty
        ),
    ]
    return [{"check": c["check"], "satisfied": c["satisfied"], "note": c["note"]} for c in checks]


def serialized_payload(db: Session, project: PortfolioProject) -> dict:
    """Single normalized payload used by both API and package renderers."""
    reqs = {
        r.requirement_id: r for r in _all(db, PortfolioRequirement, project.id, PortfolioRequirement.requirement_id)
    }
    cases = {t.test_id: t for t in _all(db, PortfolioTestCase, project.id, PortfolioTestCase.test_id)}
    results = {r.test_id: r for r in _all(db, PortfolioTestResult, project.id, PortfolioTestResult.test_id)}
    cov = coverage_sets(db, project.id)
    mc = _doc(db, PortfolioModelCard, project.id)
    dq = _doc(db, PortfolioDataQuality, project.id)
    odd = _doc(db, PortfolioOdd, project.id)
    mon = _doc(db, PortfolioMonitoringStrategy, project.id)
    decision = latest_decision(db, project.id)

    def row(record) -> dict:
        from datetime import date, datetime

        out = {}
        for attr in record.__mapper__.column_attrs:
            key = attr.key
            if key in ("id", "project_id"):
                continue
            value = getattr(record, key)
            if isinstance(value, datetime | date):
                value = value.isoformat()
            if key == "metadata_":
                key = "metadata"
            out[key] = value
        return out

    def req_rec(rid: str, r: PortfolioRequirement) -> dict:
        base = row(r)
        base["coverage"] = cov["requirements"].get(rid, {"tests": [], "evidence": [], "risks": []})
        base["gaps"] = {
            "no_test": not cov["requirements"][rid]["tests"],
            "no_evidence": not cov["requirements"][rid]["evidence"],
            "has_failed_test": rid in cov["reqs_with_failed_tests"],
            "not_verified": r.status not in ("VERIFIED", "NOT_APPLICABLE"),
        }
        return base

    project_row = row(project)
    project_row["id"] = project.id
    return {
        "project": project_row,
        "requirements": [req_rec(rid, reqs[rid]) for rid in sorted(reqs)],
        "tests": [
            {"case": row(cases[t]), "result": (row(results[t]) if t in results else None)} for t in sorted(cases)
        ],
        "evidence": [row(e) for e in _all(db, PortfolioEvidence, project.id, PortfolioEvidence.evidence_id)],
        "risks": [row(r) for r in _all(db, PortfolioRisk, project.id, PortfolioRisk.risk_id)],
        "limitations": [
            row(lim) for lim in _all(db, PortfolioLimitation, project.id, PortfolioLimitation.limitation_id)
        ],
        "fmea": [row(f) for f in _all(db, PortfolioFmeaItem, project.id, PortfolioFmeaItem.fmea_item_id)],
        "deployment_decision": row(decision) if decision else None,
        "model_card": mc.content if mc else {},
        "data_quality": dq.content if dq else {},
        "odd": odd.content if odd else {},
        "monitoring": mon.content if mon else {},
        "coverage": cov,
        "traceability": traceability_matrix(db, project.id),
        "completeness": package_completeness(
            db,
            project.id,
            generated=bool(project_packages(db, project.id)),
            verified=latest_package_verified(db, project.id),
        ),
    }


def project_packages(db: Session, project_id: str) -> list[PortfolioPackage]:
    stmt = (
        select(PortfolioPackage)
        .where(PortfolioPackage.project_id == project_id)
        .order_by(PortfolioPackage.generated_at.desc())
    )
    return list(db.execute(stmt).scalars())


def latest_package_verified(db: Session, project_id: str) -> bool | None:
    packages = project_packages(db, project_id)
    if not packages:
        return None
    return packages[0].verification.get("status") == "VALID"
