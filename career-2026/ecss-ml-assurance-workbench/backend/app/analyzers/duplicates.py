"""Duplicates checks: duplicate rows and duplicate identifiers."""

from app.analyzers.context import AnalysisContext, CheckResult, fmt
from app.schemas.enums import FindingStatus, Severity


def _duplicate_rows(ctx: AnalysisContext) -> CheckResult:
    df = ctx.df
    if ctx.row_count == 0:
        return CheckResult(
            check_id="duplicates.rows",
            category="Duplicates",
            title="Duplicate rows",
            description="Not evaluated: dataset has no rows.",
            status=FindingStatus.NOT_EVALUATED,
            severity=Severity.INFO,
            observed_value="",
            threshold="",
            columns=[],
            evidence={},
            risk="",
            recommendation="",
        )
    duplicated = int(df.duplicated(keep="first").sum())
    pct = 100.0 * duplicated / ctx.row_count
    threshold = float(ctx.config.get("duplicate_rows_threshold_pct", 5.0))
    if duplicated == 0:
        return CheckResult(
            check_id="duplicates.rows",
            category="Duplicates",
            title="Duplicate rows",
            description="No exact duplicate row detected.",
            status=FindingStatus.PASS,
            severity=Severity.INFO,
            observed_value="0",
            threshold="0",
            columns=[],
            evidence={"duplicate_rows": 0, "duplicate_pct": 0.0},
            risk="",
            recommendation="",
        )
    status = FindingStatus.FAIL if pct >= threshold else FindingStatus.WARNING
    severity = Severity.MEDIUM if status is FindingStatus.FAIL else Severity.LOW
    return CheckResult(
        check_id="duplicates.rows",
        category="Duplicates",
        title="Duplicate rows",
        description="Exact duplicate rows found in the dataset.",
        status=status,
        severity=severity,
        observed_value=f"{duplicated} rows ({pct:.2f}%)",
        threshold=f"< {fmt(threshold, 0)}% duplicate rows",
        columns=[],
        evidence={"duplicate_rows": duplicated, "duplicate_pct": round(pct, 2)},
        risk="Duplicate rows inflate apparent sample size and can distort class priors.",
        recommendation="Deduplicate deliberately after confirming duplicates are not legitimate repeated samples.",
    )


def _duplicate_ids(ctx: AnalysisContext) -> CheckResult:
    id_col = ctx.id_column
    if not id_col:
        return CheckResult(
            check_id="duplicates.ids",
            category="Duplicates",
            title="Duplicate identifiers",
            description="Not evaluated: no identifier column configured.",
            status=FindingStatus.NOT_APPLICABLE,
            severity=Severity.INFO,
            observed_value="",
            threshold="",
            columns=[],
            evidence={},
            risk="",
            recommendation="Configure an ID column when the dataset has a natural key.",
        )
    if id_col not in ctx.df.columns:
        return CheckResult(
            check_id="duplicates.ids",
            category="Duplicates",
            title="Duplicate identifiers",
            description="Configured ID column was not found in the dataset.",
            status=FindingStatus.FAIL,
            severity=Severity.MEDIUM,
            observed_value=id_col,
            threshold="configured column must exist",
            columns=[id_col],
            evidence={"column": id_col},
            risk="Analysis configuration references a missing column.",
            recommendation="Fix the configured ID column.",
        )
    series = ctx.df[id_col]
    non_null = series.notna().sum()
    dup_ids = int(series.duplicated(keep="first").sum())
    if dup_ids == 0:
        return CheckResult(
            check_id="duplicates.ids",
            category="Duplicates",
            title="Duplicate identifiers",
            description="Identifier column contains no duplicate value.",
            status=FindingStatus.PASS,
            severity=Severity.INFO,
            observed_value="0 duplicates",
            threshold="0",
            columns=[id_col],
            evidence={"column": id_col, "duplicate_ids": 0, "non_null": int(non_null)},
            risk="",
            recommendation="",
        )
    return CheckResult(
        check_id="duplicates.ids",
        category="Duplicates",
        title="Duplicate identifiers",
        description="Duplicate values found in the configured identifier column.",
        status=FindingStatus.FAIL,
        severity=Severity.MEDIUM,
        observed_value=f"{dup_ids} duplicate id values",
        threshold="0",
        columns=[id_col],
        evidence={"column": id_col, "duplicate_ids": dup_ids, "non_null": int(non_null)},
        risk="Non-unique identifiers break traceability between dataset rows and other assurance artefacts.",
        recommendation="Confirm the column is truly a unique identifier.",
    )


def run(ctx: AnalysisContext) -> list[CheckResult]:
    return [_duplicate_rows(ctx), _duplicate_ids(ctx)]
