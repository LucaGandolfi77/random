"""Numerical checks: per-column descriptive statistics and IQR outlier flags."""

from app.analyzers.context import AnalysisContext, CheckResult, fmt
from app.schemas.enums import FindingStatus, Severity

_STAT_KEYS = (
    "min",
    "max",
    "mean",
    "median",
    "std",
    "q1",
    "q3",
    "unique_count",
    "zero_ratio",
)


def _numeric_profile_checks(ctx: AnalysisContext) -> list[CheckResult]:
    iqr_mult = float(ctx.config.get("iqr_multiplier", 1.5))
    results: list[CheckResult] = []
    for p in ctx.profiles:
        if not p.numeric:
            continue
        stats = {
            "min": p.min,
            "max": p.max,
            "mean": p.mean,
            "median": p.median,
            "std": p.std,
            "q1": p.q1,
            "q3": p.q3,
            "unique_count": p.unique_count,
            "zero_ratio": p.zero_ratio,
        }
        has_outliers = p.outlier_count > 0
        if has_outliers:
            results.append(
                CheckResult(
                    check_id="numerical.outliers_iqr",
                    category="Statistical Quality",
                    title=f"Possible outliers in column: {p.name}",
                    description=(
                        "Values outside the interquartile fence "
                        f"({fmt(iqr_mult, 1)} x IQR) were detected. These are possible "
                        "statistical anomalies, not automatically errors."
                    ),
                    status=FindingStatus.WARNING,
                    severity=Severity.LOW,
                    observed_value=f"{p.outlier_count} outliers ({p.outlier_ratio * 100:.2f}%)",
                    threshold=f"IQR fence with multiplier {fmt(iqr_mult, 1)}",
                    columns=[p.name],
                    evidence={
                        "column": p.name,
                        "outlier_count": p.outlier_count,
                        "outlier_ratio": p.outlier_ratio,
                        "q1": p.q1,
                        "q3": p.q3,
                        "iqr_multiplier": iqr_mult,
                    },
                    risk="Outliers may be genuine extreme events or acquisition anomalies.",
                    recommendation="Engineering review required before deciding to filter, clip or keep the values.",
                )
            )
        zero_pct = p.zero_ratio * 100.0
        if zero_pct >= 50.0:
            results.append(
                CheckResult(
                    check_id="numerical.zero_dominated",
                    category="Statistical Quality",
                    title=f"Zero-dominated column: {p.name}",
                    description="At least half of the values are zero.",
                    status=FindingStatus.WARNING,
                    severity=Severity.LOW,
                    observed_value=f"{zero_pct:.2f}% zeros",
                    threshold="< 50% zeros",
                    columns=[p.name],
                    evidence={"column": p.name, "zero_pct": round(zero_pct, 2)},
                    risk="Zero-dominated signals may need dedicated treatment or indicate inactive channels.",
                    recommendation="Verify whether zeros are real measurements or placeholder values.",
                )
            )
        results.append(
            CheckResult(
                check_id="numerical.profile",
                category="Statistical Quality",
                title=f"Numeric profile: {p.name}",
                description="Descriptive statistics of the column.",
                status=FindingStatus.PASS,
                severity=Severity.INFO,
                observed_value=fmt(stats),
                threshold="informational",
                columns=[p.name],
                evidence={"column": p.name, "stats": stats, "missing_pct": p.missing_pct},
                risk="",
                recommendation="",
            )
        )
    if not any(r.check_id == "numerical.profile" for r in results):
        results.append(
            CheckResult(
                check_id="numerical.profile",
                category="Statistical Quality",
                title="Numeric columns",
                description="No numeric column found in the dataset.",
                status=FindingStatus.NOT_APPLICABLE,
                severity=Severity.INFO,
                observed_value="0 numeric columns",
                threshold="",
                columns=[],
                evidence={"numeric_columns": 0},
                risk="",
                recommendation="",
            )
        )
    return results


def run(ctx: AnalysisContext) -> list[CheckResult]:
    return _numeric_profile_checks(ctx)
