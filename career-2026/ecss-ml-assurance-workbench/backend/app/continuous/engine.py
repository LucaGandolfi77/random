"""Continuous Assurance (week 7): CI ingestion, snapshots, baselines,
comparisons, regression rules, actions, reproducibility, review packs.

Deterministic, rule-based, local-only. Nothing here certifies; the engine never
approves. Missing thresholds stay "Threshold Not Defined" and are never turned
into failures.
"""

from __future__ import annotations

import csv
import hashlib
import io
import json
import xml.etree.ElementTree as ET
import zipfile
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.assurance_engine.engine import analyze_gaps, dimensions, gate_evaluate, traceability_issues
from app.core.config import Settings
from app.portfolio.models import PortfolioProject
from app.portfolio.service import serialized_payload

MAX_RESULT_FILE = 20 * 1024 * 1024
MAX_TESTS_PER_IMPORT = 50_000


def _now() -> str:
    return datetime.now(UTC).isoformat()


def _stamp() -> str:
    return datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")


# ------------------------------------------------------------------ models
from sqlalchemy import JSON, DateTime, Integer, String, Text  # noqa: E402
from sqlalchemy.orm import Mapped, mapped_column  # noqa: E402

from app.database.base import Base  # noqa: E402
from app.models.project import utcnow  # noqa: E402


class IngestionRecord(Base):
    __tablename__ = "ca_ingestions"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)  # ING-<SHORT>-nnnn
    project_id: Mapped[str] = mapped_column(String(40), index=True)
    source_type: Mapped[str] = mapped_column(String(40))
    source_file: Mapped[str] = mapped_column(String(300), default="")
    checksum: Mapped[str] = mapped_column(String(64), index=True)
    status: Mapped[str] = mapped_column(String(40), default="Imported")  # Imported | Already Imported | Failed
    commit_sha: Mapped[str] = mapped_column(String(120), default="")
    branch: Mapped[str] = mapped_column(String(120), default="")
    environment: Mapped[str] = mapped_column(String(200), default="")
    model_version: Mapped[str] = mapped_column(String(80), default="")
    dataset_version: Mapped[str] = mapped_column(String(80), default="")
    test_tool: Mapped[str] = mapped_column(String(160), default="")
    tool_version: Mapped[str] = mapped_column(String(60), default="")
    total_tests: Mapped[int] = mapped_column(Integer, default=0)
    passed: Mapped[int] = mapped_column(Integer, default=0)
    failed: Mapped[int] = mapped_column(Integer, default=0)
    skipped: Mapped[int] = mapped_column(Integer, default=0)
    warnings: Mapped[dict] = mapped_column(JSON, default=dict)
    summary: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class AssuranceSnapshot(Base):
    __tablename__ = "ca_snapshots"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)  # SNP-<SHORT>-2026-001
    project_id: Mapped[str] = mapped_column(String(40), index=True)
    project_version: Mapped[str] = mapped_column(String(40), default="")
    reason: Mapped[str] = mapped_column(String(200), default="")
    role: Mapped[str] = mapped_column(String(40), default="Development Baseline")
    state: Mapped[dict] = mapped_column(JSON, default=dict)
    checksum: Mapped[str] = mapped_column(String(64))
    created_by: Mapped[str] = mapped_column(String(120), default="system")
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class RegressionFinding(Base):
    __tablename__ = "ca_regressions"

    id: Mapped[str] = mapped_column(String(60), primary_key=True)  # REG-<SHORT>-nnnn
    project_id: Mapped[str] = mapped_column(String(40), index=True)
    baseline_a: Mapped[str] = mapped_column(String(40), default="")
    baseline_b: Mapped[str] = mapped_column(String(40), default="")
    category: Mapped[str] = mapped_column(String(60))
    affected: Mapped[str] = mapped_column(String(200), default="")
    previous_value: Mapped[str] = mapped_column(String(200), default="")
    current_value: Mapped[str] = mapped_column(String(200), default="")
    threshold: Mapped[str] = mapped_column(String(120), default="")
    severity: Mapped[str] = mapped_column(String(20), default="Medium")
    blocker: Mapped[bool] = mapped_column(default=False)
    rationale: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(30), default="Open")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ActionItem(Base):
    __tablename__ = "ca_actions"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)  # ACT-CA-nnnn
    project_id: Mapped[str] = mapped_column(String(40), index=True)
    source: Mapped[str] = mapped_column(String(40), default="gap")
    source_item_id: Mapped[str] = mapped_column(String(80), default="")
    title: Mapped[str] = mapped_column(String(300))
    description: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(String(60), default="assurance")
    priority: Mapped[str] = mapped_column(String(20), default="Medium")
    status: Mapped[str] = mapped_column(String(30), default="Open")
    blocking: Mapped[bool] = mapped_column(default=False)
    resolution: Mapped[str] = mapped_column(Text, default="")
    closing_evidence: Mapped[str] = mapped_column(String(120), default="")
    closed_at: Mapped[str] = mapped_column(String(40), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class CampaignRun(Base):
    __tablename__ = "ca_campaigns"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)  # CAM-<SHORT>-nnnn
    project_id: Mapped[str] = mapped_column(String(40), index=True)
    title: Mapped[str] = mapped_column(String(300))
    scenarios: Mapped[list] = mapped_column(JSON, default=list)
    seed: Mapped[str] = mapped_column(String(80), default="")
    status: Mapped[str] = mapped_column(String(40), default="Not Executed")
    summary: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


