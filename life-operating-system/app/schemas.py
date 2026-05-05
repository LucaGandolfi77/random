from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

TaskStatus = Literal["pending", "done", "skipped", "moved"]
PlanMode = Literal["recovery", "conservative", "balanced", "ambitious"]
LoadLevel = Literal["light", "moderate", "heavy"]


class DailyCheckinInput(BaseModel):
    checkin_date: str
    sleep_hours: float = Field(ge=0, le=16)
    sleep_quality: int = Field(ge=1, le=10)
    perceived_energy: int = Field(ge=1, le=10)
    mood: int = Field(ge=1, le=10)
    stress_level: int = Field(ge=1, le=10)
    context_label: str
    available_minutes: int = Field(ge=30, le=1440)
    focus_text: str = ""
    constraints_text: str = ""
    required_tasks_text: str = ""


class TaskDraft(BaseModel):
    title: str
    category: str
    priority_score: float
    estimated_minutes: int
    is_protected: bool = False
    reason: str = ""


class PlanResult(BaseModel):
    plan_mode: PlanMode
    energy_score: float
    summary: str
    coach_message: str
    tasks: list[TaskDraft]


class WeeklyPlanningInput(BaseModel):
    week_start: str
    weekly_theme: str = ""
    top_priorities_text: str
    known_constraints_text: str = ""
    focus_areas_text: str = ""
    non_negotiables_text: str = ""


class WeeklyBlockDraft(BaseModel):
    weekday: str
    block_label: str
    objective: str
    load: LoadLevel


class WeeklyPlanResult(BaseModel):
    week_start: str
    weekly_theme: str
    summary: str
    risk_note: str
    recovery_note: str
    focus_blocks: list[WeeklyBlockDraft]


class HabitCreateInput(BaseModel):
    name: str
    target_frequency: int = Field(default=5, ge=1, le=7)
    minimum_viable: str


class ReflectionInput(BaseModel):
    reflection_date: str
    wins_text: str = ""
    friction_text: str = ""
    gratitude_text: str = ""
    tomorrow_adjustment: str = ""


class TaskStatusInput(BaseModel):
    status: TaskStatus


class HabitLogInput(BaseModel):
    log_date: str
    completed: bool
    note: str = ""
