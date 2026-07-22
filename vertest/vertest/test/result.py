from __future__ import annotations

import re
from vertest.test.model import TestResult, TestStatus


class ResultParser:
    """Parses test harness stdout/stderr into structured TestResults."""

    PASS_RE = re.compile(r"PASS\s+\[(\d+)\]\s+(.*)")
    FAIL_RE = re.compile(r"FAIL\s+\[(\d+)\]\s+(.*)")

    @classmethod
    def parse(cls, stdout: str, stderr: str) -> list[TestResult]:
        results: list[TestResult] = []
        all_lines = (stdout + "\n" + stderr).split("\n")

        for line in all_lines:
            m = cls.PASS_RE.match(line)
            if m:
                results.append(TestResult(
                    test_name=m.group(2),
                    status=TestStatus.PASSED,
                    stdout=stdout,
                    stderr=stderr,
                ))
                continue
            m = cls.FAIL_RE.match(line)
            if m:
                results.append(TestResult(
                    test_name=m.group(2),
                    status=TestStatus.FAILED,
                    message=line,
                    stdout=stdout,
                    stderr=stderr,
                ))

        return results

    @classmethod
    def parse_summary(cls, stdout: str) -> dict:
        passed = 0
        failed = 0
        for line in stdout.split("\n"):
            m = re.search(r"Results:\s+(\d+)\s+passed,\s+(\d+)\s+failed", line)
            if m:
                passed = int(m.group(1))
                failed = int(m.group(2))
                break
        return {"passed": passed, "failed": failed}
