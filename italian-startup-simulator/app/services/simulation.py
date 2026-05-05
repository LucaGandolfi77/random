from __future__ import annotations

from dataclasses import dataclass
import hashlib
from math import ceil

from app.schemas import EventLogEntry, SimulationOutcome, SimulationStateModel, StrategyMemo

ITALY_CITY_FACTORS = {
    "milan": {"capital_access": 1.2, "bureaucracy": 1.0, "sales": 1.15, "talent": 1.15},
    "rome": {"capital_access": 1.0, "bureaucracy": 1.1, "sales": 1.0, "talent": 1.0},
    "turin": {"capital_access": 0.95, "bureaucracy": 1.0, "sales": 0.95, "talent": 1.05},
    "bologna": {"capital_access": 0.9, "bureaucracy": 0.95, "sales": 0.92, "talent": 1.0},
    "naples": {"capital_access": 0.8, "bureaucracy": 1.12, "sales": 0.88, "talent": 0.92},
}

REGION_FACTORS = {
    "lombardy": {"grant_speed": 1.12, "admin_drag": 0.95, "labor_pressure": 1.08},
    "lazio": {"grant_speed": 0.96, "admin_drag": 1.08, "labor_pressure": 1.05},
    "piedmont": {"grant_speed": 1.0, "admin_drag": 1.0, "labor_pressure": 1.0},
    "emilia-romagna": {"grant_speed": 1.08, "admin_drag": 0.92, "labor_pressure": 1.02},
    "campania": {"grant_speed": 0.9, "admin_drag": 1.15, "labor_pressure": 0.95},
}

REGIONAL_GRANT_CATALOG = {
    "lombardy": [
        {"name": "Bando Innovazione Lombardia", "focus": ["ai", "saas", "deeptech"], "stage": "pre-seed", "amount_eur": "25k-100k", "fit": 8.8, "speed": "medium", "open_month": 2, "close_month": 5, "allowed_models": ["saas", "deeptech", "marketplace"]},
        {"name": "Digital Export Voucher Lombardia", "focus": ["commerce", "saas", "services"], "stage": "early", "amount_eur": "10k-30k", "fit": 6.9, "speed": "fast", "open_month": 6, "close_month": 9, "allowed_models": ["saas", "services", "commerce"]},
        {"name": "Life Sciences Acceleration Grant", "focus": ["healthtech", "deeptech"], "stage": "pre-seed", "amount_eur": "40k-120k", "fit": 8.5, "speed": "medium", "open_month": 3, "close_month": 6, "allowed_models": ["healthtech", "deeptech"]},
    ],
    "lazio": [
        {"name": "Lazio Innova Boost", "focus": ["ai", "fintech", "saas"], "stage": "pre-seed", "amount_eur": "20k-80k", "fit": 7.8, "speed": "medium", "open_month": 1, "close_month": 4, "allowed_models": ["saas", "fintech", "marketplace"]},
        {"name": "Smart City Lazio Call", "focus": ["commerce", "healthtech", "services"], "stage": "early", "amount_eur": "30k-90k", "fit": 7.0, "speed": "slow", "open_month": 9, "close_month": 11, "allowed_models": ["services", "healthtech", "commerce"]},
    ],
    "piedmont": [
        {"name": "Piemonte Tech Transition", "focus": ["deeptech", "ai", "healthtech"], "stage": "pre-seed", "amount_eur": "30k-110k", "fit": 8.1, "speed": "medium", "open_month": 2, "close_month": 5, "allowed_models": ["deeptech", "healthtech", "saas"]},
        {"name": "Torino Digital SME Voucher", "focus": ["saas", "services", "commerce"], "stage": "early", "amount_eur": "12k-40k", "fit": 6.4, "speed": "fast", "open_month": 7, "close_month": 10, "allowed_models": ["saas", "services", "commerce"]},
    ],
    "emilia-romagna": [
        {"name": "ER Startup Accelerator Grant", "focus": ["saas", "deeptech", "healthtech"], "stage": "pre-seed", "amount_eur": "25k-90k", "fit": 8.4, "speed": "fast", "open_month": 3, "close_month": 5, "allowed_models": ["saas", "deeptech", "healthtech"]},
        {"name": "Manufacturing Digitization ER", "focus": ["ai", "commerce", "services"], "stage": "early", "amount_eur": "20k-60k", "fit": 7.1, "speed": "medium", "open_month": 8, "close_month": 10, "allowed_models": ["services", "commerce", "saas"]},
    ],
    "campania": [
        {"name": "Campania Startup Restart", "focus": ["commerce", "services", "saas"], "stage": "pre-seed", "amount_eur": "15k-50k", "fit": 6.8, "speed": "slow", "open_month": 1, "close_month": 3, "allowed_models": ["commerce", "services", "saas"]},
        {"name": "South Innovation Incentive", "focus": ["deeptech", "healthtech", "ai"], "stage": "early", "amount_eur": "40k-140k", "fit": 8.0, "speed": "slow", "open_month": 9, "close_month": 12, "allowed_models": ["deeptech", "healthtech", "saas"]},
    ],
}

SECTOR_FACTORS = {
    "ai": {"market_pressure": 1.15, "competition": 1.2, "grant_fit": 1.05},
    "fintech": {"market_pressure": 1.1, "competition": 1.1, "grant_fit": 0.95},
    "healthtech": {"market_pressure": 1.0, "competition": 0.9, "grant_fit": 1.15},
    "commerce": {"market_pressure": 1.2, "competition": 1.25, "grant_fit": 0.8},
    "deeptech": {"market_pressure": 0.95, "competition": 0.8, "grant_fit": 1.2},
    "saas": {"market_pressure": 1.05, "competition": 1.05, "grant_fit": 1.0},
}

COMPLIANCE_FACTORS = {
    "saas": 0.9,
    "marketplace": 1.0,
    "commerce": 1.05,
    "deeptech": 1.18,
    "services": 0.92,
    "fintech": 1.35,
    "healthtech": 1.28,
}

