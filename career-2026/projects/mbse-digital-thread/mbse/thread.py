"""AI Assurance Digital Thread (MBSE subset).

JSON model with stable IDs and typed links (mission -> stakeholder -> system ->
ML requirement -> ODD -> dataset -> model -> test -> evidence -> risk ->
deployment -> monitoring). Implements traceability checks, suspect-link change
impact analysis and export of requirement/impact views. Subset of SysML concepts
only; full SysML compatibility is not claimed.
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path

# node kinds and the allowed downstream link kinds they may carry
KINDS = ("mission", "stakeholder", "system_requirement", "subsystem_requirement",
         "software_requirement", "ml_requirement", "odd_condition", "dataset_property",
         "model_version", "test_case", "evidence", "risk", "deployment_decision",
         "monitoring_metric", "function", "component", "interface", "scenario", "state")

DOWNSTREAM = {
    "mission": ["stakeholder", "system_requirement", "scenario", "function"],
    "stakeholder": ["system_requirement"],
    "system_requirement": ["subsystem_requirement", "function", "interface"],
    "subsystem_requirement": ["software_requirement", "component"],
    "software_requirement": ["ml_requirement", "test_case"],
    "ml_requirement": ["odd_condition", "dataset_property", "model_version", "test_case"],
    "odd_condition": ["dataset_property", "test_case", "monitoring_metric"],
    "dataset_property": ["model_version", "test_case"],
    "model_version": ["test_case", "risk", "deployment_decision"],
    "test_case": ["evidence", "risk"],
    "evidence": ["risk", "deployment_decision"],
    "risk": ["deployment_decision"],
    "deployment_decision": ["monitoring_metric"],
    "function": ["component", "interface"],
    "component": ["interface", "state"],
    "scenario": ["state", "test_case"],
}
ALL_KINDS = set(KINDS)


class ModelError(ValueError):
    pass


@dataclass
class Node:
    id: str
    kind: str
    title: str
    version: str = "1.0"
    status: str = "Draft"
    source: str = "mbse-digital-thread"
    links: list[str] = field(default_factory=list)
    data: dict = field(default_factory=dict)


def validate_id(node_id: str) -> bool:
    return bool(re.fullmatch(r"(M|SH|SR|SUB|SWR|MLR|ODD|DATA|MOD|T|EV|RSK|DEC|MON|FN|CMP|IF|SC|ST)-[A-Z0-9-]+", node_id))


class ThreadModel:
    def __init__(self) -> None:
        self.nodes: dict[str, Node] = {}

    @classmethod
    def from_dict(cls, raw: dict) -> "ThreadModel":
        m = cls()
        for item in raw.get("nodes", []):
            m.add_node(Node(**{k: item[k] for k in ("id", "kind", "title", "version", "status", "source")},
                             links=item.get("links", []), data=item.get("data", {})))
        return m

    def add_node(self, node: Node) -> None:
        if node.id in self.nodes:
            raise ModelError(f"duplicate id {node.id}")
        if node.kind not in ALL_KINDS:
            raise ModelError(f"unknown kind {node.kind}")
        if not validate_id(node.id):
            raise ModelError(f"invalid id format {node.id}")
        self.nodes[node.id] = node

    def validate(self) -> list[str]:
        issues: list[str] = []
        for nid, node in self.nodes.items():
            allowed = DOWNSTREAM.get(node.kind, [])
            for target in node.links:
                if target not in self.nodes:
                    issues.append(f"orphan link {nid} -> {target}")
                    continue
                if self.nodes[target].kind not in allowed:
                    issues.append(f"link kind mismatch {nid}({node.kind}) -> {target}({self.nodes[target].kind})")
        # cycle check (simple DFS over link graph)
        visited: set[str] = set()
        stack: list[str] = []

        def dfs(nid: str) -> bool:
            if nid in stack:
                return True
            if nid in visited:
                return False
            stack.append(nid)
            for t in self.nodes.get(nid, self.nodes[nid]).links:
                if t not in self.nodes:
                    continue  # orphan already reported above
                if dfs(t):
                    return True
            stack.pop()
            visited.add(nid)
            return False

        if any(dfs(n) for n in self.nodes):
            issues.append("cycle detected in link graph")
        return issues

    def upstream(self, nid: str) -> list[str]:
        return [k for k, n in self.nodes.items() if nid in n.links]

    def downstream(self, nid: str) -> list[str]:
        return list(self.nodes[nid].links)

    def mark_suspect_and_propagate(self, changed_id: str) -> list[str]:
        """Do not update evidence automatically: mark downstream links Suspect."""
        if changed_id not in self.nodes:
            raise ModelError(f"unknown id {changed_id}")
        changed_node = self.nodes[changed_id]
        changed_node.status = "Changed"
        suspects = self._propagate({changed_id})
        for nid in suspects:
            self.nodes[nid].data["suspect_reason"] = f"upstream change: {changed_id}"
            self.nodes[nid].status = "Suspect"
        return sorted(suspects - {changed_id})

    def _propagate(self, frontier: set[str]) -> set[str]:
        reached = set(frontier)
        work = list(frontier)
        while work:
            current = work.pop()
            for target in self.nodes[current].links:
                if target not in reached:
                    reached.add(target)
                    work.append(target)
        return reached

    def impact(self, changed_id: str) -> dict:
        affected = self._propagate({changed_id})
        by_kind: dict[str, list[str]] = {}
        for nid in affected:
            by_kind.setdefault(self.nodes[nid].kind, []).append(nid)
        return {"changed": changed_id, "affected": sorted(affected),
                "affected_by_kind": by_kind, "upstream": sorted(self.upstream(changed_id))}


def demo_model() -> ThreadModel:
    """Minimal integrated example based on the lunar landing ML (LLS) demonstration."""
    nodes = [
        Node("M-01", "mission", "Safe landing demonstration", status="Approved"),
        Node("SH-01", "stakeholder", "Demo team need: bounded touchdown risk", status="Approved"),
        Node("SR-01", "system_requirement", "Guidance commands must respect hard constraints"),
        Node("SUB-01", "subsystem_requirement", "ML guidance bounded by physics checks"),
        Node("SWR-01", "software_requirement", "Cage validates commands before release"),
        Node("MLR-01", "ml_requirement", "ML output divergence vs physics must be flagged"),
        Node("ODD-01", "odd_condition", "Altitude/velocity in declared envelope"),
        Node("DATA-01", "dataset_property", "Synthetic landing scenarios labelled"),
        Node("MOD-01", "model_version", "LLS guidance model v1.1 (synthetic)"),
        Node("T-01", "test_case", "Unsafe-command rejection test"),
        Node("EV-01", "evidence", "Cage rejection log (synthetic)"),
        Node("RSK-01", "risk", "Unsafe command released (residual)"),
        Node("DEC-01", "deployment_decision", "CONDITIONAL_GO (simulation only)"),
        Node("MON-01", "monitoring_metric", "Rejected-command count"),
        Node("FN-01", "function", "Validate command"),
        Node("CMP-01", "component", "Safety cage"),
        Node("SC-01", "scenario", "Nominal descent"),
        Node("ST-01", "state", "Cage active"),
    ]
    links = {
        "M-01": ["SH-01", "SC-01", "FN-01"],
        "SH-01": ["SR-01"],
        "SR-01": ["SUB-01", "FN-01"],
        "SUB-01": ["SWR-01", "CMP-01"],
        "SWR-01": ["MLR-01", "T-01"],
        "MLR-01": ["ODD-01", "MOD-01"],
        "ODD-01": ["DATA-01", "T-01"],
        "DATA-01": ["MOD-01"],
        "MOD-01": ["T-01"],
        "T-01": ["EV-01", "RSK-01"],
        "EV-01": ["RSK-01", "DEC-01"],
        "RSK-01": ["DEC-01"],
        "DEC-01": ["MON-01"],
        "FN-01": ["CMP-01"],
        "CMP-01": ["ST-01", "IF-01"] if "IF-01" in [n.id for n in nodes] else ["ST-01"],
        "SC-01": ["ST-01", "T-01"],
    }
    for n in nodes:
        n.links = links.get(n.id, [])
    m = ThreadModel()
    for n in nodes:
        m.add_node(n)
    return m


def export_graph(m: ThreadModel) -> str:
    lines = ["digraph digital_thread {", "  rankdir=LR;"]
    for nid, node in m.nodes.items():
        lines.append(f'  "{nid}" [label="{nid}\\n{node.kind}"];')
    for nid, node in m.nodes.items():
        for t in node.links:
            lines.append(f'  "{nid}" -> "{t}";')
    lines.append("}")
    return "\n".join(lines)


if __name__ == "__main__":
    m = demo_model()
    print("issues:", m.validate())
    print(json.dumps(m.impact("SR-01"), indent=2))
