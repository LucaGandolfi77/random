from pathlib import Path

from app.schemas import DailyCheckinInput
from app.services.memory import MemoryService


def test_daily_checkin_persistence(tmp_path: Path):
    db_path = tmp_path / "life_os.db"
    memory = MemoryService(db_path)
    memory.bootstrap_defaults()
    payload = DailyCheckinInput(
        checkin_date="2026-05-05",
        sleep_hours=7.0,
        sleep_quality=8,
        perceived_energy=7,
        mood=7,
        stress_level=4,
        context_label="Office",
        available_minutes=420,
        focus_text="Finish proposal",
        constraints_text="Two meetings",
        required_tasks_text="Finish proposal | 90 | deep",
    )

    memory.save_daily_checkin(payload)
    stored = memory.get_checkin("2026-05-05")

    assert stored is not None
    assert stored["focus_text"] == "Finish proposal"
    assert stored["available_minutes"] == 420
