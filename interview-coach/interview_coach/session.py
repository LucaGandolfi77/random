"""Session persistence — saves/loads interview transcripts as JSON."""

from __future__ import annotations

from pathlib import Path

from interview_coach.models import InterviewSession


class SessionManager:
    """Manages interview session files in a local directory."""

    def __init__(self, sessions_dir: Path) -> None:
        self.sessions_dir = sessions_dir
        self.sessions_dir.mkdir(parents=True, exist_ok=True)

    def new_session(self) -> InterviewSession:
        return InterviewSession()

    def save(self, session: InterviewSession) -> Path:
        path = self.sessions_dir / f"{session.session_id}.json"
        path.write_text(session.model_dump_json(indent=2), encoding="utf-8")
        return path

    def load(self, session_id: str) -> InterviewSession:
        path = self.sessions_dir / f"{session_id}.json"
        if not path.exists():
            raise FileNotFoundError(f"Session not found: {session_id}")
        return InterviewSession.model_validate_json(path.read_text(encoding="utf-8"))
