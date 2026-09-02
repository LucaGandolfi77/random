"""Shared context and helpers for dataset analyzers.

An ``AnalysisContext`` bundles the parsed DataFrame, per-column profiles and
the project analysis configuration so each check stays a pure function of
(``context``) -> ``list[CheckResult]``.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Any

import numpy as np
import pandas as pd

from app.schemas.enums import FindingStatus, Severity

# Category vocabulary shared by findings and the score.
SCORE_CATEGORIES: tuple[str, ...] = (
    "Structure",
    "Completeness",
    "Consistency",
    "Duplicates",
    "Statistical Quality",
    "Target Quality",
    "Time Quality",
    "Traceability",
)

# Informational types used for display and checks.
TYPE_INTEGER = "integer"
TYPE_FLOAT = "float"
TYPE_BOOLEAN = "boolean"
TYPE_CATEGORICAL = "categorical"
TYPE_TEXT = "text"
TYPE_DATETIME = "datetime"

NUMERIC_TYPES = {TYPE_INTEGER, TYPE_FLOAT}
HIGH_CARDINALITY_CATEGORIES = 1000


@dataclass
class CheckResult:
    """Normalized output of one check (one or more per check id)."""

    check_id: str
    category: str
    title: str
    description: str
    status: FindingStatus
    severity: Severity
    observed_value: str = ""
    threshold: str = ""
    columns: list[str] = field(default_factory=list)
    evidence: dict[str, Any] = field(default_factory=dict)
    risk: str = ""
    recommendation: str = ""


@dataclass
class ColumnProfile:
    name: str
    index: int
    inferred_type: str
    missing_count: int
    missing_pct: float
    non_null_count: int
    unique_count: int

    # Numeric
    numeric: bool = False
    min: float | None = None
    max: float | None = None
    mean: float | None = None
    median: float | None = None
    std: float | None = None
    q1: float | None = None
    q3: float | None = None
    zero_ratio: float = 0.0
    outlier_count: int = 0
    outlier_ratio: float = 0.0

    # Categorical
    categorical: bool = False
    category_count: int = 0
    dominant_pct: float = 0.0
    dominant_value: str = ""
    rare_category_count: int = 0
    unique_ratio: float = 0.0

    # Datetime
    datetime: bool = False
    type_compat_issues: int = 0
    sample_type_issue_values: list[Any] = field(default_factory=list)


@dataclass
class AnalysisContext:
    df: pd.DataFrame
    profiles: list[ColumnProfile]
    config: dict[str, Any]
    sha256: str
    row_count: int
    column_count: int
    target_column: str | None = None
    timestamp_column: str | None = None
    id_column: str | None = None

    profile_by_name: dict[str, ColumnProfile] = field(default_factory=dict, init=False)

    def __post_init__(self) -> None:
        self.profile_by_name = {p.name: p for p in self.profiles}


def _infer_type(series: pd.Series) -> str:
    if pd.api.types.is_bool_dtype(series):
        return TYPE_BOOLEAN
    if pd.api.types.is_integer_dtype(series):
        return TYPE_INTEGER
    if pd.api.types.is_float_dtype(series):
        return TYPE_FLOAT
    if isinstance(series.dtype, pd.DatetimeTZDtype) or pd.api.types.is_datetime64_any_dtype(series):
        return TYPE_DATETIME
    if pd.api.types.is_object_dtype(series) or pd.api.types.is_string_dtype(series):
        unique = series.nunique(dropna=True)
        if unique <= 50:
            return TYPE_CATEGORICAL
        return TYPE_TEXT
    return TYPE_TEXT


def _safe_float(value: Any) -> float | None:
    try:
        f = float(value)
        return f if math.isfinite(f) else None
    except (TypeError, ValueError):
        return None


def build_column_profile(name: str, index: int, series: pd.Series) -> ColumnProfile:
    """Compute the deterministic profile of a single column."""
    total = len(series)
    missing = int(series.isna().sum())
    non_null = total - missing
    missing_pct = round(100.0 * missing / total, 2) if total else 0.0
    unique = int(series.nunique(dropna=True)) if non_null else 0
    profile = ColumnProfile(
        name=name,
        index=index,
        inferred_type=_infer_type(series),
        missing_count=missing,
        missing_pct=missing_pct,
        non_null_count=non_null,
        unique_count=unique,
    )

    if profile.inferred_type in NUMERIC_TYPES:
        profile.numeric = True
        values = pd.to_numeric(series, errors="coerce").dropna()
        if len(values):
            profile.min = float(values.min())
            profile.max = float(values.max())
            profile.mean = round(float(values.mean()), 4)
            profile.median = round(float(values.median()), 4)
            profile.std = round(float(values.std(ddof=0)), 4)
            q1, q3 = values.quantile([0.25, 0.75])
            profile.q1 = round(float(q1), 4)
            profile.q3 = round(float(q3), 4)
            profile.zero_ratio = round(float((values == 0).mean()), 4)
            q1v, q3v = float(q1), float(q3)
            iqr = q3v - q1v
            if iqr > 0:
                lo, hi = q1v - 1.5 * iqr, q3v + 1.5 * iqr
                outliers = values[(values < lo) | (values > hi)]
                profile.outlier_count = int(len(outliers))
                profile.outlier_ratio = round(float(len(outliers)) / len(values), 4)
    elif profile.inferred_type == TYPE_CATEGORICAL:
        profile.categorical = True
        profile.category_count = unique
        profile.unique_ratio = round(unique / non_null, 4) if non_null else 0.0
        if non_null:
            counts = series.value_counts(dropna=True)
            profile.dominant_value = str(counts.index[0])
            profile.dominant_pct = round(100.0 * counts.iloc[0] / non_null, 2)
    elif profile.inferred_type == TYPE_DATETIME:
        profile.datetime = True

    # Values that do not fit the prevailing type (object columns that are
    # mostly numeric but contain stray tokens such as "ERR").
    if profile.inferred_type in (TYPE_CATEGORICAL, TYPE_TEXT):
        numeric_values = pd.to_numeric(series, errors="coerce")
        numeric_count = int(numeric_values.notna().sum())
        if numeric_count > 0 and non_null > 0 and numeric_count / non_null >= 0.9:
            bad_mask = numeric_values.isna() & series.notna()
            profile.type_compat_issues = int(bad_mask.sum())
            profile.sample_type_issue_values = [str(v) for v in series[bad_mask].head(5).tolist()]
    return profile


def build_context(
    df: pd.DataFrame,
    config: dict[str, Any],
    sha256: str,
) -> AnalysisContext:
    """Build an AnalysisContext from a parsed DataFrame."""
    if not isinstance(df.columns, pd.Index):
        df = pd.DataFrame(df)
    profiles = [build_column_profile(str(col), idx, df[col]) for idx, col in enumerate(df.columns)]
    ctx = AnalysisContext(
        df=df,
        profiles=profiles,
        config=config,
        sha256=sha256,
        row_count=int(len(df)),
        column_count=int(len(df.columns)),
        target_column=config.get("target_column"),
        timestamp_column=config.get("timestamp_column"),
        id_column=config.get("id_column"),
    )
    return ctx


def pct_str(ratio: float) -> str:
    return f"{100.0 * ratio:.2f}%"


def fmt(value: Any, digits: int = 4) -> str:
    """Deterministic string formatting for observed values."""
    if value is None:
        return ""
    if isinstance(value, float):
        return f"{value:.{digits}f}"
    return str(value)


def as_float_array(series: pd.Series) -> np.ndarray:
    return pd.to_numeric(series, errors="coerce").dropna().to_numpy(dtype=float)


def status_of(value: bool) -> FindingStatus:
    return FindingStatus.PASS if value else FindingStatus.FAIL
