"""Evidence package generation, rendering and integrity verification (week 3).

Layout (zip): one root folder ``evidence-package/`` containing README.md,
manifest.json, checksums.sha256 and per-topic subfolders with ``.md``/``.json``
(and ``.csv`` where relevant). Evidence attachments (real files stored by the
seed) are copied into ``evidence/`` and hashed.

Hash strategy (documented): ``manifest.json`` lists every package file with its
SHA-256, excluding the manifest itself; ``checksums.sha256`` lists hashes for
every file including ``manifest.json`` but not itself. Verification recomputes
hashes from the zip entries.
"""

import csv
import hashlib
import io
import json
import re
import tempfile
import uuid
import zipfile
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.version import TOOL_VERSION
from app.portfolio import DISCLAIMER, PACKAGE_SCHEMA_VERSION, SYNTHETIC_NOTE
from app.portfolio.models import PortfolioPackage, PortfolioProject
from app.portfolio.service import deployment_checklist, serialized_payload

VERIFY_OK = "VALID"
VERIFY_INVALID = "INVALID"
VERIFY_MISSING = "MISSING_FILE"
VERIFY_HASH = "HASH_MISMATCH"
VERIFY_SCHEMA = "UNSUPPORTED_SCHEMA"
VERIFY_ERROR = "VERIFICATION_ERROR"

_ROOT = "evidence-package"
_MD = "text/markdown"
_JSON = "application/json"
_CSV = "text/csv"


def _iso() -> str:
    return datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _safe_version(value: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]", "-", value).strip("-")
    return cleaned or "0.0.0"


def _md(heading: str, body: str) -> str:
    return f"# {heading}\n\n{body.strip()}\n\n> {DISCLAIMER}\n"


def _as_md(block: dict) -> str:
    return "```json\n" + json.dumps(block, indent=2, sort_keys=True) + "\n```\n"


def _kv_table(rows: list[tuple[str, str]]) -> str:
    lines = ["| Field | Value |", "|---|---|"]
    for key, value in rows:
        lines.append(f"| {key} | {value.replace(chr(10), ' ')} |")
    return "\n".join(lines)


# ------------------------------------------------------------------ renderers
def _render_project_summary(data: dict) -> dict[str, str]:
    p = data["project"]
    body = (
        _kv_table(
            [
                ("Project", p["name"]),
                ("Project ID", p["id"]),
                ("Version", p["version"]),
                ("Lifecycle", p["lifecycle_status"]),
                ("Assurance", p["assurance_status"]),
                ("Deployment decision", (data.get("deployment_decision") or {}).get("decision", "none")),
                ("Domain", p["domain"]),
                ("Use case", p["use_case"]),
                ("Criticality", p["criticality"]),
                ("Deployment target", p["deployment_target"]),
                ("Model version", p["model_version"]),
                ("Dataset version", p["dataset_version"]),
                ("Last reviewed", p["last_reviewed_at"] or "Not provided"),
            ]
        )
        + "\n\n## Description\n\n"
        + (p["short_description"] or "")
        + "\n\n"
        + (p["detailed_description"] or "")
        + "\n\n## Synthetic-data declaration\n\nAll content in this Workbench portfolio is synthetic demonstration "
        + "data. "
        + SYNTHETIC_NOTE
    )
    return {
        "project-summary.md": _md("Project Summary", body),
        "project-summary.json": json.dumps(
            {"project": p, "synthetic": True, "disclaimer": DISCLAIMER}, indent=2, sort_keys=True
        ),
    }


def _render_model_card(data: dict) -> dict[str, str]:
    mc = data.get("model_card") or {}
    rows = [(k.replace("_", " ").title(), str(v)) for k, v in mc.items() if k != "version_history"]
    rows.append(("Version history", str(mc.get("version_history", []))))
    body = _kv_table(rows) + "\n\n> Note: for SEU Fault Injector the model card describes the model *subject to "
    "injection*, not the injector. For Lunar Landing Safety Cage, the ML guidance model is described "
    "separately from the deterministic cage.\n"
    return {"model-card.md": _md("Model Card", body), "model-card.json": json.dumps(mc, indent=2, sort_keys=True)}


def _render_data_quality(data: dict) -> dict[str, str]:
    dq = data.get("data_quality") or {}
    body = _kv_table(
        [(k.replace("_", " ").title(), json.dumps(v) if isinstance(v, dict | list) else str(v)) for k, v in dq.items()]
    )
    return {
        "data-quality-report.md": _md("Data Quality Report", body),
        "data-quality-report.json": json.dumps(dq, indent=2, sort_keys=True),
    }


