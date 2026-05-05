from __future__ import annotations

import json

from fastapi import FastAPI, File, Form, Request, UploadFile
from fastapi.responses import RedirectResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.agents.finance import FinanceAgent
from app.agents.founder import FounderAgent
from app.agents.market import MarketAgent
from app.agents.narrative import NarrativeReporterAgent
from app.agents.operations import OperationsAgent
from app.agents.strategy import StrategyAgent
from app.config import BASE_DIR, get_settings
from app.schemas import SimulationActionInput, StartupCreateInput
from app.services.llm import OpenRouterProvider, build_llm_provider
from app.services.memory import MemoryService
from app.services.orchestrator import ItalianStartupSimulator

settings = get_settings()
memory = MemoryService(settings.database_path)
llm_provider = build_llm_provider(settings, cache=memory)
simulator = ItalianStartupSimulator(
    memory=memory,
    founder_agent=FounderAgent(llm_provider),
    market_agent=MarketAgent(llm_provider),
    finance_agent=FinanceAgent(llm_provider),
    operations_agent=OperationsAgent(llm_provider),
    strategy_agent=StrategyAgent(llm_provider),
    narrative_agent=NarrativeReporterAgent(llm_provider),
)


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name)
    templates = Jinja2Templates(directory=str(BASE_DIR / "app" / "templates"))
    app.mount("/static", StaticFiles(directory=str(BASE_DIR / "app" / "static")), name="static")

    def common_context(request: Request, message: str | None = None) -> dict[str, object]:
        return {
            "app_name": settings.app_name,
            "request": request,
            "message": message,
            "openrouter_enabled": bool(settings.openrouter_api_key),
            "openrouter_profile": settings.openrouter_profile,
            "openrouter_model_name": llm_provider.model if isinstance(llm_provider, OpenRouterProvider) else "rules-only",
        }

    @app.get("/")
    def index(request: Request, message: str | None = None):
        if not memory.has_startup():
            return templates.TemplateResponse(request, "create.html", {**common_context(request, message), "defaults": settings})
        return templates.TemplateResponse(request, "dashboard.html", {**common_context(request, message), "dashboard": simulator.dashboard()})

    @app.post("/startup")
    def create_startup(
        startup_name: str = Form(...),
        sector: str = Form(...),
        city: str = Form(...),
        region: str = Form(...),
        business_model: str = Form(...),
        product_type: str = Form(...),
        target_market: str = Form(...),
        founding_team: str = Form(...),
        starting_capital: float = Form(...),
        founder_name: str = Form(...),
        founder_ambition: int = Form(...),
        founder_risk_tolerance: str = Form(...),
        initial_assumptions: str = Form(""),
    ):
        simulator.create_startup(
            StartupCreateInput(
                startup_name=startup_name,
                sector=sector,
                city=city,
                region=region,
                business_model=business_model,
                product_type=product_type,
                target_market=target_market,
                founding_team=founding_team,
                starting_capital=starting_capital,
                founder_name=founder_name,
                founder_ambition=founder_ambition,
                founder_risk_tolerance=founder_risk_tolerance,
                initial_assumptions=initial_assumptions,
            )
        )
        return RedirectResponse(url="/?message=Startup%20created", status_code=303)

    @app.post("/simulate")
    def simulate(cycle_type: str = Form(...), decision_type: str = Form(...), note: str = Form("")):
        simulator.simulate(SimulationActionInput(cycle_type=cycle_type, decision_type=decision_type, note=note))
        return RedirectResponse(url="/?message=Simulation%20advanced", status_code=303)

    @app.get("/events")
    def events(request: Request, message: str | None = None):
        return templates.TemplateResponse(request, "events.html", {**common_context(request, message), "dashboard": simulator.dashboard()})

    @app.get("/finance")
    def finance(request: Request, message: str | None = None):
        return templates.TemplateResponse(request, "finance.html", {**common_context(request, message), "dashboard": simulator.dashboard()})

    @app.get("/strategy")
    def strategy(request: Request, message: str | None = None):
        return templates.TemplateResponse(request, "strategy.html", {**common_context(request, message), "dashboard": simulator.dashboard()})

    @app.get("/branches")
    def branches(request: Request, message: str | None = None):
        dashboard = simulator.dashboard() if memory.has_startup() else None
        return templates.TemplateResponse(request, "branches.html", {**common_context(request, message), "dashboard": dashboard, "comparison": None})

    @app.post("/branches/compare")
    def compare_branches(
        request: Request,
        cycle_type: str = Form(...),
        depth: int = Form(...),
        beam_width: int = Form(...),
        monte_carlo_runs: int = Form(...),
        noise_level: float = Form(...),
        decision_pool: list[str] = Form(...),
        note_focus_sales: str = Form(""),
        note_product_push: str = Form(""),
        note_apply_grant: str = Form(""),
        note_hire: str = Form(""),
        note_cut_costs: str = Form(""),
        note_pivot_services: str = Form(""),
        note_raise_round: str = Form(""),
        note_partnership: str = Form(""),
        note_compliance_sprint: str = Form(""),
    ):
        dashboard = simulator.dashboard() if memory.has_startup() else None
        comparison = simulator.compare_branch_tree(
            decisions=decision_pool,
            cycle_type=cycle_type,
            depth=depth,
            beam_width=beam_width,
            monte_carlo_runs=monte_carlo_runs,
            noise_level=noise_level,
            notes={
                "focus_sales": note_focus_sales,
                "product_push": note_product_push,
                "apply_grant": note_apply_grant,
                "hire": note_hire,
                "cut_costs": note_cut_costs,
                "pivot_services": note_pivot_services,
                "raise_round": note_raise_round,
                "partnership": note_partnership,
                "compliance_sprint": note_compliance_sprint,
            },
        )
        return templates.TemplateResponse(request, "branches.html", {**common_context(request, None), "dashboard": dashboard, "comparison": comparison})

    @app.get("/reports")
    def reports(request: Request, message: str | None = None):
        return templates.TemplateResponse(request, "reports.html", {**common_context(request, message), "dashboard": simulator.dashboard()})

    @app.get("/export")
    def export_view(request: Request, message: str | None = None):
        return templates.TemplateResponse(request, "export.html", {**common_context(request, message), "dashboard": simulator.dashboard() if memory.has_startup() else None})

    @app.get("/export/json")
    def export_json():
        payload = json.dumps(simulator.export_history(), indent=2)
        return Response(content=payload, media_type="application/json", headers={"Content-Disposition": 'attachment; filename="italian-startup-simulator-export.json"'})

    @app.get("/export/csv-pack")
    def export_csv_pack():
        payload = simulator.export_csv_pack()
        return Response(content=payload, media_type="application/zip", headers={"Content-Disposition": 'attachment; filename="italian-startup-simulator-report-pack.zip"'})

    @app.post("/import/json")
    async def import_json(file: UploadFile = File(...)):
        raw = await file.read()
        simulator.import_history(json.loads(raw.decode("utf-8")))
        return RedirectResponse(url="/?message=Simulation%20history%20imported", status_code=303)

    @app.get("/api/dashboard")
    def api_dashboard():
        return simulator.dashboard() if memory.has_startup() else {}

    return app


app = create_app()
