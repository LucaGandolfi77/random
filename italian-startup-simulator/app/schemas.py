from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

CycleType = Literal["week", "month"]
BusinessModel = Literal["saas", "marketplace", "commerce", "deeptech", "services", "fintech", "healthtech"]
FounderRisk = Literal["low", "balanced", "high"]
DecisionType = Literal["focus_sales", "product_push", "apply_grant", "hire", "cut_costs", "pivot_services", "raise_round", "partnership", "compliance_sprint"]


class StartupCreateInput(BaseModel):
    startup_name: str
    sector: str
    city: str
    region: str
    business_model: BusinessModel
    product_type: str
    target_market: str
    founding_team: str
    starting_capital: float = Field(ge=1000)
    founder_name: str
    founder_ambition: int = Field(ge=1, le=10)
    founder_risk_tolerance: FounderRisk
    initial_assumptions: str = ""


class SimulationActionInput(BaseModel):
    cycle_type: CycleType
    decision_type: DecisionType
    note: str = ""


class StrategyMemoInput(BaseModel):
    memo_date: str
    body: str


class StartupProfile(BaseModel):
    startup_name: str
    sector: str
    city: str
    region: str
    business_model: str
    product_type: str
    target_market: str
    founding_team: str
    initial_assumptions: str


class FounderProfile(BaseModel):
    founder_name: str
    ambition: int
    risk_tolerance: FounderRisk
    stress: float
    discipline: float
    conviction: float


class SimulationStateModel(BaseModel):
    cycle_number: int
    cycle_type: CycleType
    cash: float
    monthly_burn: float
    monthly_revenue: float
    runway_months: float
    founder_stress: float
    team_morale: float
    traction_score: float
    active_customers: int
    churn_risk: float
    product_maturity: float
    bureaucracy_pressure: float
    investor_attractiveness: float
    strategic_clarity: float
    reputation: float
    survival_probability: float
    market_pressure: float
    grants_probability: float
    investor_pipeline_score: float
    grant_backlog_score: float
    bureaucracy_backlog: float
    compliance_debt: float
    founder_equity: float
    investor_equity: float
    option_pool_equity: float
    employee_option_granted_equity: float
    employee_option_vested_equity: float
    employee_option_forfeited_equity: float
    employee_departures_count: int
    last_departure_summary: str
    outstanding_note_principal: float
    note_discount_rate: float
    note_valuation_cap: float
    last_note_summary: str
    cumulative_dilution: float
    last_term_sheet_summary: str
    delayed_payments_exposure: float
    agency_pivot_risk: float
    last_event_summary: str


class EventLogEntry(BaseModel):
    event_type: str
    severity: int
    title: str
    description: str
    impact_cash: float = 0.0
    impact_traction: float = 0.0
    impact_stress: float = 0.0


class StrategyMemo(BaseModel):
    headline: str
    recommendation: str
    confidence: str


class SimulationOutcome(BaseModel):
    state: SimulationStateModel
    events: list[EventLogEntry]
    strategy_options: list[dict[str, str]]
    report_text: str
    founder_note: str
    strategy_memo: StrategyMemo
    cap_table_round: dict[str, str | float] | None = None
    employee_option_grant: dict[str, str | float] | None = None
