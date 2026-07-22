from __future__ import annotations

import xml.etree.ElementTree as ET
from datetime import datetime
from pathlib import Path
from typing import Optional

from vertest.test.model import TestRun, TestStatus


def generate_junit_xml(run: TestRun, output_path: str | Path):
    """Generate JUnit-compatible XML report for CI/CD integration."""
    root = ET.Element("testsuite")
    root.set("name", run.suite_name)
    root.set("tests", str(len(run.results)))
    root.set("failures", str(run.failed_count()))
    root.set("errors", "0")
    root.set("time", f"{run.total_duration_ms / 1000:.3f}")

    for result in run.results:
        tc = ET.SubElement(root, "testcase")
        tc.set("name", result.test_name)
        tc.set("classname", run.suite_name)
        tc.set("time", f"{result.duration_ms / 1000:.3f}")

        if result.status == TestStatus.FAILED:
            fail = ET.SubElement(tc, "failure")
            fail.set("message", result.message)
            fail.text = f"STDERR:\n{result.stderr}\nSTDOUT:\n{result.stdout}"
        elif result.status == TestStatus.ERROR:
            err = ET.SubElement(tc, "error")
            err.set("message", result.message)

    tree = ET.ElementTree(root)
    tree.write(str(output_path), encoding="utf-8", xml_declaration=True)


def generate_html_report(run: TestRun, output_path: str | Path):
    """Generate a simple HTML report for test results."""
    passed = run.passed_count()
    failed = run.failed_count()
    total = len(run.results)
    pct = (passed / total * 100) if total > 0 else 0

    rows = []
    for r in run.results:
        status_class = "pass" if r.status == TestStatus.PASSED else "fail"
        rows.append(f"""<tr class="{status_class}">
            <td>{r.test_name}</td>
            <td>{r.status.value}</td>
            <td>{r.message}</td>
        </tr>""")

    html = f"""<!DOCTYPE html>
<html>
<head>
    <title>Test Report: {run.suite_name}</title>
    <style>
        body {{ font-family: monospace; margin: 2em; }}
        .summary {{ font-size: 1.2em; margin-bottom: 1em; }}
        .pass {{ background: #d4edda; }}
        .fail {{ background: #f8d7da; }}
        table {{ border-collapse: collapse; width: 100%; }}
        th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
        th {{ background: #f5f5f5; }}
    </style>
</head>
<body>
    <h1>Test Report: {run.suite_name}</h1>
    <div class="summary">
        <strong>{passed}/{total}</strong> passed ({pct:.1f}%) |
        Duration: {run.total_duration_ms:.0f}ms
    </div>
    <table>
        <tr><th>Test</th><th>Status</th><th>Message</th></tr>
        {"".join(rows)}
    </table>
</body>
</html>"""
    Path(output_path).write_text(html)
