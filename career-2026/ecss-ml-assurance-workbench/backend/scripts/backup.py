"""Backup / restore / verify for the Workbench (local, under /career-2026).

- `backup` creates <root>/release/backup-<stamp>.zip containing the storage
  directory (SQLite + packages + evidence) plus a backup-manifest.json with
  per-file checksums and restore instructions.
- `verify-backup` checks archive integrity and manifest hashes.
- `restore --to <tempdir>` restores into an isolated directory (no destructive
  restore onto the live storage) and runs a smoke check via sqlite counts.
"""
import argparse
import hashlib
import io
import json
import shutil
import sqlite3
import sys
import tempfile
import zipfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]  # workbench root (under /career-2026)
STORAGE = ROOT / "backend" / "storage"
RELEASE = ROOT / "release"
APP_VERSION = "1.0.0-rc.1"


def _stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _collect_files() -> list[Path]:
    return sorted([p for p in STORAGE.rglob("*") if p.is_file()])


def create_backup() -> Path:
    RELEASE.mkdir(parents=True, exist_ok=True)
    stamp = _stamp()
    archive_path = RELEASE / f"backup-{stamp}.zip"
    files = _collect_files()
    manifest = {
        "backup_id": f"BK-{stamp}",
        "app_version": APP_VERSION,
        "schema_version": "1.0.0",
        "created_utc": datetime.now(timezone.utc).isoformat(),
        "files": [
            {"path": str(p.relative_to(STORAGE)), "size_bytes": p.stat().st_size,
             "sha256": _sha256(p.read_bytes())}
            for p in files
        ],
        "restore_instructions": "python3 backend/scripts/backup.py restore --archive <file> --to <tempdir>",
    }
    with zipfile.ZipFile(archive_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for p in files:
            zf.write(p, arcname=f"storage/{p.relative_to(STORAGE)}")
        zf.writestr("backup-manifest.json", json.dumps(manifest, indent=2, sort_keys=True))
    return archive_path


def verify_backup(archive: Path) -> dict:
    errors: list[str] = []
    files_checked = 0
    with zipfile.ZipFile(archive) as zf:
        manifest = json.loads(zf.read("backup-manifest.json"))
        for entry in manifest["files"]:
            member = f"storage/{entry['path']}"
            if member not in zf.namelist():
                errors.append(f"missing member {member}")
                continue
            actual = _sha256(zf.read(member))
            if actual != entry["sha256"]:
                errors.append(f"hash mismatch {member}")
            files_checked += 1
    return {"verified": not errors, "files_checked": files_checked, "errors": errors}


def restore(archive: Path, target: Path) -> dict:
    target.mkdir(parents=True, exist_ok=True)
    storage_target = target / "storage"
    with zipfile.ZipFile(archive) as zf:
        for member in zf.namelist():
            if member.startswith("storage/"):
                dest = storage_target / Path(member).relative_to("storage")
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_bytes(zf.read(member))
        manifest = json.loads(zf.read("backup-manifest.json"))
    # smoke check on restored sqlite
    dbs = list((storage_target / "workbench.db").resolve().parent.rglob("workbench.db"))
    result = {"restored_files": len(list(storage_target.rglob("*"))), "projects": None, "manifest": manifest["backup_id"]}
    if dbs:
        con = sqlite3.connect(dbs[0])
        try:
            row = con.execute("SELECT COUNT(*) FROM portfolio_projects").fetchone()
            result["projects"] = row[0] if row else 0
        except sqlite3.Error:
            result["projects"] = "error"
        finally:
            con.close()
    return result


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Workbench backup / restore / verify")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("backup")
    verify = sub.add_parser("verify")
    verify.add_argument("--archive", type=Path)
    restore_p = sub.add_parser("restore")
    restore_p.add_argument("--archive", type=Path)
    restore_p.add_argument("--to", type=Path)
    args = parser.parse_args(argv)

    if args.command == "backup":
        path = create_backup()
        print(f"backup created: {path}")
        return 0
    if args.command == "verify":
        if not args.archive:
            parser.error("--archive required")
        report = verify_backup(args.archive)
        print(json.dumps(report, indent=2))
        return 0 if report["verified"] else 1
    if args.command == "restore":
        if not args.archive or not args.to:
            parser.error("--archive and --to required")
        result = restore(args.archive, args.to)
        print(json.dumps(result, indent=2))
        return 0 if result["projects"] == 4 else 1
    return 2


if __name__ == "__main__":
    sys.exit(main())