DECISION_EFFECTS = {
    "focus_sales": {"traction": 6.0, "clarity": 4.0, "stress": 1.0, "burn": 800.0, "bureaucracy": 0.2},
    "product_push": {"traction": 2.0, "clarity": 2.5, "stress": 1.4, "burn": 1400.0, "product": 6.0},
    "apply_grant": {"traction": -0.5, "clarity": 1.0, "stress": 0.8, "burn": 300.0, "grants": 8.0, "bureaucracy": 1.6},
    "hire": {"traction": 2.0, "clarity": 1.0, "stress": -0.5, "burn": 2400.0, "morale": 3.0},
    "cut_costs": {"traction": -1.5, "clarity": 1.5, "stress": 1.8, "burn": -2500.0, "morale": -2.0},
    "pivot_services": {"traction": 4.0, "clarity": -1.5, "stress": 1.2, "burn": -900.0, "revenue": 2200.0, "agency_risk": 10.0},
    "raise_round": {"traction": 0.0, "clarity": 1.0, "stress": 2.2, "burn": 1000.0, "investor": 6.0},
    "partnership": {"traction": 3.5, "clarity": 2.0, "stress": 0.6, "burn": 500.0, "reputation": 4.0},
    "compliance_sprint": {"traction": -0.8, "clarity": 3.0, "stress": 0.5, "burn": 700.0, "bureaucracy": -2.0, "investor": 1.5},
}

EVENT_LIBRARY = [
    {"event_type": "bureaucracy_delay", "title": "Unexpected compliance delay", "description": "Administrative overhead slowed a key operational step.", "impact_cash": -1200, "impact_stress": 1.2},
    {"event_type": "delayed_payment", "title": "Client payment delayed", "description": "An Italian B2B client pushed payment beyond expected terms.", "impact_cash": -2200, "impact_stress": 1.0},
    {"event_type": "grant_rejection", "title": "Public incentive rejected", "description": "A grant application failed after a slow review process.", "impact_stress": 0.8},
    {"event_type": "grant_approval", "title": "Innovation grant approved", "description": "A regional incentive created temporary oxygen for the startup.", "impact_cash": 6000, "impact_stress": -0.6},
    {"event_type": "sales_slip", "title": "Pipeline slipped", "description": "Several leads went quiet at the end of the cycle.", "impact_traction": -3.5, "impact_stress": 0.8},
    {"event_type": "niche_pull", "title": "Unexpected niche traction", "description": "A small but promising customer segment responded better than expected.", "impact_traction": 5.0, "impact_cash": 1500},
    {"event_type": "cofounder_tension", "title": "Founder tension increased", "description": "Misalignment around pace and priorities affected execution.", "impact_stress": 1.5},
    {"event_type": "partnership_window", "title": "Partnership window opened", "description": "A corporate or ecosystem player showed tentative interest.", "impact_traction": 3.0},
    {"event_type": "grant_review_extended", "title": "Grant review extended", "description": "The incentive office requested clarifications and pushed the decision further out.", "impact_stress": 0.4},
    {"event_type": "investor_dd", "title": "Investor due diligence started", "description": "Angels requested a tighter data room and repeatable metrics before moving forward.", "impact_stress": 0.6},
    {"event_type": "investor_commitment", "title": "Investor commitment secured", "description": "A small Italian syndicate agreed to fund the next stretch of runway.", "impact_stress": -0.5},
    {"event_type": "note_commitment", "title": "Bridge instrument committed", "description": "An investor offered a SAFE or convertible note instead of a priced round.", "impact_stress": -0.2},
    {"event_type": "option_forfeiture", "title": "Unvested options forfeited", "description": "Layoffs or acute team stress caused pre-cliff employee options to be forfeited.", "impact_stress": 0.7},
    {"event_type": "permit_hold", "title": "Operational permit held up", "description": "A local administrative dependency slowed a customer or hiring milestone.", "impact_cash": -1800, "impact_stress": 0.9},
]

SEASONAL_GRANT_FACTORS = {
    "winter": 0.92,
    "spring": 1.14,
    "summer": 0.88,
    "autumn": 1.06,
}


@dataclass
class SimulationContext:
    city: str
    region: str
    sector: str
    business_model: str
    founder_ambition: int
    founder_risk_tolerance: str
    founding_team: str


def clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def deterministic_fraction(*parts: str) -> float:
    digest = hashlib.sha256("|".join(parts).encode("utf-8")).hexdigest()
    return int(digest[:8], 16) / 0xFFFFFFFF


def cycle_season(cycle_number: int) -> str:
    month = ((max(cycle_number, 1) - 1) % 12) + 1
    if month in {12, 1, 2}:
        return "winter"
    if month in {3, 4, 5}:
        return "spring"
    if month in {6, 7, 8}:
        return "summer"
    return "autumn"


def cycle_month(cycle_number: int) -> int:
    return ((max(cycle_number, 1) - 1) % 12) + 1


def window_is_open(current_month: int, open_month: int, close_month: int) -> bool:
    if open_month <= close_month:
        return open_month <= current_month <= close_month
    return current_month >= open_month or current_month <= close_month


def _city_factors(city: str) -> dict[str, float]:
    return ITALY_CITY_FACTORS.get(city.lower(), {"capital_access": 0.9, "bureaucracy": 1.05, "sales": 0.92, "talent": 0.95})


def _sector_factors(sector: str) -> dict[str, float]:
    return SECTOR_FACTORS.get(sector.lower(), {"market_pressure": 1.0, "competition": 1.0, "grant_fit": 1.0})


def _region_factors(region: str) -> dict[str, float]:
    return REGION_FACTORS.get(region.lower(), {"grant_speed": 0.98, "admin_drag": 1.02, "labor_pressure": 1.0})


def _compliance_factor(business_model: str, sector: str) -> float:
    return max(COMPLIANCE_FACTORS.get(business_model.lower(), 1.0), COMPLIANCE_FACTORS.get(sector.lower(), 1.0))


def get_regional_grant_catalog(region: str, sector: str) -> list[dict[str, str | float]]:
    return evaluate_regional_grant_catalog(region, sector)


def startup_stage(state: SimulationStateModel | None) -> str:
    if state is None:
        return "pre-seed"
    if state.cycle_number <= 6 and state.monthly_revenue < 5000:
        return "pre-seed"
    if state.cycle_number <= 16 and state.monthly_revenue < 25000:
        return "early"
    return "growth"


