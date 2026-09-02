#!/usr/bin/env python3
"""Initialize ML assurance documentation for a new project.

Copies the seven assurance templates (all files in this folder except README.md)
into a new project directory. Non-destructive: refuses to overwrite existing
files. Updates only the basic "Project" placeholder in the Document Control
table and the document ID prefix if requested.

Usage:
  init_project.py PROJECT_NAME [options]

Options:
  --dest-dir DIR    Parent directory for the new project folder (default: cwd)
  --prefix PREFIX   Optional identifier prefix (prefixes the generic IDs in
                    examples, e.g. MYPJ -> MYPJ-REQ-F-001)
  --dry-run         Print the actions without creating or writing anything
  --help            Show this help message

Examples:
  python3 init_project.py my-ml-project
  python3 init_project.py my-ml-project --dest-dir ~/projects --prefix MYPJ
  python3 init_project.py my-ml-project --dry-run
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

TEMPLATE_FILES = (
    "PROJECT_CHARTER.md",
    "OPERATIONAL_DESIGN_DOMAIN.md",
    "DATA_READINESS_REVIEW.md",
    "MODEL_CARD.md",
    "TEST_PLAN.md",
    "FMEA.md",
    "ASSURANCE_CASE.md",
)


def _parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="init_project.py",
        description="Initialize ML assurance documentation from the reusable templates.",
        epilog="The script never overwrites existing files. Remove or move a file first to re-initialize it.",
    )
    parser.add_argument("project", help="new project name (a directory will be created with this name)")
    parser.add_argument("--dest-dir", default=".", help="parent directory for the new project (default: current directory)")
    parser.add_argument("--prefix", default="", help="optional identifier prefix (e.g. MYPJ -> MYPJ-REQ-F-001)")
    parser.add_argument("--dry-run", action="store_true", help="show actions without creating or writing anything")
    return parser.parse_args(argv)


def _source_dir() -> Path:
    return Path(__file__).resolve().parent.parent


def _rewrite(content: str, project_name: str, prefix: str) -> str:
    """Apply only basic placeholder updates: project name + optional prefix."""
    content = content.replace("| Project | [TO BE COMPLETED] |", f"| Project | {project_name} |")
    if prefix:
        # Prepend the project prefix to placeholder example IDs (REQ-F-001 -> PREFIX-REQ-F-001).
        token = prefix.rstrip("-")
        content = re.sub(
            r"(?<![\w-])(REQ-F-|REQ-NF-|REQ-I-|ODD-|DATA-|RISK-|FM-|TEST-|EVID-|ASM-|LIM-|ACT-|ARG-|NC-|DEC-)",
            rf"{token}-\1",
            content,
        )
    return content


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv if argv is not None else sys.argv[1:])
    source = _source_dir()
    dest_root = Path(args.dest_dir).expanduser().resolve()
    project_dir = dest_root / args.project
    planned: list[tuple[str, Path]] = []

    for filename in TEMPLATE_FILES:
        planned.append((filename, project_dir / filename))

    if args.dry_run:
        print(f"[dry-run] Would create project directory: {project_dir}")
        for _name, target in planned:
            action = "write" if not target.exists() else "SKIP (exists)"
            print(f"[dry-run] {action}: {target}")
        if args.prefix:
            print(f"[dry-run] identifier prefix: '{args.prefix}'")
        return 0

    if project_dir.exists():
        existing = [name for name, target in planned if target.exists()]
        if existing:
            print(f"ERROR: refusing to overwrite existing file(s) in {project_dir}:", file=sys.stderr)
            for name in existing:
                print(f"  - {name}", file=sys.stderr)
            print("Move or remove the files first, or use a different project name.", file=sys.stderr)
            return 2

    project_dir.mkdir(parents=True, exist_ok=True)
    for filename, target in planned:
        content = (source / filename).read_text(encoding="utf-8")
        content = _rewrite(content, args.project, args.prefix)
        target.write_text(content, encoding="utf-8")
        print(f"created: {target}")

    print(f"OK: {len(planned)} documentation templates initialized for '{args.project}'.")
    print("Start with PROJECT_CHARTER.md and consult the README.md guide for the recommended order.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
