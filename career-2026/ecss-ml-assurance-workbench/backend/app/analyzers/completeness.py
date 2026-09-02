"""Completeness checks: missing values."""

from app.analyzers.context import AnalysisContext, CheckResult, fmt
from app.schemas.enums import FindingStatus, Severity


def _total_missing(ctx: AnalysisContext) -> CheckResult:
    total_cells = ctx.row_count * ctx.column_count
    missing_cells = sum(p.missing_count for p in ctx.profiles)
    overall_pct = 100.0 * missing_cells / total_cells if total_cells else 0.0
    if missing_cells == 0:
        return CheckResult(
            check_id="completeness.total_missing",
            category="Completeness",
            title="Total missing values",
            description="No missing value detected in the whole dataset.",
            status=FindingStatus.PASS,
            severity=Severity.INFO,
            observed_value="0",
            threshold="0",
            columns=[],
            evidence={"missing_cells": 0, "overall_missing_pct": 0.0},
            risk="",
            recommendation="",
        )
    status = (
        FindingStatus.WARNING if overall_pct >= ctx.config.get("missing_threshold_pct", 10.0) else FindingStatus.PASS
    )
    severity = Severity.MEDIUM if status is FindingStatus.WARNING else Severity.LOW
    return CheckResult(
        check_id="completeness.total_missing",
        category="Completeness",
        title="Total missing values",
        description="Number and share of missing cells across the dataset.",
        status=status,
        severity=severity,
        observed_value=f"{missing_cells} cells ({overall_pct:.2f}%)",
        threshold=f"< {fmt(ctx.config.get('missing_threshold_pct', 10.0), 0)}% missing",
        columns=[],
        evidence={"missing_cells": missing_cells, "overall_missing_pct": round(overall_pct, 2)},
        risk="Missing values constrain training and may bias metrics if handled implicitly.",
        recommendation="Adopt an explicit missing-value policy per column.",
    )


def _rows_with_missing(ctx: AnalysisContext) -> CheckResult:
    df = ctx.df
    rows_missing = int((df.isna().any(axis=1)).sum())
    pct = 100.0 * rows_missing / ctx.row_count if ctx.row_count else 0.0
    if rows_missing == 0:
        return CheckResult(
            check_id="completeness.rows_with_missing",
            category="Completeness",
            title="Rows with missing values",
            description="No row contains a missing value.",
            status=FindingStatus.PASS,
            severity=Severity.INFO,
            observed_value="0 rows",
            threshold="0",
            columns=[],
            evidence={"rows_with_missing": 0, "pct": 0.0},
            risk="",
            recommendation="",
        )
    status = FindingStatus.WARNING if pct >= ctx.config.get("missing_threshold_pct", 10.0) else FindingStatus.PASS
    return CheckResult(
        check_id="completeness.rows_with_missing",
        category="Completeness",
        title="Rows with missing values",
        description="Rows containing at least one missing value.",
        status=status,
        severity=Severity.MEDIUM if status is FindingStatus.WARNING else Severity.LOW,
        observed_value=f"{rows_missing} rows ({pct:.2f}%)",
        threshold=f"< {fmt(ctx.config.get('missing_threshold_pct', 10.0), 0)}% of rows",
        columns=[],
        evidence={"rows_with_missing": rows_missing, "pct": round(pct, 2)},
        risk="Rows with missing values may be dropped or imputed differently by training and inference pipelines.",
        recommendation="Document how rows with missing values are treated downstream.",
    )


def _columns_above_threshold(ctx: AnalysisContext) -> list[CheckResult]:
    """Individual findings for columns above the configurable missing threshold."""
    threshold = float(ctx.config.get("missing_threshold_pct", 10.0))
    results: list[CheckResult] = []
    for p in ctx.profiles:
        if p.missing_count == 0 or p.missing_pct >= 100.0:
            continue  # clean or handled by structure.empty_columns
        if p.missing_pct >= threshold:
            status = FindingStatus.FAIL if p.missing_pct >= 50.0 else FindingStatus.WARNING
            severity = Severity.HIGH if status is FindingStatus.FAIL else Severity.MEDIUM
            results.append(
                CheckResult(
                    check_id="completeness.column_missing_above_threshold",
                    category="Completeness",
                    title=f"Missing values above threshold: {p.name}",
                    description=f"Column has {p.missing_pct:.2f}% missing values, exceeding the configured threshold.",
                    status=status,
                    severity=severity,
                    observed_value=f"{p.missing_count} missing ({p.missing_pct:.2f}%)",
                    threshold=f"< {fmt(threshold, 0)}% missing",
                    columns=[p.name],
                    evidence={"column": p.name, "missing_count": p.missing_count, "missing_pct": p.missing_pct},
                    risk="A column with heavy missingness can bias learned models unless explicitly modelled.",
                    recommendation="Confirm acquisition health; apply explicit imputation or missing-value features.",
                )
            )
        elif p.missing_pct > 0:
            results.append(
                CheckResult(
                    check_id="completeness.column_missing_below_threshold",
                    category="Completeness",
                    title=f"Minor missing values: {p.name}",
                    description="Column contains a small share of missing values below the configured threshold.",
                    status=FindingStatus.PASS,
                    severity=Severity.INFO,
                    observed_value=f"{p.missing_count} missing ({p.missing_pct:.2f}%)",
                    threshold=f"< {fmt(threshold, 0)}% missing",
                    columns=[p.name],
                    evidence={"column": p.name, "missing_count": p.missing_count, "missing_pct": p.missing_pct},
                    risk="",
                    recommendation="",
                )
            )
    if not results:
        results.append(
            CheckResult(
                check_id="completeness.column_missing_above_threshold",
                category="Completeness",
                title="Columns above the missing-value threshold",
                description="No column exceeds the missing-value threshold.",
                status=FindingStatus.PASS,
                severity=Severity.INFO,
                observed_value="0 columns",
                threshold=f"< {fmt(threshold, 0)}% missing per column",
                columns=[],
                evidence={"threshold_pct": threshold},
                risk="",
                recommendation="",
            )
        )
    return results


def run(ctx: AnalysisContext) -> list[CheckResult]:
    results: list[CheckResult] = [_total_missing(ctx), _rows_with_missing(ctx)]
    results.extend(_columns_above_threshold(ctx))
    return results