def _render_odd(data: dict) -> dict[str, str]:
    odd = data.get("odd") or {}
    body = _kv_table(
        [(k.replace("_", " ").title(), json.dumps(v) if isinstance(v, dict | list) else str(v)) for k, v in odd.items()]
    )
    return {
        "operational-design-domain.md": _md("Operational Design Domain", body),
        "operational-design-domain.json": json.dumps(odd, indent=2, sort_keys=True),
    }


def _render_requirements(data: dict, csv_rows: list[list[str]]) -> dict[str, str]:
    lines = ["## Requirements", ""]
    for r in data.get("requirements", []):
        lines.append(f"### {r['requirement_id']} — {r['title']} [{r['status']}]")
        lines.append("")
        lines.append(r.get("description", ""))
        lines.append("")
        lines.append(
            f"- Category: {r['category']} | Priority: {r['priority']} | Verification: {r['verification_method']}"
        )
        lines.append(f"- Acceptance: {r.get('acceptance_criteria') or 'Not provided'}")
        cov = r.get("coverage", {})
        lines.append(
            f"- Tests: {', '.join(cov.get('tests', [])) or 'none'} | Evidence: "
            f"{', '.join(cov.get('evidence', [])) or 'none'}"
        )
        lines.append("")
    md = _md("Requirements", "\n".join(lines))
    return {
        "requirements.md": md,
        "requirements.json": json.dumps(data.get("requirements", []), indent=2, sort_keys=True),
        "traceability-matrix.csv": _to_csv(csv_rows),
    }


def _render_test_results(data: dict, passed: list[list[str]], failed: list[list[str]]) -> dict[str, str]:
    tests = data.get("tests", [])
    counts = data.get("coverage", {}).get("verdict_counts", {})
    lines = [
        _kv_table(
            [
                ("Tests defined", str(len(tests))),
                ("PASS", str(counts.get("PASS", 0))),
                ("FAIL", str(counts.get("FAIL", 0))),
                ("BLOCKED", str(counts.get("BLOCKED", 0))),
                ("INCONCLUSIVE", str(counts.get("INCONCLUSIVE", 0))),
                ("NOT_EXECUTED", str(counts.get("NOT_EXECUTED", 0))),
                ("NOT_APPLICABLE", str(counts.get("NOT_APPLICABLE", 0))),
            ]
        ),
        "",
        "A verdict exists only when a Test Result row is recorded. A defined test without a result is never "
        "reported as passed.",
        "",
    ]
    for item in tests:
        case = item["case"]
        res = item.get("result")
        verdict = res["verdict"] if res else "NO_RESULT"
        lines.append(f"### {case['test_id']} — {case['title']} [{verdict}]")
        lines.append("")
        lines.append(f"- Objective: {case.get('objective', '')}")
        lines.append(f"- Requirements: {', '.join(case.get('related_requirement_ids', []))}")
        if res:
            lines.append(
                f"- Environment: {res.get('environment', '')} | Model: {res.get('model_version', '')} | "
                f"Dataset: {res.get('dataset_version', '')}"
            )
            lines.append(f"- Actual: {res.get('actual_result', '')}")
            if res.get("measured_metrics"):
                lines.append(f"- Metrics: {json.dumps(res['measured_metrics'])}")
            if res.get("failure_reason"):
                lines.append(f"- Failure reason: {res['failure_reason']}")
        lines.append("")
    md = _md("Test Results", "\n".join(lines))
    return {
        "test-summary.md": md,
        "test-results.json": json.dumps(tests, indent=2, sort_keys=True),
        "passed-tests.csv": _to_csv(passed),
        "failed-tests.csv": _to_csv(failed),
    }


def _render_fmea(data: dict, csv_rows: list[list[str]]) -> dict[str, str]:
    lines = [
        "",
        SYNTHETIC_NOTE,
        "",
        "This FMEA is a synthetic engineering example requiring project-specific "
        "review; it is not approved by a safety engineer.",
        "",
    ]
    for item in data.get("fmea", []):
        lines.append(f"### {item['fmea_item_id']} — {item['failure_mode']}")
        lines.append("")
        lines.append(f"- Function: {item['function']}")
        lines.append(f"- Cause: {item.get('possible_cause', '')} | Detection: {item.get('detection_method', '')}")
        lines.append(f"- Control: {item.get('existing_control', '')} | Residual risk: {item.get('residual_risk', '')}")
        lines.append(
            f"- Tests: {', '.join(item.get('related_test_ids', []))} | Evidence: "
            f"{', '.join(item.get('evidence_ids', []))}"
        )
        lines.append("")
    return {
        "fmea.md": _md("FMEA", "\n".join(lines)),
        "fmea.json": json.dumps(data.get("fmea", []), indent=2, sort_keys=True),
        "fmea.csv": _to_csv(csv_rows),
    }


