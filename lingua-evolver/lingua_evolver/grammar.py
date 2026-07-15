"""Grammar module: detecting and managing emergent grammar rules."""

from __future__ import annotations

from collections import Counter
from uuid import UUID

from lingua_evolver.models import GrammarRule, Utterance, Word


def detect_word_order(
    utterances: list[Utterance],
    lexicon: list[Word],
    threshold: float = 0.8,
) -> GrammarRule | None:
    """Detect word order pattern using semantic alignment.

    Analyzes which positions speakers consistently use for the same meaning.
    Returns a GrammarRule if a pattern emerges above the threshold.
    """
    successful = [u for u in utterances if u.understood]
    if len(successful) < 5:
        return None

    # Group utterances by meaning and analyze position patterns
    meaning_positions: dict[str, list[int]] = {}
    for utt in successful:
        if utt.intended_meaning not in meaning_positions:
            meaning_positions[utt.intended_meaning] = []
        # Track average position length for this meaning
        meaning_positions[utt.intended_meaning].append(len(utt.phoneme_sequence))

    # Check if meanings consistently map to specific sequence lengths
    length_consistency: Counter[int] = Counter()
    for meaning, lengths in meaning_positions.items():
        if len(lengths) >= 3:
            most_common_len = Counter(lengths).most_common(1)[0][0]
            length_consistency[most_common_len] += 1

    if not length_consistency:
        return None

    total_meanings = sum(length_consistency.values())
    best_length, best_count = length_consistency.most_common(1)[0]
    ratio = best_count / total_meanings

    if ratio >= threshold:
        order_map = {
            2: "SV",
            3: "SVO",
            4: "SOV",
            5: "SVOO",
        }
        order = order_map.get(best_length, f"pattern_{best_length}")
        return GrammarRule(
            rule_type="word_order",
            pattern=order,
            strength=ratio,
        )

    return None


def detect_suffix(
    utterances: list[Utterance],
    lexicon: list[Word],
    threshold: float = 0.7,
) -> GrammarRule | None:
    """Detect common suffix patterns in utterances.

    Looks for phonemes that appear consistently at the end of utterances
    with related meanings.
    """
    successful = [u for u in utterances if u.understood and len(u.phoneme_sequence) >= 2]
    if len(successful) < 8:
        return None

    # Analyze last phoneme across utterances
    suffix_counter: Counter[UUID] = Counter()
    for utt in successful:
        suffix_counter[utt.phoneme_sequence[-1]] += 1

    total = len(successful)
    for phoneme_id, count in suffix_counter.most_common(3):
        ratio = count / total
        if ratio >= threshold:
            return GrammarRule(
                rule_type="suffix",
                pattern=str(phoneme_id)[:8],
                strength=ratio,
            )

    return None


def detect_plural(
    utterances: list[Utterance],
    lexicon: list[Word],
    threshold: float = 0.7,
) -> GrammarRule | None:
    """Detect plural marking patterns.

    Looks for a consistent phoneme added to words to mark plurality.
    Heuristic: if singular/plural pairs exist (e.g., "grande"/"grandi"),
    check if there's a consistent final phoneme difference.
    """
    successful = [u for u in utterances if u.understood and len(u.phoneme_sequence) >= 2]
    if len(successful) < 8:
        return None

    # Group by meaning to find potential singular/plural pairs
    meaning_groups: dict[str, list[Utterance]] = {}
    for utt in successful:
        if utt.intended_meaning not in meaning_groups:
            meaning_groups[utt.intended_meaning] = []
        meaning_groups[utt.intended_meaning].append(utt)

    # Look for meanings with multiple variants (potential plural forms)
    plural_candidates: Counter[UUID] = Counter()
    for meaning, utts in meaning_groups.items():
        if len(utts) >= 2:
            # Compare phoneme sequences of same meaning
            sequences = [tuple(u.phoneme_sequence) for u in utts]
            # If there are different sequences for same meaning,
            # the last phoneme might be a plural marker
            unique_sequences = set(sequences)
            if len(unique_sequences) >= 2:
                for seq in unique_sequences:
                    plural_candidates[seq[-1]] += 1

    if not plural_candidates:
        return None

    total = sum(plural_candidates.values())
    for phoneme_id, count in plural_candidates.most_common(1):
        ratio = count / total
        if ratio >= threshold:
            return GrammarRule(
                rule_type="plural",
                pattern=str(phoneme_id)[:8],
                strength=ratio,
            )

    return None


