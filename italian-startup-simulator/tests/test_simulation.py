import io
import zipfile
from pathlib import Path

from app.schemas import SimulationActionInput, StartupCreateInput
from app.services.llm import NullLLMProvider
from app.services.memory import MemoryService
from app.services.orchestrator import ItalianStartupSimulator
from app.agents.finance import FinanceAgent
from app.agents.founder import FounderAgent
from app.agents.market import MarketAgent
from app.agents.narrative import NarrativeReporterAgent
from app.agents.operations import OperationsAgent
from app.agents.strategy import StrategyAgent
from app.services.simulation import SimulationContext, apply_cycle, evaluate_regional_grant_catalog, finance_snapshot, get_regional_grant_catalog, initial_state, liquidation_waterfall


def build_simulator(tmp_path: Path) -> ItalianStartupSimulator:
    memory = MemoryService(tmp_path / "simulator.db")
    llm = NullLLMProvider()
    return ItalianStartupSimulator(
        memory=memory,
        founder_agent=FounderAgent(llm),
        market_agent=MarketAgent(llm),
        finance_agent=FinanceAgent(llm),
        operations_agent=OperationsAgent(llm),
        strategy_agent=StrategyAgent(llm),
        narrative_agent=NarrativeReporterAgent(llm),
    )


def sample_startup() -> StartupCreateInput:
    return StartupCreateInput(
        startup_name="QuietLedger",
        sector="fintech",
        city="Milan",
        region="Lombardy",
        business_model="saas",
        product_type="SME treasury automation",
        target_market="Italian SMEs",
        founding_team="CEO, CTO",
        starting_capital=90000,
        founder_name="Elena",
        founder_ambition=8,
        founder_risk_tolerance="balanced",
        initial_assumptions="Procurement will be slow but the pain is real.",
    )


def test_startup_state_progression(tmp_path: Path):
    simulator = build_simulator(tmp_path)
    simulator.create_startup(sample_startup())
    before = simulator.dashboard()["state"]
    simulator.simulate(SimulationActionInput(cycle_type="week", decision_type="focus_sales", note="Push outbound"))
    after = simulator.dashboard()["state"]
    assert after["cycle_number"] == before["cycle_number"] + 1
    assert after["cash"] != before["cash"]


def test_finance_runway_logic():
    context = SimulationContext(city="Milan", region="Lombardy", sector="fintech", business_model="saas", founder_ambition=8, founder_risk_tolerance="balanced", founding_team="CEO, CTO")
    state = initial_state(context, 60000)
    outcome = apply_cycle(state, context, "cut_costs", "month")
    finance = finance_snapshot(outcome.state)
    assert finance["runway_months"] >= 0
    assert finance["monthly_burn"] > 0


def test_event_generation_consistency():
    context = SimulationContext(city="Naples", region="Campania", sector="commerce", business_model="services", founder_ambition=7, founder_risk_tolerance="high", founding_team="CEO")
    state = initial_state(context, 12000)
    state.cash = 3000
    outcome = apply_cycle(state, context, "focus_sales", "week")
    assert len(outcome.events) >= 1
    assert all(event.severity >= 2 for event in outcome.events)


def test_memory_persistence_roundtrip(tmp_path: Path):
    simulator = build_simulator(tmp_path)
    simulator.create_startup(sample_startup())
    simulator.simulate(SimulationActionInput(cycle_type="week", decision_type="focus_sales"))
    payload = simulator.export_history()

    clone = build_simulator(tmp_path / "clone")
    clone.import_history(payload)
    assert clone.dashboard()["state"]["cycle_number"] == 1
    assert clone.dashboard()["profile"]["startup"]["startup_name"] == "QuietLedger"


