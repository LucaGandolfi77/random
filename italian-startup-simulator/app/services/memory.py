from __future__ import annotations

import csv
import io
import json
import zipfile
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from app.db import get_connection, init_db
from app.schemas import FounderProfile, SimulationOutcome, SimulationStateModel, StartupCreateInput, StartupProfile
from app.services.simulation import SimulationContext, evaluate_regional_grant_catalog, finance_snapshot, get_regional_grant_catalog, initial_state, liquidation_waterfall, market_snapshot, monthly_summary_from_state, team_snapshot

EXPORT_TABLES = [
    "startup_profiles",
    "founder_profiles",
    "simulation_states",
    "finance_states",
    "market_states",
    "team_states",
    "weekly_snapshots",
    "monthly_snapshots",
    "event_logs",
    "decision_logs",
    "strategy_memos",
    "narrative_reports",
    "cap_table_rounds",
    "employee_option_grants",
]

CSV_PACK_TABLES = [
    "simulation_states",
    "finance_states",
    "market_states",
    "team_states",
    "event_logs",
    "decision_logs",
    "strategy_memos",
    "narrative_reports",
    "cap_table_rounds",
    "employee_option_grants",
]


class MemoryService:
    def __init__(self, db_path: Path) -> None:
        self.db_path = db_path
        init_db(db_path)

    def has_startup(self) -> bool:
        with get_connection(self.db_path) as connection:
            row = connection.execute("SELECT COUNT(*) AS count FROM startup_profiles").fetchone()
        return bool(row["count"])

    def create_startup(self, payload: StartupCreateInput) -> None:
        context = SimulationContext(
            city=payload.city,
            region=payload.region,
            sector=payload.sector,
            business_model=payload.business_model,
            founder_ambition=payload.founder_ambition,
            founder_risk_tolerance=payload.founder_risk_tolerance,
            founding_team=payload.founding_team,
        )
        state = initial_state(context, payload.starting_capital)
        founder = FounderProfile(
            founder_name=payload.founder_name,
            ambition=payload.founder_ambition,
            risk_tolerance=payload.founder_risk_tolerance,
            stress=state.founder_stress,
            discipline=6.0,
            conviction=7.0,
        )
        startup = StartupProfile(
            startup_name=payload.startup_name,
            sector=payload.sector,
            city=payload.city,
            region=payload.region,
            business_model=payload.business_model,
            product_type=payload.product_type,
            target_market=payload.target_market,
            founding_team=payload.founding_team,
            initial_assumptions=payload.initial_assumptions,
        )
        with get_connection(self.db_path) as connection:
            for table in reversed(EXPORT_TABLES):
                connection.execute(f"DELETE FROM {table}")
            connection.execute("DELETE FROM startup_profiles")
            connection.execute("DELETE FROM founder_profiles")
            connection.execute(
                """
                INSERT INTO startup_profiles (id, startup_name, sector, city, region, business_model, product_type, target_market, founding_team, initial_assumptions)
                VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    startup.startup_name,
                    startup.sector,
                    startup.city,
                    startup.region,
                    startup.business_model,
                    startup.product_type,
                    startup.target_market,
                    startup.founding_team,
                    startup.initial_assumptions,
                ),
            )
            connection.execute(
                """
                INSERT INTO founder_profiles (id, founder_name, ambition, risk_tolerance, stress, discipline, conviction)
                VALUES (1, ?, ?, ?, ?, ?, ?)
                """,
                (founder.founder_name, founder.ambition, founder.risk_tolerance, founder.stress, founder.discipline, founder.conviction),
            )
        self.save_simulation_outcome(state, [], [], "The simulator is ready.", "The founder is energized at the starting line.", {"headline": "Start narrow", "recommendation": "Validate demand before expanding complexity.", "confidence": "medium"})

    def get_startup_profile(self) -> dict[str, Any] | None:
        with get_connection(self.db_path) as connection:
            startup = connection.execute("SELECT * FROM startup_profiles WHERE id = 1").fetchone()
            founder = connection.execute("SELECT * FROM founder_profiles WHERE id = 1").fetchone()
        if not startup or not founder:
            return None
        return {"startup": dict(startup), "founder": dict(founder)}

    def latest_state(self) -> dict[str, Any] | None:
        with get_connection(self.db_path) as connection:
            state = connection.execute("SELECT * FROM simulation_states ORDER BY cycle_number DESC LIMIT 1").fetchone()
        return dict(state) if state else None

    def get_state_model(self) -> SimulationStateModel | None:
        state = self.latest_state()
        return SimulationStateModel(**state) if state else None

    def save_simulation_outcome(
        self,
        state: SimulationStateModel,
        events: list[dict[str, Any]] | list[Any],
        strategy_options: list[dict[str, str]],
        report_text: str,
        founder_note: str,
        strategy_memo: dict[str, str],
        decision_type: str | None = None,
        note: str = "",
        cap_table_round: dict[str, str | float] | None = None,
        employee_option_grant: dict[str, str | float] | None = None,
    ) -> None:
        profile = self.get_startup_profile() or {"founder": {"conviction": 7.0}}
        finance = finance_snapshot(state)
        market = market_snapshot(state)
        team = team_snapshot(state, conviction=float(profile["founder"].get("conviction", 7.0)))
        with get_connection(self.db_path) as connection:
            connection.execute(
                """
                INSERT INTO simulation_states (
                    cycle_number, cycle_type, cash, monthly_burn, monthly_revenue, runway_months,
                    founder_stress, team_morale, traction_score, active_customers, churn_risk,
                    product_maturity, bureaucracy_pressure, investor_attractiveness,
                    strategic_clarity, reputation, survival_probability, market_pressure,
                    grants_probability, investor_pipeline_score, grant_backlog_score,
                    bureaucracy_backlog, compliance_debt, founder_equity,
                    investor_equity, option_pool_equity, employee_option_granted_equity,
                    employee_option_vested_equity, employee_option_forfeited_equity, employee_departures_count,
                    last_departure_summary,
                    outstanding_note_principal, note_discount_rate, note_valuation_cap,
                    cumulative_dilution, last_note_summary, last_term_sheet_summary, delayed_payments_exposure,
                    agency_pivot_risk, last_event_summary
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    state.cycle_number,
                    state.cycle_type,
                    state.cash,
                    state.monthly_burn,
                    state.monthly_revenue,
                    state.runway_months,
                    state.founder_stress,
                    state.team_morale,
                    state.traction_score,
                    state.active_customers,
                    state.churn_risk,
                    state.product_maturity,
                    state.bureaucracy_pressure,
                    state.investor_attractiveness,
                    state.strategic_clarity,
                    state.reputation,
                    state.survival_probability,
                    state.market_pressure,
                    state.grants_probability,
                    state.investor_pipeline_score,
                    state.grant_backlog_score,
                    state.bureaucracy_backlog,
                    state.compliance_debt,
                    state.founder_equity,
                    state.investor_equity,
                    state.option_pool_equity,
                    state.employee_option_granted_equity,
                    state.employee_option_vested_equity,
                    state.employee_option_forfeited_equity,
                    state.employee_departures_count,
                    state.last_departure_summary,
                    state.outstanding_note_principal,
                    state.note_discount_rate,
                    state.note_valuation_cap,
                    state.cumulative_dilution,
                    state.last_note_summary,
                    state.last_term_sheet_summary,
                    state.delayed_payments_exposure,
                    state.agency_pivot_risk,
                    state.last_event_summary,
                ),
            )
            connection.execute(
                "INSERT INTO finance_states (cycle_number, cash, monthly_burn, monthly_revenue, runway_months, taxes_due, delayed_receivables) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (state.cycle_number, finance["cash"], finance["monthly_burn"], finance["monthly_revenue"], finance["runway_months"], finance["taxes_due"], finance["delayed_receivables"]),
            )
            connection.execute(
                "INSERT INTO market_states (cycle_number, traction_score, active_customers, churn_risk, pipeline_strength, competition_pressure) VALUES (?, ?, ?, ?, ?, ?)",
                (state.cycle_number, market["traction_score"], market["active_customers"], market["churn_risk"], market["pipeline_strength"], market["competition_pressure"]),
            )
            connection.execute(
                "INSERT INTO team_states (cycle_number, founder_stress, team_morale, strategic_clarity, conviction) VALUES (?, ?, ?, ?, ?)",
                (state.cycle_number, team["founder_stress"], team["team_morale"], team["strategic_clarity"], team["conviction"]),
            )
            for event in events:
                payload = event if isinstance(event, dict) else event.model_dump()
                connection.execute(
                    "INSERT INTO event_logs (cycle_number, cycle_type, event_type, severity, title, description, impact_cash, impact_traction, impact_stress) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (state.cycle_number, state.cycle_type, payload["event_type"], payload["severity"], payload["title"], payload["description"], payload.get("impact_cash", 0.0), payload.get("impact_traction", 0.0), payload.get("impact_stress", 0.0)),
                )
            if decision_type:
                connection.execute(
                    "INSERT INTO decision_logs (cycle_number, cycle_type, decision_type, note) VALUES (?, ?, ?, ?)",
                    (state.cycle_number, state.cycle_type, decision_type, note),
                )
            connection.execute(
                "INSERT INTO strategy_memos (cycle_number, headline, recommendation, confidence) VALUES (?, ?, ?, ?)",
                (state.cycle_number, strategy_memo["headline"], strategy_memo["recommendation"], strategy_memo["confidence"]),
            )
            connection.execute(
                "INSERT INTO narrative_reports (cycle_number, cycle_type, report_text, founder_note) VALUES (?, ?, ?, ?)",
                (state.cycle_number, state.cycle_type, report_text, founder_note),
            )
            if cap_table_round:
                connection.execute(
                    """
                    INSERT INTO cap_table_rounds (
                        cycle_number, round_label, instrument_type, investment_amount, pre_money, investor_share,
                        founder_share, option_pool_share, existing_investor_follow_on_amount,
                        new_investor_amount, existing_investor_post_share, new_investor_post_share,
                        converted_note_principal, discount_rate, valuation_cap,
                        dilution, liquidation_preference, board_rights
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        state.cycle_number,
                        cap_table_round["round_label"],
                        cap_table_round.get("instrument_type", "equity"),
                        cap_table_round["investment_amount"],
                        cap_table_round["pre_money"],
                        cap_table_round["investor_share"],
                        cap_table_round["founder_share"],
                        cap_table_round["option_pool_share"],
                        cap_table_round.get("existing_investor_follow_on_amount", 0.0),
                        cap_table_round.get("new_investor_amount", 0.0),
                        cap_table_round.get("existing_investor_post_share", 0.0),
                        cap_table_round.get("new_investor_post_share", 0.0),
                        cap_table_round.get("converted_note_principal", 0.0),
                        cap_table_round.get("discount_rate", 0.0),
                        cap_table_round.get("valuation_cap", 0.0),
                        cap_table_round["dilution"],
                        cap_table_round["liquidation_preference"],
                        cap_table_round["board_rights"],
                    ),
                )
            if employee_option_grant:
                connection.execute(
                    """
                    INSERT INTO employee_option_grants (
                        cycle_number, grant_label, granted_equity, vested_equity, vesting_months, cliff_months
                    ) VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        state.cycle_number,
                        employee_option_grant["grant_label"],
                        employee_option_grant["granted_equity"],
                        employee_option_grant["vested_equity"],
                        employee_option_grant["vesting_months"],
                        employee_option_grant["cliff_months"],
                    ),
                )
            if state.cycle_type == "week":
                connection.execute("INSERT INTO weekly_snapshots (cycle_number, summary) VALUES (?, ?)", (state.cycle_number, report_text))
            if state.cycle_type == "month" or state.cycle_number % 4 == 0:
                connection.execute("INSERT INTO monthly_snapshots (cycle_number, summary) VALUES (?, ?)", (state.cycle_number, monthly_summary_from_state(state)))

    def update_founder_profile(self, stress: float, conviction: float, discipline: float) -> None:
        with get_connection(self.db_path) as connection:
            connection.execute(
                "UPDATE founder_profiles SET stress = ?, conviction = ?, discipline = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1",
                (stress, conviction, discipline),
            )

    def dashboard(self) -> dict[str, Any]:
        profile = self.get_startup_profile()
        state = self.latest_state()
        with get_connection(self.db_path) as connection:
            finance = connection.execute("SELECT * FROM finance_states ORDER BY cycle_number DESC LIMIT 1").fetchone()
            market = connection.execute("SELECT * FROM market_states ORDER BY cycle_number DESC LIMIT 1").fetchone()
            team = connection.execute("SELECT * FROM team_states ORDER BY cycle_number DESC LIMIT 1").fetchone()
            events = connection.execute("SELECT * FROM event_logs ORDER BY id DESC LIMIT 8").fetchall()
            reports = connection.execute("SELECT * FROM narrative_reports ORDER BY id DESC LIMIT 6").fetchall()
            cap_table_rounds = connection.execute("SELECT * FROM cap_table_rounds ORDER BY cycle_number DESC LIMIT 8").fetchall()
            option_grants = connection.execute("SELECT * FROM employee_option_grants ORDER BY cycle_number DESC LIMIT 8").fetchall()
            memo = connection.execute("SELECT * FROM strategy_memos ORDER BY id DESC LIMIT 1").fetchone()
            decisions = connection.execute("SELECT * FROM decision_logs ORDER BY id DESC LIMIT 10").fetchall()
            chart_states = connection.execute(
                """
                SELECT cycle_number, cash, monthly_revenue, monthly_burn, survival_probability,
                       traction_score, investor_pipeline_score, grant_backlog_score,
                       bureaucracy_backlog, compliance_debt
                FROM simulation_states
                ORDER BY cycle_number ASC
                LIMIT 30
                """
            ).fetchall()
        regional_grants = []
        if profile and profile.get("startup") and state:
            regional_grants = evaluate_regional_grant_catalog(
                profile["startup"]["region"],
                profile["startup"]["sector"],
                profile["startup"]["business_model"],
                SimulationStateModel(**state),
            )
        waterfall = None
        if state:
            state_model = SimulationStateModel(**state)
            cap_table_payload = [dict(row) for row in cap_table_rounds]
            illustrative_exit_value = max(
                50000.0,
                state_model.cash + state_model.monthly_revenue * 24 + state_model.traction_score * 25000,
            )
            waterfall = liquidation_waterfall(state_model, cap_table_payload, illustrative_exit_value)
        return {
            "profile": profile,
            "state": state,
            "finance": dict(finance) if finance else None,
            "market": dict(market) if market else None,
            "team": dict(team) if team else None,
            "events": [dict(row) for row in events],
            "reports": [dict(row) for row in reports],
            "cap_table_rounds": [dict(row) for row in cap_table_rounds],
            "employee_option_grants": [dict(row) for row in option_grants],
            "strategy_memo": dict(memo) if memo else None,
            "decisions": [dict(row) for row in decisions],
            "regional_grants": regional_grants,
            "liquidation_waterfall": waterfall,
            "chart_data": {
                "trajectory": [dict(row) for row in chart_states],
            },
        }

    def build_csv_pack(self) -> bytes:
        payload = self.get_export_payload()
        summary = self.dashboard()
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            archive.writestr("export.json", json.dumps(payload, indent=2))
            archive.writestr("summary.md", self._summary_report(summary))
            for table in CSV_PACK_TABLES:
                archive.writestr(f"csv/{table}.csv", self._table_to_csv(table))
        return buffer.getvalue()

    def _table_to_csv(self, table: str) -> str:
        with get_connection(self.db_path) as connection:
            rows = connection.execute(f"SELECT * FROM {table}").fetchall()
        text = io.StringIO()
        if not rows:
            text.write("\n")
            return text.getvalue()
        writer = csv.DictWriter(text, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        for row in rows:
            writer.writerow(dict(row))
        return text.getvalue()

    def _summary_report(self, dashboard: dict[str, Any]) -> str:
        profile = dashboard.get("profile") or {}
        startup = profile.get("startup") or {}
        state = dashboard.get("state") or {}
        finance = dashboard.get("finance") or {}
        memo = dashboard.get("strategy_memo") or {}
        return "\n".join(
            [
                "# Italian Startup Simulator report pack",
                "",
                f"- Exported at: {datetime.now(UTC).isoformat(timespec='seconds')}",
                f"- Startup: {startup.get('startup_name', 'N/A')}",
                f"- Sector: {startup.get('sector', 'N/A')}",
                f"- Base: {startup.get('city', 'N/A')}, {startup.get('region', 'N/A')}",
                f"- Cycle: {state.get('cycle_number', 0)} ({state.get('cycle_type', 'week')})",
                f"- Cash: €{state.get('cash', 0):,.0f}",
                f"- Runway: {state.get('runway_months', 0)} months",
                f"- Survival: {state.get('survival_probability', 0)}%",
                f"- Investor pipeline: {state.get('investor_pipeline_score', 0)} / 10",
                f"- Grant backlog: {state.get('grant_backlog_score', 0)} / 10",
                f"- Bureaucracy backlog: {state.get('bureaucracy_backlog', 0)} / 10",
                f"- Compliance debt: {state.get('compliance_debt', 0)} / 10",
                f"- Founder equity: {state.get('founder_equity', 0)}%",
                f"- Investor equity: {state.get('investor_equity', 0)}%",
                f"- Option pool: {state.get('option_pool_equity', 0)}%",
                f"- Employee departures: {state.get('employee_departures_count', 0)}",
                f"- Departure summary: {state.get('last_departure_summary', 'No departures yet.')}",
                f"- Term sheet: {state.get('last_term_sheet_summary', 'No external financing yet.')}",
                f"- Monthly burn: €{finance.get('monthly_burn', 0):,.0f}",
                f"- Monthly revenue: €{finance.get('monthly_revenue', 0):,.0f}",
                "",
                "## Cap table rounds",
                "",
                *[
                    f"- Cycle {row['cycle_number']} · {row['round_label']} · €{row['investment_amount']:,.0f} at €{row['pre_money']:,.0f} pre-money"
                    for row in dashboard.get("cap_table_rounds", [])[:5]
                ],
                "",
                "## Current strategic memo",
                "",
                memo.get("headline", "No memo yet."),
                "",
                memo.get("recommendation", "No recommendation yet."),
                "",
                "## Regional grant catalog",
                "",
                *[
                    f"- {grant['name']} · {grant['amount_eur']} · stage {grant['stage']} · match {grant['match_score']}"
                    for grant in dashboard.get("regional_grants", [])[:5]
                ],
            ]
        )

    def get_export_payload(self) -> dict[str, Any]:
        payload: dict[str, Any] = {"version": 1, "exported_at": datetime.now(UTC).isoformat(timespec="seconds"), "tables": {}}
        with get_connection(self.db_path) as connection:
            startup = connection.execute("SELECT * FROM startup_profiles").fetchall()
            founder = connection.execute("SELECT * FROM founder_profiles").fetchall()
            payload["tables"]["startup_profiles"] = [dict(row) for row in startup]
            payload["tables"]["founder_profiles"] = [dict(row) for row in founder]
            for table in EXPORT_TABLES:
                rows = connection.execute(f"SELECT * FROM {table}").fetchall()
                payload["tables"][table] = [dict(row) for row in rows]
        return payload

    def import_payload(self, payload: dict[str, Any]) -> None:
        tables = payload.get("tables", {})
        with get_connection(self.db_path) as connection:
            for table in ["startup_profiles", "founder_profiles", *reversed(EXPORT_TABLES), "llm_cache"]:
                connection.execute(f"DELETE FROM {table}")
            for table, rows in tables.items():
                if not rows:
                    continue
                columns = list(rows[0].keys())
                placeholders = ", ".join(["?"] * len(columns))
                column_list = ", ".join(columns)
                connection.executemany(
                    f"INSERT INTO {table} ({column_list}) VALUES ({placeholders})",
                    [tuple(row.get(column) for column in columns) for row in rows],
                )

    def get_cached_response(self, cache_key: str) -> str | None:
        with get_connection(self.db_path) as connection:
            row = connection.execute("SELECT response_text FROM llm_cache WHERE cache_key = ?", (cache_key,)).fetchone()
        return row["response_text"] if row else None

    def set_cached_response(self, cache_key: str, response_text: str) -> None:
        with get_connection(self.db_path) as connection:
            connection.execute(
                "INSERT INTO llm_cache (cache_key, response_text) VALUES (?, ?) ON CONFLICT(cache_key) DO UPDATE SET response_text = excluded.response_text",
                (cache_key, response_text),
            )