# ------------------------------------------------------------------ helpers
def _short(project_id: str) -> str:
    return project_id.replace("PRJ-", "")[:3].upper()


def _counter(db: Session, model, project_id: str, prefix: str, kind: str) -> str:
    n = db.query(model).filter(model.project_id == project_id).count() + 1
    return f"{prefix}-{_short(project_id)}-{n:04d}"


def sha_of_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha_of_text(text: str) -> str:
    return sha_of_bytes(text.encode("utf-8"))


# ------------------------------------------------------------------ ingestion
def parse_junit_xml(data: bytes) -> dict:
    root = ET.fromstring(data)  # ElementTree: no external entity resolution
    suites = root.findall(".//testsuite") or [root]
    total = failed = skipped = 0
    for suite in suites:
        total += int(suite.get("tests", 0) or 0)
        failed += int(suite.get("failures", 0) or 0) + int(suite.get("errors", 0) or 0)
        skipped += int(suite.get("skipped", 0) or 0)
    passed = max(total - failed - skipped, 0)
    return {
        "total_tests": total,
        "passed": passed,
        "failed": failed,
        "skipped": skipped,
        "source_type": "junit-xml",
        "test_tool": "junit",
    }


def parse_json_summary(data: bytes) -> dict:
    payload = json.loads(data.decode("utf-8"))
    summary: dict = payload.get("summary", payload if isinstance(payload, dict) else {})
    pick = {k: int(summary[k]) for k in ("passed", "failed", "skipped", "blocked", "inconclusive") if k in summary}
    return {
        "source_type": "workbench-json",
        "total_tests": int(summary.get("total_tests") or sum(pick.values())),
        "passed": int(summary.get("passed", pick.get("passed", 0))),
        "failed": int(summary.get("failed", pick.get("failed", 0))),
        "skipped": int(summary.get("skipped", pick.get("skipped", 0))),
        "blocked": int(summary.get("blocked", 0)),
        "inconclusive": int(summary.get("inconclusive", 0)),
        "test_tool": payload.get("test_tool", "workbench"),
        "tool_version": payload.get("tool_version", ""),
    }


