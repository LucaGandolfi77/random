"""Input queue module: handling asynchronous user word additions."""

from __future__ import annotations

from pathlib import Path

from lingua_evolver.models import UserInputWord


class InputQueue:
    """Manages a queue of user-submitted words to be processed during simulation."""

    def __init__(self) -> None:
        self._queue: list[UserInputWord] = []

    def add(self, phoneme: str, meaning: str, generation: int) -> UserInputWord:
        """Add a word to the queue."""
        entry = UserInputWord(
            phoneme_symbol=phoneme,
            meaning=meaning,
            added_generation=generation,
        )
        self._queue.append(entry)
        return entry

    def process_pending(self) -> list[UserInputWord]:
        """Process all pending entries and return them."""
        pending = [w for w in self._queue if not w.processed]
        for entry in pending:
            entry.processed = True
        return pending

    def load_from_file(self, path: Path, generation: int) -> int:
        """Load words from a text file (format: phoneme = meaning).

        Returns the number of words loaded.
        """
        count = 0
        if not path.exists():
            return count

        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                parts = line.split("=", 1)
                phoneme = parts[0].strip()
                meaning = parts[1].strip()
                if phoneme and meaning:
                    self.add(phoneme, meaning, generation)
                    count += 1

        return count

    @property
    def pending_count(self) -> int:
        """Number of entries waiting to be processed."""
        return len([w for w in self._queue if not w.processed])

    @property
    def total_count(self) -> int:
        """Total entries ever added."""
        return len(self._queue)

    def get_all_entries(self) -> list[UserInputWord]:
        """Get all entries in the queue."""
        return list(self._queue)

    def get_processed_entries(self) -> list[UserInputWord]:
        """Get all processed entries."""
        return [w for w in self._queue if w.processed]
