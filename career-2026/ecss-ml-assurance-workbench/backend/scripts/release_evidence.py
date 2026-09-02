"""Generate release evidence: manifest + checksums + portability export (local)."""
import hashlib
import io
import json
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RELEASE = ROOT / "release"
VERSION = "1.0.0-rc.1"


def main() -> int:
    RELEASE.mkdir(parents=True, exist_ok=True)
    qg_path = RELEASE / "quality-gate-report.json"
    qg = json.loads(qg_path.read_text()) if qg_path.exists() else {"final_verdict": "INCOMPLETE"}
    manifest = {
        "release_version": VERSION,
        "release_type": "rc",
        "build_timestamp": datetime.now(timezone.utc).isoformat(),
        "source_commit": "local (not committed)",
        "frontend_version": VERSION, "backend_version": VERSION,
        "content_version": "portfolio-v1", "database_schema_version": "portfolio-tables",
        "included_projects": ["PRJ-TAD-001", "PRJ-QNT-001", "PRJ-SEU-001", "PRJ-LLS-001"],
        "quality_gate_verdict": qg.get("final_verdict"),
        "known_limitations_ref": "docs/known-limitations.md",
        "security_review_ref": "docs/SECURITY_REVIEW.md",
        "release_decision": "RELEASE_WITH_LIMITATIONS" if qg.get("final_verdict") in ("PASS", "PASS_WITH_WARNINGS") else "HOLD",
        "note": "RC.1 engineering release; not certified; demo data synthetic.",
    }
    (RELEASE / "release-manifest.json").write_text(json.dumps(manifest, indent=2, sort_keys=True))

    # portability export
    export = io.BytesIO()
    with zipfile.ZipFile(export, "w", zipfile.ZIP_DEFLATED) as zf:
        for name in ["quality-gate-report.json", "quality-gate-report.md", "release-manifest.json"]:
            path = RELEASE / name
            if path.exists():
                zf.write(path, arcname=f"release/{name}")
        zf.writestr("export/manifest.json", json.dumps({"schema_version": "1.0", "release": VERSION}, indent=2))
    export_path = RELEASE / f"career-2026-workbench-export_{VERSION}.zip"
    export_path.write_bytes(export.getvalue())

    # checksums over release files
    lines = []
    for path in sorted(RELEASE.glob("*.json")) + sorted(RELEASE.glob("*.zip")) + sorted(RELEASE.glob("*.md")):
        if path.name == "checksums.sha256":
            continue
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        lines.append(f"{digest}  {path.name}")
    (RELEASE / "checksums.sha256").write_text("\n".join(lines) + "\n")
    print(json.dumps({"release_decision": manifest["release_decision"], "files": len(lines)}, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
