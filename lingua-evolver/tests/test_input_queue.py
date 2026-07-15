"""Tests for input queue module."""

from __future__ import annotations

from pathlib import Path

from lingua_evolver.input_queue import InputQueue


class TestInputQueue:
    def test_add_entry(self) -> None:
        queue = InputQueue()
        entry = queue.add("ka", "io", 0)
        assert entry.phoneme_symbol == "ka"
        assert entry.meaning == "io"
        assert entry.processed is False

    def test_process_pending(self) -> None:
        queue = InputQueue()
        queue.add("ka", "io", 0)
        queue.add("mu", "vedere", 0)

        pending = queue.process_pending()
        assert len(pending) == 2
        assert all(w.processed for w in pending)

    def test_process_returns_only_pending(self) -> None:
        queue = InputQueue()
        queue.add("ka", "io", 0)
        queue.process_pending()

        queue.add("mu", "vedere", 1)
        pending = queue.process_pending()
        assert len(pending) == 1
        assert pending[0].meaning == "vedere"

    def test_pending_count(self) -> None:
        queue = InputQueue()
        queue.add("ka", "io", 0)
        queue.add("mu", "vedere", 0)
        assert queue.pending_count == 2

        queue.process_pending()
        assert queue.pending_count == 0

    def test_total_count(self) -> None:
        queue = InputQueue()
        queue.add("ka", "io", 0)
        queue.add("mu", "vedere", 0)
        queue.process_pending()
        assert queue.total_count == 2


class TestInputQueueFileLoading:
    def test_load_from_file(self, tmp_path: Path) -> None:
        words_file = tmp_path / "words.txt"
        words_file.write_text("ka = io\nmu = vedere\nti = te\n")

        queue = InputQueue()
        count = queue.load_from_file(words_file, 0)

        assert count == 3
        assert queue.pending_count == 3

    def test_load_from_file_with_comments(self, tmp_path: Path) -> None:
        words_file = tmp_path / "words.txt"
        words_file.write_text("# Comment\nka = io\n\n# Another\nmu = vedere\n")

        queue = InputQueue()
        count = queue.load_from_file(words_file, 0)

        assert count == 2

    def test_load_from_nonexistent_file(self, tmp_path: Path) -> None:
        queue = InputQueue()
        count = queue.load_from_file(tmp_path / "missing.txt", 0)
        assert count == 0

    def test_load_from_empty_file(self, tmp_path: Path) -> None:
        words_file = tmp_path / "empty.txt"
        words_file.write_text("")

        queue = InputQueue()
        count = queue.load_from_file(words_file, 0)
        assert count == 0