def detect_negation(
    utterances: list[Utterance],
    lexicon: list[Word],
    threshold: float = 0.7,
) -> GrammarRule | None:
    """Detect negation marker patterns.

    Looks for a consistent phoneme added at the beginning of utterances
    that might indicate negation.
    """
    successful = [u for u in utterances if u.understood and len(u.phoneme_sequence) >= 2]
    if len(successful) < 8:
        return None

    # Analyze first phoneme across utterances
    prefix_counter: Counter[UUID] = Counter()
    for utt in successful:
        prefix_counter[utt.phoneme_sequence[0]] += 1

    total = len(successful)
    for phoneme_id, count in prefix_counter.most_common(3):
        ratio = count / total
        if ratio >= threshold:
            return GrammarRule(
                rule_type="negation",
                pattern=str(phoneme_id)[:8],
                strength=ratio,
            )

    return None


def detect_tense(
    utterances: list[Utterance],
    lexicon: list[Word],
    threshold: float = 0.7,
) -> GrammarRule | None:
    """Detect tense marking patterns.

    Looks for consistent phoneme patterns that differentiate
    past/present/future forms.
    """
    successful = [u for u in utterances if u.understood and len(u.phoneme_sequence) >= 3]
    if len(successful) < 10:
        return None

    # Group by meaning to find temporal variants
    meaning_groups: dict[str, list[Utterance]] = {}
    for utt in successful:
        if utt.intended_meaning not in meaning_groups:
            meaning_groups[utt.intended_meaning] = []
        meaning_groups[utt.intended_meaning].append(utt)

    # Look for meanings with multiple variants (potential tense forms)
    tense_candidates: Counter[UUID] = Counter()
    for meaning, utts in meaning_groups.items():
        if len(utts) >= 3:
            sequences = [tuple(u.phoneme_sequence) for u in utts]
            unique_sequences = set(sequences)
            if len(unique_sequences) >= 2:
                # The first phoneme might be a tense marker
                for seq in unique_sequences:
                    tense_candidates[seq[0]] += 1

    if not tense_candidates:
        return None

    total = sum(tense_candidates.values())
    for phoneme_id, count in tense_candidates.most_common(1):
        ratio = count / total
        if ratio >= threshold:
            return GrammarRule(
                rule_type="tense",
                pattern=str(phoneme_id)[:8],
                strength=ratio,
            )

    return None


def detect_morphology(
    utterances: list[Utterance],
    lexicon: list[Word],
    threshold: float = 0.7,
) -> list[GrammarRule]:
    """Detect all morphological patterns in utterances."""
    rules: list[GrammarRule] = []

    suffix = detect_suffix(utterances, lexicon, threshold)
    if suffix:
        rules.append(suffix)

    plural = detect_plural(utterances, lexicon, threshold)
    if plural:
        rules.append(plural)

    negation = detect_negation(utterances, lexicon, threshold)
    if negation:
        rules.append(negation)

    tense = detect_tense(utterances, lexicon, threshold)
    if tense:
        rules.append(tense)

    return rules


def strengthen_rule(rule: GrammarRule, amount: float = 0.05) -> GrammarRule:
    """Strengthen a grammar rule's strength value."""
    rule.strength = min(1.0, rule.strength + amount)
    return rule


def weaken_rule(rule: GrammarRule, amount: float = 0.02) -> GrammarRule:
    """Weaken a grammar rule's strength value."""
    rule.strength = max(0.0, rule.strength - amount)
    return rule


def find_rule_by_type(
    rules: list[GrammarRule], rule_type: str
) -> GrammarRule | None:
    """Find a rule by its type."""
    for rule in rules:
        if rule.rule_type == rule_type:
            return rule
    return None


def get_strongest_rules(rules: list[GrammarRule], limit: int = 5) -> list[GrammarRule]:
    """Get the strongest grammar rules."""
    return sorted(rules, key=lambda r: r.strength, reverse=True)[:limit]


def format_rule(rule: GrammarRule) -> str:
    """Format a grammar rule as a readable string."""
    type_labels = {
        "word_order": "Ordine",
        "prefix": "Prefisso",
        "suffix": "Suffisso",
        "tense": "Tempo",
        "plural": "Plurale",
        "negation": "Negazione",
    }
    label = type_labels.get(rule.rule_type, rule.rule_type)
    return f"{label}: {rule.pattern} ({rule.strength:.0%})"
