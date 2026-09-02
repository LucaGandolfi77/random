"""AI Assurance Crosswalk Engine (engineering aid only).

Maps framework controls (ECSS-informed, EASA, NIST AI RMF, EU AI Act technical
docs, internal policies) to Workbench artefacts (requirements, evidence, risks,
tests, documents, claims) with explicit mapping kinds and applicability states.
No legal advice; no automatic conformity; source version/date carried per
control.
"""
from __future__ import annotations

import csv
import io
import json
from dataclasses import dataclass, field

MAPPING = ("Exact", "Partial", "Supporting", "Related", "No Direct Mapping", "Human Review Required")
APP = ("Applicable", "Not Applicable", "Applicability Pending",
       "Implemented", "Partially Implemented", "Not Implemented",
       "Evidence Available", "Evidence Missing", "Review Required")

DISCLAIMER = ("This crosswalk is an engineering aid and does not constitute a legal assessment, "
              "conformity assessment, certification, or proof of compliance.")


@dataclass
class Control:
    control_id: str
    framework: str
    framework_version: str
    reference: str
    title: str
    objective: str
    source_date: str = ""
    applicability: str = "Applicability Pending"
    rationale: str = ""
    expected_evidence: str = ""
    artefact: str = ""
    implementation_status: str = "Not Implemented"
    evidence_status: str = "Evidence Missing"
    reviewer: str = ""
    notes: str = ""
    superseded_by: str = ""


@dataclass
class Mapping:
    control_id: str
    artefact_id: str
    artefact_kind: str     # requirement | evidence | risk | test | document | claim
    kind: str = "Related"
    note: str = ""


class CrosswalkEngine:
    def __init__(self, registry: dict[str, dict] | None = None) -> None:
        self.controls: dict[str, Control] = {}
        self.mappings: list[Mapping] = []
        self.registry = registry or {}   # framework -> {"version": ..., "date": ...}

    def add_control(self, c: Control) -> None:
        if c.control_id in self.controls:
            raise ValueError(f"duplicate control {c.control_id}")
        self.controls[c.control_id] = c

    def add_mapping(self, m: Mapping) -> None:
        if m.control_id not in self.controls:
            raise ValueError(f"mapping to unknown control {m.control_id}")
        if m.kind not in MAPPING:
            raise ValueError(f"invalid mapping kind {m.kind}")
        if m.kind != "No Direct Mapping" and not m.artefact_id:
            raise ValueError("mapping requires an artefact id")
        self.mappings.append(m)

    def supersede(self, control_id: str, new_id: str) -> None:
        self.controls[control_id].superseded_by = new_id
        self.controls[control_id].framework_version = self.controls[control_id].framework_version + "-superseded"

    def applicability_report(self) -> list[dict]:
        return [{"control_id": c.control_id, "framework": c.framework, "applicability": c.applicability,
                 "rationale": c.rationale, "superseded_by": c.superseded_by}
                for c in self.controls.values()]

    def crosswalk_matrix(self, artefact_ids: list[str] | None = None) -> list[dict]:
        rows = []
        for m in self.mappings:
            if artefact_ids and m.artefact_id not in artefact_ids:
                continue
            rows.append({"control_id": m.control_id, "artefact_id": m.artefact_id,
                         "artefact_kind": m.artefact_kind, "kind": m.kind, "note": m.note})
        return rows

    def gap_report(self) -> list[dict]:
        out = []
        for c in self.controls.values():
            mapped = [m for m in self.mappings if m.control_id == c.control_id and m.kind != "No Direct Mapping"]
            evidence_available = c.evidence_status == "Evidence Available"
            out.append({
                "control_id": c.control_id, "framework": c.framework,
                "implementation_status": c.implementation_status,
                "evidence_status": c.evidence_status,
                "artefact_mappings": len(mapped),
                "gap": c.applicability == "Applicable" and (not mapped or not evidence_available),
                "reviewer": c.reviewer,
            })
        return out

    def export_json(self, path) -> None:
        payload = {
            "disclaimer": DISCLAIMER,
            "frameworks": self.registry,
            "controls": [vars(c) for c in self.controls.values()],
            "mappings": [vars(m) for m in self.mappings],
        }
        path.write_text(json.dumps(payload, indent=2, sort_keys=True))

    def export_matrix_csv(self, path) -> None:
        rows = self.crosswalk_matrix()
        header = ["control_id", "artefact_id", "artefact_kind", "kind", "note"]
        with path.open("w", newline="", encoding="utf-8") as fh:
            writer = csv.DictWriter(fh, fieldnames=header)
            writer.writeheader()
            for r in rows:
                writer.writerow({k: r.get(k, "") for k in header})

    def profile_comparison(self, target_profile: dict[str, str]) -> list[dict]:
        """target_profile maps control_id -> target status; compare current vs target."""
        out = []
        for cid, target in target_profile.items():
            current = self.controls.get(cid)
            out.append({
                "control_id": cid,
                "target_status": target,
                "current_implementation": current.implementation_status if current else "Unknown",
                "match": bool(current and current.implementation_status == target),
            })
        return out