def _render_risks(data: dict) -> dict[str, str]:
    lines: list[str] = []
    for risk in data.get("risks", []):
        lines.append(f"### {risk['risk_id']} — {risk['title']} [{risk['acceptance_status']}]")
        lines.append("")
        lines.append(
            _kv_table(
                [
                    (
                        "Initial",
                        f"S{risk['initial_severity']} L{risk['initial_likelihood']} -> {risk['initial_risk_level']}",
                    ),
                    (
                        "Residual",
                        f"S{risk['residual_severity']} L{risk['residual_likelihood']} -> {risk['residual_risk_level']}",
                    ),
                    ("Mitigation", risk.get("mitigation", "")),
                    ("Acceptance rationale", risk.get("acceptance_rationale", "")),
                    ("Owner", risk.get("owner", "")),
                    ("Review date", risk.get("review_date", "")),
                    ("Related requirements", ", ".join(risk.get("related_requirement_ids", []))),
                ]
            )
        )
        lines.append("")
    return {
        "residual-risks.md": _md("Residual Risks", "\n".join(lines) or "No risks registered."),
        "residual-risks.json": json.dumps(data.get("risks", []), indent=2, sort_keys=True),
    }


def _render_deployment(data: dict) -> dict[str, str]:
    decision = data.get("deployment_decision") or {}
    checklist = "\n".join(
        f"- [{'x' if c['satisfied'] else ' '}] {c['check']} — {c['note']}" for c in data["deployment_checklist"]
    )
    body = (
        _kv_table(
            [
                ("Decision", decision.get("decision", "none")),
                ("Date", decision.get("decision_date", "")),
                ("Project version", decision.get("project_version", "")),
                ("Model version", decision.get("model_version", "")),
                ("Dataset version", decision.get("dataset_version", "")),
                ("Approver", decision.get("approver", "")),
                ("Review status", decision.get("review_status", "")),
            ]
        )
        + "\n\n## Summary\n\n"
        + decision.get("decision_summary", "")
        + "\n\n## Rationale\n\n"
        + decision.get("rationale", "")
        + "\n\n## Blocking findings\n\n"
        + "\n".join(f"- {b}" for b in decision.get("blocking_findings", []))
        or "none" + "\n\n## Accepted risks\n\n" + "\n".join(f"- {r}" for r in decision.get("accepted_risks", []))
        or "none"
        + "\n\n## Required mitigations\n\n"
        + "\n".join(f"- {m}" for m in decision.get("required_mitigations", []))
        or "none"
        + "\n\n## Operational constraints\n\n"
        + "\n".join(f"- {c}" for c in decision.get("operational_constraints", []))
        or "none"
        + "\n\n## Rollback strategy\n\n"
        + (decision.get("rollback_strategy") or "Not provided")
        + "\n\n## Reviewer checklist (informational, non-binding)\n\n"
        + checklist
    )
    return {
        "deployment-report.md": _md("Deployment Report", body),
        "deployment-report.json": json.dumps(decision, indent=2, sort_keys=True),
    }


def _render_monitoring(data: dict) -> dict[str, str]:
    mon = data.get("monitoring") or {}
    body = _kv_table(
        [(k.replace("_", " ").title(), json.dumps(v) if isinstance(v, dict | list) else str(v)) for k, v in mon.items()]
    )
    return {
        "monitoring-strategy.md": _md("Monitoring Strategy", body),
        "monitoring-strategy.json": json.dumps(mon, indent=2, sort_keys=True),
    }


def _render_limitations(data: dict) -> dict[str, str]:
    lines = []
    for lim in data.get("limitations", []):
        lines.append(f"### {lim['limitation_id']} — {lim['title']} [{lim['status']}]")
        lines.append("")
        lines.append(f"- Scope: {lim.get('affected_scope', '')} | Severity: {lim.get('severity', '')}")
        lines.append(f"- Impact: {lim.get('impact', '')}")
        lines.append(f"- Workaround: {lim.get('workaround', '') or 'None'}")
        lines.append(f"- Operational constraint: {lim.get('operational_constraint', '') or 'None'}")
        lines.append("")
    return {
        "known-limitations.md": _md("Known Limitations", "\n".join(lines) or "No limitations registered."),
        "known-limitations.json": json.dumps(data.get("limitations", []), indent=2, sort_keys=True),
    }


