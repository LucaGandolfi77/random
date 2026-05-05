from __future__ import annotations

import json

from fastapi import FastAPI, File, Form, Request, UploadFile
from fastapi.responses import RedirectResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.agents.energy_coach import EnergyCoachAgent
from app.agents.habit_auditor import HabitAuditorAgent
from app.agents.planner import PlannerAgent
from app.agents.reflection_guide import ReflectionGuideAgent
from app.agents.weekly_planner import WeeklyPlannerAgent
from app.config import BASE_DIR, get_settings
from app.schemas import DailyCheckinInput, HabitCreateInput, HabitLogInput, ReflectionInput, WeeklyPlanningInput
from app.services.llm import OpenRouterProvider, build_llm_provider
from app.services.memory import MemoryService
from app.services.orchestrator import LifeOperatingSystem
from app.services.rules import today_iso, week_start_for

settings = get_settings()
memory = MemoryService(settings.database_path)
memory.bootstrap_defaults()
llm_provider = build_llm_provider(settings, cache=memory)
life_os = LifeOperatingSystem(
    memory=memory,
    planner=PlannerAgent(llm_provider),
    weekly_planner=WeeklyPlannerAgent(llm_provider),
    energy_coach=EnergyCoachAgent(llm_provider),
    habit_auditor=HabitAuditorAgent(llm_provider),
    reflection_guide=ReflectionGuideAgent(llm_provider),
)

