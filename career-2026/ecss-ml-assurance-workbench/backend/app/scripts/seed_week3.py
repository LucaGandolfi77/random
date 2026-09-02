"""CLI entrypoint for the week-3 portfolio seed (dockerized via make seed-week3)."""

from app.core.config import get_settings
from app.database.session import SessionLocal, init_db
from app.portfolio.seed import seed_portfolio

init_db()
settings = get_settings()
settings.ensure_directories()
with SessionLocal() as db:
    created, updated = seed_portfolio(db, settings)
    print(f"portfolio seed complete (created={created}, updated={updated})")
