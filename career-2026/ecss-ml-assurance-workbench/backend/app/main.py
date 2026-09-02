"""ECSS ML Assurance Workbench — FastAPI application entrypoint."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.errors import register_exception_handlers
from app.api.router import api_router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.core.version import TOOL_VERSION
from app.database.session import init_db

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    settings = get_settings()
    settings.ensure_directories()
    init_db()
    from app.assurance.seed import seed_registry
    from app.database.session import SessionLocal
    from app.portfolio.seed import seed_portfolio

    with SessionLocal() as db:
        created = seed_registry(db)
        if created:
            logger.info("assurance registry seeded with %s projects", created)
        portfolio_created, portfolio_updated = seed_portfolio(db, settings)
        if portfolio_created or portfolio_updated:
            logger.info("portfolio seeded (created=%s updated=%s)", portfolio_created, portfolio_updated)
    logger.info("startup complete environment=%s storage=%s", settings.environment, settings.storage_dir)
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(settings.log_level)

    app = FastAPI(
        title=settings.app_name,
        version=TOOL_VERSION,
        description=(
            "Engineering support tool inspired by ML verification, data assurance "
            "and risk-based testing principles for datasets used by embedded and "
            "space applications. Not a certification tool."
        ),
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    register_exception_handlers(app)
    app.include_router(api_router)

    @app.get("/", include_in_schema=False)
    def root() -> dict:
        return {"name": settings.app_name, "version": TOOL_VERSION, "docs": "/docs", "health": "/api/health"}

    return app


app = create_app()
