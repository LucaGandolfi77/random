"""API routes package."""

from fastapi import APIRouter

from app.api.routes import (
    analysis,
    assurance,
    assurance_engine,
    auth,
    audit,
    config,
    continuous,
    datasets,
    health,
    portfolio,
    projects,
    reports,
)

api_router = APIRouter(prefix="/api")
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(projects.router)
api_router.include_router(datasets.router)
api_router.include_router(config.router)
api_router.include_router(analysis.router)
api_router.include_router(reports.router)
api_router.include_router(audit.router)
api_router.include_router(assurance.router)
api_router.include_router(portfolio.router)
api_router.include_router(assurance_engine.router)
api_router.include_router(continuous.router)
