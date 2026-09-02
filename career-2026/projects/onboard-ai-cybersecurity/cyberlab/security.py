"""Defensive security primitives for onboard ML (controlled lab).

Implements integrity, authenticity and update-safety controls and a defensive
test harness. Only local controlled fixtures are used; nothing here targets
external systems.
"""
from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass
from pathlib import Path

DIGEST = hashlib.sha256


@dataclass
class ModelPackage:
    model_id: str
    version: str
    payload: bytes
    metadata: dict | None = None

    @property
    def checksum(self) -> str:
        return DIGEST(self.payload).hexdigest()


class IntegrityGuard:
    """Checksum + manifest integrity for model artefacts."""

    def __init__(self, root: Path, allowlist: dict[str, str] | None = None) -> None:
        self.root = root.resolve()
        self.allowlist = allowlist or {}

    def _resolve(self, rel: str) -> Path:
        p = (self.root / rel).resolve()
        if self.root != p and self.root not in p.parents:
            raise ValueError("path escapes root")
        return p

    def artifact_ok(self, rel: str, expected_sha: str) -> bool:
        p = self._resolve(rel)
        if not p.is_file() or p.is_symlink():
            return False
        return DIGEST(p.read_bytes()).hexdigest() == expected_sha

    def is_allowlisted(self, model_id: str, version: str) -> bool:
        return self.allowlist.get(model_id) == version


class ManifestValidator:
    """Schema + version pinning + unknown-extension rejection (no arbitrary code)."""

    REQUIRED = ("model_id", "version", "artefacts", "integrity")

    def validate(self, manifest: dict) -> list[str]:
        errors = [k for k in self.REQUIRED if k not in manifest]
        if errors:
            return errors
        for rel, meta in manifest["artefacts"].items():
            if ".." in rel or rel.startswith("/") or "\\" in rel:
                return [f"unsafe path {rel}"]
        return []


class UpdateGate:
    """Secure update decision: version pinning, checksum, rollback, replay guard."""

    def __init__(self, trusted: dict[str, str]) -> None:
        self.trusted = trusted          # model_id -> approved version (pinned)
        self.last_applied: dict[str, str] = {}

    def should_apply(self, model_id: str, version: str, checksum: str, integrity: IntegrityGuard,
                     expected_sha: str, manifest_ok: bool, timestamp_ms: int,
                     last_message_ms: int, max_age_ms: int = 5000) -> tuple[bool, str]:
        if model_id not in self.trusted:
            return False, "model not in pin allowlist"
        if version != self.trusted[model_id]:
            return False, "version not pinned"
        if not manifest_ok:
            return False, "manifest invalid"
        if checksum != expected_sha:
            return False, "checksum mismatch"
        if timestamp_ms <= last_message_ms:
            return False, "replay or out-of-order message"
        if timestamp_ms > last_message_ms + max_age_ms:
            return False, "message too old (stale)"
        self.last_applied[model_id] = timestamp_ms
        return True, "ok"

    def rollback_allowed(self, model_id: str, current: str, target: str, trusted: dict[str, str]) -> bool:
        if target not in trusted.get(model_id, []):
            return False
        return target != current


class InputSanitizer:
    @staticmethod
    def sanitize_filename(name: str) -> str:
        safe = re.sub(r"[^A-Za-z0-9._-]", "_", Path(name).name)
        return safe or "unnamed"

    @staticmethod
    def check_range(value: float, low: float, high: float) -> bool:
        return low <= value <= high


def check_payload_consistency(telemetry: dict, expected_ts: int, max_ts: int) -> bool:
    return 0 <= telemetry.get("ts", -1) <= expected_ts and telemetry.get("ts", -1) <= max_ts
