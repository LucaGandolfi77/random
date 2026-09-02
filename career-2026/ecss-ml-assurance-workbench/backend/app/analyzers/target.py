"""Target column checks (optional but recommended)."""

import numpy as np

from app.analyzers.context import (
    NUMERIC_TYPES,
    AnalysisContext,
    CheckResult,
    fmt,
)
from app.schemas.enums import FindingStatus, Severity


def _not_configured(ctx: AnalysisContext) -> CheckResult:
    return CheckResult(
        check_id="target.not_configured",
        category="Target Quality",
        title="Target column not configured",
        description="No target column was selected, so target-specific quality checks were not evaluated.",
        status=FindingStatus.NOT_APPLICABLE,
        severity=Severity.INFO,
        observed_value="",
        threshold="",
        columns=[],
        evidence={},
        risk="Without an explicit target, class balance and leakage-vs-target checks cannot run.",
        recommendation="Select the target column on the Dataset page when the dataset is intended for supervised ML.",
    )


def _missing_target_column(ctx: AnalysisContext, col: str) -> CheckResult:
    return CheckResult(
        check_id="target.column_missing",
        category="Target Quality",
        title="Configured target column missing",
        description="The configured target column does not exist in the dataset.",
        status=FindingStatus.FAIL,
        severity=Severity.HIGH,
        observed_value=col,
        threshold="configured column must exist",
        columns=[col],
        evidence={"column": col},
        risk="Analysis configuration is inconsistent with the dataset schema.",
        recommendation="Re-select the target column from the available columns.",
    )


def _categorical_target(ctx: AnalysisContext, col: str, profile) -> CheckResult:
    series = ctx.df[col].dropna()
    counts = series.value_counts(dropna=False)
    if len(counts) == 0:
        return CheckResult(
            check_id="target.imbalance",
            category="Target Quality",
            title="Target is empty",
            description="The target column contains no values.",
            status=FindingStatus.FAIL,
            severity=Severity.HIGH,
            observed_value="0 values",
            threshold="> 0",
            columns=[col],
            evidence={"column": col},
            risk="A target without values prevents supervised verification.",
            recommendation="Investigate acquisition or labelling of the target column.",
        )
    majority = int(counts.iloc[0])
    minority = int(counts.iloc[-1])
    ratio = majority / minority if minority else float("inf")
    warn_at = float(ctx.config.get("imbalance_ratio_warn", 10.0))
    if ratio < warn_at:
        return CheckResult(
            check_id="target.imbalance",
            category="Target Quality",
            title=f"Class distribution: {col}",
            description="Target class distribution is within the configured balance threshold.",
            status=FindingStatus.PASS,
            severity=Severity.INFO,
            observed_value=f"majority {majority} / minority {minority} (ratio {ratio:.2f})",
            threshold=f"ratio < {fmt(warn_at, 0)}",
            columns=[col],
            evidence={
                "column": col,
                "majority_class": str(counts.index[0]),
                "minority_class": str(counts.index[-1]),
                "majority_count": majority,
                "minority_count": minority,
                "ratio": round(float(ratio) if np.isfinite(ratio) else 0.0, 2),
                "class_counts": {str(k): int(v) for k, v in counts.items()},
            },
            risk="",
            recommendation="",
        )
    severity = Severity.HIGH if ratio >= warn_at * 10 else Severity.MEDIUM
    return CheckResult(
        check_id="target.imbalance",
        category="Target Quality",
        title=f"Imbalanced target: {col}",
        description="The majority/minority class ratio exceeds the configured warning threshold.",
        status=FindingStatus.WARNING,
        severity=severity,
        observed_value=f"ratio {ratio:.2f} (majority {majority}, minority {minority})",
        threshold=f"ratio < {fmt(warn_at, 0)}",
        columns=[col],
        evidence={
            "column": col,
            "majority_class": str(counts.index[0]),
            "minority_class": str(counts.index[-1]),
            "majority_count": majority,
            "minority_count": minority,
            "ratio": round(float(ratio) if np.isfinite(ratio) else 0.0, 2),
            "class_counts": {str(k): int(v) for k, v in counts.items()},
        },
        risk="Rare classes can be under-represented in verification metrics.",
        recommendation="Engineering review required: consider stratified splits and class-specific metrics.",
    )


def _numeric_target(ctx: AnalysisContext, col: str, profile) -> list[CheckResult]:
    results: list[CheckResult] = []
    missing_pct = profile.missing_pct
    if missing_pct > 0:
        status = FindingStatus.FAIL if missing_pct >= 50.0 else FindingStatus.WARNING
        results.append(
            CheckResult(
                check_id="target.missing_values",
                category="Target Quality",
                title=f"Missing values in numeric target: {col}",
                description="The numeric target column contains missing values.",
                status=status,
                severity=Severity.HIGH if status is FindingStatus.FAIL else Severity.MEDIUM,
                observed_value=f"{profile.missing_count} missing ({missing_pct:.2f}%)",
                threshold="0% missing in target",
                columns=[col],
                evidence={"column": col, "missing_count": profile.missing_count, "missing_pct": missing_pct},
                risk="Missing targets reduce the effective verification sample.",
                recommendation="Investigate how missing targets arise; rows without targets need explicit handling.",
            )
        )
    results.append(
        CheckResult(
            check_id="target.numeric_profile",
            category="Target Quality",
            title=f"Numeric target profile: {col}",
            description="Descriptive statistics of the numeric target.",
            status=FindingStatus.PASS,
            severity=Severity.INFO,
            observed_value=f"min {fmt(profile.min)} max {fmt(profile.max)} mean {fmt(profile.mean)}",
            threshold="informational",
            columns=[col],
            evidence={
                "column": col,
                "min": profile.min,
                "max": profile.max,
                "mean": profile.mean,
                "median": profile.median,
                "std": profile.std,
            },
            risk="",
            recommendation="",
        )
    )
    if profile.outlier_count:
        results.append(
            CheckResult(
                check_id="target.outliers",
                category="Target Quality",
                title=f"Possible outliers in numeric target: {col}",
                description="Values outside the IQR fence detected in the target. Possible statistical anomalies.",
                status=FindingStatus.WARNING,
                severity=Severity.LOW,
                observed_value=f"{profile.outlier_count} outliers",
                threshold="IQR fence",
                columns=[col],
                evidence={
                    "column": col,
                    "outlier_count": profile.outlier_count,
                    "outlier_ratio": profile.outlier_ratio,
                },
                risk="Extreme target values can dominate regression metrics.",
                recommendation="Review extreme target values before model verification.",
            )
        )
    return results


def run(ctx: AnalysisContext) -> list[CheckResult]:
    col = ctx.target_column
    if not col:
        return [_not_configured(ctx)]
    if col not in ctx.df.columns:
        return [_missing_target_column(ctx, col)]
    profile = ctx.profile_by_name[col]
    if profile.inferred_type in NUMERIC_TYPES:
        return _numeric_target(ctx, col, profile)
    return [_categorical_target(ctx, col, profile)]