def ingest_results(
    db: Session,
    project: PortfolioProject,
    content: bytes,
    source_type: str,
    source_file: str = "",
    metadata: dict | None = None,
) -> IngestionRecord:
    if len(content) > MAX_RESULT_FILE:
        raise ValueError("result file exceeds configured limit")
    checksum = sha_of_bytes(content)
    duplicate = (
        db.query(IngestionRecord)
        .filter(IngestionRecord.project_id == project.id, IngestionRecord.checksum == checksum)
        .first()
    )
    if duplicate is not None:
        duplicate.status = "Already Imported"
        db.commit()
        return duplicate
    if source_type == "junit-xml":
        parsed = parse_junit_xml(content)
    elif source_type == "json-summary":
        parsed = parse_json_summary(content)
    else:
        raise ValueError(f"unsupported source type {source_type}")
    total = int(parsed.get("total_tests", 0))
    if total > MAX_TESTS_PER_IMPORT:
        raise ValueError("test count exceeds configured limit")
    meta = metadata or {}
    existing = db.query(IngestionRecord).filter(IngestionRecord.project_id == project.id).count()
    record_id = f"ING-{_short(project.id)}-{existing + 1:04d}"
    record = IngestionRecord(
        id=record_id,
        project_id=project.id,
        source_type=parsed.get("source_type", source_type),
        source_file=source_file,
        checksum=checksum,
        status="Imported",
        commit_sha=meta.get("commit_sha", ""),
        branch=meta.get("branch", ""),
        environment=meta.get("environment", ""),
        model_version=meta.get("model_version", project.model_version),
        dataset_version=meta.get("dataset_version", project.dataset_version),
        test_tool=parsed.get("test_tool", ""),
        tool_version=parsed.get("tool_version", ""),
        total_tests=total,
        passed=int(parsed.get("passed", 0)),
        failed=int(parsed.get("failed", 0)),
        skipped=int(parsed.get("skipped", 0)),
        summary=parsed,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


# ------------------------------------------------------------------ snapshots
def snapshot_state(db: Session, project: PortfolioProject) -> dict:
    payload = serialized_payload(db, project)
    gaps = analyze_gaps(db, project)
    gate = gate_evaluate(db, project)
    trace = traceability_issues(db, project)
    verdicts = payload["coverage"]["verdict_counts"]
    return {
        "project_id": project.id,
        "project_version": project.version,
        "model_version": project.model_version,
        "dataset_version": project.dataset_version,
        "requirements": [r["requirement_id"] for r in payload["requirements"]],
        "requirements_verified": [r["requirement_id"] for r in payload["requirements"] if r["status"] == "VERIFIED"],
        "tests": [t["case"]["test_id"] for t in payload["tests"]],
        "tests_passed": [
            t["case"]["test_id"] for t in payload["tests"] if t.get("result") and t["result"]["verdict"] == "PASS"
        ],
        "tests_failed": [
            t["case"]["test_id"] for t in payload["tests"] if t.get("result") and t["result"]["verdict"] == "FAIL"
        ],
        "verdicts": verdicts,
        "evidence": [e["evidence_id"] for e in payload["evidence"]],
        "limitations": [lim["limitation_id"] for lim in payload["limitations"]],
        "failure_modes": [f["fmea_item_id"] for f in payload["fmea"]],
        "risks": [r["risk_id"] for r in payload["risks"]],
        "unaccepted_risks": [
            r["risk_id"] for r in payload["risks"] if r["acceptance_status"] in ("NOT_ACCEPTABLE", "NOT_ASSESSED")
        ],
        "odd_status": payload["odd"].get("status", "PARTIAL"),
        "deployment_recommendation": gate["recommendation"],
        "deployment_decision": gate["official_deployment_decision"],
        "monitoring": payload["monitoring"].get("status", "PARTIAL"),
        "gaps": [g["gap_id"] for g in gaps],
        "blocking_gaps": [g["gap_id"] for g in gaps if g.get("blocking")],
        "traceability_orphans": trace["orphan_ids"],
        "dimensions": [d["status"] for d in dimensions(db, project)["dimensions"]],
    }


def create_snapshot(
    db: Session,
    project: PortfolioProject,
    reason: str = "",
    role: str = "Development Baseline",
    created_by: str = "system",
    notes: str = "",
) -> AssuranceSnapshot:
    state = snapshot_state(db, project)
    year = datetime.now(UTC).year
    count = db.query(AssuranceSnapshot).filter(AssuranceSnapshot.project_id == project.id).count() + 1
    checksum = sha_of_text(json.dumps(state, sort_keys=True))
    snapshot = AssuranceSnapshot(
        id=f"SNP-{_short(project.id)}-{year}-{count:03d}",
        project_id=project.id,
        project_version=project.version,
        reason=reason,
        role=role,
        state=state,
        checksum=checksum,
        created_by=created_by,
        notes=notes,
    )
    db.add(snapshot)
    db.commit()
    db.refresh(snapshot)
    return snapshot


def list_snapshots(db: Session, project_id: str) -> list[AssuranceSnapshot]:
    stmt = (
        select(AssuranceSnapshot)
        .where(AssuranceSnapshot.project_id == project_id)
        .order_by(AssuranceSnapshot.created_at.asc())
    )
    return list(db.execute(stmt).scalars())


def compare_snapshots(a: AssuranceSnapshot, b: AssuranceSnapshot) -> dict:
    sa_, sb_ = a.state, b.state

    def diff_ids(na: str, nb: str) -> dict:
        return {"added": sorted(set(sb_[nb]) - set(sa_[na])), "removed": sorted(set(sa_[na]) - set(sb_[nb]))}

    verdicts_a = sa_.get("verdicts", {})
    verdicts_b = sb_.get("verdicts", {})
    passed_to_failed = sorted(set(sa_["tests_passed"]) - set(sb_["tests_passed"]))
    verified_to_unverified = sorted(set(sa_["requirements_verified"]) - set(sb_["requirements_verified"]))
    newly_verified = sorted(set(sb_["requirements_verified"]) - set(sa_["requirements_verified"]))

    checks = {
        "requirements": diff_ids("requirements", "requirements"),
        "tests": diff_ids("tests", "tests"),
        "evidence": diff_ids("evidence", "evidence"),
        "limitations": diff_ids("limitations", "limitations"),
        "failure_modes": diff_ids("failure_modes", "failure_modes"),
        "risks": diff_ids("risks", "risks"),
        "unaccepted_risks": diff_ids("unaccepted_risks", "unaccepted_risks"),
        "passed_tests": {"removed": passed_to_failed},
        "verified_requirements": {"added": newly_verified, "removed": verified_to_unverified},
    }
    regression_facts: list[dict] = []
    for test in passed_to_failed:
        regression_facts.append(
            {"category": "Test Regression", "affected": test, "previous": "Passed", "current": "Failed or missing"}
        )
    for req in verified_to_unverified:
        regression_facts.append(
            {"category": "Requirement Regression", "affected": req, "previous": "Verified", "current": "Not verified"}
        )
    changed: dict[str, str] = {}
    for key in (
        "model_version",
        "dataset_version",
        "deployment_decision",
        "deployment_recommendation",
        "odd_status",
        "monitoring",
    ):
        if sa_.get(key) != sb_.get(key):
            changed[key] = f"{sa_.get(key)} -> {sb_.get(key)}"
    return {
        "baseline_a": a.id,
        "baseline_b": b.id,
        "project_id": a.project_id,
        "comparison": checks,
        "regression_facts": regression_facts,
        "changed_fields": changed,
        "verdict_delta": {
            k: int(verdicts_b.get(k, 0)) - int(verdicts_a.get(k, 0))
            for k in ("passed", "failed", "skipped", "blocked", "inconclusive")
        },
        "note": "Context matters: numeric increases are not automatically improvements.",
    }


# ------------------------------------------------------------------ regressions
def regressions_from_comparison(
    db: Session, project: PortfolioProject, comparison: dict, reason_a: str = "", reason_b: str = ""
) -> list[RegressionFinding]:
    findings: list[RegressionFinding] = []
    seen = set()
    base = (
        db.query(RegressionFinding)
        .filter(
            RegressionFinding.project_id == project.id,
            RegressionFinding.baseline_a == comparison["baseline_a"],
            RegressionFinding.baseline_b == comparison["baseline_b"],
        )
        .count()
    )

    def add(
        category: str,
        affected: str,
        previous: str,
        current: str,
        severity: str,
        blocker: bool,
        rationale: str,
        threshold: str = "",
    ) -> None:
        key = (category, affected)
        if key in seen:
            return
        seen.add(key)
        base_id = base + len(findings) + 1
        findings.append(
            RegressionFinding(
                id=f"REG-{_short(project.id)}-{base_id:04d}",
                project_id=project.id,
                baseline_a=comparison["baseline_a"],
                baseline_b=comparison["baseline_b"],
                category=category,
                affected=affected,
                previous_value=previous,
                current_value=current,
                threshold=threshold or "Threshold Not Defined",
                severity=severity,
                blocker=blocker,
                rationale=rationale,
            )
        )

    for fact in comparison["regression_facts"]:
        add(
            fact["category"],
            fact["affected"],
            fact["previous"],
            fact["current"],
            severity="High",
            blocker=False,
            rationale="Detected by deterministic snapshot comparison.",
        )
    unacc_a = set((comparison["baseline_a"] and _snapshot_unaccepted(comparison, "a")) or [])
    unacc_b = set((comparison["baseline_b"] and _snapshot_unaccepted(comparison, "b")) or [])
    if len(unacc_b) > len(unacc_a):
        for risk in sorted(unacc_b - unacc_a):
            add(
                "Risk Regression",
                risk,
                "accepted",
                "unaccepted",
                "Critical",
                True,
                "Unaccepted residual risk appeared in the newer snapshot.",
            )
    changed = comparison["changed_fields"]
    if changed.get("deployment_recommendation", "").endswith("Not Ready") or "Not Ready" in changed.get(
        "deployment_recommendation", ""
    ):
        add(
            "Deployment Regression",
            "deployment_recommendation",
            changed["deployment_recommendation"].split(" -> ")[0],
            changed["deployment_recommendation"].split(" -> ")[1],
            "High",
            True,
            "Deployment recommendation regressed to Not Ready.",
        )
    if "model_version" in changed:
        parts = changed["model_version"].split(" -> ")
        add(
            "Version Mismatch",
            "model_version",
            parts[0],
            parts[1],
            "Medium",
            False,
            "Model version changed between baselines.",
        )
    for f in findings:
        db.add(f)
    db.commit()
    return findings


def _snapshot_unaccepted(comparison: dict, which: str) -> list[str]:
    from app.portfolio.models import PortfolioProject  # noqa: F401

    # state payload not available here; regressions rely on facts above
    return []


# ------------------------------------------------------------------ actions
def create_action(
    db: Session,
    project: PortfolioProject,
    source: str,
    source_item_id: str,
    title: str,
    description: str,
    category: str = "assurance",
    priority: str = "Medium",
    blocking: bool = False,
) -> ActionItem:
    count = db.query(ActionItem).filter(ActionItem.project_id == project.id).count() + 1
    action = ActionItem(
        id=f"ACT-CA-{_short(project.id)}-{count:03d}",
        project_id=project.id,
        source=source,
        source_item_id=source_item_id,
        title=title,
        description=description,
        category=category,
        priority=priority,
        blocking=blocking,
        status="Open",
    )
    db.add(action)
    db.commit()
    db.refresh(action)
    return action


def close_action(db: Session, action: ActionItem, resolution: str, closing_evidence: str = "") -> ActionItem:
    action.status = "Closed"
    action.resolution = resolution
    action.closing_evidence = closing_evidence
    action.closed_at = _now()
    db.commit()
    db.refresh(action)
    return action


def actions_from_regressions(
    db: Session, project: PortfolioProject, regressions: list[RegressionFinding]
) -> list[ActionItem]:
    created: list[ActionItem] = []
    for reg in regressions:
        if (
            db.query(ActionItem)
            .filter(
                ActionItem.project_id == project.id,
                ActionItem.source == "regression",
                ActionItem.source_item_id == reg.id,
            )
            .count()
        ):
            continue
        created.append(
            create_action(
                db,
                project,
                "regression",
                reg.id,
                f"Investigate regression {reg.affected}",
                reg.rationale,
                priority="High" if reg.blocker else "Medium",
                blocking=reg.blocker,
            )
        )
    return created


def export_actions_csv(actions: list[ActionItem]) -> str:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["action_id", "project_id", "source", "source_item_id", "title", "status", "priority", "blocking"])
    for action in actions:
        writer.writerow(
            [
                action.id,
                action.project_id,
                action.source,
                action.source_item_id,
                action.title,
                action.status,
                action.priority,
                action.blocking,
            ]
        )
    return buffer.getvalue()