def evaluate_regional_grant_catalog(
    region: str,
    sector: str,
    business_model: str | None = None,
    state: SimulationStateModel | None = None,
) -> list[dict[str, str | float | bool]]:
    region_key = region.lower()
    sector_key = sector.lower()
    grants = REGIONAL_GRANT_CATALOG.get(region_key, [])
    stage = startup_stage(state)
    annual_month = cycle_month(state.cycle_number if state is not None else 1)
    ranked: list[dict[str, str | float | bool]] = []
    for grant in grants:
        fit_bonus = 1.2 if sector_key in grant["focus"] else 0.0
        open_month = int(grant.get("open_month", 1))
        close_month = int(grant.get("close_month", 12))
        deadline_open = window_is_open(annual_month, open_month, close_month)
        stage_ok = True if stage == "growth" else grant["stage"] == stage or grant["stage"] == "early"
        model_ok = True if business_model is None else business_model.lower() in grant.get("allowed_models", [])
        focus_ok = sector_key in grant["focus"]
        season = cycle_season(state.cycle_number if state is not None else 1)
        season_factor = SEASONAL_GRANT_FACTORS[season]
        stochastic_probability = clamp(
            ((float(grant["fit"]) + fit_bonus) / 10) * season_factor
            * (1.0 if deadline_open else 0.55)
            * (1.0 if stage_ok else 0.7)
            * (1.0 if model_ok else 0.65),
            0.05,
            0.95,
        )
        reasons = []
        if not focus_ok:
            reasons.append("sector mismatch")
        if not model_ok:
            reasons.append("business model not eligible")
        if not stage_ok:
            reasons.append(f"stage {stage} not eligible")
        if not deadline_open:
            reasons.append("deadline passed")
        ranked.append(
            {
                **grant,
                "match_score": round(float(grant["fit"]) + fit_bonus, 2),
                "eligible": focus_ok and model_ok and stage_ok and deadline_open,
                "deadline_open": deadline_open,
                "current_stage": stage,
                "open_month": open_month,
                "close_month": close_month,
                "annual_month": annual_month,
                "season": season,
                "stochastic_probability": round(stochastic_probability, 2),
                "reason": ", ".join(reasons) if reasons else "eligible now",
            }
        )
    ranked.sort(key=lambda item: (bool(item["eligible"]), float(item["match_score"])), reverse=True)
    return ranked


def build_term_sheet(state: SimulationStateModel, context: SimulationContext) -> dict[str, float | str]:
    city = _city_factors(context.city)
    sector = _sector_factors(context.sector)
    traction_multiplier = 1 + state.traction_score / 120
    pre_money = round((65000 + state.monthly_revenue * 8 + state.traction_score * 900 + state.reputation * 2500) * city["capital_access"] * traction_multiplier, -3)
    cheque = round((18000 + state.traction_score * 220 + context.founder_ambition * 950) * city["capital_access"] * sector["grant_fit"], -3)
    discounted_pre_money = min(pre_money * max(0.55, 1 - state.note_discount_rate), state.note_valuation_cap or pre_money)
    converted_note_principal = float(state.outstanding_note_principal)
    converted_note_share = (converted_note_principal / max(discounted_pre_money + cheque, 1.0)) * 100 if converted_note_principal > 0 else 0.0
    option_pool_top_up = 10.0 if state.option_pool_equity < 8 else max(0.0, 12.0 - state.option_pool_equity)
    dilution = clamp((cheque / max(pre_money + cheque, 1.0)) * 100 + option_pool_top_up * 0.35, 5.0, 28.0)
    investor_share = clamp((cheque / max(pre_money + cheque, 1.0)) * 100, 4.0, 24.0)
    existing_investor_follow_on_amount = round(cheque * min(state.investor_equity / 100, 0.45), -2) if state.investor_equity > 0 else 0.0
    new_investor_amount = float(max(0.0, cheque - existing_investor_follow_on_amount))
    existing_investor_post_share = round(state.investor_equity * (pre_money / max(pre_money + cheque, 1.0)) + investor_share * (existing_investor_follow_on_amount / max(cheque, 1.0)) + converted_note_share, 2)
    new_investor_post_share = round(max(0.0, investor_share - (investor_share * (existing_investor_follow_on_amount / max(cheque, 1.0)))), 2)
    aggregate_investor_post_share = round(existing_investor_post_share + new_investor_post_share, 2)
    founder_post = clamp(state.founder_equity - dilution, 35.0, 100.0)
    option_pool_post = clamp(max(state.option_pool_equity, option_pool_top_up), 0.0, 20.0)
    investor_post = clamp(max(aggregate_investor_post_share, 100.0 - founder_post - option_pool_post), 0.0, 45.0)
    founder_post = clamp(100.0 - investor_post - option_pool_post, 30.0, 100.0)
    round_label = "Pre-seed" if state.investor_equity == 0 else "Seed" if state.investor_equity < 18 else "Seed extension"
    return {
        "round_label": round_label,
        "investment_amount": float(cheque),
        "pre_money": float(pre_money),
        "investor_share": round(investor_post, 2),
        "founder_share": round(founder_post, 2),
        "option_pool_share": round(option_pool_post, 2),
        "existing_investor_follow_on_amount": float(existing_investor_follow_on_amount),
        "new_investor_amount": float(new_investor_amount),
        "existing_investor_post_share": float(existing_investor_post_share),
        "new_investor_post_share": float(new_investor_post_share),
        "converted_note_principal": float(converted_note_principal),
        "discount_rate": float(state.note_discount_rate),
        "valuation_cap": float(state.note_valuation_cap),
        "instrument_type": "equity",
        "dilution": round(max(0.0, state.founder_equity - founder_post), 2),
        "liquidation_preference": "1x non-participating",
        "board_rights": "observer seat",
    }


def build_note_round(state: SimulationStateModel, context: SimulationContext) -> dict[str, float | str]:
    city = _city_factors(context.city)
    instrument_type = "safe" if state.monthly_revenue < 6000 and state.cycle_number < 8 else "convertible-note"
    principal = round((12000 + context.founder_ambition * 1200 + state.traction_score * 90) * city["capital_access"], -3)
    discount_rate = 0.2 if instrument_type == "safe" else 0.15
    valuation_cap = round((110000 + state.traction_score * 1500 + state.reputation * 6000) * city["capital_access"], -3)
    return {
        "round_label": "SAFE" if instrument_type == "safe" else "Convertible Note",
        "instrument_type": instrument_type,
        "investment_amount": float(principal),
        "pre_money": 0.0,
        "investor_share": 0.0,
        "founder_share": state.founder_equity,
        "option_pool_share": state.option_pool_equity,
        "existing_investor_follow_on_amount": 0.0,
        "new_investor_amount": float(principal),
        "existing_investor_post_share": state.investor_equity,
        "new_investor_post_share": 0.0,
        "converted_note_principal": 0.0,
        "discount_rate": discount_rate,
        "valuation_cap": float(valuation_cap),
        "dilution": 0.0,
        "liquidation_preference": "conversion discount at next qualified equity round",
        "board_rights": "information rights",
    }


