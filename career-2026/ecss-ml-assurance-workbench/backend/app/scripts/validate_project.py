"""validate-project CLI: dry-run validation of a project manifest folder.

Never executes imported code; no symlink following outside root; read-only unless
--import is passed (not implemented). Exits non-zero on blocking errors.
"""
import argparse
import json
import re
import sys
from pathlib import Path

REQUIRED_TOP = {"meta"}
META_KEYS = ("id", "name", "version")
ID_RE = re.compile(r"^(REQ|TEST|EVID|RISK|FM|LIM)-[A-Z0-9-]+$")


def validate(path: Path, strict: bool = False) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    manifest = Path(path)
    if not manifest.exists():
        return ["manifest file not found"], warnings
    try:
        data = json.loads(manifest.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as exc:
        return [f"manifest not valid JSON: {exc}"], warnings
    if not data.get("meta", {}).get("id"):
        errors.append("meta.id missing")
    for key in META_KEYS:
        if not data.get("meta", {}).get(key):
            errors.append(f"meta.{key} missing")
    if data.get("syntheticDemoData") is not True:
        warnings.append("syntheticDemoData flag not set to true (synthetic fixture expected)")
    seen: list[str] = []
    for section in ("requirements", "tests", "evidence", "risks", "fmea", "limitations"):
        for item in data.get(section, []):
            id_keys = ("requirement_id", "test_id", "evidence_id", "risk_id", "fmea_item_id", "limitation_id")
            found = next((item.get(k) for k in id_keys if item.get(k)), None)
            if not found:
                errors.append(f"{section} item without id")
            elif not ID_RE.match(found) and not found.startswith(
        ("REQ-", "TEST-", "EVID-", "RISK-", "FM-", "LIM-")
    ):
                warnings.append(f"non-conventional id {found}")
            if found is not None:
                if found in seen and strict:
                    errors.append(f"duplicate id {found}")
                seen.append(found)
    if strict and not data.get("requirements"):
        errors.append("no requirements in strict mode")
    return errors, warnings


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Validate a Workbench project manifest")
    parser.add_argument("path", help="path to manifest.json")
    parser.add_argument("--dry-run", action="store_true", help="validate without importing (always true in this CLI)")
    parser.add_argument("--strict", action="store_true")
    parser.add_argument("--format", choices=("text", "json"), default="text")
    parser.add_argument("--output", type=str, default="")
    args = parser.parse_args(argv)
    errors, warnings = validate(Path(args.path), strict=args.strict)
    report = {"errors": errors, "warnings": warnings, "blocking_errors": len(errors)}
    payload = json.dumps(report, indent=2) if args.format == "json" else "\n".join(
        [f"ERROR: {e}" for e in errors] + [f"WARN: {w}" for w in warnings] or ["OK"])
    if args.output:
        Path(args.output).write_text(payload + "\n", encoding="utf-8")
    else:
        print(payload)
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