def _to_csv(rows: list[list[str]]) -> str:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerows(rows)
    return buffer.getvalue()


# ------------------------------------------------------------------ assembly
# ------------------------------------------------------------------ assembly
def _evidence_file_rows(data: dict) -> dict[str, tuple[str, str]]:
    """Return {zip_rel_path: (abs_path_on_disk, sha256)} for stored attachments."""
    found: dict[str, tuple[str, str]] = {}
    for ev in data.get("evidence", []):
        ref = ev.get("file_reference")
        if not ref:
            continue
        name = Path(ref).name
        rel = f"evidence/{name}"
        if name != ref:
            ev["_manifest_note"] = "stored under safe server-generated name"
        found[rel] = (ev.get("file_reference", ""), ev.get("content_hash", ""))
    return found


def generate_package(db: Session, project: PortfolioProject, settings: Settings) -> PortfolioPackage:
    """Generate an immutable package version. Never overwrites previous packages."""
    payload = serialized_payload(db, project)
    payload["deployment_checklist"] = deployment_checklist(db, project.id)
    evidence_dir = settings.storage_dir / "portfolio" / "evidence" / project.slug

    # ---- build documents (deterministic for same data)
    docs: dict[str, str] = {}
    for renderer, folder in (
        (_render_project_summary, "project-summary"),
        (_render_model_card, "model-card"),
        (_render_data_quality, "data-quality"),
        (_render_odd, "odd"),
    ):
        for name, content in renderer(payload).items():
            docs[f"{folder}/{name}"] = content

    trace = payload["traceability"]
    trace_csv = [["requirement_id", "requirement", "status", "test_id", "verdict", "evidence_ids", "risk_ids"]]
    for row in trace:
        trace_csv.append(
            [
                row["requirement_id"],
                row["requirement_title"],
                row["status"],
                row.get("test_id", ""),
                row.get("verdict", ""),
                ";".join(row.get("evidence_ids", [])),
                ";".join(row.get("risk_ids", [])),
            ]
        )
    docs.update({f"requirements/{k}": v for k, v in _render_requirements(payload, trace_csv).items()})

    passed_csv = [["test_id", "title", "run_id", "environment", "verdict"]]
    failed_csv = [["test_id", "title", "run_id", "verdict", "failure_reason"]]
    for item in payload["tests"]:
        case, res = item["case"], item.get("result")
        verdict = res["verdict"] if res else "NO_RESULT"
        run = res["test_run_id"] if res else ""
        row = [case["test_id"], case["title"], run, (res or {}).get("environment", ""), verdict]
        if verdict == "PASS":
            passed_csv.append(row)
        elif verdict == "FAIL":
            failed_csv.append([case["test_id"], case["title"], run, verdict, (res or {}).get("failure_reason", "")])
    docs.update({f"test-results/{k}": v for k, v in _render_test_results(payload, passed_csv, failed_csv).items()})

    fmea_csv = [
        [
            "fmea_item_id",
            "function",
            "failure_mode",
            "severity",
            "occurrence",
            "detectability",
            "residual_risk",
            "related_tests",
            "related_evidence",
        ]
    ]
    for item in payload["fmea"]:
        fmea_csv.append(
            [
                item["fmea_item_id"],
                item["function"],
                item["failure_mode"],
                str(item["severity"]),
                str(item["occurrence"]),
                str(item["detectability"]),
                item["residual_risk"],
                ";".join(item.get("related_test_ids", [])),
                ";".join(item.get("evidence_ids", [])),
            ]
        )
    docs.update({f"fmea/{k}": v for k, v in _render_fmea(payload, fmea_csv).items()})
    docs.update({f"risks/{k}": v for k, v in _render_risks(payload).items()})
    docs.update({f"deployment/{k}": v for k, v in _render_deployment(payload).items()})
    docs.update({f"monitoring/{k}": v for k, v in _render_monitoring(payload).items()})
    docs.update({f"limitations/{k}": v for k, v in _render_limitations(payload).items()})

    # ---- evidence attachments present on disk (path traversal guarded: basename only)
    attachment_sources: dict[str, Path] = {}
    for ev in payload["evidence"]:
        ref = ev.get("file_reference")
        if not ref:
            continue
        disk = evidence_dir / Path(ref).name
        if disk.exists():
            attachment_sources[f"evidence/{disk.name}"] = disk
    docs["README.md"] = _readme(project)

    docs["evidence/_index.json"] = json.dumps(
        [e for e in payload["evidence"] if e.get("file_reference")], indent=2, sort_keys=True
    )

    package_id = f"PKG-{uuid.uuid4().hex}"
    generated_iso = _now_iso()
    count = db.query(PortfolioPackage).filter(PortfolioPackage.project_id == project.id).count()

    # hashes for all doc files (manifest excluded from itself)
    file_entries: list[dict] = []
    for path, content in sorted(docs.items()):
        digest = hashlib.sha256(content.encode("utf-8")).hexdigest()
        file_entries.append(
            {"path": path, "media_type": _media_type(path), "size_bytes": len(content.encode()), "sha256": digest}
        )

    # evidence files copied into zip (read + hash)
    ev_entries: list[dict] = []
    for rel, disk in sorted(attachment_sources.items()):
        if rel in docs:
            continue
        raw = disk.read_bytes()
        ev_entries.append(
            {
                "path": rel,
                "media_type": _media_type(rel),
                "size_bytes": len(raw),
                "sha256": hashlib.sha256(raw).hexdigest(),
            }
        )

    all_files = [*file_entries, *ev_entries]
    manifest = {
        "package_id": package_id,
        "package_schema_version": PACKAGE_SCHEMA_VERSION,
        "package_version": count + 1,
        "generated_at": generated_iso,
        "generated_by": "workbench-week3",
        "workbench_version": TOOL_VERSION,
        "project": {"id": project.id, "name": project.name, "version": project.version},
        "model_version": project.model_version,
        "dataset_version": project.dataset_version,
        "deployment_decision": (payload.get("deployment_decision") or {}).get("decision", "none"),
        "document_list": [f["path"] for f in file_entries],
        "evidence_list": [f["path"] for f in ev_entries],
        "files": all_files,
        "disclaimer": DISCLAIMER,
        "known_limitations": payload.get("limitations", []),
        "snapshot_status": "FINAL",
        "hash_strategy": "manifest hashes all package files except manifest.json itself; checksums.sha256 "
        "hashes all files including manifest.json but not itself.",
    }

    checksums_lines = [f"{f['sha256']}  {f['path']}" for f in all_files]
    checksums_lines.append(
        f"{hashlib.sha256(json.dumps(manifest, sort_keys=True).encode()).hexdigest()}  manifest.json"
    )
    docs["manifest.json"] = json.dumps(manifest, indent=2, sort_keys=True)
    docs["checksums.sha256"] = "\n".join(sorted(checksums_lines)) + "\n"

    # atomic write: build zip in a temp dir then move into storage.
    # Filename carries the project version and a timestamp; if a same-second
    # generation already exists a numeric suffix is appended (never overwritten).
    final_dir = settings.storage_dir / "portfolio" / "packages"
    final_dir.mkdir(parents=True, exist_ok=True)
    base = f"{project.slug}_evidence-package_{_safe_version(project.version)}_{_iso()}"
    filename = f"{base}.zip"
    suffix = 2
    while (final_dir / filename).exists():
        filename = f"{base}-{suffix}.zip"
        suffix += 1
    temp_dir = Path(tempfile.mkdtemp(prefix="pkg_", dir=str(settings.storage_dir / "portfolio")))
    try:
        zip_path = temp_dir / filename
        with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            for rel, content in sorted(docs.items()):
                archive.writestr(f"{_ROOT}/{rel}", content)
            for rel, disk in sorted(attachment_sources.items()):
                if rel in docs:
                    continue
                archive.write(disk, arcname=f"{_ROOT}/{rel}")
        final_path = final_dir / filename
        zip_path.replace(final_path)
    finally:
        import shutil

        shutil.rmtree(temp_dir, ignore_errors=True)

    package = PortfolioPackage(
        id=f"PKG-{uuid.uuid4().hex}",
        project_id=project.id,
        package_version=count + 1,
        package_schema_version=PACKAGE_SCHEMA_VERSION,
        filename=filename,
        size_bytes=final_path.stat().st_size,
        document_list=[f["path"] for f in all_files],
        evidence_list=[f["path"] for f in ev_entries],
        manifest=manifest,
        snapshot_status="FINAL",
    )
    db.add(package)
    db.commit()
    db.refresh(package)
    return package


