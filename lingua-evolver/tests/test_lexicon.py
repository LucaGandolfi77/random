"""Tests for lexicon module."""

from __future__ import annotations

from uuid import uuid4

from lingua_evolver.lexicon import (
    add_word_to_lexicon,
    create_word,
    find_word_by_meaning,
    find_word_by_phonemes,
    format_word,
    get_most_frequent_words,
)
from lingua_evolver.models import Phoneme


class TestWordCreation:
    def test_create_word_basic(self) -> None:
        word = create_word(
            phoneme_ids=[uuid4(), uuid4()],
            meaning="test",
            generation=0,
        )
        assert word.meaning == "test"
        assert len(word.phonemes) == 2
        assert word.source == "emerged"

    def test_create_word_user_input(self) -> None:
        word = create_word(
            phoneme_ids=[uuid4()],
            meaning="custom",
            generation=5,
            source="user_input",
        )
        assert word.source == "user_input"


class TestLexiconOperations:
    def test_find_word_by_meaning_found(self) -> None:
        word = create_word([uuid4()], "hello", 0)
        result = find_word_by_meaning([word], "hello")
        assert result is not None
        assert result.meaning == "hello"

    def test_find_word_by_meaning_not_found(self) -> None:
        word = create_word([uuid4()], "hello", 0)
        result = find_word_by_meaning([word], "world")
        assert result is None

    def test_find_word_by_phonemes(self) -> None:
        pid = uuid4()
        word = create_word([pid], "test", 0)
        result = find_word_by_phonemes([word], [pid])
        assert result is not None

    def test_add_word_new(self) -> None:
        lexicon = []
        word = create_word([uuid4()], "new", 0)
        add_word_to_lexicon(lexicon, word)
        assert len(lexicon) == 1

    def test_add_word_existing_boosts_frequency(self) -> None:
        word1 = create_word([uuid4()], "test", 0)
        word1.frequency = 0.3
        lexicon = [word1]

        word2 = create_word([uuid4()], "test", 1)
        add_word_to_lexicon(lexicon, word2)
        assert len(lexicon) == 1
        assert lexicon[0].frequency == 0.4


class TestWordFormatting:
    def test_format_word_with_phoneme_map(self) -> None:
        pid1, pid2 = uuid4(), uuid4()
        p1 = Phoneme(id=pid1, symbol="ka")
        p2 = Phoneme(id=pid2, symbol="mu")
        word = create_word([pid1, pid2], "test", 0)

        result = format_word(word, {pid1: p1, pid2: p2})
        assert result == "ka-mu"

    def test_format_word_without_map(self) -> None:
        pid = uuid4()
        word = create_word([pid], "test", 0)
        result = format_word(word)
        # Without a phoneme map, it uses str(pid)[:4]
        assert str(pid)[:4] in result or "?" in result


class TestFrequentWords:
    def test_get_most_frequent_words(self) -> None:
        words = [
            create_word([uuid4()], "low", 0),
            create_word([uuid4()], "high", 0),
            create_word([uuid4()], "mid", 0),
        ]
        words[0].frequency = 0.2
        words[1].frequency = 0.9
        words[2].frequency = 0.5

        result = get_most_frequent_words(words, limit=2)
        assert len(result) == 2
        assert result[0].meaning == "high"
        assert result[1].meaning == "mid"