def test_decision_impacts_survival_differently():
    context = SimulationContext(city="Milan", region="Lombardy", sector="saas", business_model="saas", founder_ambition=8, founder_risk_tolerance="balanced", founding_team="CEO, CTO")
    state = initial_state(context, 30000)
    sales = apply_cycle(state, context, "focus_sales", "month")
    cuts = apply_cycle(state, context, "cut_costs", "month")
    assert sales.state.survival_probability != cuts.state.survival_probability


def test_investor_and_grant_dynamics_trigger_special_events():
    context = SimulationContext(city="Milan", region="Lombardy", sector="healthtech", business_model="healthtech", founder_ambition=9, founder_risk_tolerance="balanced", founding_team="CEO, CTO")
    state = initial_state(context, 140000)
    state.grant_backlog_score = 5.2
    state.grants_probability = 8.3
    state.bureaucracy_backlog = 2.1
    state.compliance_debt = 2.4
    grant_outcome = apply_cycle(state, context, "apply_grant", "month")
    assert any(event.event_type == "grant_approval" for event in grant_outcome.events)

    state.investor_pipeline_score = 6.8
    state.investor_attractiveness = 8.2
    state.traction_score = 38
    state.reputation = 7.4
    state.founder_stress = 4.2
    investor_outcome = apply_cycle(state, context, "raise_round", "month")
    assert any(event.event_type == "investor_commitment" for event in investor_outcome.events)


def test_term_sheet_dilution_updates_equity_structure():
    context = SimulationContext(city="Milan", region="Lombardy", sector="saas", business_model="saas", founder_ambition=9, founder_risk_tolerance="balanced", founding_team="CEO, CTO")
    state = initial_state(context, 180000)
    state.investor_pipeline_score = 8.0
    state.investor_attractiveness = 8.5
    state.traction_score = 45
    state.reputation = 8.0
    outcome = apply_cycle(state, context, "raise_round", "month")
    assert outcome.state.investor_equity > 0
    assert outcome.state.founder_equity < 100
    assert "pre-money" in outcome.state.last_term_sheet_summary
    assert outcome.cap_table_round is not None


def test_cap_table_rounds_persist_over_time(tmp_path: Path):
    simulator = build_simulator(tmp_path)
    simulator.create_startup(sample_startup())
    dashboard = simulator.dashboard()
    state = simulator.memory.get_state_model()
    assert state is not None
    state.investor_pipeline_score = 8.5
    state.investor_attractiveness = 8.0
    state.traction_score = 40
    state.reputation = 7.5
    outcome = apply_cycle(state, SimulationContext(city="Milan", region="Lombardy", sector="fintech", business_model="saas", founder_ambition=8, founder_risk_tolerance="balanced", founding_team="CEO, CTO"), "raise_round", "month")
    simulator.memory.save_simulation_outcome(
        outcome.state,
        [event.model_dump() for event in outcome.events],
        outcome.strategy_options,
        outcome.report_text,
        outcome.founder_note,
        outcome.strategy_memo.model_dump(),
        decision_type="raise_round",
        cap_table_round=outcome.cap_table_round,
    )
    refreshed = simulator.dashboard()
    assert refreshed["cap_table_rounds"]
    assert refreshed["cap_table_rounds"][0]["round_label"] in {"Pre-seed", "Seed", "Seed extension"}
    assert refreshed["cap_table_rounds"][0]["existing_investor_follow_on_amount"] >= 0


def test_employee_option_grants_and_vesting_progress():
    context = SimulationContext(city="Milan", region="Lombardy", sector="saas", business_model="saas", founder_ambition=8, founder_risk_tolerance="balanced", founding_team="CEO, CTO")
    state = initial_state(context, 90000)
    state.option_pool_equity = 6.0
    hire_outcome = apply_cycle(state, context, "hire", "month")
    assert hire_outcome.employee_option_grant is not None
    assert hire_outcome.state.employee_option_granted_equity > 0
    rolling_state = hire_outcome.state.model_copy(deep=True)
    rolling_state.cycle_number = 12
    rolling_state.cycle_type = "month"
    rolling_state.founder_stress = 4.0
    rolling_state.team_morale = 7.0
    later = apply_cycle(rolling_state, context, "focus_sales", "month")
    assert later.state.employee_option_vested_equity > hire_outcome.state.employee_option_vested_equity


