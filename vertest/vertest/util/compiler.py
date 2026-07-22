from __future__ import annotations

import shutil


def detect_compiler(prefer: str | None = None) -> str:
    """Detect available C compiler. Prefers GCC or Clang."""
    candidates = ["gcc", "clang", "cc"]
    if prefer and prefer in candidates:
        candidates.insert(0, prefer)
    for c in candidates:
        path = shutil.which(c)
        if path:
            return path
    raise RuntimeError("No C compiler found (tried: gcc, clang, cc)")


def detect_cxx_compiler(prefer: str | None = None) -> str:
    candidates = ["g++", "clang++", "c++"]
    if prefer and prefer in candidates:
        candidates.insert(0, prefer)
    for c in candidates:
        path = shutil.which(c)
        if path:
            return path
    raise RuntimeError("No C++ compiler found (tried: g++, clang++, c++)")
