"""Assurance Review Report generator (Markdown + JSON)."""

import json
import re
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.assurance_engine.engine import analyze_gaps, dimensions, gate_evaluate, traceability_issues
from app.core.config import Settings
from app.portfolio.models import PortfolioMonitoringStrategy, PortfolioProject
from app.portfolio.service import serialized_payload

DISCLAIMER = (
    "This report provides an ECSS-informed engineering summary. It does not constitute certification, "
    "qualification, formal approval, or proof of compliance."
)


def _safe(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]", "-", value).strip("-") or "project"


def generate_assurance_report(db: Session, project: PortfolioProject, settings: Settings) -> dict:
    payload = serialized_payload(db, project)
    gaps = analyze_gaps(db, project)
    dims = dimensions(db, project)
    gate = gate_evaluate(db, project)
    trace = traceability_issues(db, project)
    packages = sorted(project.packages, key=lambda p: p.generated_at, reverse=True)
    verdicts = payload["coverage"]["verdict_counts"]

    report = {
        "project": payload["project"],
        "executive_summary": {
            "assurance_status": project.assurance_status,
            "gate_recommendation": gate["recommendation"],
            "official_deployment_decision": gate["official_deployment_decision"],
            "blocking_gap_count": len([g for g in gaps if g.get("blocking")]),
            "gap_count": len(gaps),
            "evidence_note": "Computed from imported records only; missing data is never treated as a pass.",
        },
        "artefact_inventory": {
            "requirements": len(payload["requirements"]),
            "tests": len(payload["tests"]),
            "evidence": len(payload["evidence"]),
            "risks": len(payload["risks"]),
            "fmea_items": len(payload["fmea"]),
            "limitations": len(payload["limitations"]),
        },
        "requirements_status": {
            "verified": sum(1 for r in payload["requirements"] if r["status"] == "VERIFIED"),
            "total": len(payload["requirements"]),
            "not_verified": [r["requirement_id"] for r in payload["requirements"] if r["status"] == "NOT_VERIFIED"],
        },
        "test_summary": verdicts,
        "failed_tests": [
            t["case"]["test_id"] for t in payload["tests"] if t.get("result") and t["result"]["verdict"] == "FAIL"
        ],
        "not_executed_tests": [
            t["case"]["test_id"]
            for t in payload["tests"]
            if not t.get("result") or t["result"]["verdict"] in ("NOT_EXECUTED", "BLOCKED")
        ],
        "evidence_summary": {
            "count": len(payload["evidence"]),
            "with_file": sum(1 for e in payload["evidence"] if e.get("file_reference")),
        },
        "open_failure_modes": [f["fmea_item_id"] for f in payload["fmea"] if f["status"] == "OPEN"],
        "residual_risks": [
            {
                "risk_id": r["risk_id"],
                "acceptance_status": r["acceptance_status"],
                "residual_risk_level": r["residual_risk_level"],
            }
            for r in payload["risks"]
        ],
        "assurance_gaps": gaps,
        "deployment_gate": {
            "recommendation": gate["recommendation"],
            "rules": gate["rules"],
            "blocking_fails": gate["blocking_fails"],
            "inconsistencies": gate["inconsistencies"],
        },
        "deployment_decision": payload["deployment_decision"],
        "monitoring_readiness": _monitoring_content(db, project),
        "traceability_summary": trace,
        "evidence_package_status": (packages[0].verification if packages else {"status": "not generated"}),
        "open_actions": payload["project"].get("open_actions") or [],
        "limitations": [lim["title"] for lim in payload["limitations"]],
        "assurance_dimensions": dims["dimensions"],
        "disclaimer": DISCLAIMER,
        "generated_at": datetime.now(UTC).isoformat(),
    }

    out_dir = settings.storage_dir / "assurance-reports"
    out_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    base = out_dir / f"{_safe(project.slug)}_assurance-report_{stamp}"
    text = _render_markdown(report, project)
    (out_dir / f"{base.name}.md").write_text(text, encoding="utf-8")
    (out_dir / f"{base.name}.json").write_text(json.dumps(report, indent=2, sort_keys=True), encoding="utf-8")
    report["_files"] = [f"{base.name}.md", f"{base.name}.json"]
    return report


