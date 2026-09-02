"""Data Readiness Score computation.

Method (v1, deterministic):

* Every finding belongs to one of 8 categories.
* Each category starts at 100 and loses penalty points per finding:
    FAIL:  CRITICAL 30, HIGH 20, MEDIUM 12, LOW 6
    WARNING: HIGH 7, MEDIUM 4, LOW 2, INFO 1
  A category is bounded at 0.
* Categories with zero applicable checks are marked NOT EVALUATED.
* Overall score = weighted mean of evaluated category scores (weights from
  the W_CATEGORIES table), rounded to one decimal.
* The method is fully deterministic given the same findings.

The score is a decision-support indicator, never a certification.
"""

from __future__ import annotations

from app.analyzers.context import SCORE_CATEGORIES
from app.models.analysis import Finding, ScoreResult
from app.schemas.enums import FindingStatus, Severity

WEIGHTS: dict[str, float] = {
    "Structure": 15.0,
    "Completeness": 20.0,
    "Consistency": 12.0,
    "Duplicates": 8.0,
    "Statistical Quality": 20.0,
    "Target Quality": 15.0,
    "Time Quality": 5.0,
    "Traceability": 5.0,
}

_PENALTY_FAIL: dict[str, float] = {
    Severity.CRITICAL.value: 30.0,
    Severity.HIGH.value: 20.0,
    Severity.MEDIUM.value: 12.0,
    Severity.LOW.value: 6.0,
    Severity.INFO.value: 0.0,
}
_PENALTY_WARNING: dict[str, float] = {
    Severity.CRITICAL.value: 12.0,
    Severity.HIGH.value: 7.0,
    Severity.MEDIUM.value: 4.0,
    Severity.LOW.value: 2.0,
    Severity.INFO.value: 1.0,
}

SCORE_METHOD_VERSION = "1.0.0"


def _penalty(status: str, severity: str) -> float:
    if status == FindingStatus.FAIL.value:
        return _PENALTY_FAIL.get(severity, 0.0)
    if status == FindingStatus.WARNING.value:
        return _PENALTY_WARNING.get(severity, 0.0)
    return 0.0


def compute_category_scores(findings: list[Finding]) -> tuple[dict[str, dict], dict[str, int]]:
    """Return ({category: stats}, {status: total_count}) for all 8 categories."""
    category_stats: dict[str, dict] = {}
    status_totals: dict[str, int] = {status.value: 0 for status in FindingStatus}
    for category in SCORE_CATEGORIES:
        category_stats[category] = {
            "score": 100.0,
            "evaluated": False,
            "pass_count": 0,
            "warning_count": 0,
            "fail_count": 0,
            "not_applicable_count": 0,
        }
    for finding in findings:
        status_totals[finding.status] = status_totals.get(finding.status, 0) + 1
        stats = category_stats.get(finding.category)
        if stats is None:
            continue
        if finding.status == FindingStatus.NOT_APPLICABLE.value:
            stats["not_applicable_count"] += 1
            continue
        if finding.status == FindingStatus.NOT_EVALUATED.value:
            continue
        stats["evaluated"] = True
        if finding.status == FindingStatus.PASS.value:
            stats["pass_count"] += 1
        elif finding.status == FindingStatus.WARNING.value:
            stats["warning_count"] += 1
            stats["score"] -= _penalty(finding.status, finding.severity)
        elif finding.status == FindingStatus.FAIL.value:
            stats["fail_count"] += 1
            stats["score"] -= _penalty(finding.status, finding.severity)
        stats["score"] = max(0.0, stats["score"])
    return category_stats, status_totals


def build_score_result(run_id: str, findings: list[Finding]) -> ScoreResult:
    category_stats, status_totals = compute_category_scores(findings)

    evaluated = [c for c in SCORE_CATEGORIES if category_stats[c]["evaluated"]]
    weighted_sum = 0.0
    weight_sum = 0.0
    for category in evaluated:
        weighted_sum += category_stats[category]["score"] * WEIGHTS[category]
        weight_sum += WEIGHTS[category]
    overall: float | None = round(weighted_sum / weight_sum, 1) if weight_sum > 0 else None

    coverage = round(100.0 * len(evaluated) / len(SCORE_CATEGORIES), 1)

    def _round(score: float | None) -> float | None:
        return round(score, 1) if score is not None else None

    return ScoreResult(
        run_id=run_id,
        overall_score=_round(overall),
        coverage_pct=coverage,
        category_scores={
            category: {
                "weight": WEIGHTS[category],
                "score": (_round(category_stats[category]["score"]) if category_stats[category]["evaluated"] else None),
                "evaluated": category_stats[category]["evaluated"],
                "pass_count": category_stats[category]["pass_count"],
                "warning_count": category_stats[category]["warning_count"],
                "fail_count": category_stats[category]["fail_count"],
                "not_applicable_count": category_stats[category]["not_applicable_count"],
            }
            for category in SCORE_CATEGORIES
        },
        pass_count=status_totals.get(FindingStatus.PASS.value, 0),
        warning_count=status_totals.get(FindingStatus.WARNING.value, 0),
        fail_count=status_totals.get(FindingStatus.FAIL.value, 0),
        not_applicable_count=status_totals.get(FindingStatus.NOT_APPLICABLE.value, 0),
        not_evaluated_count=status_totals.get(FindingStatus.NOT_EVALUATED.value, 0),
        weights_json=dict(WEIGHTS),
        score_method_version=SCORE_METHOD_VERSION,
    )
