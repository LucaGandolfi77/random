"""Time-quality checks for an optional timestamp column.

Timestamp handling is deliberately conservative: the column is parsed with
``pandas.to_datetime``; rows that do not parse are counted, not dropped.
"""

import pandas as pd

from app.analyzers.context import AnalysisContext, CheckResult
from app.schemas.enums import FindingStatus, Severity


def _parse_ts(ctx: AnalysisContext) -> tuple[str, pd.Series]:
    col = ctx.timestamp_column or ""
    try:
        parsed = pd.to_datetime(ctx.df[col], errors="coerce", utc=True)
    except (TypeError, ValueError):
        parsed = pd.Series([pd.NaT] * ctx.row_count, index=ctx.df.index)
    return col, parsed


def _parseable(ctx: AnalysisContext, col: str, parsed: pd.Series) -> CheckResult:
    bad = int(parsed.isna().sum())
    if bad == 0:
        return CheckResult(
            check_id="time.parseable",
            category="Time Quality",
            title="Timestamp values parseable",
            description="All timestamp values were parsed successfully.",
            status=FindingStatus.PASS,
            severity=Severity.INFO,
            observed_value=f"{ctx.row_count}/{ctx.row_count}",
            threshold="100%",
            columns=[col],
            evidence={"unparseable": 0},
            risk="",
            recommendation="",
        )
    return CheckResult(
        check_id="time.parseable",
        category="Time Quality",
        title="Unparseable timestamp values",
        description="Some timestamp values could not be interpreted.",
        status=FindingStatus.WARNING,
        severity=Severity.MEDIUM,
        observed_value=f"{bad} unparseable",
        threshold="0",
        columns=[col],
        evidence={"unparseable": bad, "unparseable_pct": round(100.0 * bad / ctx.row_count, 2)},
        risk="Unparseable timestamps break temporal ordering and interval analysis.",
        recommendation="Inspect the offending values and standardise the timestamp format.",
    )


def _ordering(ctx: AnalysisContext, col: str, parsed: pd.Series) -> CheckResult:
    valid = parsed.dropna()
    inversions = int((valid.diff().dt.total_seconds() < 0).sum())
    if inversions == 0:
        return CheckResult(
            check_id="time.ordering",
            category="Time Quality",
            title="Temporal ordering",
            description="Timestamps are monotonically non-decreasing.",
            status=FindingStatus.PASS,
            severity=Severity.INFO,
            observed_value="0 inversions",
            threshold="0",
            columns=[col],
            evidence={"inversions": 0},
            risk="",
            recommendation="",
        )
    return CheckResult(
        check_id="time.ordering",
        category="Time Quality",
        title="Timestamp ordering violations",
        description="Timestamps are not in chronological order.",
        status=FindingStatus.WARNING,
        severity=Severity.MEDIUM,
        observed_value=f"{inversions} inversions",
        threshold="0",
        columns=[col],
        evidence={"inversions": int(inversions)},
        risk="Disordered rows complicate time-series splits and can create look-ahead effects.",
        recommendation="Sort by timestamp before training/verification or investigate acquisition jitter.",
    )


def _duplicates_ts(ctx: AnalysisContext, col: str, parsed: pd.Series) -> CheckResult:
    valid = parsed.dropna()
    dups = int(valid.duplicated(keep="first").sum())
    if dups == 0:
        return CheckResult(
            check_id="time.duplicates",
            category="Time Quality",
            title="Duplicate timestamps",
            description="No duplicate timestamp value.",
            status=FindingStatus.PASS,
            severity=Severity.INFO,
            observed_value="0",
            threshold="0",
            columns=[col],
            evidence={"duplicate_timestamps": 0},
            risk="",
            recommendation="",
        )
    return CheckResult(
        check_id="time.duplicates",
        category="Time Quality",
        title="Duplicate timestamps",
        description="Multiple rows share the same timestamp value.",
        status=FindingStatus.WARNING,
        severity=Severity.LOW,
        observed_value=f"{dups} duplicated values",
        threshold="0",
        columns=[col],
        evidence={"duplicate_timestamps": int(dups)},
        risk="Duplicate timestamps may indicate sampling-rate confusion.",
        recommendation="Confirm the expected sampling scheme.",
    )


