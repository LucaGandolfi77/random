from pathlib import Path

from app.schemas import HabitCreateInput, HabitLogInput
from app.services.memory import MemoryService
from app.services.rules import analyze_habit_performance


def test_habit_audit_detects_friction(tmp_path: Path):
    db_path = tmp_path / "life_os.db"
    memory = MemoryService(db_path)
    memory.bootstrap_defaults()
    memory.create_habit(HabitCreateInput(name="Shutdown ritual", target_frequency=5, minimum_viable="Write tomorrow top 1"))
    habits = [habit for habit in memory.list_habits() if habit["name"] == "Shutdown ritual"]
    habit_id = habits[0]["id"]

    memory.save_habit_log(habit_id, HabitLogInput(log_date="2026-05-01", completed=False, note="Too tired"))
    memory.save_habit_log(habit_id, HabitLogInput(log_date="2026-05-02", completed=False, note="Late work"))
    memory.save_habit_log(habit_id, HabitLogInput(log_date="2026-05-03", completed=True, note=""))

    insight = analyze_habit_performance(memory.get_recent_habit_logs(days=30))

    assert insight["completion_rate"] < 50
    assert "friction" in insight["signal"].lower() or "reduce" in insight["signal"].lower()