def test_cliff_triggered_option_forfeiture_on_layoffs():
    context = SimulationContext(city="Milan", region="Lombardy", sector="saas", business_model="saas", founder_ambition=8, founder_risk_tolerance="balanced", founding_team="CEO, CTO")
    state = initial_state(context, 90000)
    state.option_pool_equity = 6.0
    hired = apply_cycle(state, context, "hire", "month")
    cut = apply_cycle(hired.state, context, "cut_costs", "month")
    assert cut.state.employee_option_forfeited_equity > 0
    assert any(event.event_type == "employee_departure" for event in cut.events)
    assert cut.state.employee_departures_count >= 1
    assert "vested equity stayed outstanding" in cut.state.last_departure_summary


def test_regional_grant_catalog_prefers_region_and_sector():
    lombardy_grants = get_regional_grant_catalog("Lombardy", "healthtech")
    campania_grants = get_regional_grant_catalog("Campania", "commerce")
    assert lombardy_grants[0]["name"] != campania_grants[0]["name"]
    assert lombardy_grants[0]["match_score"] >= lombardy_grants[-1]["match_score"]


def test_grant_deadlines_and_eligibility_gates_apply():
    context = SimulationContext(city="Milan", region="Lombardy", sector="fintech", business_model="saas", founder_ambition=8, founder_risk_tolerance="balanced", founding_team="CEO")
    state = initial_state(context, 50000)
    state.cycle_number = 12
    late_grants = evaluate_regional_grant_catalog("Lombardy", "fintech", "saas", state)
    assert any(not grant["deadline_open"] for grant in late_grants)
    blocked = apply_cycle(state, context, "apply_grant", "month")
    assert any(event.event_type == "grant_deadline_or_eligibility_block" for event in blocked.events)


def test_stochastic_grant_probabilities_vary_by_season():
    context = SimulationContext(city="Milan", region="Lombardy", sector="saas", business_model="saas", founder_ambition=8, founder_risk_tolerance="balanced", founding_team="CEO")
    winter_state = initial_state(context, 50000)
    winter_state.cycle_number = 1
    spring_state = initial_state(context, 50000)
    spring_state.cycle_number = 4
    winter = evaluate_regional_grant_catalog("Lombardy", "saas", "saas", winter_state)
    spring = evaluate_regional_grant_catalog("Lombardy", "saas", "saas", spring_state)
    assert winter[0]["season"] != spring[0]["season"]
    assert winter[0]["stochastic_probability"] != spring[0]["stochastic_probability"]


def test_safe_or_convertible_note_can_precede_equity_round():
    context = SimulationContext(city="Milan", region="Lombardy", sector="saas", business_model="saas", founder_ambition=8, founder_risk_tolerance="balanced", founding_team="CEO, CTO")
    state = initial_state(context, 60000)
    state.investor_pipeline_score = 5.6
    state.investor_attractiveness = 5.8
    state.traction_score = 20
    state.reputation = 5.0
    note_outcome = apply_cycle(state, context, "raise_round", "month")
    assert any(event.event_type == "note_commitment" for event in note_outcome.events)
    assert note_outcome.cap_table_round is not None
    assert note_outcome.cap_table_round["instrument_type"] in {"safe", "convertible-note"}
    assert note_outcome.state.outstanding_note_principal > 0

    converted_state = note_outcome.state
    converted_state.investor_pipeline_score = 8.3
    converted_state.investor_attractiveness = 8.0
    converted_state.traction_score = 42
    converted_state.reputation = 7.9
    equity_outcome = apply_cycle(converted_state, context, "raise_round", "month")
    assert any(event.event_type == "investor_commitment" for event in equity_outcome.events)
    assert equity_outcome.cap_table_round is not None
    assert equity_outcome.cap_table_round["converted_note_principal"] > 0