def _intervals(ctx: AnalysisContext, col: str, parsed: pd.Series) -> list[CheckResult]:
    valid = parsed.dropna().sort_values()
    results: list[CheckResult] = []
    if len(valid) < 3:
        results.append(
            CheckResult(
                check_id="time.intervals",
                category="Time Quality",
                title="Time interval regularity",
                description="Not evaluated: fewer than three valid timestamps.",
                status=FindingStatus.NOT_EVALUATED,
                severity=Severity.INFO,
                observed_value=f"{len(valid)} timestamps",
                threshold=">= 3",
                columns=[col],
                evidence={"valid_timestamps": int(len(valid))},
                risk="",
                recommendation="",
            )
        )
        return results
    diffs = valid.diff().dt.total_seconds().dropna()
    diffs = diffs[diffs > 0]
    if len(diffs) == 0:
        results.append(
            CheckResult(
                check_id="time.intervals",
                category="Time Quality",
                title="Time interval regularity",
                description="No positive interval between successive timestamps.",
                status=FindingStatus.NOT_EVALUATED,
                severity=Severity.INFO,
                observed_value="0 positive intervals",
                threshold="> 0",
                columns=[col],
                evidence={},
                risk="",
                recommendation="",
            )
        )
        return results
    mean = float(diffs.mean())
    std = float(diffs.std())
    cv = std / mean if mean > 0 else 0.0
    median = float(diffs.median())
    max_gap = float(diffs.max())
    min_gap = float(diffs.min())
    suspected_gaps = int((diffs > max(10.0 * median, 1.0)).sum()) if median > 0 else 0

    if cv < 1.0:
        results.append(
            CheckResult(
                check_id="time.intervals",
                category="Time Quality",
                title="Time interval regularity",
                description="Timestamps are approximately regular.",
                status=FindingStatus.PASS,
                severity=Severity.INFO,
                observed_value=f"mean {mean:.2f}s, std {std:.2f}s, CV {cv:.2f}",
                threshold="CV < 1.0",
                columns=[col],
                evidence={
                    "mean_interval_s": round(mean, 3),
                    "std_interval_s": round(std, 3),
                    "cv": round(cv, 3),
                    "median_interval_s": round(median, 3),
                    "max_gap_s": round(max_gap, 3),
                },
                risk="",
                recommendation="",
            )
        )
    else:
        results.append(
            CheckResult(
                check_id="time.intervals",
                category="Time Quality",
                title="Irregular time intervals",
                description="Interval variability is high relative to the mean interval.",
                status=FindingStatus.WARNING,
                severity=Severity.MEDIUM,
                observed_value=f"mean {mean:.2f}s, std {std:.2f}s, CV {cv:.2f}",
                threshold="CV < 1.0",
                columns=[col],
                evidence={
                    "mean_interval_s": round(mean, 3),
                    "std_interval_s": round(std, 3),
                    "cv": round(cv, 3),
                    "median_interval_s": round(median, 3),
                    "max_gap_s": round(max_gap, 3),
                },
                risk="Irregular sampling can distort time-series features and metrics.",
                recommendation="Resample or re-express features on a time grid, or model irregularity explicitly.",
            )
        )
    if suspected_gaps:
        results.append(
            CheckResult(
                check_id="time.suspicious_gaps",
                category="Time Quality",
                title="Suspicious time gaps",
                description="Intervals far larger than the median were detected.",
                status=FindingStatus.WARNING,
                severity=Severity.MEDIUM,
                observed_value=f"{suspected_gaps} gaps > 10x median ({median:.2f}s)",
                threshold=f"gaps <= 10x median ({median:.2f}s)",
                columns=[col],
                evidence={
                    "suspected_gaps": int(suspected_gaps),
                    "median_interval_s": round(median, 3),
                    "max_gap_s": round(max_gap, 3),
                    "min_gap_s": round(min_gap, 3),
                },
                risk="Large gaps may correspond to data-loss windows during acquisition.",
                recommendation="Correlate gaps with mission or platform events before imputing.",
            )
        )
    return results


def _coverage(ctx: AnalysisContext, col: str, parsed: pd.Series) -> CheckResult:
    valid = parsed.dropna()
    if len(valid) == 0:
        return CheckResult(
            check_id="time.coverage",
            category="Time Quality",
            title="Temporal coverage",
            description="Not evaluated: no valid timestamp.",
            status=FindingStatus.NOT_EVALUATED,
            severity=Severity.INFO,
            observed_value="0 valid",
            threshold="> 0",
            columns=[col],
            evidence={},
            risk="",
            recommendation="",
        )
    start = valid.min()
    end = valid.max()
    span_s = float((end - start).total_seconds())
    return CheckResult(
        check_id="time.coverage",
        category="Time Quality",
        title="Temporal coverage",
        description="Overall span of the dataset timestamps.",
        status=FindingStatus.PASS,
        severity=Severity.INFO,
        observed_value=f"{start} -> {end} ({span_s:.0f}s)",
        threshold="informational",
        columns=[col],
        evidence={
            "start_utc": start.isoformat(),
            "end_utc": end.isoformat(),
            "span_seconds": round(span_s, 1),
            "valid_timestamps": int(len(valid)),
        },
        risk="",
        recommendation="",
    )


def run(ctx: AnalysisContext) -> list[CheckResult]:
    col = ctx.timestamp_column
    if not col:
        return [
            CheckResult(
                check_id="time.not_configured",
                category="Time Quality",
                title="Timestamp column not configured",
                description="No timestamp column was selected; time-quality checks were not evaluated.",
                status=FindingStatus.NOT_APPLICABLE,
                severity=Severity.INFO,
                observed_value="",
                threshold="",
                columns=[],
                evidence={},
                risk="",
                recommendation="Select the timestamp column when the dataset is time-ordered telemetry.",
            )
        ]
    if col not in ctx.df.columns:
        return [
            CheckResult(
                check_id="time.column_missing",
                category="Time Quality",
                title="Configured timestamp column missing",
                description="The configured timestamp column does not exist in the dataset.",
                status=FindingStatus.FAIL,
                severity=Severity.MEDIUM,
                observed_value=col,
                threshold="configured column must exist",
                columns=[col],
                evidence={"column": col},
                risk="Analysis configuration is inconsistent with the dataset schema.",
                recommendation="Re-select the timestamp column.",
            )
        ]
    _, parsed = _parse_ts(ctx)
    results: list[CheckResult] = [
        _parseable(ctx, col, parsed),
        _ordering(ctx, col, parsed),
        _duplicates_ts(ctx, col, parsed),
    ]
    results.extend(_intervals(ctx, col, parsed))
    results.append(_coverage(ctx, col, parsed))
    return results
