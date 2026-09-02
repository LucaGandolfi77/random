"""Crosswalk engine tests."""
import json
import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from governance.crosswalk import Control, CrosswalkEngine, Mapping, DISCLAIMER


def engine():
    e = CrosswalkEngine(registry={"ecss-informed": {"version": "v1", "date": "2026-01"},
                                  "easa": {"version": "v2", "date": "2026-02"}})
    e.add_control(Control("ECSS-001", "ecss-informed", "v1", "A", "Data quality",
                          "Ensure data traceability", source_date="2026-01",
                          applicability="Applicable", rationale="demo",
                          artefact="DATA-001", evidence_status="Evidence Available"))
    e.add_control(Control("NIST-001", "nist-ai-rmf", "1.0", "B", "Map",
                          "Map context", applicability="Applicability Pending"))
    e.add_control(Control("EU-001", "eu-ai-act", "proposal-ref", "C", "Tech docs",
                          "Technical documentation", applicability="Not Applicable"))
    e.add_mapping(Mapping("ECSS-001", "DATA-001", "evidence", kind="Exact"))
    e.add_mapping(Mapping("ECSS-001", "T-01", "test", kind="Supporting"))
    return e


def test_registry_and_versioning():
    e = engine()
    assert e.registry["easa"]["version"] == "v2"
    c = e.controls["ECSS-001"]
    assert c.framework_version == "v1" and c.source_date == "2026-01"


def test_duplicate_control():
    e = engine()
    try:
        e.add_control(Control("ECSS-001", "ecss-informed", "v1", "A", "x", "y"))
        raised = False
    except ValueError:
        raised = True
    assert raised


def test_mapping_and_matrix():
    e = engine()
    rows = e.crosswalk_matrix(artefact_ids=["DATA-001"])
    assert rows and rows[0]["kind"] == "Exact"
    full = e.crosswalk_matrix()
    assert len(full) == 2


def test_applicability_states():
    e = engine()
    report = {r["control_id"]: r["applicability"] for r in e.applicability_report()}
    assert report["ECSS-001"] == "Applicable"
    assert report["EU-001"] == "Not Applicable"
    assert report["NIST-001"] == "Applicability Pending"


def test_gap_report_missing_evidence():
    e = engine()
    gaps = {g["control_id"]: g["gap"] for g in e.gap_report()}
    # ECSS-001 applicable with evidence + mapping -> no gap
    assert gaps["ECSS-001"] is False
    # NIST-001 pending -> not a gap
    assert gaps["NIST-001"] is False
    # EU-001 Not Applicable -> no gap
    assert gaps["EU-001"] is False


def test_superseded_framework():
    e = engine()
    e.supersede("NIST-001", "NIST-002")
    assert "superseded" in e.controls["NIST-001"].framework_version
    assert e.controls["NIST-001"].superseded_by == "NIST-002"


def test_exports(tmp_path):
    e = engine()
    e.export_json(Path(tmp_path) / "x.json")
    e.export_matrix_csv(Path(tmp_path) / "m.csv")
    data = json.loads((Path(tmp_path) / "x.json").read_text())
    assert data["disclaimer"] == DISCLAIMER
    assert len(data["controls"]) == 3
    assert (Path(tmp_path) / "m.csv").stat().st_size > 0


def test_profile_comparison():
    e = engine()
    comp = e.profile_comparison({"ECSS-001": "Implemented", "MISSING-1": "Implemented"})
    row = {r["control_id"]: r for r in comp}
    assert row["ECSS-001"]["current_implementation"] == "Not Implemented"
    assert row["MISSING-1"]["match"] is False


def test_no_direct_mapping_requires_no_artefact():
    e = engine()
    e.add_mapping(Mapping("NIST-001", "", "claim", kind="No Direct Mapping"))
    assert len(e.mappings) == 3


if __name__ == "__main__":
    import inspect

    tmp = tempfile.mkdtemp()
    failures = 0
    for name, fn in sorted(globals().items()):
        if not name.startswith("test_"):
            continue
        try:
            fn(Path(tmp)) if "tmp_path" in inspect.signature(fn).parameters else fn()
            print("PASS", name)
        except Exception as exc:  # noqa: BLE001
            failures += 1
            print("FAIL", name, exc)
    raise SystemExit(1 if failures else 0)
