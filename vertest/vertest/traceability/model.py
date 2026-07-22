from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Requirement:
    req_id: str
    title: str = ""
    description: str = ""
    source: str = ""
    linked_test_cases: list[str] = field(default_factory=list)


@dataclass
class TraceLink:
    req_id: str
    test_case_name: str
    link_type: str = "tests"  # tests, verifies, covers


@dataclass
class TraceMatrix:
    """Bidirectional traceability matrix between requirements and tests."""
    requirements: dict[str, Requirement] = field(default_factory=dict)
    links: list[TraceLink] = field(default_factory=list)

    def get_tests_for_requirement(self, req_id: str) -> list[str]:
        return [
            link.test_case_name
            for link in self.links
            if link.req_id == req_id
        ]

    def get_requirements_for_test(self, test_name: str) -> list[str]:
        return [
            link.req_id
            for link in self.links
            if link.test_case_name == test_name
        ]

    def coverage_pct(self) -> float:
        if not self.requirements:
            return 100.0
        linked = len({link.req_id for link in self.links})
        return (linked / len(self.requirements)) * 100
