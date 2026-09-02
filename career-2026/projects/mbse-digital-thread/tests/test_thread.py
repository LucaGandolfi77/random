"""MBSE digital thread tests."""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mbse.thread import (  # noqa: E402
    DOWNSTREAM, Node, ThreadModel, demo_model, export_graph, validate_id, ModelError,
)


def raw_of(m: ThreadModel) -> dict:
    return {"nodes": [{"id": n.id, "kind": n.kind, "title": n.title, "version": n.version,
                       "status": n.status, "source": n.source, "links": n.links, "data": n.data}
                      for n in m.nodes.values()]}


def test_demo_model_is_consistent():
    m = demo_model()
    assert m.validate() == []


def test_import_idempotent_roundtrip():
    m = demo_model()
    m2 = ThreadModel.from_dict(raw_of(m))
    assert sorted(m.nodes) == sorted(m2.nodes)
    assert m2.validate() == []


def test_duplicate_id_and_invalid_format():
    m = ThreadModel()
    m.add_node(Node("SR-01", "system_requirement", "x"))
    try:
        m.add_node(Node("SR-01", "system_requirement", "y"))
        raised = False
    except ModelError:
        raised = True
    assert raised
    assert not validate_id("bad id!")
    try:
        m.add_node(Node("bad id!", "function", "x"))
        raised = False
    except ModelError:
        raised = True
    assert raised


def test_orphan_detected():
    m = ThreadModel()
    m.add_node(Node("T-01", "test_case", "t", links=["EV-99"]))
    assert any("orphan" in i for i in m.validate())


def test_cycle_detected():
    m = ThreadModel()
    m.add_node(Node("FN-01", "function", "f", links=["CMP-01"]))
    m.add_node(Node("CMP-01", "component", "c", links=["FN-01"]))
    assert any("cycle" in i for i in m.validate())


def test_suspect_propagation_never_touches_evidence():
    m = demo_model()
    ev_before = m.nodes["EV-01"].status
    suspects = m.mark_suspect_and_propagate("SR-01")
    assert "EV-01" in suspects
    assert m.nodes["EV-01"].status == "Suspect" or ev_before == m.nodes["EV-01"].status  # not auto-updated content-wise
    assert "suspect_reason" in m.nodes["EV-01"].data
    # downstream of change includes model, test, decision, monitoring
    kinds = {m.nodes[n].kind for n in suspects}
    assert {"ml_requirement", "model_version", "test_case", "risk", "deployment_decision",
            "monitoring_metric"} <= kinds


def test_impact_by_kind_and_upstream():
    m = demo_model()
    impact = m.impact("MLR-01")
    assert "T-01" in impact["affected"] and "EV-01" in impact["affected"]
    assert "SWR-01" in impact["upstream"]
    assert impact["affected_by_kind"]["test_case"]


def test_export_graph_contains_edges():
    dot = export_graph(demo_model())
    assert dot.startswith("digraph") and "->" in dot


if __name__ == "__main__":
    failures = 0
    for name, fn in sorted(globals().items()):
        if not name.startswith("test_"):
            continue
        try:
            fn()
            print("PASS", name)
        except Exception as exc:  # noqa: BLE001
            failures += 1
            print("FAIL", name, exc)
    raise SystemExit(1 if failures else 0)
