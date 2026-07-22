from __future__ import annotations

import os
from pathlib import Path
from typing import Optional


def find_source_files(root: str | Path, exts: tuple[str, ...] = (".c", ".cpp", ".cxx", ".cc")) -> list[Path]:
    root = Path(root).resolve()
    files: list[Path] = []
    for ext in exts:
        files.extend(root.rglob(f"*{ext}"))
    return [f for f in files if not f.name.startswith(".") and not f.name.startswith("_test")]


def find_header_files(root: str | Path) -> list[Path]:
    root = Path(root).resolve()
    return list(root.rglob("*.h")) + list(root.rglob("*.hpp")) + list(root.rglob("*.hxx"))


def resolve_include_path(include: str, search_dirs: list[Path]) -> Optional[Path]:
    for d in search_dirs:
        candidate = d / include
        if candidate.exists():
            return candidate.resolve()
    return None
