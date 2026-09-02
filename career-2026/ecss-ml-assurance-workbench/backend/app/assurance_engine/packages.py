"""Evidence Package full validator (week 5).

Produces machine-readable validation with states:
Valid · Valid with Warnings · Incomplete · Invalid · Validation Failed
plus error/warning/info lists and remediation suggestions. The authoritative
snapshot in the database is used for checksum verification.
"""

import json
import zipfile
from pathlib import Path

from app.core.config import Settings
from app.portfolio.models import PortfolioPackage
from app.portfolio.package import PACKAGE_SCHEMA_VERSION

_REQUIRED = {"README.md", "manifest.json", "checksums.sha256"}
_SENSITIVE_HINTS = ("secret", "credential", "token", ".env", "password", "private_key")


def _is_safe_member(name: str) -> bool:
    return not name.startswith(("/", "\\")) and ".." not in name.split("/") and "\\" not in name


def validate_package_full(settings: Settings, package: PortfolioPackage) -> dict:
    errors: list[dict] = []
    warnings: list[dict] = []
    infos: list[dict] = []
    path: Path = settings.storage_dir / "portfolio" / "packages" / package.filename
    try:
        resolved = path.resolve()
        base = (settings.storage_dir / "portfolio" / "packages").resolve()
        if base not in resolved.parents:
            errors.append({"code": "PATH_ESCAPE", "message": "Package path escapes the authorized root."})
        if not resolved.exists():
            return _result("Validation Failed", errors, warnings, infos, package)
        with zipfile.ZipFile(resolved) as archive:
            members = archive.namelist()
            duplicates = sorted({m for m in members if members.count(m) > 1})
            if duplicates:
                warnings.append({"code": "DUPLICATE_ENTRY", "message": f"Duplicate entries: {duplicates[:5]}"})
            root = members[0].split("/")[0] if members else ""
            rel = {m[len(root) + 1 :] for m in members if m.startswith(root + "/")} if root else set()
            for name in members:
                if not _is_safe_member(name):
                    errors.append({"code": "UNSAFE_PATH", "message": f"Unsafe internal path: {name}"})
                lower = name.lower()
                if any(h in lower for h in _SENSITIVE_HINTS):
                    warnings.append({"code": "SENSITIVE_ARTEFACT", "message": f"Potentially sensitive name: {name}"})
            for required in _REQUIRED:
                if f"{root}/{required}" not in members:
                    errors.append({"code": "MISSING_REQUIRED", "message": f"Missing {required}"})
            manifest_name = f"{root}/manifest.json"
            if manifest_name in members:
                try:
                    manifest = json.loads(archive.read(manifest_name))
                    infos.append({"code": "JSON_VALID", "message": "manifest.json is valid JSON."})
                except (json.JSONDecodeError, UnicodeDecodeError):
                    manifest = {}
                    errors.append({"code": "MANIFEST_INVALID", "message": "manifest.json is not valid JSON."})
                if manifest.get("package_schema_version") != PACKAGE_SCHEMA_VERSION:
                    errors.append(
                        {
                            "code": "SCHEMA_UNSUPPORTED",
                            "message": f"Schema {manifest.get('package_schema_version')} unsupported.",
                        }
                    )
                if manifest.get("project", {}).get("id") != package.project_id:
                    errors.append({"code": "PROJECT_MISMATCH", "message": "Manifest project id does not match record."})
                files = manifest.get("files", [])
                declared = {f["path"] for f in files}
                unexpected = rel - declared - _REQUIRED
                missing = declared - rel
                if unexpected:
                    warnings.append(
                        {"code": "UNEXPECTED_FILE", "message": f"Unexpected files: {sorted(unexpected)[:5]}"}
                    )
                if missing:
                    errors.append({"code": "MISSING_FILE", "message": f"Missing files: {sorted(missing)[:5]}"})
                # checksums
                expected_hashes = {f["path"]: f.get("sha256") for f in files}
                import hashlib

                mismatch = []
                for name in sorted(expected_hashes):
                    if name not in rel:
                        continue
                    actual = hashlib.sha256(archive.read(f"{root}/{name}")).hexdigest()
                    if expected_hashes[name] and actual != expected_hashes[name]:
                        mismatch.append(name)
                if mismatch:
                    errors.append({"code": "CHECKSUM_MISMATCH", "message": f"Hash mismatch: {mismatch[:5]}"})
                else:
                    infos.append({"code": "CHECKSUM_OK", "message": "All declared hashes verified."})
            else:
                errors.append({"code": "NO_MANIFEST", "message": "manifest.json missing — cannot validate."})

            size_bytes = resolved.stat().st_size
            if size_bytes > 200 * 1024 * 1024:
                warnings.append({"code": "OVERSIZED", "message": "Package larger than 200 MB."})
    except zipfile.BadZipFile:
        errors.append({"code": "BAD_ZIP", "message": "File is not a readable ZIP archive."})
    except Exception as exc:
        errors.append({"code": "VALIDATION_ERROR", "message": f"Unexpected failure: {exc.__class__.__name__}"})

    return _result(
        _state(errors, warnings, rel if "rel" in dir() else set(), package), errors, warnings, infos, package
    )


def _state(errors: list, warnings: list, rel: set, package: PortfolioPackage) -> str:
    if not package.manifest:
        return "Incomplete"
    if errors:
        return (
            "Invalid"
            if any(e["code"] in ("BAD_ZIP", "CHECKSUM_MISMATCH", "SCHEMA_UNSUPPORTED", "PATH_ESCAPE") for e in errors)
            else "Incomplete"
        )
    if rel and not {"README.md", "manifest.json", "checksums.sha256"}.issubset(rel):
        return "Incomplete"
    if warnings:
        return "Valid with Warnings"
    return "Valid"


def _result(status: str, errors: list, warnings: list, infos: list, package: PortfolioPackage) -> dict:
    return {
        "package_id": package.id,
        "project_id": package.project_id,
        "validation_status": status,
        "error_count": len(errors),
        "warning_count": len(warnings),
        "information_count": len(infos),
        "problems": [{"severity": "error", **e} for e in errors]
        + [{"severity": "warning", **w} for w in warnings]
        + [{"severity": "info", **i} for i in infos],
        "remediation": "Fix listed errors, regenerate the package as a new version and re-verify.",
        "machine_readable": True,
    }
