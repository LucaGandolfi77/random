from __future__ import annotations

import json
import sqlite3
from pathlib import Path

from .models import AgentMessage, CaseInput, StoredCase, Verdict, utc_now


def default_db_path() -> Path:
    base = Path.home() / ".ai_courtroom"
    base.mkdir(parents=True, exist_ok=True)
    return base / "courtroom.sqlite3"


class CourtroomStorage:
    def __init__(self, db_path: Path | None = None) -> None:
        self.db_path = db_path or default_db_path()
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._connect() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS cases (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    dilemma TEXT NOT NULL,
                    category TEXT NOT NULL,
                    budget TEXT,
                    time_horizon TEXT,
                    constraints TEXT,
                    risk_tolerance INTEGER NOT NULL,
                    existing_context TEXT,
                    alternatives_json TEXT NOT NULL,
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS agent_messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    case_id INTEGER NOT NULL,
                    agent_role TEXT NOT NULL,
                    stage TEXT NOT NULL,
                    content TEXT NOT NULL,
                    round_index INTEGER NOT NULL,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY(case_id) REFERENCES cases(id)
                );

                CREATE TABLE IF NOT EXISTS verdicts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    case_id INTEGER NOT NULL UNIQUE,
                    verdict TEXT NOT NULL,
                    reasoning TEXT NOT NULL,
                    key_risks_json TEXT NOT NULL,
                    best_alternatives_json TEXT NOT NULL,
                    action_plan_json TEXT NOT NULL,
                    confidence INTEGER NOT NULL,
                    change_conditions_json TEXT NOT NULL,
                    missing_evidence_json TEXT NOT NULL,
                    follow_up_questions_json TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY(case_id) REFERENCES cases(id)
                );

                CREATE TABLE IF NOT EXISTS reports (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    case_id INTEGER NOT NULL,
                    format TEXT NOT NULL,
                    content TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY(case_id) REFERENCES cases(id)
                );

                CREATE TABLE IF NOT EXISTS saved_sessions (
                    case_id INTEGER PRIMARY KEY,
                    label TEXT NOT NULL,
                    last_opened_at TEXT NOT NULL,
                    FOREIGN KEY(case_id) REFERENCES cases(id)
                );
                """
            )

    def create_case(self, case_input: CaseInput) -> StoredCase:
        created_at = utc_now()
        with self._connect() as conn:
            cursor = conn.execute(
                """
                INSERT INTO cases (
                    title, dilemma, category, budget, time_horizon, constraints,
                    risk_tolerance, existing_context, alternatives_json, status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    case_input.title,
                    case_input.dilemma,
                    case_input.category,
                    case_input.budget,
                    case_input.time_horizon,
                    case_input.constraints,
                    case_input.risk_tolerance,
                    case_input.existing_context,
                    json.dumps(case_input.alternatives),
                    "running",
                    created_at,
                ),
            )
            case_id = int(cursor.lastrowid)
        self.upsert_session(case_id, case_input.title)
        return StoredCase(
            id=case_id,
            title=case_input.title,
            dilemma=case_input.dilemma,
            category=case_input.category,
            budget=case_input.budget,
            time_horizon=case_input.time_horizon,
            constraints=case_input.constraints,
            risk_tolerance=case_input.risk_tolerance,
            existing_context=case_input.existing_context,
            alternatives=case_input.alternatives,
            status="running",
            created_at=created_at,
        )

    def update_case_status(self, case_id: int, status: str) -> None:
        with self._connect() as conn:
            conn.execute("UPDATE cases SET status = ? WHERE id = ?", (status, case_id))

    def upsert_session(self, case_id: int, label: str) -> None:
        now = utc_now()
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO saved_sessions (case_id, label, last_opened_at)
                VALUES (?, ?, ?)
                ON CONFLICT(case_id) DO UPDATE SET
                    label = excluded.label,
                    last_opened_at = excluded.last_opened_at
                """,
                (case_id, label, now),
            )

    def add_message(self, message: AgentMessage) -> AgentMessage:
        with self._connect() as conn:
            cursor = conn.execute(
                """
                INSERT INTO agent_messages (
                    case_id, agent_role, stage, content, round_index, created_at
                ) VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    message.case_id,
                    message.agent_role,
                    message.stage,
                    message.content,
                    message.round_index,
                    message.created_at,
                ),
            )
            message.id = int(cursor.lastrowid)
        return message

    def save_verdict(self, verdict: Verdict) -> Verdict:
        with self._connect() as conn:
            cursor = conn.execute(
                """
                INSERT INTO verdicts (
                    case_id, verdict, reasoning, key_risks_json,
                    best_alternatives_json, action_plan_json, confidence,
                    change_conditions_json, missing_evidence_json,
                    follow_up_questions_json, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(case_id) DO UPDATE SET
                    verdict = excluded.verdict,
                    reasoning = excluded.reasoning,
                    key_risks_json = excluded.key_risks_json,
                    best_alternatives_json = excluded.best_alternatives_json,
                    action_plan_json = excluded.action_plan_json,
                    confidence = excluded.confidence,
                    change_conditions_json = excluded.change_conditions_json,
                    missing_evidence_json = excluded.missing_evidence_json,
                    follow_up_questions_json = excluded.follow_up_questions_json,
                    created_at = excluded.created_at
                """,
                (
                    verdict.case_id,
                    verdict.verdict,
                    verdict.reasoning,
                    json.dumps(verdict.key_risks),
                    json.dumps(verdict.best_alternatives),
                    json.dumps(verdict.action_plan),
                    verdict.confidence,
                    json.dumps(verdict.change_conditions),
                    json.dumps(verdict.missing_evidence),
                    json.dumps(verdict.follow_up_questions),
                    verdict.created_at,
                ),
            )
            verdict.id = int(cursor.lastrowid or 0)
        return verdict

    def save_report(self, case_id: int, fmt: str, content: str) -> None:
        with self._connect() as conn:
            conn.execute(
                "INSERT INTO reports (case_id, format, content, created_at) VALUES (?, ?, ?, ?)",
                (case_id, fmt, content, utc_now()),
            )

    def list_cases(self) -> list[StoredCase]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT c.*
                FROM cases c
                LEFT JOIN saved_sessions s ON s.case_id = c.id
                ORDER BY COALESCE(s.last_opened_at, c.created_at) DESC
                """
            ).fetchall()
        return [self._row_to_case(row) for row in rows]

    def get_case(self, case_id: int) -> StoredCase | None:
        with self._connect() as conn:
            row = conn.execute("SELECT * FROM cases WHERE id = ?", (case_id,)).fetchone()
        return self._row_to_case(row) if row else None

    def get_messages(self, case_id: int) -> list[AgentMessage]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM agent_messages WHERE case_id = ? ORDER BY id ASC",
                (case_id,),
            ).fetchall()
        return [
            AgentMessage(
                id=int(row["id"]),
                case_id=int(row["case_id"]),
                agent_role=row["agent_role"],
                stage=row["stage"],
                content=row["content"],
                round_index=int(row["round_index"]),
                created_at=row["created_at"],
            )
            for row in rows
        ]

    def get_verdict(self, case_id: int) -> Verdict | None:
        with self._connect() as conn:
            row = conn.execute("SELECT * FROM verdicts WHERE case_id = ?", (case_id,)).fetchone()
        if not row:
            return None
        return Verdict(
            id=int(row["id"]),
            case_id=int(row["case_id"]),
            verdict=row["verdict"],
            reasoning=row["reasoning"],
            key_risks=json.loads(row["key_risks_json"]),
            best_alternatives=json.loads(row["best_alternatives_json"]),
            action_plan=json.loads(row["action_plan_json"]),
            confidence=int(row["confidence"]),
            change_conditions=json.loads(row["change_conditions_json"]),
            missing_evidence=json.loads(row["missing_evidence_json"]),
            follow_up_questions=json.loads(row["follow_up_questions_json"]),
            created_at=row["created_at"],
        )

    def get_latest_report(self, case_id: int, fmt: str = "markdown") -> str | None:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT content FROM reports WHERE case_id = ? AND format = ? ORDER BY id DESC LIMIT 1",
                (case_id, fmt),
            ).fetchone()
        return row["content"] if row else None

    def _row_to_case(self, row: sqlite3.Row) -> StoredCase:
        return StoredCase(
            id=int(row["id"]),
            title=row["title"],
            dilemma=row["dilemma"],
            category=row["category"],
            budget=row["budget"],
            time_horizon=row["time_horizon"],
            constraints=row["constraints"] or "",
            risk_tolerance=int(row["risk_tolerance"]),
            existing_context=row["existing_context"] or "",
            alternatives=json.loads(row["alternatives_json"]),
            status=row["status"],
            created_at=row["created_at"],
        )
        markdown = self.get_report(case_id)
        if markdown is None:
            raise ValueError(f"No report found for case_id={case_id}")
        output = Path(output_path) if output_path else self.exports_dir / f"{case_id}.md"
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(markdown, encoding="utf-8")
        return output

    def hydrate_trial(self, case_id: str) -> TrialResult:
        case_row = self.get_case(case_id)
        verdict_row = self.get_verdict(case_id)
        if case_row is None or verdict_row is None:
            raise ValueError(f"Case {case_id} not found")
        case = CaseInput(
            title=case_row["title"],
            dilemma=case_row["dilemma"],
            category=case_row["category"],
            budget=case_row["budget"],
            time_horizon=case_row["time_horizon"],
            constraints=case_row["constraints"],
            risk_tolerance=case_row["risk_tolerance"],
            existing_context=case_row["existing_context"],
            alternatives_considered=case_row["alternatives_considered"],
            case_id=case_row["case_id"],
            created_at=case_row["created_at"],
        )
        messages = [
            AgentMessage(
                case_id=row["case_id"],
                role=row["role"],
                phase=row["phase"],
                content=row["content"],
                order_index=row["order_index"],
                created_at=row["created_at"],
                message_id=row["message_id"],
            )
            for row in self.get_messages(case_id)
        ]
        intake_content = next((msg.content for msg in messages if msg.role == "Case Intake Agent"), "")
        intake = IntakeAnalysis(
            decision_type=case.category,
            assumptions=[],
            missing_information=[],
            key_constraints=[],
            reversibility="unknown",
            timing_pressure="unknown",
            evidence_strength="unknown",
            context_summary=intake_content,
        )
        verdict = Verdict(
            case_id=verdict_row["case_id"],
            verdict_label=verdict_row["verdict_label"],
            reasoning=verdict_row["reasoning"],
            main_risks=json.loads(verdict_row["main_risks"]),
            alternatives=json.loads(verdict_row["alternatives"]),
            action_plan=json.loads(verdict_row["action_plan"]),
            missing_evidence=json.loads(verdict_row["missing_evidence"]),
            follow_up_questions=json.loads(verdict_row["follow_up_questions"]),
            change_conditions=json.loads(verdict_row["change_conditions"]),
            confidence_score=verdict_row["confidence_score"],
            created_at=verdict_row["created_at"],
        )
        return TrialResult(case=case, intake=intake, messages=messages, verdict=verdict)
