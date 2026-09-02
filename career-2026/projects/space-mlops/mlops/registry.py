"""Mission-grade model registry and safe deployment lab (local, no cloud).

Promotions are never automatic; every stage transition is explicit with audit
events. Shadow/canary are simulated locally. Rollback verifies checksum and
target allowlist, records rationale, and supports dry-run.
"""
from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

STAGES = ("Development", "Candidate", "Under Review", "Approved for Demonstration",
          "Shadow", "Canary", "Active", "Rolled Back", "Retired")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class ModelRecord:
    model_id: str
    project_id: str
    version: str                 # semantic version
    payload_sha: str
    framework: str = "python"
    training_revision: str = ""
    dataset_version: str = ""
    preprocessing_version: str = ""
    inference_engine: str = "local"
    target: str = "simulation"
    optimization: str = "none"
    test_status: str = "Not Run"
    approval_status: str = "Not Requested"
    stage: str = "Development"
    owner: str = ""
    evidence_links: list[str] = field(default_factory=list)
    created_at: str = field(default_factory=_now)
    config_baseline: str = ""

    def semver_ok(self) -> bool:
        return bool(re.fullmatch(r"\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?", self.version))


class Registry:
    def __init__(self, trusted_rollback_versions: dict[str, list[str]] | None = None) -> None:
        self.models: dict[str, ModelRecord] = {}
        self.audit: list[dict] = []
        self.trusted_rollback = trusted_rollback_versions or {}

    def _log(self, model_id: str, event: str, detail: dict) -> None:
        self.audit.append({"ts": _now(), "model_id": model_id, "event": event, "detail": detail})

    def add(self, record: ModelRecord) -> None:
        key = f"{record.model_id}@{record.version}"
        if key in self.models:
            raise ValueError(f"duplicate registration {key}")
        if not record.semver_ok():
            raise ValueError("invalid semantic version")
        self.models[key] = record
        self._log(record.model_id, "REGISTERED", {"version": record.version, "sha": record.payload_sha})

    def approve(self, model_id: str, version: str, reviewer: str) -> None:
        rec = self._get(model_id, version)
        if rec.stage not in ("Candidate", "Under Review"):
            raise ValueError("only Candidate/Under Review can be approved")
        if not rec.evidence_links:
            raise ValueError("cannot approve without evidence links")
        rec.approval_status = "Approved"
        rec.stage = "Approved for Demonstration"
        self._log(model_id, "APPROVED", {"version": version, "reviewer": reviewer})

    def promote(self, model_id: str, version: str, to_stage: str, evidence_required: bool = True) -> ModelRecord:
        if to_stage not in STAGES:
            raise ValueError("unknown stage")
        rec = self._get(model_id, version)
        if evidence_required and not rec.evidence_links:
            raise ValueError("promotion rejected: missing evidence")
        if to_stage == "Active":
            if rec.stage not in ("Approved for Demonstration", "Canary"):
                raise ValueError("promotion rejected: must be Approved for Demonstration (or Canary)")
            if rec.approval_status != "Approved":
                raise ValueError("promotion rejected: not approved")
        if to_stage in ("Shadow", "Canary", "Active"):
            # automatic never happens: caller invoked explicit promote
            pass
        rec.stage = to_stage
        self._log(model_id, "PROMOTED", {"version": version, "to": to_stage})
        return rec

    def canary_fail(self, model_id: str, version: str, reason: str) -> ModelRecord:
        rec = self._get(model_id, version)
        rec.stage = "Rolled Back"
        self._log(model_id, "CANARY_FAILED", {"version": version, "reason": reason})
        return rec

    def rollback(self, model_id: str, current: str, target: str, reason: str,
                 integrity: "IntegrityCheck", dry_run: bool = False) -> dict:
        allowed = self.trusted_rollback.get(model_id, [])
        if target not in allowed:
            return {"ok": False, "reason": "rollback target not in allowlist"}
        target_rec = self._get(model_id, target)
        if current == target:
            return {"ok": False, "reason": "same version"}
        if target_rec.stage not in ("Approved for Demonstration", "Active", "Candidate"):
            return {"ok": False, "reason": "target version not validated for rollback"}
        if not integrity.checksum_ok(target_rec):
            return {"ok": False, "reason": "target checksum invalid"}
        if dry_run:
            return {"ok": True, "dry_run": True, "reason": reason, "target": target}
        self._get(model_id, current).stage = "Rolled Back"
        target_rec.stage = "Active"
        self._log(model_id, "ROLLED_BACK", {"from": current, "to": target, "reason": reason, "dry_run": False})
        return {"ok": True, "dry_run": False, "reason": reason, "target": target}

    def _get(self, model_id: str, version: str) -> ModelRecord:
        key = f"{model_id}@{version}"
        if key not in self.models:
            raise KeyError(f"unknown {key}")
        return self.models[key]

    def compatibility(self, model_id: str, version: str, target: str) -> bool:
        rec = self._get(model_id, version)
        return rec.target == target


class IntegrityCheck:
    """Checksum verification against stored expected hash (fixture file)."""

    def __init__(self, expected_hashes: dict[str, str]) -> None:
        self.expected = expected_hashes  # model_id@version -> sha

    def checksum_ok(self, rec: ModelRecord) -> bool:
        expected = self.expected.get(f"{rec.model_id}@{rec.version}")
        return bool(expected) and expected == rec.payload_sha


class ShadowComparator:
    def disagree(self, incumbent_out: float, candidate_out: float, threshold: float) -> bool:
        return abs(incumbent_out - candidate_out) > threshold


def demo_flow(tmp_path: Path | None = None) -> dict:
    """Candidate -> Approved for Demonstration -> Shadow -> Canary -> Active (explicit)."""
    import hashlib

    sha = hashlib.sha256(b"model-v1").hexdigest()
    registry = Registry(trusted_rollback_versions={"m1": ["1.0.0"]})
    integrity = IntegrityCheck({"m1@1.0.0": sha, "m1@1.1.0": hashlib.sha256(b"model-v2").hexdigest()})
    registry.add(ModelRecord("m1", "PRJ-LLS-001", "1.0.0", sha, evidence_links=["ev-1"], target="simulation"))
    registry.add(ModelRecord("m1", "PRJ-LLS-001", "1.1.0", hashlib.sha256(b"model-v2").hexdigest(),
                             evidence_links=["ev-2"], target="simulation", stage="Candidate"))
    registry.approve("m1", "1.1.0", reviewer="demo")
    registry.promote("m1", "1.1.0", "Shadow")
    registry.promote("m1", "1.1.0", "Canary")
    registry.promote("m1", "1.1.0", "Active")
    return {"registry_size": len(registry.models), "stage": registry._get("m1", "1.1.0").stage,
            "audit_events": len(registry.audit)}