def liquidation_waterfall(state: SimulationStateModel, cap_table_rounds: list[dict[str, float | str]], exit_value: float) -> dict[str, float]:
    remaining = max(0.0, exit_value)
    note_payout = min(remaining, state.outstanding_note_principal)
    remaining -= note_payout

    preferred_claim = 0.0
    for round_entry in cap_table_rounds:
        if round_entry.get("instrument_type", "equity") == "equity":
            preferred_claim += float(round_entry.get("investment_amount", 0.0))
    preferred_equity_payout = min(remaining, preferred_claim)
    remaining -= preferred_equity_payout

    employee_option_retained = min(state.employee_option_vested_equity, state.option_pool_equity)
    founder_common_share = max(0.0, state.founder_equity) / 100
    employee_common_share = max(0.0, employee_option_retained) / 100
    investor_common_share = max(0.0, state.investor_equity) / 100
    common_share_total = max(founder_common_share + employee_common_share + investor_common_share, 0.0001)

    founder_common_payout = remaining * (founder_common_share / common_share_total)
    employee_option_payout = remaining * (employee_common_share / common_share_total)
    investor_common_payout = remaining * (investor_common_share / common_share_total)
    residual = max(0.0, remaining - founder_common_payout - employee_option_payout - investor_common_payout)
    return {
        "exit_value": round(exit_value, 2),
        "note_payout": round(note_payout, 2),
        "preferred_equity_payout": round(preferred_equity_payout, 2),
        "investor_common_payout": round(investor_common_payout, 2),
        "founder_common_payout": round(founder_common_payout, 2),
        "employee_option_payout": round(employee_option_payout, 2),
        "residual": round(residual, 2),
    }


def has_reached_option_cliff(state: SimulationStateModel) -> bool:
    months_elapsed = state.cycle_number if state.cycle_type == "month" else state.cycle_number * 0.25
    return months_elapsed >= 12


def issue_employee_option_grant(state: SimulationStateModel, cycle_type: str) -> dict[str, str | float] | None:
    if state.option_pool_equity <= 0 and state.founder_equity <= 45:
        return None
    grant_size = 0.8 if cycle_type == "week" else 1.6
    required_pool = state.employee_option_granted_equity + grant_size
    if state.option_pool_equity < required_pool:
        top_up = min(2.0, max(0.0, required_pool - state.option_pool_equity))
        state.option_pool_equity = round(state.option_pool_equity + top_up, 2)
        state.founder_equity = round(max(25.0, state.founder_equity - top_up), 2)
        state.cumulative_dilution = round(100.0 - state.founder_equity, 2)
    state.employee_option_granted_equity = round(min(state.option_pool_equity, state.employee_option_granted_equity + grant_size), 2)
    vested_now = state.employee_option_vested_equity
    return {
        "grant_label": f"Employee grant cycle {state.cycle_number}",
        "granted_equity": round(grant_size, 2),
        "vested_equity": round(vested_now, 2),
        "vesting_months": 48,
        "cliff_months": 12,
    }


def apply_option_vesting(state: SimulationStateModel, months: float) -> None:
    if state.employee_option_granted_equity <= state.employee_option_vested_equity:
        return
    if not has_reached_option_cliff(state):
        return
    monthly_vesting = state.employee_option_granted_equity / 48
    newly_vested = monthly_vesting * months
    state.employee_option_vested_equity = round(min(state.employee_option_granted_equity, state.employee_option_vested_equity + newly_vested), 2)


def maybe_forfeit_unvested_options(state: SimulationStateModel, decision_type: str) -> EventLogEntry | None:
    unvested = max(0.0, state.employee_option_granted_equity - state.employee_option_vested_equity)
    if unvested <= 0 or has_reached_option_cliff(state):
        return None
    stress_trigger = state.founder_stress >= 8.2 or state.team_morale <= 3.0
    layoff_trigger = decision_type == "cut_costs"
    if not (stress_trigger or layoff_trigger):
        return None
    forfeited = round(unvested * (0.7 if layoff_trigger else 0.45), 2)
    if forfeited <= 0:
        return None
    state.employee_option_granted_equity = round(max(state.employee_option_vested_equity, state.employee_option_granted_equity - forfeited), 2)
    state.employee_option_forfeited_equity = round(state.employee_option_forfeited_equity + forfeited, 2)
    state.employee_departures_count += 1
    retained_vested = round(state.employee_option_vested_equity, 2)
    state.last_departure_summary = f"One employee departed. {retained_vested}% vested equity stayed outstanding, {forfeited}% unvested equity was forfeited."
    return EventLogEntry(
        event_type="option_forfeiture",
        severity=3,
        title="Unvested options forfeited",
        description=f"{forfeited}% of pre-cliff employee options were forfeited after layoffs or acute team strain, while {retained_vested}% vested equity remained outstanding.",
        impact_stress=0.6,
    )


def maybe_employee_departure(state: SimulationStateModel, decision_type: str) -> EventLogEntry | None:
    if state.employee_option_granted_equity <= 0:
        return None
    departure_trigger = decision_type == "cut_costs" or state.founder_stress >= 8.6 or state.team_morale <= 2.8
    if not departure_trigger:
        return None
    unvested = round(max(0.0, state.employee_option_granted_equity - state.employee_option_vested_equity), 2)
    vested = round(min(state.employee_option_vested_equity, state.employee_option_granted_equity), 2)
    if unvested <= 0 and vested <= 0:
        return None
    forfeiture_ratio = 0.75 if decision_type == "cut_costs" else 0.5
    forfeited = round(unvested * forfeiture_ratio, 2)
    if forfeited > 0:
        state.employee_option_granted_equity = round(max(vested, state.employee_option_granted_equity - forfeited), 2)
        state.employee_option_forfeited_equity = round(state.employee_option_forfeited_equity + forfeited, 2)
    state.employee_departures_count += 1
    state.last_departure_summary = (
        f"One employee departed. {vested}% vested equity stayed outstanding, {forfeited}% unvested equity was forfeited."
    )
    return EventLogEntry(
        event_type="employee_departure",
        severity=3,
        title="Employee departure",
        description=f"A team member left. {vested}% vested equity stayed on the cap table and {forfeited}% unvested equity returned to the pool.",
        impact_stress=0.8,
    )


