from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from ai_courtroom_cli.examples import RTX_3090_EXAMPLE
from ai_courtroom_cli.mock_agents import MockAgentProvider
from ai_courtroom_cli.orchestrator import TrialEngine
from ai_courtroom_cli.storage import CourtroomStorage


class TrialEngineTests(unittest.TestCase):
    def test_demo_case_generates_complete_bundle(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            storage = CourtroomStorage(Path(temp_dir) / "courtroom.sqlite3")
            engine = TrialEngine(storage=storage, provider=MockAgentProvider())

            case, messages, verdict, report = engine.run_trial(RTX_3090_EXAMPLE)

            self.assertGreater(case.id, 0)
            self.assertEqual(case.status, "complete")
            self.assertGreaterEqual(len(messages), 1 + 7 + 6 + 1)
            self.assertTrue(0 <= verdict.confidence <= 100)
            self.assertIn("Final verdict", report)
            self.assertIn(case.title, report)


if __name__ == "__main__":
    unittest.main()