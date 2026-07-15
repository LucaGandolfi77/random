"""Tests for grammar module."""

from __future__ import annotations

from uuid import uuid4

from lingua_evolver.grammar import (
    detect_word_order,
    find_rule_by_type,
    format_rule,
    strengthen_rule,
    weaken_rule,
)
from lingua_evolver.models import GrammarRule, Utterance, Word


def _make_utterance(
    understood: bool = True,
    phoneme_count: int = 3,
    generation: int = 0,
) -> Utterance:
    return Utterance(
        speaker_id=uuid4(),
        listener_id=uuid4(),
        phoneme_sequence=[uuid4() for _ in range(phoneme_count)],
        intended_meaning="test",
        understood=understood,
        generation=generation,
    )


class TestWordOrderDetection:
    def test_no_detection_with_few_utterances(self) -> None:
        utterances = [_make_utterance() for _ in range(3)]
        result = detect_word_order(utterances, [], threshold=0.8)
        assert result is None

    def test_detection_with_consistent_pattern(self) -> None:
        # Create 10 utterances all with 3 phonemes (SVO pattern)
        utterances = [_make_utterance(phoneme_count=3) for _ in range(10)]
        result = detect_word_order(utterances, [], threshold=0.7)
        assert result is not None
        assert result.rule_type == "word_order"
        assert result.strength >= 0.7


class TestRuleOperations:
    def test_strengthen_rule(self) -> None:
        rule = GrammarRule(rule_type="test", pattern="SVO", strength=0.5)
        strengthen_rule(rule, 0.1)
        assert rule.strength == 0.6

    def test_strengthen_rule_capped(self) -> None:
        rule = GrammarRule(rule_type="test", pattern="SVO", strength=0.95)
        strengthen_rule(rule, 0.1)
        assert rule.strength == 1.0

    def test_weaken_rule(self) -> None:
        rule = GrammarRule(rule_type="test", pattern="SVO", strength=0.5)
        weaken_rule(rule, 0.1)
        assert rule.strength == 0.4

    def test_weaken_rule_floored(self) -> None:
        rule = GrammarRule(rule_type="test", pattern="SVO", strength=0.05)
        weaken_rule(rule, 0.1)
        assert rule.strength == 0.0


class TestRuleLookup:
    def test_find_rule_by_type(self) -> None:
        rules = [
            GrammarRule(rule_type="word_order", pattern="SVO"),
            GrammarRule(rule_type="prefix", pattern="ka"),
        ]
        result = find_rule_by_type(rules, "prefix")
        assert result is not None
        assert result.pattern == "ka"

    def test_find_rule_by_type_not_found(self) -> None:
        rules = [GrammarRule(rule_type="word_order", pattern="SVO")]
        result = find_rule_by_type(rules, "suffix")
        assert result is None


class TestRuleFormatting:
    def test_format_rule(self) -> None:
        rule = GrammarRule(rule_type="word_order", pattern="SVO", strength=0.92)
        result = format_rule(rule)
        assert "Ordine" in result
        assert "SVO" in result
        assert "92%" in result