def test_liquidation_waterfall_respects_seniority():
    context = SimulationContext(city="Milan", region="Lombardy", sector="saas", business_model="saas", founder_ambition=8, founder_risk_tolerance="balanced", founding_team="CEO, CTO")
    state = initial_state(context, 60000)
    state.outstanding_note_principal = 80000
    state.founder_equity = 62.0
    state.investor_equity = 28.0
    state.option_pool_equity = 10.0
    state.employee_option_vested_equity = 4.0
    waterfall = liquidation_waterfall(
        state,
        [{"instrument_type": "equity", "investment_amount": 120000}],
        exit_value=250000,
    )
    assert waterfall["note_payout"] == 80000
    assert waterfall["preferred_equity_payout"] == 120000
    assert waterfall["founder_common_payout"] > waterfall["employee_option_payout"]


def test_richer_bureaucracy_rules_penalize_regulated_contexts():
    low_drag = SimulationContext(city="Bologna", region="Emilia-Romagna", sector="saas", business_model="saas", founder_ambition=7, founder_risk_tolerance="balanced", founding_team="CEO")
    high_drag = SimulationContext(city="Rome", region="Lazio", sector="fintech", business_model="fintech", founder_ambition=7, founder_risk_tolerance="balanced", founding_team="CEO")
    low_state = initial_state(low_drag, 40000)
    high_state = initial_state(high_drag, 40000)
    assert high_state.bureaucracy_backlog > low_state.bureaucracy_backlog
    assert high_state.compliance_debt > low_state.compliance_debt


def test_branch_comparison_does_not_mutate_saved_state(tmp_path: Path):
    simulator = build_simulator(tmp_path)
    simulator.create_startup(sample_startup())
    baseline_cycle = simulator.dashboard()["state"]["cycle_number"]
    comparison = simulator.compare_branch_tree(["focus_sales", "compliance_sprint", "apply_grant"], "month", 2, beam_width=3, monte_carlo_runs=15, noise_level=3.0)
    assert comparison is not None
    assert len(comparison["paths"]) >= 3
    assert comparison["winner"]["label"]
    assert simulator.dashboard()["state"]["cycle_number"] == baseline_cycle


def test_beam_search_prunes_large_decision_tree(tmp_path: Path):
    simulator = build_simulator(tmp_path)
    simulator.create_startup(sample_startup())
    comparison = simulator.compare_branch_tree(
        ["focus_sales", "product_push", "apply_grant", "raise_round", "compliance_sprint"],
        "month",
        3,
        beam_width=2,
        monte_carlo_runs=20,
        noise_level=5.0,
    )
    assert comparison is not None
    assert len(comparison["paths"]) <= 2
    assert comparison["expanded_paths"] > len(comparison["paths"])
    assert all("monte_carlo" in path for path in comparison["paths"])
    assert comparison["paths"][0]["monte_carlo"]["mean"] >= comparison["paths"][0]["monte_carlo"]["p10"]


def test_compatibility_branch_wrapper_still_works(tmp_path: Path):
    simulator = build_simulator(tmp_path)
    simulator.create_startup(sample_startup())
    comparison = simulator.compare_branches("focus_sales", "compliance_sprint", "month", 2)
    assert comparison is not None
    assert len(comparison["branches"]) == 2


def test_csv_pack_contains_expected_reports(tmp_path: Path):
    simulator = build_simulator(tmp_path)
    simulator.create_startup(sample_startup())
    simulator.simulate(SimulationActionInput(cycle_type="week", decision_type="focus_sales"))
    payload = simulator.export_csv_pack()
    with zipfile.ZipFile(io.BytesIO(payload)) as archive:
        names = set(archive.namelist())
    assert "summary.md" in names
    assert "export.json" in names
    assert "csv/simulation_states.csv" in names
    assert "csv/event_logs.csv" in names
