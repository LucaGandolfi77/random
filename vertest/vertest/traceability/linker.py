from __future__ import annotations

from vertest.traceability.model import Requirement, TraceLink, TraceMatrix


class TraceLinker:
    """Manages bidirectional trace links between requirements and test cases."""

    def __init__(self):
        self.matrix = TraceMatrix()

    def add_requirement(self, req: Requirement):
        self.matrix.requirements[req.req_id] = req

    def add_requirements(self, reqs: list[Requirement]):
        for req in reqs:
            self.add_requirement(req)

    def link(self, req_id: str, test_case_name: str, link_type: str = "tests"):
        link = TraceLink(req_id=req_id, test_case_name=test_case_name, link_type=link_type)
        self.matrix.links.append(link)

    def trace_report(self) -> str:
        lines = [
            "Traceability Matrix",
            "===================",
            "",
        ]
        for req_id, req in self.matrix.requirements.items():
            tests = self.matrix.get_tests_for_requirement(req_id)
            lines.append(f"  {req_id}: {req.title}")
            if tests:
                for t in tests:
                    lines.append(f"    -> {t}")
            else:
                lines.append("    (no tests linked)")
            lines.append("")

        lines.append(f"Coverage: {self.matrix.coverage_pct():.1f}%")
        return "\n".join(lines)
