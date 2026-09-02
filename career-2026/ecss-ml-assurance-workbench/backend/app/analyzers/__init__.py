"""Analyzers package: deterministic dataset checks producing structured findings."""

from .context import AnalysisContext, ColumnProfile, build_context  # noqa: F401
from .registry import REGISTRY, CheckFunction, category_rank  # noqa: F401
