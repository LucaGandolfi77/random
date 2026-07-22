from __future__ import annotations

from pathlib import Path
from typing import Optional


class CoverageReport:
    """Generates coverage reports in various formats."""

    @staticmethod
    def generate_text_summary(coverage_data: dict) -> str:
        lines = [
            "Coverage Summary",
            "================",
            f"  Lines:    {coverage_data.get('lines_executed', 0):.1f}%",
            f"  Branches: {coverage_data.get('branches_executed', 0):.1f}%",
            f"  Calls:    {coverage_data.get('calls_executed', 0):.1f}%",
        ]
        return "\n".join(lines)

    @staticmethod
    def generate_html(coverage_data: dict, source_files: list[str], output_path: str | Path):
        lines_pct = coverage_data.get("lines_executed", 0)
        branches_pct = coverage_data.get("branches_executed", 0)
        calls_pct = coverage_data.get("calls_executed", 0)

        def color(pct: float) -> str:
            if pct >= 90:
                return "#4CAF50"
            elif pct >= 70:
                return "#FF9800"
            return "#f44336"

        files_rows = "\n".join(
            f"<tr><td>{f}</td><td>{lines_pct:.1f}%</td></tr>"
            for f in source_files
        )

        html = f"""<!DOCTYPE html>
<html>
<head>
    <title>Coverage Report</title>
    <style>
        body {{ font-family: monospace; margin: 2em; }}
        .meter {{ height: 20px; background: #e0e0e0; border-radius: 10px; overflow: hidden; margin: 0.5em 0; }}
        .meter-fill {{ height: 100%; border-radius: 10px; transition: width 0.3s; }}
        .summary {{ display: flex; gap: 2em; margin: 2em 0; }}
        .stat {{ text-align: center; padding: 1em; border: 1px solid #ddd; border-radius: 8px; }}
        .stat-value {{ font-size: 2em; font-weight: bold; }}
        table {{ border-collapse: collapse; width: 100%; }}
        th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
    </style>
</head>
<body>
    <h1>Code Coverage Report</h1>
    <div class="summary">
        <div class="stat">
            <div class="stat-value" style="color:{color(lines_pct)}">{lines_pct:.1f}%</div>
            <div>Lines</div>
            <div class="meter"><div class="meter-fill" style="width:{lines_pct}%;background:{color(lines_pct)}"></div></div>
        </div>
        <div class="stat">
            <div class="stat-value" style="color:{color(branches_pct)}">{branches_pct:.1f}%</div>
            <div>Branches</div>
            <div class="meter"><div class="meter-fill" style="width:{branches_pct}%;background:{color(branches_pct)}"></div></div>
        </div>
        <div class="stat">
            <div class="stat-value" style="color:{color(calls_pct)}">{calls_pct:.1f}%</div>
            <div>Calls</div>
            <div class="meter"><div class="meter-fill" style="width:{calls_pct}%;background:{color(calls_pct)}"></div></div>
        </div>
    </div>
    <h2>Files</h2>
    <table>
        <tr><th>File</th><th>Coverage</th></tr>
        {files_rows}
    </table>
</body>
</html>"""
        Path(output_path).write_text(html)