def _render_markdown(report: dict, project: PortfolioProject) -> str:
    lines = [
        f"# Assurance Review Report — {project.name}",
        "",
        f"- Project ID: {project.id} · version {project.version}",
        f"- Lifecycle: {project.lifecycle_status} · Assurance: {project.assurance_status}",
        f"- Generated: {report['generated_at']}",
        "",
        f"> {DISCLAIMER}",
        "",
        "## 1. Executive summary",
        "",
        f"- Gate recommendation: **{report['executive_summary']['gate_recommendation']}**",
        f"- Official deployment decision: {report['executive_summary']['official_deployment_decision'] or 'none'}",
        f"- Gaps: {report['executive_summary']['gap_count']} (blocking: "
        f"{report['executive_summary']['blocking_gap_count']})",
        "",
        "## 2. Artefact inventory",
        "",
        "| Artefact | Count |",
        "|---|---|",
    ]
    for key, value in report["artefact_inventory"].items():
        lines.append(f"| {key} | {value} |")
    lines += [
        "",
        "## 3. Requirements status",
        "",
        f"Verified {report['requirements_status']['verified']} / {report['requirements_status']['total']}; "
        f"not verified: {', '.join(report['requirements_status']['not_verified']) or 'none'}",
        "",
        "## 4. Test summary",
        "",
        "| Verdict | Count |",
        "|---|---|",
    ]
    for verdict, count in report["test_summary"].items():
        lines.append(f"| {verdict} | {count} |")
    lines += [
        "",
        "## 5. Failed tests",
        "",
    ]
    lines += [f"- {t}" for t in report["failed_tests"]] or ["- none"]
    lines += ["", "## 6. Not executed / blocked tests", ""]
    lines += [f"- {t}" for t in report["not_executed_tests"]] or ["- none"]
    lines += ["", "## 7. Assurance gaps", ""]
    for gap in report["assurance_gaps"]:
        lines.append(f"- **{gap['gap_id']}** [{gap['severity']}] {gap['title']} — {gap['description']}")
    lines += ["", "## 8. Deployment gate", "", f"Recommendation: {report['deployment_gate']['recommendation']}", ""]
    for rule in report["deployment_gate"]["rules"]:
        lines.append(f"- {rule['rule_id']}: {rule['result']} ({rule['severity']}) {rule['rationale']}")
    if report["deployment_gate"]["inconsistencies"]:
        lines += ["", "Inconsistencies detected:", ""]
        lines += [f"- {i['rule']}: {i['detail']}" for i in report["deployment_gate"]["inconsistencies"]]
    lines += ["", "## 9. Open failure modes", ""]
    lines += [f"- {f}" for f in report["open_failure_modes"]] or ["- none"]
    lines += ["", "## 10. Residual risks", ""]
    for risk in report["residual_risks"]:
        lines.append(f"- {risk['risk_id']}: {risk['acceptance_status']} (level {risk['residual_risk_level']})")
    lines += [
        "",
        "## 11. Traceability summary",
        "",
        f"Orphans: {report['traceability_summary']['orphan_count']}; duplicates: "
        f"{len(report['traceability_summary']['duplicate_ids'])}",
        "",
        "## 12. Evidence package status",
        "",
        f"{report['evidence_package_status']}",
        "",
        "## 13. Review conclusion",
        "",
        "Reviewed dimensions, gaps, gate rules and official decision from imported records. "
        "Human review remains required for acceptance; this report does not approve anything.",
        "",
    ]
    return "\n".join(lines)


def _monitoring_content(db: Session, project: PortfolioProject) -> dict:
    doc = db.get(PortfolioMonitoringStrategy, project.id)
    return doc.content if doc else {}