def initial_state(context: SimulationContext, starting_capital: float) -> SimulationStateModel:
    city = _city_factors(context.city)
    region = _region_factors(context.region)
    sector = _sector_factors(context.sector)
    compliance = _compliance_factor(context.business_model, context.sector)
    team_size = max(1, len([item for item in context.founding_team.split(",") if item.strip()]))
    initial_burn = 5500 + (team_size * 1200) + (900 if context.business_model in {"deeptech", "fintech", "healthtech"} else 0)
    traction_seed = 8 + (2 if context.business_model in {"saas", "services"} else 0)
    bureaucracy = clamp(5.0 * city["bureaucracy"], 2.5, 9.5)
    return SimulationStateModel(
        cycle_number=0,
        cycle_type="week",
        cash=starting_capital,
        monthly_burn=initial_burn,
        monthly_revenue=0.0,
        runway_months=round(starting_capital / initial_burn, 2),
        founder_stress=4.8,
        team_morale=6.5,
        traction_score=traction_seed,
        active_customers=0,
        churn_risk=4.0,
        product_maturity=8.0,
        bureaucracy_pressure=bureaucracy,
        investor_attractiveness=4.5 * city["capital_access"],
        strategic_clarity=6.0,
        reputation=4.8,
        survival_probability=62.0,
        market_pressure=5.0 * sector["market_pressure"],
        grants_probability=5.5 * sector["grant_fit"],
        investor_pipeline_score=clamp(3.2 * city["capital_access"] + region["grant_speed"] * 0.2, 1.5, 8.5),
        grant_backlog_score=clamp(2.6 * sector["grant_fit"] / region["grant_speed"], 1.0, 7.0),
        bureaucracy_backlog=clamp(bureaucracy * region["admin_drag"] + compliance * 0.9, 2.0, 9.5),
        compliance_debt=clamp(3.0 * compliance + (0.8 if context.business_model in {"fintech", "healthtech"} else 0.0), 1.5, 9.5),
        founder_equity=100.0,
        investor_equity=0.0,
        option_pool_equity=0.0,
        employee_option_granted_equity=0.0,
        employee_option_vested_equity=0.0,
        employee_option_forfeited_equity=0.0,
        employee_departures_count=0,
        last_departure_summary="No departures yet.",
        outstanding_note_principal=0.0,
        note_discount_rate=0.0,
        note_valuation_cap=0.0,
        last_note_summary="No note financing yet.",
        cumulative_dilution=0.0,
        last_term_sheet_summary="No external financing yet.",
        delayed_payments_exposure=5.5 if context.business_model in {"saas", "services", "commerce"} else 3.5,
        agency_pivot_risk=6.0 if context.business_model in {"saas", "deeptech", "ai"} else 4.0,
        last_event_summary="The startup has just been incorporated and is facing the first real cycle of execution.",
    )


def choose_event(state: SimulationStateModel, context: SimulationContext, decision_type: str) -> EventLogEntry:
    if state.cash < state.monthly_burn * 2:
        template = EVENT_LIBRARY[1]
        severity = 4
    elif state.bureaucracy_backlog > 7.2 or state.compliance_debt > 7.2:
        template = EVENT_LIBRARY[11]
        severity = 4
    elif decision_type == "apply_grant" and state.grants_probability > 7.0:
        template = EVENT_LIBRARY[3]
        severity = 3
    elif state.bureaucracy_pressure >= 6.8:
        template = EVENT_LIBRARY[0]
        severity = 4
    elif decision_type == "focus_sales" and state.traction_score < 35:
        template = EVENT_LIBRARY[4]
        severity = 3
    elif state.market_pressure > 6.5 and state.product_maturity > 20:
        template = EVENT_LIBRARY[5]
        severity = 2
    elif state.founder_stress > 7.0:
        template = EVENT_LIBRARY[6]
        severity = 3
    else:
        template = EVENT_LIBRARY[7]
        severity = 2

    return EventLogEntry(
        event_type=template["event_type"],
        severity=severity,
        title=template["title"],
        description=template["description"],
        impact_cash=float(template.get("impact_cash", 0.0)),
        impact_traction=float(template.get("impact_traction", 0.0)),
        impact_stress=float(template.get("impact_stress", 0.0)),
    )


def _grant_events(state: SimulationStateModel, context: SimulationContext, decision_type: str) -> list[EventLogEntry]:
    region = _region_factors(context.region)
    catalog = evaluate_regional_grant_catalog(context.region, context.sector, context.business_model, state)
    eligible_grants = [grant for grant in catalog if bool(grant["eligible"])]
    if decision_type == "apply_grant" and not eligible_grants:
        top_grant = catalog[0] if catalog else None
        reason = top_grant["reason"] if top_grant else "no regional program available"
        return [
            EventLogEntry(
                event_type="grant_deadline_or_eligibility_block",
                severity=3,
                title="Grant application blocked",
                description=f"No eligible regional grant could be filed: {reason}.",
                impact_stress=0.7,
            )
        ]
    review_score = (
        state.grants_probability * 0.9
        + region["grant_speed"] * 1.6
        - state.bureaucracy_backlog * 0.35
        - state.compliance_debt * 0.22
        + (1.0 if decision_type == "apply_grant" else 0.0)
    )
    events: list[EventLogEntry] = []
    selected_grant = eligible_grants[0] if eligible_grants else None
    approval_roll = deterministic_fraction(context.region, context.sector, str(state.cycle_number), selected_grant["name"] if selected_grant else "none")
    approval_threshold = float(selected_grant["stochastic_probability"]) if selected_grant else 0.0
    if state.grant_backlog_score >= 4.8 and review_score >= 5.9 and selected_grant and approval_roll <= approval_threshold:
        grant_cash = round((4500 + state.traction_score * 120 + context.founder_ambition * 450) * region["grant_speed"], -2)
        events.append(
            EventLogEntry(
                event_type="grant_approval",
                severity=2,
                title="Innovation grant approved",
                description=f"{selected_grant['name']} cleared during {selected_grant['season']} and released non-dilutive cash.",
                impact_cash=float(grant_cash),
                impact_stress=-0.9,
            )
        )
    elif state.grant_backlog_score >= 4.0 and (review_score < 4.4 or approval_roll > min(0.95, approval_threshold + 0.22)):
        events.append(
            EventLogEntry(
                event_type="grant_rejection",
                severity=3,
                title="Public incentive rejected",
                description="The application missed the stochastic approval window after review, forcing the team back to operating cash reality.",
                impact_stress=0.9,
            )
        )
    elif state.grant_backlog_score >= 2.5 and selected_grant:
        template = EVENT_LIBRARY[8]
        events.append(
            EventLogEntry(
                event_type=template["event_type"],
                severity=2,
                title=template["title"],
                description=f"{selected_grant['name']} requested clarifications and pushed the decision further out.",
                impact_stress=float(template.get("impact_stress", 0.0)),
            )
        )
    return events


