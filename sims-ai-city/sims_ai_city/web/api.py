"""FastAPI application exposing the city inspector and simulation controls."""

from __future__ import annotations

from pathlib import Path
from threading import Lock

from fastapi import FastAPI, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from sims_ai_city.config import SimulationConfig
from sims_ai_city.simulation.engine import SimulationEngine, boot_engine

STATIC_DIR = Path(__file__).resolve().parent / "static"


class RuntimeManager:
    """Serialize stateful simulation mutations behind a small lock."""

    def __init__(self, config: SimulationConfig) -> None:
        self.config = config
        self.lock = Lock()

    def load(self) -> SimulationEngine:
        return boot_engine(self.config)

    def reset(self, seed: int | None = None) -> SimulationEngine:
        config = self.config.model_copy(update={"random_seed": seed or self.config.random_seed})
        engine = SimulationEngine(config)
        engine.save()
        return engine


def create_app(config: SimulationConfig | None = None) -> FastAPI:
    """Create the FastAPI app used by the local inspector."""

    runtime = RuntimeManager(config or SimulationConfig())
    app = FastAPI(title="Sims AI City", version="0.1.0")
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

    @app.get("/")
    def index() -> FileResponse:
        return FileResponse(STATIC_DIR / "index.html")

    @app.get("/api/status")
    def get_status() -> dict[str, object]:
        with runtime.lock:
            return runtime.load().inspector_snapshot()

    @app.post("/api/step")
    def step(days: int = Query(default=7, ge=1, le=365)) -> dict[str, object]:
        with runtime.lock:
            engine = runtime.load()
            events = engine.simulate_days(days)
            engine.save()
            snapshot = engine.inspector_snapshot()
            snapshot["new_headlines"] = [event.headline for event in events[-18:]]
            snapshot["simulated_days"] = days
            return snapshot

    @app.post("/api/reset")
    def reset(seed: int | None = Query(default=None, ge=1)) -> dict[str, object]:
        with runtime.lock:
            engine = runtime.reset(seed=seed)
            snapshot = engine.inspector_snapshot()
            snapshot["reset_seed"] = engine.config.random_seed
            return snapshot

    @app.get("/api/export")
    def export_snapshot() -> dict[str, object]:
        with runtime.lock:
            snapshot = runtime.load().inspector_snapshot()
            snapshot["exported"] = True
            return snapshot

    return app


app = create_app()


def serve_app(port: int = 8123) -> None:
    """Run the local inspector server."""

    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=port, reload=False)
