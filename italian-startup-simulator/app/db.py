from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

SCHEMA = """
CREATE TABLE IF NOT EXISTS startup_profiles (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    startup_name TEXT NOT NULL,
    sector TEXT NOT NULL,
    city TEXT NOT NULL,
    region TEXT NOT NULL,
    business_model TEXT NOT NULL,
    product_type TEXT NOT NULL,
    target_market TEXT NOT NULL,
    founding_team TEXT NOT NULL,
    initial_assumptions TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS founder_profiles (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    founder_name TEXT NOT NULL,
    ambition INTEGER NOT NULL,
    risk_tolerance TEXT NOT NULL,
    stress REAL NOT NULL DEFAULT 4.5,
    discipline REAL NOT NULL DEFAULT 6.0,
    conviction REAL NOT NULL DEFAULT 7.0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS simulation_states (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cycle_number INTEGER NOT NULL,
    cycle_type TEXT NOT NULL,
    cash REAL NOT NULL,
    monthly_burn REAL NOT NULL,
    monthly_revenue REAL NOT NULL,
    runway_months REAL NOT NULL,
    founder_stress REAL NOT NULL,
    team_morale REAL NOT NULL,
    traction_score REAL NOT NULL,
    active_customers INTEGER NOT NULL,
    churn_risk REAL NOT NULL,
    product_maturity REAL NOT NULL,
    bureaucracy_pressure REAL NOT NULL,
    investor_attractiveness REAL NOT NULL,
    strategic_clarity REAL NOT NULL,
    reputation REAL NOT NULL,
    survival_probability REAL NOT NULL,
    market_pressure REAL NOT NULL,
    grants_probability REAL NOT NULL,
    investor_pipeline_score REAL NOT NULL,
    grant_backlog_score REAL NOT NULL,
    bureaucracy_backlog REAL NOT NULL,
    compliance_debt REAL NOT NULL,
    founder_equity REAL NOT NULL DEFAULT 100,
    investor_equity REAL NOT NULL DEFAULT 0,
    option_pool_equity REAL NOT NULL DEFAULT 0,
    employee_option_granted_equity REAL NOT NULL DEFAULT 0,
    employee_option_vested_equity REAL NOT NULL DEFAULT 0,
    employee_option_forfeited_equity REAL NOT NULL DEFAULT 0,
    employee_departures_count INTEGER NOT NULL DEFAULT 0,
    last_departure_summary TEXT NOT NULL DEFAULT 'No departures yet.',
    outstanding_note_principal REAL NOT NULL DEFAULT 0,
    note_discount_rate REAL NOT NULL DEFAULT 0,
    note_valuation_cap REAL NOT NULL DEFAULT 0,
    last_note_summary TEXT NOT NULL DEFAULT 'No note financing yet.',
    cumulative_dilution REAL NOT NULL DEFAULT 0,
    last_term_sheet_summary TEXT NOT NULL DEFAULT 'No external financing yet.',
    delayed_payments_exposure REAL NOT NULL,
    agency_pivot_risk REAL NOT NULL,
    last_event_summary TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS finance_states (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cycle_number INTEGER NOT NULL,
    cash REAL NOT NULL,
    monthly_burn REAL NOT NULL,
    monthly_revenue REAL NOT NULL,
    runway_months REAL NOT NULL,
    taxes_due REAL NOT NULL,
    delayed_receivables REAL NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS market_states (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cycle_number INTEGER NOT NULL,
    traction_score REAL NOT NULL,
    active_customers INTEGER NOT NULL,
    churn_risk REAL NOT NULL,
    pipeline_strength REAL NOT NULL,
    competition_pressure REAL NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS team_states (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cycle_number INTEGER NOT NULL,
    founder_stress REAL NOT NULL,
    team_morale REAL NOT NULL,
    strategic_clarity REAL NOT NULL,
    conviction REAL NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS weekly_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cycle_number INTEGER NOT NULL,
    summary TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS monthly_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cycle_number INTEGER NOT NULL,
    summary TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS event_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cycle_number INTEGER NOT NULL,
    cycle_type TEXT NOT NULL,
    event_type TEXT NOT NULL,
    severity INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    impact_cash REAL NOT NULL DEFAULT 0,
    impact_traction REAL NOT NULL DEFAULT 0,
    impact_stress REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS decision_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cycle_number INTEGER NOT NULL,
    cycle_type TEXT NOT NULL,
    decision_type TEXT NOT NULL,
    note TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS strategy_memos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cycle_number INTEGER NOT NULL,
    headline TEXT NOT NULL,
    recommendation TEXT NOT NULL,
    confidence TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS narrative_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cycle_number INTEGER NOT NULL,
    cycle_type TEXT NOT NULL,
    report_text TEXT NOT NULL,
    founder_note TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cap_table_rounds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cycle_number INTEGER NOT NULL,
    round_label TEXT NOT NULL,
    instrument_type TEXT NOT NULL DEFAULT 'equity',
    investment_amount REAL NOT NULL,
    pre_money REAL NOT NULL,
    investor_share REAL NOT NULL,
    founder_share REAL NOT NULL,
    option_pool_share REAL NOT NULL,
    existing_investor_follow_on_amount REAL NOT NULL DEFAULT 0,
    new_investor_amount REAL NOT NULL DEFAULT 0,
    existing_investor_post_share REAL NOT NULL DEFAULT 0,
    new_investor_post_share REAL NOT NULL DEFAULT 0,
    converted_note_principal REAL NOT NULL DEFAULT 0,
    discount_rate REAL NOT NULL DEFAULT 0,
    valuation_cap REAL NOT NULL DEFAULT 0,
    dilution REAL NOT NULL,
    liquidation_preference TEXT NOT NULL,
    board_rights TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS employee_option_grants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cycle_number INTEGER NOT NULL,
    grant_label TEXT NOT NULL,
    granted_equity REAL NOT NULL,
    vested_equity REAL NOT NULL,
    vesting_months INTEGER NOT NULL,
    cliff_months INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS llm_cache (
    cache_key TEXT PRIMARY KEY,
    response_text TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
"""


def ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


@contextmanager
def get_connection(db_path: Path) -> Iterator[sqlite3.Connection]:
    ensure_parent(db_path)
    connection = sqlite3.connect(db_path, check_same_thread=False)
    connection.row_factory = sqlite3.Row
    try:
        yield connection
        connection.commit()
    finally:
        connection.close()



def init_db(db_path: Path) -> None:
    with get_connection(db_path) as connection:
        connection.executescript(SCHEMA)
        _apply_migrations(connection)


def _apply_migrations(connection: sqlite3.Connection) -> None:
    simulation_state_columns = {row["name"] for row in connection.execute("PRAGMA table_info(simulation_states)").fetchall()}
    existing_tables = {row["name"] for row in connection.execute("SELECT name FROM sqlite_master WHERE type = 'table'").fetchall()}
    migrations = {
        "investor_pipeline_score": "ALTER TABLE simulation_states ADD COLUMN investor_pipeline_score REAL NOT NULL DEFAULT 0",
        "grant_backlog_score": "ALTER TABLE simulation_states ADD COLUMN grant_backlog_score REAL NOT NULL DEFAULT 0",
        "bureaucracy_backlog": "ALTER TABLE simulation_states ADD COLUMN bureaucracy_backlog REAL NOT NULL DEFAULT 0",
        "compliance_debt": "ALTER TABLE simulation_states ADD COLUMN compliance_debt REAL NOT NULL DEFAULT 0",
        "founder_equity": "ALTER TABLE simulation_states ADD COLUMN founder_equity REAL NOT NULL DEFAULT 100",
        "investor_equity": "ALTER TABLE simulation_states ADD COLUMN investor_equity REAL NOT NULL DEFAULT 0",
        "option_pool_equity": "ALTER TABLE simulation_states ADD COLUMN option_pool_equity REAL NOT NULL DEFAULT 0",
        "employee_option_granted_equity": "ALTER TABLE simulation_states ADD COLUMN employee_option_granted_equity REAL NOT NULL DEFAULT 0",
        "employee_option_vested_equity": "ALTER TABLE simulation_states ADD COLUMN employee_option_vested_equity REAL NOT NULL DEFAULT 0",
        "employee_option_forfeited_equity": "ALTER TABLE simulation_states ADD COLUMN employee_option_forfeited_equity REAL NOT NULL DEFAULT 0",
        "employee_departures_count": "ALTER TABLE simulation_states ADD COLUMN employee_departures_count INTEGER NOT NULL DEFAULT 0",
        "last_departure_summary": "ALTER TABLE simulation_states ADD COLUMN last_departure_summary TEXT NOT NULL DEFAULT 'No departures yet.'",
        "outstanding_note_principal": "ALTER TABLE simulation_states ADD COLUMN outstanding_note_principal REAL NOT NULL DEFAULT 0",
        "note_discount_rate": "ALTER TABLE simulation_states ADD COLUMN note_discount_rate REAL NOT NULL DEFAULT 0",
        "note_valuation_cap": "ALTER TABLE simulation_states ADD COLUMN note_valuation_cap REAL NOT NULL DEFAULT 0",
        "last_note_summary": "ALTER TABLE simulation_states ADD COLUMN last_note_summary TEXT NOT NULL DEFAULT 'No note financing yet.'",
        "cumulative_dilution": "ALTER TABLE simulation_states ADD COLUMN cumulative_dilution REAL NOT NULL DEFAULT 0",
        "last_term_sheet_summary": "ALTER TABLE simulation_states ADD COLUMN last_term_sheet_summary TEXT NOT NULL DEFAULT 'No external financing yet.'",
    }
    for column, statement in migrations.items():
        if column not in simulation_state_columns:
            connection.execute(statement)
    if "cap_table_rounds" not in existing_tables:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS cap_table_rounds (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cycle_number INTEGER NOT NULL,
                round_label TEXT NOT NULL,
                instrument_type TEXT NOT NULL DEFAULT 'equity',
                investment_amount REAL NOT NULL,
                pre_money REAL NOT NULL,
                investor_share REAL NOT NULL,
                founder_share REAL NOT NULL,
                option_pool_share REAL NOT NULL,
                existing_investor_follow_on_amount REAL NOT NULL DEFAULT 0,
                new_investor_amount REAL NOT NULL DEFAULT 0,
                existing_investor_post_share REAL NOT NULL DEFAULT 0,
                new_investor_post_share REAL NOT NULL DEFAULT 0,
                converted_note_principal REAL NOT NULL DEFAULT 0,
                discount_rate REAL NOT NULL DEFAULT 0,
                valuation_cap REAL NOT NULL DEFAULT 0,
                dilution REAL NOT NULL,
                liquidation_preference TEXT NOT NULL,
                board_rights TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
    cap_round_columns = {row["name"] for row in connection.execute("PRAGMA table_info(cap_table_rounds)").fetchall()} if "cap_table_rounds" in {row["name"] for row in connection.execute("SELECT name FROM sqlite_master WHERE type = 'table'").fetchall()} else set()
    cap_round_migrations = {
        "instrument_type": "ALTER TABLE cap_table_rounds ADD COLUMN instrument_type TEXT NOT NULL DEFAULT 'equity'",
        "existing_investor_follow_on_amount": "ALTER TABLE cap_table_rounds ADD COLUMN existing_investor_follow_on_amount REAL NOT NULL DEFAULT 0",
        "new_investor_amount": "ALTER TABLE cap_table_rounds ADD COLUMN new_investor_amount REAL NOT NULL DEFAULT 0",
        "existing_investor_post_share": "ALTER TABLE cap_table_rounds ADD COLUMN existing_investor_post_share REAL NOT NULL DEFAULT 0",
        "new_investor_post_share": "ALTER TABLE cap_table_rounds ADD COLUMN new_investor_post_share REAL NOT NULL DEFAULT 0",
        "converted_note_principal": "ALTER TABLE cap_table_rounds ADD COLUMN converted_note_principal REAL NOT NULL DEFAULT 0",
        "discount_rate": "ALTER TABLE cap_table_rounds ADD COLUMN discount_rate REAL NOT NULL DEFAULT 0",
        "valuation_cap": "ALTER TABLE cap_table_rounds ADD COLUMN valuation_cap REAL NOT NULL DEFAULT 0",
    }
    for column, statement in cap_round_migrations.items():
        if column not in cap_round_columns:
            connection.execute(statement)
    if "employee_option_grants" not in existing_tables:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS employee_option_grants (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cycle_number INTEGER NOT NULL,
                grant_label TEXT NOT NULL,
                granted_equity REAL NOT NULL,
                vested_equity REAL NOT NULL,
                vesting_months INTEGER NOT NULL,
                cliff_months INTEGER NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