def _investor_events(state: SimulationStateModel, context: SimulationContext, decision_type: str) -> list[EventLogEntry]:
    investor_score = (
        state.investor_pipeline_score * 1.3
        + state.investor_attractiveness
        + state.reputation * 0.45
        + state.traction_score * 0.04
        - state.founder_stress * 0.28
        - state.agency_pivot_risk * 0.03
    )
    events: list[EventLogEntry] = []
    early_note_candidate = (
        decision_type == "raise_round"
        and state.investor_equity <= 0
        and state.outstanding_note_principal <= 0
        and state.traction_score < 28
        and state.monthly_revenue < 4000
        and state.investor_pipeline_score >= 4.6
        and investor_score >= 8.8
    )
    if early_note_candidate:
        note_round = build_note_round(state, context)
        events.append(
            EventLogEntry(
                event_type="note_commitment",
                severity=2,
                title="Bridge instrument committed",
                description=f"An investor offered a {note_round['round_label']} for €{note_round['investment_amount']:,.0f} instead of pricing the round now.",
                impact_cash=float(note_round["investment_amount"]),
                impact_stress=-0.2,
            )
        )
    elif state.investor_pipeline_score >= 6.2 and investor_score >= 12.0:
        term_sheet = build_term_sheet(state, context)
        events.append(
            EventLogEntry(
                event_type="investor_commitment",
                severity=2,
                title="Investor commitment secured",
                description=(
                    f"A small syndicate agreed to invest €{term_sheet['investment_amount']:,.0f} "
                    f"at roughly {term_sheet['investor_share']}% post-money ownership."
                ),
                impact_cash=float(term_sheet["investment_amount"]),
                impact_stress=-0.5,
            )
        )
    elif decision_type == "raise_round" or state.investor_pipeline_score >= 4.5:
        template = EVENT_LIBRARY[9]
        events.append(
            EventLogEntry(
                event_type=template["event_type"],
                severity=2,
                title=template["title"],
                description=template["description"],
                impact_stress=float(template.get("impact_stress", 0.0)),
            )
        )
    return events


def resolve_events(state: SimulationStateModel, context: SimulationContext, decision_type: str) -> list[EventLogEntry]:
    events = [choose_event(state, context, decision_type)]
    if decision_type in {"apply_grant", "compliance_sprint"} or state.grant_backlog_score >= 2.5:
        events.extend(_grant_events(state, context, decision_type))
    if decision_type == "raise_round" or state.investor_pipeline_score >= 4.5:
        events.extend(_investor_events(state, context, decision_type))
    deduped: list[EventLogEntry] = []
    seen: set[tuple[str, str]] = set()
    for event in events:
        key = (event.event_type, event.title)
        if key not in seen:
            deduped.append(event)
            seen.add(key)
    return deduped


def generate_strategy_options(state: SimulationStateModel) -> list[dict[str, str]]:
    options = [
        {"decision": "focus_sales", "label": "Focus outbound sales", "why": "Revenue is still the cleanest survival lever."},
        {"decision": "product_push", "label": "Push product quality", "why": "Product maturity may unlock better retention and demos."},
        {"decision": "apply_grant", "label": "Apply for grants", "why": "Italian incentives can buy time, slowly."},
        {"decision": "cut_costs", "label": "Cut burn now", "why": "Runway protection matters more than narrative confidence."},
    ]
    if state.investor_attractiveness > 6.5:
        options.append({"decision": "raise_round", "label": "Start fundraising", "why": "Investor interest is not strong, but it is no longer absent."})
    if state.agency_pivot_risk < 40 and state.monthly_revenue < state.monthly_burn * 0.25:
        options.append({"decision": "pivot_services", "label": "Take service revenue", "why": "A service-heavy pivot can extend survival at the cost of scale."})
    if state.bureaucracy_backlog > 6.0 or state.compliance_debt > 6.0:
        options.append({"decision": "compliance_sprint", "label": "Run a compliance sprint", "why": "Administrative debt is now blocking both grants and execution speed."})
    return options


def _cycle_months(cycle_type: str) -> float:
    return 1.0 if cycle_type == "month" else 0.25


