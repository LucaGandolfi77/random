"""SQLAlchemy ORM models.

Importing the package registers every table on ``Base.metadata``:
- project.py   -> Project, AnalysisConfig
- dataset.py   -> Dataset
- analysis.py  -> AnalysisRun, Finding, ScoreResult
- audit.py     -> AuditEvent, Report
"""

from app.assurance import models as assurance_models
from app.models import analysis, audit, dataset, project

__all__ = ["analysis", "assurance_models", "audit", "dataset", "portfolio_models", "project"]
