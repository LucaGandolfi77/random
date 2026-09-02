"""Traceability checks.

These checks validate the assurance bookkeeping around the dataset (file hash,
recorded metadata) rather than the data content itself.
"""

from app.analyzers.context import AnalysisContext, CheckResult
from app.schemas.enums import FindingStatus, Severity


def _sha256_recorded(ctx: AnalysisContext) -> CheckResult:
    return CheckResult(
        check_id="trace.sha256_recorded",
        category="Traceability",
        title="Dataset content hash",
        description="The dataset file hash (SHA-256) is recorded and was recomputed for this analysis.",
        status=FindingStatus.PASS if ctx.sha256 else FindingStatus.FAIL,
        severity=Severity.INFO if ctx.sha256 else Severity.HIGH,
        observed_value=ctx.sha256,
        threshold="SHA-256 available",
        columns=[],
        evidence={"sha256": ctx.sha256},
        risk="Without a content hash the exact analysed dataset cannot be reproduced later.",
        recommendation="",
    )


def _row_consistency(ctx: AnalysisContext, recorded_rows: int) -> CheckResult:
    consistent = ctx.row_count == recorded_rows
    return CheckResult(
        check_id="trace.row_consistency",
        category="Traceability",
        title="Row count consistency",
        description="Rows parsed at analysis time match the rows recorded at upload time.",
        status=FindingStatus.PASS if consistent else FindingStatus.FAIL,
        severity=Severity.INFO if consistent else Severity.HIGH,
        observed_value=f"{ctx.row_count} (analysis) vs {recorded_rows} (recorded)",
        threshold="equal",
        columns=[],
        evidence={"analysis_rows": ctx.row_count, "recorded_rows": recorded_rows},
        risk="A mismatch means the stored file changed or parsing is not deterministic.",
        recommendation="Re-upload the dataset to refresh recorded metadata.",
    )


def _natural_key(ctx: AnalysisContext) -> CheckResult:
    if ctx.id_column:
        if ctx.id_column not in ctx.df.columns:
            return CheckResult(
                check_id="trace.natural_key",
                category="Traceability",
                title="Row identifier configured",
                description="Configured ID column was not found in the dataset.",
                status=FindingStatus.FAIL,
                severity=Severity.MEDIUM,
                observed_value=ctx.id_column,
                threshold="column exists",
                columns=[ctx.id_column],
                evidence={"id_column": ctx.id_column},
                risk="Broken identifier configuration reduces traceability.",
                recommendation="Fix the configured ID column.",
            )
        return CheckResult(
            check_id="trace.natural_key",
            category="Traceability",
            title="Row identifier configured",
            description="An identifier column is configured, enabling row-level traceability.",
            status=FindingStatus.PASS,
            severity=Severity.INFO,
            observed_value=ctx.id_column,
            threshold="configured",
            columns=[ctx.id_column],
            evidence={"id_column": ctx.id_column},
            risk="",
            recommendation="",
        )
    candidates = [p for p in ctx.profiles if p.non_null_count >= 100 and p.unique_count / p.non_null_count >= 0.99]
    if not candidates:
        return CheckResult(
            check_id="trace.natural_key",
            category="Traceability",
            title="Row identifier configured",
            description="No identifier column configured and no obvious natural key found.",
            status=FindingStatus.WARNING,
            severity=Severity.LOW,
            observed_value="none",
            threshold="a row-unique column recommended",
            columns=[],
            evidence={},
            risk="Without an identifier, findings cannot be traced to specific rows in later stages.",
            recommendation="Select an ID column on the Dataset page if a natural key exists.",
        )
    return CheckResult(
        check_id="trace.natural_key",
        category="Traceability",
        title="Row identifier configured",
        description="No ID configured, but candidate row-unique columns exist and could serve as identifiers.",
        status=FindingStatus.WARNING,
        severity=Severity.LOW,
        observed_value=", ".join(p.name for p in candidates[:5]),
        threshold="one column configured as ID",
        columns=[p.name for p in candidates[:5]],
        evidence={"candidates": [p.name for p in candidates[:5]]},
        risk="Findings are not row-traceable until an ID column is chosen.",
        recommendation="Select the natural key as ID column on the Dataset page.",
    )


def run(ctx: AnalysisContext) -> list[CheckResult]:
    return [
        _sha256_recorded(ctx),
        _row_consistency(ctx, int(ctx.config.get("recorded_row_count", ctx.row_count))),
        _natural_key(ctx),
    ]