def apply_cycle(state: SimulationStateModel, context: SimulationContext, decision_type: str, cycle_type: str, note: str = "") -> SimulationOutcome:
    months = _cycle_months(cycle_type)
    city = _city_factors(context.city)
    region = _region_factors(context.region)
    sector = _sector_factors(context.sector)
    compliance = _compliance_factor(context.business_model, context.sector)
    effect = DECISION_EFFECTS[decision_type]
    current = state.model_copy(deep=True)

    current.cycle_number += 1
    current.cycle_type = cycle_type

    execution_bonus = (current.strategic_clarity * 0.3) + ((10 - current.founder_stress) * 0.2)
    sales_friction = current.market_pressure * 0.55 + (current.bureaucracy_pressure * 0.25) + (current.bureaucracy_backlog * 0.18) - (city["sales"] * 2.5)
    revenue_gain = max(0.0, ((effect.get("traction", 0.0) + execution_bonus - sales_friction) * 220) * months)
    if decision_type == "pivot_services":
        revenue_gain += effect.get("revenue", 0.0) * months

    burn_change = effect.get("burn", 0.0) * months
    taxes_due = max(0.0, revenue_gain * (0.18 + compliance * 0.01))
    delayed_receivables = revenue_gain * (current.delayed_payments_exposure / 15)
    bureaucracy_admin_cost = (current.bureaucracy_backlog * 55 + current.compliance_debt * 40 * region["admin_drag"]) * months

    current.monthly_revenue = max(0.0, current.monthly_revenue + revenue_gain - (current.monthly_revenue * current.churn_risk / 120) * months)
    current.monthly_burn = max(1800.0, current.monthly_burn + burn_change + (current.bureaucracy_pressure * 30 * months) + region["labor_pressure"] * 110 * months + current.compliance_debt * 18 * months)
    cash_delta = current.monthly_revenue * months - current.monthly_burn * months - taxes_due - delayed_receivables * 0.12 - bureaucracy_admin_cost
    current.cash = max(-50000.0, current.cash + cash_delta)

    current.traction_score = clamp(current.traction_score + effect.get("traction", 0.0) + city["sales"] - sector["competition"] - current.churn_risk * 0.1, 0.0, 100.0)
    current.product_maturity = clamp(current.product_maturity + effect.get("product", 1.4) * months, 0.0, 100.0)
    current.founder_stress = clamp(current.founder_stress + effect.get("stress", 0.0) + (8 - current.runway_months) * 0.15 + current.bureaucracy_pressure * 0.04, 0.0, 10.0)
    current.team_morale = clamp(current.team_morale + effect.get("morale", 0.0) * 0.35 - current.founder_stress * 0.08, 0.0, 10.0)
    current.strategic_clarity = clamp(current.strategic_clarity + effect.get("clarity", 0.0) * 0.35 - (0.6 if note else 0.0), 0.0, 10.0)
    current.investor_attractiveness = clamp(current.investor_attractiveness + effect.get("investor", 0.0) * 0.25 + current.traction_score * 0.03 - current.agency_pivot_risk * 0.02, 0.0, 10.0)
    current.reputation = clamp(current.reputation + effect.get("reputation", 0.0) * 0.25 + current.traction_score * 0.02 - current.bureaucracy_pressure * 0.02, 0.0, 10.0)
    current.grants_probability = clamp(current.grants_probability + effect.get("grants", 0.0) * 0.2 - current.bureaucracy_pressure * 0.04 - current.compliance_debt * 0.06 + sector["grant_fit"] + region["grant_speed"] * 0.35, 0.0, 10.0)
    current.bureaucracy_pressure = clamp(current.bureaucracy_pressure + effect.get("bureaucracy", 0.0) + (0.25 if cycle_type == "month" else 0.1), 0.0, 10.0)
    current.market_pressure = clamp(current.market_pressure + sector["market_pressure"] * 0.2 + (0.15 if cycle_type == "month" else 0.0), 0.0, 10.0)
    current.investor_pipeline_score = clamp(
        current.investor_pipeline_score
        + (1.8 if decision_type == "raise_round" else 0.2)
        + current.traction_score * 0.01
        + current.reputation * 0.03
        - current.founder_stress * 0.05
        - current.bureaucracy_backlog * 0.04,
        0.0,
        10.0,
    )
    current.grant_backlog_score = clamp(
        current.grant_backlog_score
        + (2.0 if decision_type == "apply_grant" else -0.25 * months * region["grant_speed"])
        + (0.4 if decision_type == "compliance_sprint" else 0.0),
        0.0,
        10.0,
    )
    current.bureaucracy_backlog = clamp(
        current.bureaucracy_backlog
        + region["admin_drag"] * 0.38
        + compliance * 0.22
        + (0.75 if decision_type in {"apply_grant", "hire", "raise_round"} else 0.0)
        - (1.8 if decision_type == "compliance_sprint" else 0.0),
        0.0,
        10.0,
    )
    current.compliance_debt = clamp(
        current.compliance_debt
        + compliance * 0.28
        + (0.55 if cycle_type == "month" else 0.18)
        + (0.35 if decision_type in {"hire", "raise_round"} else 0.0)
        - (2.0 if decision_type == "compliance_sprint" else 0.0),
        0.0,
        10.0,
    )
    current.delayed_payments_exposure = clamp(current.delayed_payments_exposure + (0.4 if context.business_model in {"saas", "services"} else 0.2), 0.0, 10.0)
    current.agency_pivot_risk = clamp(current.agency_pivot_risk + effect.get("agency_risk", 0.0) * 0.35 + (0.2 if current.cash < current.monthly_burn * 2 else 0.0), 0.0, 100.0)
    current.active_customers = max(0, current.active_customers + int(max(0, current.traction_score / 8) * months) + (3 if decision_type == "focus_sales" else 0))
    current.churn_risk = clamp(current.churn_risk + (0.6 if decision_type == "product_push" else -0.2) + (current.market_pressure - current.product_maturity / 16) * 0.08, 0.0, 10.0)
    apply_option_vesting(current, months)

    events = resolve_events(current, context, decision_type)
    departure_event = maybe_employee_departure(current, decision_type)
    if departure_event:
        events.append(departure_event)
    cap_table_round: dict[str, str | float] | None = None
    employee_option_grant: dict[str, str | float] | None = None
    if decision_type == "hire":
        employee_option_grant = issue_employee_option_grant(current, cycle_type)
    for event in events:
        current.cash += event.impact_cash
        current.traction_score = clamp(current.traction_score + event.impact_traction, 0.0, 100.0)
        current.founder_stress = clamp(current.founder_stress + event.impact_stress, 0.0, 10.0)
        if event.event_type == "grant_approval":
            current.grant_backlog_score = clamp(current.grant_backlog_score - 2.6, 0.0, 10.0)
            current.bureaucracy_backlog = clamp(current.bureaucracy_backlog - 0.7, 0.0, 10.0)
        elif event.event_type == "grant_rejection":
            current.grant_backlog_score = clamp(current.grant_backlog_score - 1.4, 0.0, 10.0)
        elif event.event_type == "investor_commitment":
            term_sheet = build_term_sheet(current, context)
            current.investor_pipeline_score = clamp(current.investor_pipeline_score - 3.2, 0.0, 10.0)
            current.investor_attractiveness = clamp(current.investor_attractiveness + 0.8, 0.0, 10.0)
            current.founder_equity = float(term_sheet["founder_share"])
            current.investor_equity = float(term_sheet["investor_share"])
            current.option_pool_equity = float(term_sheet["option_pool_share"])
            current.cumulative_dilution = round(100.0 - current.founder_equity, 2)
            current.outstanding_note_principal = 0.0
            current.last_term_sheet_summary = (
                f"€{term_sheet['investment_amount']:,.0f} on €{term_sheet['pre_money']:,.0f} pre-money, "
                f"{term_sheet['investor_share']}% investor ownership, €{term_sheet['existing_investor_follow_on_amount']:,.0f} pro-rata follow-on, "
                f"€{term_sheet['converted_note_principal']:,.0f} note conversion, {term_sheet['liquidation_preference']}, {term_sheet['board_rights']}."
            )
            current.last_note_summary = "Outstanding notes converted into the priced round."
            cap_table_round = term_sheet
        elif event.event_type == "note_commitment":
            note_round = build_note_round(current, context)
            current.outstanding_note_principal = round(current.outstanding_note_principal + float(note_round["investment_amount"]), 2)
            current.note_discount_rate = float(note_round["discount_rate"])
            current.note_valuation_cap = float(note_round["valuation_cap"])
            current.last_note_summary = (
                f"{note_round['round_label']} outstanding: €{note_round['investment_amount']:,.0f} at {int(note_round['discount_rate'] * 100)}% discount and €{note_round['valuation_cap']:,.0f} cap."
            )
            cap_table_round = note_round
        elif event.event_type == "investor_dd":
            current.investor_pipeline_score = clamp(current.investor_pipeline_score + 0.4, 0.0, 10.0)

    current.last_event_summary = "; ".join(f"{event.title}: {event.description}" for event in events[:3])
    current.runway_months = round(current.cash / current.monthly_burn, 2) if current.monthly_burn > 0 else 0.0

    current.survival_probability = clamp(
        55
        + current.runway_months * 3.5
        + current.traction_score * 0.28
        + current.team_morale * 1.8
        + current.strategic_clarity * 1.5
        + current.investor_pipeline_score * 1.1
        - current.founder_stress * 3.2
        - current.bureaucracy_pressure * 1.8
        - current.bureaucracy_backlog * 1.3
        - current.compliance_debt * 1.1
        - current.agency_pivot_risk * 0.18,
        0.0,
        100.0,
    )

    strategy_options = generate_strategy_options(current)
    confidence = "high" if current.survival_probability >= 70 else "medium" if current.survival_probability >= 45 else "low"
    strategy_memo = StrategyMemo(
        headline="Protect survival while looking for non-fake traction",
        recommendation=(
            "Double down on sales discipline and tighten the scope."
            if current.cash > current.monthly_burn * 3 and current.traction_score > 22
            else "Reduce burn and pursue the most credible near-term revenue source."
        ),
        confidence=confidence,
    )

    report_text = (
        f"Cycle {current.cycle_number}: the startup is operating from {context.city}, {context.region}. "
        f"Cash is now €{current.cash:,.0f}, runway is {current.runway_months} months, and traction sits at {current.traction_score:.1f}. "
        f"The most visible constraint remains {('bureaucracy' if current.bureaucracy_pressure > current.market_pressure else 'market access')} in the Italian context."
    )
    founder_note = (
        "The founder is stretched but still functional."
        if current.founder_stress < 7
        else "The founder is under meaningful psychological strain and may start making reactive choices."
    )

    return SimulationOutcome(
        state=current,
        events=events,
        strategy_options=strategy_options,
        report_text=report_text,
        founder_note=founder_note,
        strategy_memo=strategy_memo,
        cap_table_round=cap_table_round,
        employee_option_grant=employee_option_grant,
    )


