"""Reset week-3/5 demo portfolio data.

Non-destructive by default (prints what it would do). Use --reset-portfolio to
delete and re-import the synthetic portfolio projects. Real user data created in
other modules (week-1 analysis projects) is never touched.
"""
import argparse

from app.core.config import get_settings
from app.database.session import SessionLocal, init_db
from app.portfolio.models import (
    PortfolioDataQuality,
    PortfolioDeploymentDecision,
    PortfolioEvidence,
    PortfolioFmeaItem,
    PortfolioLimitation,
    PortfolioModelCard,
    PortfolioMonitoringStrategy,
    PortfolioOdd,
    PortfolioPackage,
    PortfolioProject,
    PortfolioRequirement,
    PortfolioRisk,
    PortfolioTestCase,
    PortfolioTestResult,
)
from app.portfolio.seed import seed_portfolio

MODELS = [
    PortfolioPackage, PortfolioDeploymentDecision, PortfolioFmeaItem, PortfolioLimitation,
    PortfolioRisk, PortfolioTestResult, PortfolioTestCase, PortfolioEvidence, PortfolioRequirement,
    PortfolioMonitoringStrategy, PortfolioOdd, PortfolioDataQuality, PortfolioModelCard, PortfolioProject,
]


def main() -> int:
    parser = argparse.ArgumentParser(description="Reset synthetic demo portfolio data")
    parser.add_argument("--reset-portfolio", action="store_true", help="Delete and re-import the four demo projects")
    args = parser.parse_args()
    if not args.reset_portfolio:
        print("Dry run: pass --reset-portfolio to delete and re-import the synthetic demo portfolio.")
        return 0
    settings = get_settings()
    settings.ensure_directories()
    init_db()
    with SessionLocal() as db:
        for model in MODELS:
            db.query(model).delete(synchronize_session=False)
        created, _updated = seed_portfolio(db, settings)
    print(f"Demo portfolio reset complete ({created} projects re-imported).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