def _media_type(path: str) -> str:
    if path.endswith(".json"):
        return _JSON
    if path.endswith(".csv"):
        return _CSV
    if path.endswith(".md"):
        return _MD
    return "application/octet-stream"


def _readme(project: PortfolioProject) -> str:
    return (
        _md(
            "Evidence Package",
            f"""This evidence package was generated by the ECSS-informed ML Assurance
Workbench for **{project.name}** ({project.id}).

{
                _kv_table(
                    [
                        ("Project version", project.version),
                        ("Model version", project.model_version),
                        ("Dataset version", project.dataset_version),
                        ("Synthetic content", "Yes — demonstration data; no mission data"),
                        ("Certification", "None — this Workbench does not provide ECSS certification"),
                    ]
                )
            }

Inspect `manifest.json` for the file list with SHA-256 hashes and verify with
`sha256sum -c checksums.sha256`.""",
        )
        + "\n"
    )


def _package_path(settings: Settings, package: PortfolioPackage) -> Path:
    path = (settings.storage_dir / "portfolio" / "packages" / package.filename).resolve()
    base = (settings.storage_dir / "portfolio" / "packages").resolve()
    if base not in path.parents:
        raise ValueError("unsafe package path")
    return path


def verify_package_file(settings: Settings, package: PortfolioPackage) -> dict:
    """Verify a stored package zip against the authoritative DB snapshot (see module docstring)."""
    try:
        path = _package_path(settings, package)
        if not path.exists():
            return {"status": VERIFY_MISSING, "detail": "package file missing on disk"}
        snapshot = package.manifest or {}
        expected = {f["path"]: f["sha256"] for f in snapshot.get("files", []) if "sha256" in f}
        return _verify_zip(path, expected, snapshot.get("package_id"))
    except Exception as exc:
        return {"status": VERIFY_ERROR, "detail": f"{exc.__class__.__name__}: {exc}"}