def issue_draft(action: ActionItem) -> str:
    return (
        f"Title: {action.title}\n"
        f"Context: {action.description}\n"
        f"Observed behaviour: reported as {action.source} ({action.source_item_id}).\n"
        f"Expected behaviour: resolution with closing evidence.\n"
        f"Affected project: {action.project_id}\n"
        f"Severity: {action.priority}\n"
        f"Acceptance criteria: action closed with evidence '{action.closing_evidence or 'evidence reference'}'."
    )


# ------------------------------------------------------------------ reproducibility record
def reproducibility_record(
    db: Session, project: PortfolioProject, run: Any | None = None, settings: Settings | None = None
) -> dict:
    payload = serialized_payload(db, project)
    latest = run
    record = {
        "project_id": project.id,
        "project_version": project.version,
        "model_version": project.model_version,
        "dataset_version": project.dataset_version,
        "source_revision": "local workspace (no git metadata captured for demo data)",
        "dependencies": "managed by requirements.txt / package-lock.json (see security/sbom)",
        "random_seed": getattr(latest, "seed", None) if latest else None,
        "runner_version": "workbench-week7-0.1",
        "reproducibility_status": "Not Evaluated" if not latest else latest.status,
        "execution": None if not latest else {"campaign": latest.id, "scenarios": len(latest.scenarios or [])},
        "artefact_hashes": {"project_state": sha_of_text(json.dumps(payload, sort_keys=True))},
        "notes": "Fixture/synthetic data. Exact reproduction requires capturing CI logs, seeds and environment "
        "per run; historical CI results are recorded from imported summaries only.",
    }
    out = _ensure_repro_dir(settings)
    if out is not None:
        base = out / f"{project.slug}_reproducibility-record_{_stamp()}"
        (out / f"{base.name}.json").write_text(json.dumps(record, indent=2, sort_keys=True), encoding="utf-8")
        (out / f"{base.name}.md").write_text(_repro_md(record), encoding="utf-8")
        record["_files"] = [f"{base.name}.json", f"{base.name}.md"]
    return record


