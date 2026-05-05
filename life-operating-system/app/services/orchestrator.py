from __future__ import annotations

from app.agents.energy_coach import EnergyCoachAgent
from app.agents.habit_auditor import HabitAuditorAgent
from app.agents.planner import PlannerAgent
from app.agents.reflection_guide import ReflectionGuideAgent
from app.agents.weekly_planner import WeeklyPlannerAgent
from app.schemas import DailyCheckinInput, HabitCreateInput, HabitLogInput, ReflectionInput, WeeklyPlanningInput
from app.services.memory import MemoryService
from app.services.rules import today_iso, week_start_for


class LifeOperatingSystem:
    def __init__(
        self,
        memory: MemoryService,
        planner: PlannerAgent,
        weekly_planner: WeeklyPlannerAgent,
        energy_coach: EnergyCoachAgent,
        habit_auditor: HabitAuditorAgent,
        reflection_guide: ReflectionGuideAgent,
    ) -> None:
        self.memory = memory
        self.planner = planner
        self.weekly_planner = weekly_planner
        self.energy_coach = energy_coach
        self.habit_auditor = habit_auditor
        self.reflection_guide = reflection_guide

    def save_checkin(self, payload: DailyCheckinInput) -> None:
        self.memory.save_daily_checkin(payload)

    def generate_plan(self, plan_date: str | None = None) -> dict[str, object] | None:
        resolved_date = plan_date or today_iso()
        checkin = self.memory.get_checkin(resolved_date)
        if not checkin:
            return None
        profile_data = self.memory.get_profile()
        energy_profile = profile_data.get("energy_profile", {})
        carryover_context = self.memory.get_daily_carryover_context(resolved_date)
        plan = self.planner.plan(
            checkin=checkin,
            baseline_sleep_hours=float(energy_profile.get("baseline_sleep_hours", 7.5)),
            baseline_energy=int(energy_profile.get("baseline_energy", 7)),
            recent_plan_stats=self.memory.get_recent_plan_stats(limit=5),
            weekly_focus_blocks=carryover_context.get("weekly_focus_blocks", []),
            carryover_tasks=carryover_context.get("carryover_tasks", []),
        )
        coach_message = self.energy_coach.coach(checkin, plan.model_dump(), self.memory.get_recent_reflections(limit=3))
        final_plan = plan.model_copy(update={"coach_message": coach_message})
        self.memory.save_daily_plan(resolved_date, final_plan)
        self.refresh_weekly_insight(resolved_date)
        return self.memory.get_plan(resolved_date)

    def create_habit(self, payload: HabitCreateInput) -> None:
        self.memory.create_habit(payload)

    def log_habit(self, habit_id: int, payload: HabitLogInput) -> None:
        self.memory.save_habit_log(habit_id, payload)
        self.refresh_weekly_insight(payload.log_date)

    def save_reflection(self, payload: ReflectionInput) -> tuple[str, str]:
        extracted_signal, tone = self.reflection_guide.synthesize(payload, self.memory.get_recent_reflections(limit=5))
        self.memory.save_reflection(payload, extracted_signal=extracted_signal, tone=tone)
        self.refresh_weekly_insight(payload.reflection_date)
        return extracted_signal, tone

    def reflection_questions(self, reflection_date: str | None = None) -> list[str]:
        resolved_date = reflection_date or today_iso()
        return self.reflection_guide.build_questions(
            self.memory.get_checkin(resolved_date),
            self.memory.get_plan(resolved_date),
        )

    def save_weekly_plan(self, payload: WeeklyPlanningInput) -> dict[str, object]:
        plan = self.weekly_planner.plan(
            payload=payload,
            recent_checkins=self.memory.get_recent_checkins(limit=14),
            recent_plan_stats=self.memory.get_recent_plan_stats(limit=7),
        )
        self.memory.save_weekly_plan(payload, plan)
        self.refresh_weekly_insight(payload.week_start)
        return self.memory.get_weekly_plan(payload.week_start) or {}

    def refresh_weekly_insight(self, insight_date: str | None = None) -> dict[str, str]:
        resolved_date = insight_date or today_iso()
        insight = self.habit_auditor.weekly_review(
            insight_date=resolved_date,
            habit_logs=self.memory.get_recent_habit_logs(days=7),
            recent_checkins=self.memory.get_recent_checkins(limit=7),
            recent_plan_stats=self.memory.get_recent_plan_stats(limit=7),
            recent_reflections=self.memory.get_recent_reflections(limit=7),
        )
        self.memory.save_weekly_insight(resolved_date, **insight)
        return insight

    def dashboard(self, target_date: str | None = None) -> dict[str, object]:
        dashboard = self.memory.build_dashboard(target_date)
        dashboard["reflection_questions"] = self.reflection_questions(target_date)
        return dashboard

    def weekly_dashboard(self, week_start: str | None = None) -> dict[str, object]:
        resolved_week = week_start or week_start_for(today_iso())
        return self.memory.build_weekly_dashboard(resolved_week)

    def export_memory(self) -> dict[str, object]:
        return self.memory.export_snapshot()

    def export_memory_csv(self) -> bytes:
        return self.memory.export_csv_bundle()

    def import_memory(self, snapshot: dict[str, object]) -> None:
        self.memory.import_snapshot(snapshot)
