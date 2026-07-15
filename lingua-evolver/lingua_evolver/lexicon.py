"""Lexicon module: managing the emergent vocabulary."""

from __future__ import annotations

from uuid import UUID

from lingua_evolver.models import Phoneme, SemanticCategory, Word


def create_word(
    phoneme_ids: list[UUID],
    meaning: str,
    generation: int,
    source: str = "emerged",
) -> Word:
    """Create a new word from a sequence of phoneme IDs."""
    return Word(
        phonemes=phoneme_ids,
        meaning=meaning,
        coined_generation=generation,
        source=source,  # type: ignore[arg-type]
    )


def find_word_by_meaning(lexicon: list[Word], meaning: str) -> Word | None:
    """Find a word in the lexicon by its meaning."""
    for word in lexicon:
        if word.meaning == meaning:
            return word
    return None


def find_word_by_phonemes(lexicon: list[Word], phoneme_ids: list[UUID]) -> Word | None:
    """Find a word that matches the given phoneme sequence."""
    for word in lexicon:
        if word.phonemes == phoneme_ids:
            return word
    return None


def add_word_to_lexicon(
    lexicon: list[Word],
    word: Word,
    frequency_boost: float = 0.1,
) -> list[Word]:
    """Add a word to the lexicon or boost its frequency if it exists.

    Returns the updated lexicon.
    """
    existing = find_word_by_meaning(lexicon, word.meaning)
    if existing:
        existing.frequency = min(1.0, existing.frequency + frequency_boost)
        return lexicon
    lexicon.append(word)
    return lexicon


def remove_word_from_lexicon(lexicon: list[Word], meaning: str) -> list[Word]:
    """Remove a word from the lexicon by meaning."""
    return [w for w in lexicon if w.meaning != meaning]


def get_most_frequent_words(lexicon: list[Word], limit: int = 10) -> list[Word]:
    """Get the most frequently used words from the lexicon."""
    sorted_words = sorted(lexicon, key=lambda w: w.frequency, reverse=True)
    return sorted_words[:limit]


def get_words_by_source(
    lexicon: list[Word], source: str
) -> list[Word]:
    """Get all words from a specific source (emerged or user_input)."""
    return [w for w in lexicon if w.source == source]


def format_word(
    word: Word, phoneme_map: dict[UUID, Phoneme] | None = None
) -> str:
    """Format a word as a readable string (e.g., 'ka-mu-ti')."""
    if phoneme_map:
        symbols = [
            phoneme_map[pid].symbol if pid in phoneme_map else "??"
            for pid in word.phonemes
        ]
    else:
        symbols = [str(pid)[:4] for pid in word.phonemes]
    return "-".join(symbols)


def get_words_by_category(
    lexicon: list[Word], category: SemanticCategory
) -> list[Word]:
    """Get all words of a specific semantic category."""
    return [w for w in lexicon if w.category == category]


def get_category_counts(lexicon: list[Word]) -> dict[SemanticCategory, int]:
    """Count words in each semantic category."""
    counts: dict[SemanticCategory, int] = {}
    for word in lexicon:
        counts[word.category] = counts.get(word.category, 0) + 1
    return counts


def find_synonyms(
    lexicon: list[Word], meaning: str
) -> list[Word]:
    """Find words that share the same category (potential synonyms)."""
    target = next((w for w in lexicon if w.meaning == meaning), None)
    if not target:
        return []
    return [w for w in lexicon if w.category == target.category and w.meaning != meaning]


def find_antonyms(
    lexicon: list[Word], meaning: str
) -> list[Word]:
    """Find words that are likely antonyms based on category and meaning.

    Heuristic: adjectives with opposite semantic distance are potential antonyms.
    """
    target = next((w for w in lexicon if w.meaning == meaning), None)
    if not target or target.category != SemanticCategory.ADJECTIVE:
        return []

    # Simple heuristic: look for adjectives that are used in contrast
    return [w for w in lexicon if w.category == SemanticCategory.ADJECTIVE and w.meaning != meaning]
