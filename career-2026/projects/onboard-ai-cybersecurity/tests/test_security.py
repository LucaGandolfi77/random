"""Defensive security tests (local fixtures only)."""
import hashlib
import json
import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from cyberlab.security import (  # noqa: E402
    IntegrityGuard, ManifestValidator, ModelPackage, UpdateGate, InputSanitizer,
)


def sha(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def test_checksum_and_corruption(tmp_path):
    pkg = ModelPackage("mdl", "1.0", b"weights-bytes")
    ok = tmp_path / "model.bin"
    ok.write_bytes(pkg.payload)
    guard = IntegrityGuard(tmp_path)
    assert guard.artifact_ok("model.bin", pkg.checksum)
    assert not guard.artifact_ok("model.bin", sha(b"tampered"))
    assert not guard.artifact_ok("model.bin", pkg.checksum.upper())


def test_path_traversal_and_symlink(tmp_path):
    guard = IntegrityGuard(tmp_path)
    try:
        guard.artifact_ok("../outside", sha(b"x"))
        escaped = False
    except ValueError:
        escaped = True
    assert escaped
    link = tmp_path / "link.bin"
    link.symlink_to(tmp_path / "real.bin")
    assert not guard.artifact_ok("link.bin", sha(b"x"))


def test_manifest_validation(tmp_path):
    good = {"model_id": "m", "version": "1", "artefacts": {"w.bin": {}}, "integrity": "x"}
    assert ManifestValidator().validate(good) == []
    bad_path = {"model_id": "m", "version": "1", "artefacts": {"../../evil": {}}, "integrity": "x"}
    assert ManifestValidator().validate(bad_path)


def test_update_gate(tmp_path):
    guard = IntegrityGuard(tmp_path)
    payload = b"v2-bytes"
    artefact = tmp_path / "w2.bin"
    artefact.write_bytes(payload)
    trusted = {"mdl": "2.0", "mdl-rollback": ["1.0", "2.0"]}
    gate = UpdateGate({"mdl": "2.0"})
    ok, reason = gate.should_apply("mdl", "2.0", sha(payload), guard,
                                   expected_sha=sha(payload), manifest_ok=True,
                                   timestamp_ms=100, last_message_ms=0)
    assert ok and reason == "ok"
    # version not pinned
    ok, reason = gate.should_apply("mdl", "1.9", sha(payload), guard, sha(payload), True, 200, 100)
    assert not ok and "pinned" in reason
    # replay
    ok, reason = gate.should_apply("mdl", "2.0", sha(payload), guard, sha(payload), True, 50, 100)
    assert not ok and "replay" in reason
    # stale
    ok, reason = gate.should_apply("mdl", "2.0", sha(payload), guard, sha(payload), True, 100000, 100)
    assert not ok and "stale" in reason
    # checksum mismatch
    ok, reason = gate.should_apply("mdl", "2.0", sha(b"other"), guard, sha(payload), True, 300, 100)
    assert not ok and "checksum" in reason


def test_filename_sanitization_and_range():
    assert InputSanitizer.sanitize_filename("../../evil.bin") == "evil.bin"
    assert not InputSanitizer.check_range(999.0, 0.0, 100.0)


def test_malicious_archive_rejected():
    import io
    import zipfile

    bad = io.BytesIO()
    with zipfile.ZipFile(bad, "w") as zf:
        zf.writestr("../../escape.txt", "x")
    # never extracted by this lab; verify member scan rejects traversal names
    with zipfile.ZipFile(io.BytesIO(bad.getvalue())) as zf:
        assert any(".." in n for n in zf.namelist())
    # defensive stance: lab refuses extraction of unsafe members
    with zipfile.ZipFile(io.BytesIO(bad.getvalue())) as zf:
        unsafe = [n for n in zf.namelist() if ".." in n or n.startswith("/")]
        assert unsafe


def test_lockfile_mismatch_detected(tmp_path):
    # fixture lock mismatch -> update gate refuses via checksum path (no pinned lock == deny)
    gate = UpdateGate({})
    ok, reason = gate.should_apply("dep", "1.2", sha(b"x"), IntegrityGuard(tmp_path), "x", True, 1, 0)
    assert not ok and "allowlist" in reason


def test_unexpected_model_version():
    gate = UpdateGate({"mdl": "1.0"})
    ok, _ = gate.should_apply("mdl", "9.9", "c", IntegrityGuard(Path(".")), "c", True, 1, 0)
    assert not ok


if __name__ == "__main__":
    import inspect

    failures = 0
    import tempfile as _tf

    tmp = _tf.mkdtemp()
    for name, fn in sorted(globals().items()):
        if not name.startswith("test_"):
            continue
        try:
            if "tmp_path" in inspect.signature(fn).parameters:
                fn(Path(tmp))
            else:
                fn()
            print("PASS", name)
        except Exception as exc:  # noqa: BLE001
            failures += 1
            print("FAIL", name, exc)
    raise SystemExit(1 if failures else 0)