def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name)
    templates = Jinja2Templates(directory=str(BASE_DIR / "app" / "templates"))
    app.mount("/static", StaticFiles(directory=str(BASE_DIR / "app" / "static")), name="static")

    @app.get("/")
    def index(request: Request, date: str | None = None, message: str | None = None):
        target_date = date or today_iso()
        dashboard = life_os.dashboard(target_date)
        model_name = llm_provider.model if isinstance(llm_provider, OpenRouterProvider) else "rules-first"
        return templates.TemplateResponse(
            request,
            "index.html",
            {
                "app_name": settings.app_name,
                "request": request,
                "dashboard": dashboard,
                "message": message,
                "today": target_date,
                "openrouter_enabled": bool(settings.openrouter_api_key),
                "openrouter_profile": settings.openrouter_profile,
                "openrouter_model_name": model_name,
            },
        )

    @app.get("/weekly")
    def weekly(request: Request, week_start: str | None = None, message: str | None = None):
        resolved_week = week_start or week_start_for(today_iso())
        weekly_dashboard = life_os.weekly_dashboard(resolved_week)
        return templates.TemplateResponse(
            request,
            "weekly.html",
            {
                "app_name": settings.app_name,
                "request": request,
                "weekly": weekly_dashboard,
                "message": message,
                "today": today_iso(),
                "openrouter_enabled": bool(settings.openrouter_api_key),
                "openrouter_profile": settings.openrouter_profile,
                "openrouter_model_name": llm_provider.model if isinstance(llm_provider, OpenRouterProvider) else "rules-first",
            },
        )

    @app.get("/api/dashboard")
    def dashboard_api(date: str | None = None):
        return life_os.dashboard(date or today_iso())

    @app.get("/api/weekly")
    def weekly_api(week_start: str | None = None):
        return life_os.weekly_dashboard(week_start or week_start_for(today_iso()))

    @app.post("/checkin")
    def save_checkin(
        checkin_date: str = Form(...),
        sleep_hours: float = Form(...),
        sleep_quality: int = Form(...),
        perceived_energy: int = Form(...),
        mood: int = Form(...),
        stress_level: int = Form(...),
        context_label: str = Form(...),
        available_minutes: int = Form(...),
        focus_text: str = Form(""),
        constraints_text: str = Form(""),
        required_tasks_text: str = Form(""),
    ):
        payload = DailyCheckinInput(
            checkin_date=checkin_date,
            sleep_hours=sleep_hours,
            sleep_quality=sleep_quality,
            perceived_energy=perceived_energy,
            mood=mood,
            stress_level=stress_level,
            context_label=context_label,
            available_minutes=available_minutes,
            focus_text=focus_text,
            constraints_text=constraints_text,
            required_tasks_text=required_tasks_text,
        )
        life_os.save_checkin(payload)
        life_os.generate_plan(checkin_date)
        return RedirectResponse(url=f"/?date={checkin_date}&message=Check-in%20saved", status_code=303)

    @app.post("/plan/generate")
    def generate_plan(plan_date: str = Form(...)):
        life_os.generate_plan(plan_date)
        return RedirectResponse(url=f"/?date={plan_date}&message=Plan%20generated", status_code=303)

    @app.post("/tasks/{task_id}/status")
    def update_task_status(task_id: int, plan_date: str = Form(...), status: str = Form(...)):
        memory.update_task_status(task_id, status)
        life_os.refresh_weekly_insight(plan_date)
        return RedirectResponse(url=f"/?date={plan_date}&message=Task%20updated", status_code=303)

    @app.post("/habits")
    def create_habit(
        name: str = Form(...),
        target_frequency: int = Form(...),
        minimum_viable: str = Form(...),
        current_date: str = Form(...),
    ):
        payload = HabitCreateInput(name=name, target_frequency=target_frequency, minimum_viable=minimum_viable)
        life_os.create_habit(payload)
        return RedirectResponse(url=f"/?date={current_date}&message=Habit%20added", status_code=303)

    @app.post("/habits/{habit_id}/log")
    def log_habit(
        habit_id: int,
        log_date: str = Form(...),
        completed: str = Form(...),
        note: str = Form(""),
    ):
        payload = HabitLogInput(log_date=log_date, completed=completed == "true", note=note)
        life_os.log_habit(habit_id, payload)
        return RedirectResponse(url=f"/?date={log_date}&message=Habit%20saved", status_code=303)

    @app.post("/reflection")
    def save_reflection(
        reflection_date: str = Form(...),
        wins_text: str = Form(""),
        friction_text: str = Form(""),
        gratitude_text: str = Form(""),
        tomorrow_adjustment: str = Form(""),
    ):
        payload = ReflectionInput(
            reflection_date=reflection_date,
            wins_text=wins_text,
            friction_text=friction_text,
            gratitude_text=gratitude_text,
            tomorrow_adjustment=tomorrow_adjustment,
        )
        life_os.save_reflection(payload)
        return RedirectResponse(url=f"/?date={reflection_date}&message=Reflection%20saved", status_code=303)

    @app.post("/weekly")
    def save_weekly_plan(
        week_start: str = Form(...),
        weekly_theme: str = Form(""),
        top_priorities_text: str = Form(...),
        known_constraints_text: str = Form(""),
        focus_areas_text: str = Form(""),
        non_negotiables_text: str = Form(""),
    ):
        payload = WeeklyPlanningInput(
            week_start=week_start,
            weekly_theme=weekly_theme,
            top_priorities_text=top_priorities_text,
            known_constraints_text=known_constraints_text,
            focus_areas_text=focus_areas_text,
            non_negotiables_text=non_negotiables_text,
        )
        life_os.save_weekly_plan(payload)
        return RedirectResponse(url=f"/weekly?week_start={week_start}&message=Weekly%20plan%20saved", status_code=303)

    @app.get("/memory/export")
    def export_memory():
        payload = json.dumps(life_os.export_memory(), indent=2)
        return Response(
            content=payload,
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="life-os-memory-{today_iso()}.json"'},
        )

    @app.get("/memory/export/csv")
    def export_memory_csv():
        payload = life_os.export_memory_csv()
        return Response(
            content=payload,
            media_type="application/zip",
            headers={"Content-Disposition": f'attachment; filename="life-os-memory-{today_iso()}-csv.zip"'},
        )

    @app.post("/memory/import")
    async def import_memory(file: UploadFile = File(...)):
        raw = await file.read()
        snapshot = json.loads(raw.decode("utf-8"))
        life_os.import_memory(snapshot)
        return RedirectResponse(url="/?message=Memory%20imported", status_code=303)

    return app


app = create_app()
