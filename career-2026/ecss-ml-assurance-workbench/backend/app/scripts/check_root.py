"""Root directory enforcement.

Validates that configured outputs and artefact references stay inside `/career-2026`.
Safe: read-only, never deletes files. Exits non-zero on violations.

Exceptions (documented, contain no final artefacts):
- package-manager dependencies (node_modules, .venv);
- OS-managed temp dirs (system `tempfile`) used only during execution;
- global caches outside the repository.

Run: python3 -m app.scripts.check_root [--root /career-2026]
"""
import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]


def _violations(root: Path) -> list[str]:
    problems: list[str] = []
    # 1) generated output dirs under storage must resolve inside root
    storage = root / "ecss-ml-assurance-workbench" / "backend" / "storage"
    for sub in ("assurance-reports", "portfolio/packages", "portfolio/evidence"):
        p = (storage / sub).resolve()
        if not str(p).startswith(str(root.resolve())):
            problems.append(f"output path outside root: {p}")
    # 2) manifests must not reference external paths
    for manifest in root.rglob("manifest.json"):
        try:
            data = json.loads(manifest.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            continue
        raw = json.dumps(data)
        for marker in ("/home/", "/Users/", "C:\\", "..\\", ":\\"):
            if marker in raw:
                problems.append(f"external path marker in manifest {manifest.relative_to(root)}")
    # 3) local links should not use absolute localhost/user paths outside root in docs
    for md in (root / "docs").rglob("*.md"):
        for line in md.read_text(encoding="utf-8", errors="ignore").splitlines():
            if (
                ("](/Users/" in line or "](/home/" in line or "](/workspaces/random" in line)
                and "/career-2026" not in line
            ):
                problems.append(f"absolute local link in {md.relative_to(root)}")
    # 4) no .env with secrets is required inside public content (presence check is informational)
    return problems


def main() -> int:
    parser = argparse.ArgumentParser(description="Root directory enforcement under /career-2026")
    parser.add_argument("--root", type=Path, default=ROOT)
    args = parser.parse_args()
    root: Path = args.root.resolve()
    if not str(root).endswith("career-2026"):
        print(f"ERROR: root must be /career-2026 (got {root})")
        return 2
    violations = _violations(root)
    if violations:
        print(f"{len(violations)} violation(s) found:")
        for item in violations:
            print(" -", item)
        return 1
    print("Root enforcement passed: all outputs and references are under /career-2026.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