def _ensure_repro_dir(settings: Settings | None):
    if settings is None:
        return None
    out = settings.storage_dir / "reproducibility"
    out.mkdir(parents=True, exist_ok=True)
    return out


def _repro_md(record: dict) -> str:
    lines = [
        f"# Reproducibility record — {record['project_id']}",
        "",
        f"- Project version: {record['project_version']}",
        f"- Model / dataset: {record['model_version']} / {record['dataset_version']}",
        f"- Status: {record['reproducibility_status']}",
        f"- Notes: {record['notes']}",
        "",
        "Inputs needed: repository under /career-2026, backend requirements.txt, frontend "
        "package-lock.json, fixture data in backend/app/portfolio/datadefs.",
    ]
    return "\n".join(lines)


# ------------------------------------------------------------------ technical review pack
REVIEW_TYPES = (
    "Data Readiness Review",
    "Model Review",
    "Test Readiness Review",
    "Test Results Review",
    "Deployment Readiness Review",
    "Operational Monitoring Review",
    "Portfolio Demonstration Review",
)


def generate_review_pack(
    db: Session,
    project: PortfolioProject,
    review_type: str = "Portfolio Demonstration Review",
    baseline_a: AssuranceSnapshot | None = None,
    baseline_b: AssuranceSnapshot | None = None,
    settings: Settings | None = None,
) -> dict:
    if review_type not in REVIEW_TYPES:
        raise ValueError(f"unsupported review type {review_type}")
    payload = serialized_payload(db, project)
    gaps = analyze_gaps(db, project)
    gate = gate_evaluate(db, project)
    comparison = compare_snapshots(baseline_a, baseline_b) if baseline_a and baseline_b else None
    regressions = regressions_from_comparison(db, project, comparison) if comparison else []
    actions = db.query(ActionItem).filter(ActionItem.project_id == project.id, ActionItem.status != "Closed").all()

    docs = {
        "README.md": "# Technical Review Pack\n\nHuman review package. It complements, not replaces, the Evidence "
        "Package.\n\n> This project provides an ECSS-informed engineering demonstration for AI/ML assurance. "
        "It does not constitute certification, qualification, formal approval, or proof of compliance.",
        "REVIEW_AGENDA.md": f"# Review agenda\n\nType: {review_type}\n\n- Read REVIEW_SUMMARY.md\n"
        "- Confirm CHANGE_SUMMARY.md against the previous baseline\n- Review open risks and gaps\n"
        "- Answer QUESTIONS_FOR_REVIEW.md\n- Approve ACTION_ITEMS.md",
        "REVIEW_SUMMARY.md": _markdown_rows(
            {
                "Project": project.id,
                "Version": project.version,
                "Recommendation": gate["recommendation"],
                "Official decision": gate["official_deployment_decision"],
                "Open gaps": len(gaps),
                "Open actions": len(actions),
            }
        ),
        "CHANGE_SUMMARY.md": json.dumps(comparison, indent=2) if comparison else "No baseline comparison provided.",
        "REQUIREMENTS_STATUS.md": json.dumps(
            [{"id": r["requirement_id"], "status": r["status"]} for r in payload["requirements"]], indent=2
        ),
        "TEST_STATUS.md": json.dumps(payload["coverage"]["verdict_counts"], indent=2),
        "FAILED_TESTS.md": "\n".join(
            f"- {t['case']['test_id']}: {t['result'].get('failure_reason', '')}"
            for t in payload["tests"]
            if t.get("result") and t["result"]["verdict"] == "FAIL"
        )
        or "none",
        "ASSURANCE_GAPS.md": "\n".join(f"- {g['gap_id']} [{g['severity']}] {g['title']}" for g in gaps) or "none",
        "OPEN_RISKS.md": json.dumps(
            [
                {"risk_id": r["risk_id"], "acceptance_status": r["acceptance_status"]}
                for r in payload["risks"]
                if r["acceptance_status"] != "ACCEPTABLE"
            ],
            indent=2,
        ),
        "FMEA_SUMMARY.md": f"{len(payload['fmea'])} FMEA items; open: "
        f"{sum(1 for f in payload['fmea'] if f['status'] == 'OPEN')}",
        "DEPLOYMENT_GATE.md": json.dumps(
            {
                "recommendation": gate["recommendation"],
                "blocking_fails": gate["blocking_fails"],
                "inconsistencies": gate["inconsistencies"],
            },
            indent=2,
        ),
        "MONITORING_READINESS.md": json.dumps(payload["monitoring"].get("status", "PARTIAL")),
        "QUESTIONS_FOR_REVIEW.md": "1. Are unaccepted residual risks acceptable?\n2. Are failed tests blocking?"
        "\n3. Is monitoring sufficient for the declared ODD?",
        "ACTION_ITEMS.md": "\n".join(f"- [{a.status}] {a.id}: {a.title} ({a.source})" for a in actions) or "none",
        "EVIDENCE_INDEX.md": "\n".join(
            f"- {e['evidence_id']} ({e['status']}) {e['title']}" for e in payload["evidence"]
        )
        or "none",
        "MANIFEST.json": json.dumps(
            {
                "project_id": project.id,
                "review_type": review_type,
                "baseline_a": baseline_a.id if baseline_a else None,
                "baseline_b": baseline_b.id if baseline_b else None,
                "regressions": [r.id for r in regressions],
                "generated_at": _now(),
            },
            indent=2,
        ),
    }
    pack_id = f"TRP-{_short(project.id)}-{_stamp()}"
    cfg = settings or settings_lookup()
    if cfg is None:
        raise RuntimeError("technical review packs require a settings storage dir")
    archive_dir = cfg.storage_dir / "technical-review-packs"
    archive_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{project.slug}_technical-review-pack_{_stamp()}.zip"
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for name, content in docs.items():
            zf.writestr(f"technical-review-pack/{name}", content)
    archive_dir.joinpath(filename).write_bytes(buffer.getvalue())
    return {
        "pack_id": pack_id,
        "project_id": project.id,
        "review_type": review_type,
        "filename": filename,
        "size_bytes": len(buffer.getvalue()),
        "regressions": [r.id for r in regressions],
        "actions": [a.id for a in actions],
    }




def _markdown_rows(rows: dict) -> str:
    lines = ["| Field | Value |", "|---|---|"]
    for key, value in rows.items():
        lines.append(f"| {key} | {value} |")
    return "\n".join(lines)

def settings_lookup():
    try:
        from app.core.config import get_settings

        return get_settings()
    except Exception:
        return None
