"""Idempotent importer for the week-3 portfolio projects.

Strategy (documented):

- Stable primary keys: project ``PRJ-*`` id; child rows use ``uuid4`` ids but
  carry stable business ids (``REQ-*``, ``TEST-*``, ``EVID-*``, ``RISK-*``,
  ``FM-*``, ``LIM-*``, ``DEC-*``) unique per project.
- A project is (re)imported when its seed ``meta.version`` differs from the
  stored project ``version``. Children are then replaced atomically inside a
  transaction; previously generated evidence packages are kept (historical
  snapshots) and are not deleted.
- Evidence attachments (small synthetic text files) are written under
  ``storage/portfolio/evidence/<slug>/`` only when the file is missing or its
  hash differs. Content hashes are SHA-256.

Call ``seed_portfolio(db, settings)``; returns (created, updated).
"""

import hashlib
import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.orm import Session

from app.core.config import Settings
from app.models.audit import AuditEvent
from app.portfolio.datadefs import PROJECTS
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


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def risk_level(severity: int, likelihood: int) -> str:
    """Configurable risk matrix: product thresholds (documented in docs/residual-risk-method.md)."""
    score = severity * likelihood
    if severity >= 5 and likelihood >= 4:
        return "CRITICAL"
    if score >= 12:
        return "HIGH"
    if score >= 6:
        return "MEDIUM"
    return "LOW"


def _insert_child(model, project_id: str, data: dict, drop: tuple[str, ...] = ()) -> Any:
    row = model(project_id=project_id, id=str(uuid.uuid4()))
    for key, value in data.items():
        if key in drop or value is None:
            continue
        setattr(row, key, value)
    return row


def _evidence_dir(settings: Settings, slug: str):
    path = settings.storage_dir / "portfolio" / "evidence" / slug
    path.mkdir(parents=True, exist_ok=True)
    return path


def _store_attachment(settings: Settings, slug: str, evidence_id: str, content: str) -> tuple[str, str]:
    path = _evidence_dir(settings, slug) / f"{evidence_id}.txt"
    digest = hashlib.sha256(content.encode("utf-8")).hexdigest()
    if not path.exists() or path.read_text(encoding="utf-8") != content:
        path.write_text(content, encoding="utf-8")
    return f"evidence/{evidence_id}.txt", digest


def _replace_children(db: Session, project_id: str, spec: dict, settings: Settings, slug: str) -> None:
    """Delete existing children and (re)insert from spec inside the caller's transaction."""
    for model in (
        PortfolioRequirement,
        PortfolioEvidence,
        PortfolioTestCase,
        PortfolioTestResult,
        PortfolioRisk,
        PortfolioLimitation,
        PortfolioFmeaItem,
        PortfolioDeploymentDecision,
        PortfolioModelCard,
        PortfolioDataQuality,
        PortfolioOdd,
        PortfolioMonitoringStrategy,
    ):
        db.query(model).filter(model.project_id == project_id).delete(synchronize_session=False)

    for item in spec["requirements"]:
        row_data = dict(item)
        row_data.setdefault("external_id", item["requirement_id"])
        db.add(_insert_child(PortfolioRequirement, project_id, row_data))
    for item in spec["tests"]:
        case = {k: v for k, v in item.items() if k != "result"}
        case.setdefault("external_id", item["test_id"])
        db.add(_insert_child(PortfolioTestCase, project_id, case))
        result = item["result"]
        db.add(_insert_child(PortfolioTestResult, project_id, result))
    for item in spec["evidence"]:
        fields = dict(item)
        att = fields.pop("attachment", None)
        if att:
            ref, digest = _store_attachment(settings, slug, item["evidence_id"], att)
            fields["file_reference"] = ref
            fields["content_hash"] = digest
        db.add(_insert_child(PortfolioEvidence, project_id, fields))
    for item in spec["risks"]:
        risk_data = dict(item)
        risk_data.setdefault("external_id", item["risk_id"])
        row = _insert_child(PortfolioRisk, project_id, risk_data)
        row.initial_risk_level = risk_level(item["initial_severity"], item["initial_likelihood"])
        row.residual_risk_level = risk_level(item["residual_severity"], item["residual_likelihood"])
        db.add(row)
    for item in spec["fmea"]:
        db.add(_insert_child(PortfolioFmeaItem, project_id, item))
    for item in spec["limitations"]:
        db.add(_insert_child(PortfolioLimitation, project_id, item))
    meta = spec["meta"]
    for item in spec["deployment_decisions"]:
        fields = dict(item)
        fields.setdefault("project_version", meta.get("version", ""))
        fields.setdefault("model_version", meta.get("model_version", ""))
        fields.setdefault("dataset_version", meta.get("dataset_version", ""))
        db.add(_insert_child(PortfolioDeploymentDecision, project_id, fields))

    db.add(_child_doc(PortfolioModelCard, project_id, spec["model_card"]))
    db.add(_child_doc(PortfolioDataQuality, project_id, spec["data_quality"]))
    db.add(_child_doc(PortfolioOdd, project_id, spec["odd"]))
    db.add(_child_doc(PortfolioMonitoringStrategy, project_id, spec["monitoring"]))


def _child_doc(model, project_id: str, content: dict) -> object:
    row = model(project_id=project_id, content=content)
    if isinstance(row, PortfolioModelCard):
        row.model_name = content.get("model_name", "")
        row.model_version = content.get("model_version", "")
        row.model_type = content.get("model_type", "")
    if isinstance(row, PortfolioDataQuality):
        row.dataset_name = content.get("dataset_name", "")
        row.dataset_version = content.get("dataset_version", "")
    if isinstance(row, PortfolioOdd | PortfolioMonitoringStrategy):
        row.status = content.get("status", "PARTIAL")
    return row


def _audit(db: Session, event_type: str, project_id: str, details: dict) -> None:
    db.add(
        AuditEvent(
            id=str(uuid.uuid4()),
            event_type=event_type,
            project_id=project_id,
            details=details,
            created_at=datetime.now(UTC),
        )
    )


def seed_portfolio(db: Session, settings: Settings) -> tuple[int, int]:
    created = 0
    updated = 0
    for spec in PROJECTS:
        meta = spec["meta"]
        stored = db.get(PortfolioProject, meta["id"])
        if stored is None:
            fields = {k: v for k, v in meta.items() if k != "id"}
            db.add(PortfolioProject(id=meta["id"], **fields))
            db.flush()
            _replace_children(db, meta["id"], spec, settings, meta["slug"])
            _audit(db, "PROJECT_IMPORTED", meta["id"], {"version": meta["version"]})
            created += 1
            continue
        if stored.version == meta["version"]:
            continue
        for key, value in meta.items():
            setattr(stored, key, value)
        stored.updated_at = datetime.now(UTC)
        _replace_children(db, stored.id, spec, settings, meta["slug"])
        _audit(db, "PROJECT_UPDATED", meta["id"], {"version": meta["version"]})
        updated += 1
    db.commit()
    return created, updated