def _verify_zip(path: Path, expected: dict[str, str], expected_package_id: str | None) -> dict:
    try:
        with zipfile.ZipFile(path) as archive:
            members = [m for m in archive.namelist() if not m.endswith("/")]
            root = members[0].split("/")[0] if members else ""
            if not root or any(not m.startswith(root + "/") for m in members):
                return {"status": VERIFY_INVALID, "detail": "zip layout invalid (no single root)"}
            if f"{root}/manifest.json" not in members:
                return {"status": VERIFY_INVALID, "detail": "manifest.json missing"}
            if f"{root}/checksums.sha256" not in members:
                return {"status": VERIFY_MISSING, "detail": "checksums.sha256 missing"}
            manifest = json.loads(archive.read(f"{root}/manifest.json"))
            if manifest.get("package_schema_version") != PACKAGE_SCHEMA_VERSION:
                return {"status": VERIFY_SCHEMA, "detail": "unsupported schema version"}
            if expected_package_id and manifest.get("package_id") != expected_package_id:
                return {"status": VERIFY_INVALID, "detail": "manifest package_id does not match snapshot"}
            present = {m[len(root) + 1 :]: m for m in members if m != f"{root}/checksums.sha256"}
            for rel in expected:
                if rel not in present:
                    return {"status": VERIFY_MISSING, "detail": f"{rel} missing in zip"}
            for rel, sha in expected.items():
                actual = hashlib.sha256(archive.read(present[rel])).hexdigest()
                if actual != sha:
                    return {"status": VERIFY_HASH, "detail": f"hash mismatch for {rel}"}
            if not expected:
                return {"status": VERIFY_INVALID, "detail": "no authoritative file snapshot in database"}
            # checksums file covers manifest + all manifest files
            checksum_text = archive.read(f"{root}/checksums.sha256").decode()
            manifest_rel = "manifest.json"
            lines = [ln for ln in checksum_text.splitlines() if ln.strip()]
            if not any(ln.endswith("  " + manifest_rel) for ln in lines):
                return {"status": VERIFY_INVALID, "detail": "checksums.sha256 does not cover manifest.json"}
            return {"status": VERIFY_OK, "detail": "all files present and hashes valid"}
    except zipfile.BadZipFile:
        return {"status": VERIFY_INVALID, "detail": "not a valid zip archive"}
    except Exception as exc:
        return {"status": VERIFY_ERROR, "detail": f"{exc.__class__.__name__}: {exc}"}


def package_zip_bytes(settings: Settings, package: PortfolioPackage) -> bytes:
    return _package_path(settings, package).read_bytes()
