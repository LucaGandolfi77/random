from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional


class TestStatus(Enum):
    PENDING = "pending"
    PASSED = "passed"
    FAILED = "failed"
    ERROR = "error"
    SKIPPED = "skipped"


@dataclass
class TestCase:
    """A single test case for a function under test."""
    name: str
    function_name: str
    args: dict = field(default_factory=dict)
    expected: dict = field(default_factory=dict)
    stubs: dict[str, list[int]] = field(default_factory=dict)
    description: str = ""
    requirement_ids: list[str] = field(default_factory=list)
    status: TestStatus = TestStatus.PENDING
    line: int = 0


@dataclass
class TestSuite:
    """A collection of test cases for one source file / component."""
    name: str
    source_file: str
    test_cases: list[TestCase] = field(default_factory=list)
    setup_code: str = ""
    teardown_code: str = ""
    compiler_flags: list[str] = field(default_factory=list)
    include_dirs: list[str] = field(default_factory=list)

    def add_case(self, case: TestCase):
        self.test_cases.append(case)

    def total_count(self) -> int:
        return len(self.test_cases)

    def passed_count(self) -> int:
        return sum(1 for tc in self.test_cases if tc.status == TestStatus.PASSED)

    def failed_count(self) -> int:
        return sum(1 for tc in self.test_cases if tc.status == TestStatus.FAILED)


@dataclass
class TestResult:
    """Result of a single test case execution."""
    test_name: str
    status: TestStatus
    duration_ms: float = 0.0
    message: str = ""
    stdout: str = ""
    stderr: str = ""


@dataclass
class TestRun:
    """A complete test execution run."""
    suite_name: str
    results: list[TestResult] = field(default_factory=list)
    start_time: float = 0.0
    end_time: float = 0.0
    total_duration_ms: float = 0.0

    def passed_count(self) -> int:
        return sum(1 for r in self.results if r.status == TestStatus.PASSED)

    def failed_count(self) -> int:
        return sum(1 for r in self.results if r.status == TestStatus.FAILED)