def finance_snapshot(state: SimulationStateModel) -> dict[str, float]:
    taxes_due = max(0.0, state.monthly_revenue * 0.18)
    delayed_receivables = max(0.0, state.monthly_revenue * (state.delayed_payments_exposure / 15))
    return {
        "cash": state.cash,
        "monthly_burn": state.monthly_burn,
        "monthly_revenue": state.monthly_revenue,
        "runway_months": state.runway_months,
        "taxes_due": taxes_due,
        "delayed_receivables": delayed_receivables,
        "investor_pipeline_score": state.investor_pipeline_score,
        "grant_backlog_score": state.grant_backlog_score,
        "bureaucracy_backlog": state.bureaucracy_backlog,
        "compliance_debt": state.compliance_debt,
        "founder_equity": state.founder_equity,
        "investor_equity": state.investor_equity,
        "option_pool_equity": state.option_pool_equity,
        "employee_option_granted_equity": state.employee_option_granted_equity,
        "employee_option_vested_equity": state.employee_option_vested_equity,
        "employee_option_forfeited_equity": state.employee_option_forfeited_equity,
        "outstanding_note_principal": state.outstanding_note_principal,
        "note_discount_rate": state.note_discount_rate,
        "note_valuation_cap": state.note_valuation_cap,
        "cumulative_dilution": state.cumulative_dilution,
    }


def market_snapshot(state: SimulationStateModel) -> dict[str, float]:
    return {
        "traction_score": state.traction_score,
        "active_customers": state.active_customers,
        "churn_risk": state.churn_risk,
        "pipeline_strength": clamp(state.traction_score * 0.7 - state.market_pressure * 2, 0.0, 100.0),
        "competition_pressure": clamp(state.market_pressure + state.churn_risk * 0.3, 0.0, 10.0),
    }


def team_snapshot(state: SimulationStateModel, conviction: float) -> dict[str, float]:
    return {
        "founder_stress": state.founder_stress,
        "team_morale": state.team_morale,
        "strategic_clarity": state.strategic_clarity,
        "conviction": conviction,
    }


def monthly_summary_from_state(state: SimulationStateModel) -> str:
    outlook = "fragile" if state.survival_probability < 45 else "viable" if state.survival_probability < 70 else "encouraging"
    return (
        f"Month {ceil(max(state.cycle_number, 1) / 4)} closes with {outlook} outlook, "
        f"€{state.cash:,.0f} cash, {state.runway_months} months of runway, traction at {state.traction_score:.1f}, "
        f"and bureaucracy backlog at {state.bureaucracy_backlog:.1f}."
    )
