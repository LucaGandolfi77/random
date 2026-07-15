"""Phonology module: managing phonemes and inventories."""

from __future__ import annotations

import random
from uuid import UUID

from lingua_evolver.models import Phoneme, SoundChange

# Consonant and vowel pools for generating abstract phonemes
_CONSONANTS = ["k", "m", "t", "z", "p", "g", "r", "n", "s", "l", "b", "d", "f", "v"]
_VOWELS = ["a", "u", "i", "o", "e"]

# Pre-generated phoneme symbols to ensure variety
_PHONEME_SYMBOLS: list[str] = []
for c in _CONSONANTS:
    for v in _VOWELS:
        _PHONEME_SYMBOLS.append(c + v)
random.shuffle(_PHONEME_SYMBOLS)

# Sound change mappings
_LENITION_MAP = {
    "p": "b", "t": "d", "k": "g",
    "b": "v", "d": "z", "g": "r",
}

_ASSIMILATION_MAP = {
    "a": {"before_u": "u", "before_i": "i"},
    "u": {"before_a": "a", "before_i": "u"},
    "i": {"before_a": "a", "before_u": "i"},
}


def generate_random_phoneme() -> Phoneme:
    """Generate a random phoneme with a unique symbol."""
    symbol = _PHONEME_SYMBOLS[random.randint(0, len(_PHONEME_SYMBOLS) - 1)]
    return Phoneme(symbol=symbol)


def generate_inventory(size: int = 8) -> list[Phoneme]:
    """Generate a phoneme inventory of given size with unique symbols."""
    available = list(_PHONEME_SYMBOLS)
    random.shuffle(available)
    selected = available[:size]
    return [Phoneme(symbol=s) for s in selected]


def mutate_inventory(
    inventory: list[Phoneme], mutation_rate: float = 0.1
) -> list[Phoneme]:
    """Apply random mutations to a phoneme inventory.

    Mutations: swap symbols, add new phoneme, remove weak phoneme.
    """
    result = list(inventory)

    for phoneme in result:
        if random.random() < mutation_rate:
            # Mutate symbol slightly
            old_idx = _PHONEME_SYMBOLS.index(phoneme.symbol) if phoneme.symbol in _PHONEME_SYMBOLS else 0
            new_idx = (old_idx + random.randint(-2, 2)) % len(_PHONEME_SYMBOLS)
            phoneme.symbol = _PHONEME_SYMBOLS[new_idx]

    # Small chance to add a new phoneme
    if random.random() < mutation_rate and len(result) < 15:
        existing_symbols = {p.symbol for p in result}
        available = [s for s in _PHONEME_SYMBOLS if s not in existing_symbols]
        if available:
            result.append(Phoneme(symbol=random.choice(available)))

    return result


def find_phoneme_by_symbol(inventory: list[Phoneme], symbol: str) -> Phoneme | None:
    """Find a phoneme in the inventory by its symbol."""
    for phoneme in inventory:
        if phoneme.symbol == symbol:
            return phoneme
    return None


def get_symbol_map(inventory: list[Phoneme]) -> dict[str, UUID]:
    """Map phoneme symbols to their IDs for quick lookup."""
    return {p.symbol: p.id for p in inventory}


def apply_lenition(symbol: str, probability: float = 0.3) -> tuple[str, bool]:
    """Apply lenition (weakening) to a consonant.

    Returns (new_symbol, changed).
    """
    if random.random() > probability:
        return symbol, False

    if len(symbol) >= 2:
        consonant = symbol[0]
        vowel = symbol[1:]
        if consonant in _LENITION_MAP:
            return _LENITION_MAP[consonant] + vowel, True

    return symbol, False


def apply_assimilation(
    symbol: str, next_symbol: str | None, probability: float = 0.2
) -> tuple[str, bool]:
    """Apply vowel assimilation based on following vowel.

    Returns (new_symbol, changed).
    """
    if random.random() > probability or len(symbol) < 2:
        return symbol, False

    vowel = symbol[-1]
    consonant = symbol[:-1]

    if next_symbol and len(next_symbol) >= 1:
        next_vowel = next_symbol[0]
        if vowel in _ASSIMILATION_MAP and next_vowel in _ASSIMILATION_MAP[vowel]:
            new_vowel = _ASSIMILATION_MAP[vowel][next_vowel]
            return consonant + new_vowel, True

    return symbol, False


def apply_vowel_harmony(
    symbols: list[str], probability: float = 0.25
) -> tuple[list[str], bool]:
    """Apply vowel harmony across a word's phonemes.

    Makes vowels in a word more similar to each other.
    Returns (new_symbols, changed).
    """
    if random.random() > probability or len(symbols) < 2:
        return symbols, False

    # Determine dominant vowel class
    front_vowels = {"a", "e"}
    back_vowels = {"u", "o"}

    front_count = 0
    back_count = 0

    for sym in symbols:
        if len(sym) >= 1:
            vowel = sym[-1]
            if vowel in front_vowels:
                front_count += 1
            elif vowel in back_vowels:
                back_count += 1

    if front_count == 0 and back_count == 0:
        return symbols, False

    # Apply harmony: make all vowels match dominant class
    dominant = "front" if front_count > back_count else "back"
    changed = False
    new_symbols = []

    for sym in symbols:
        if len(sym) >= 2:
            consonant = sym[:-1]
            vowel = sym[-1]

            if dominant == "front" and vowel in back_vowels:
                new_vowel = random.choice(list(front_vowels))
                new_symbols.append(consonant + new_vowel)
                changed = True
            elif dominant == "back" and vowel in front_vowels:
                new_vowel = random.choice(list(back_vowels))
                new_symbols.append(consonant + new_vowel)
                changed = True
            else:
                new_symbols.append(sym)
        else:
            new_symbols.append(sym)

    return new_symbols, changed


def apply_consonant_shift(
    symbol: str, probability: float = 0.15
) -> tuple[str, bool]:
    """Apply consonant shift (systematic consonant changes).

    Returns (new_symbol, changed).
    """
    if random.random() > probability or len(symbol) < 2:
        return symbol, False

    consonant = symbol[0]
    vowel = symbol[1:]

    # Shift along the consonant chain
    shift_map = {
        "k": "g", "g": "r", "r": "n",
        "t": "d", "d": "z", "z": "s",
        "p": "b", "b": "v", "v": "f",
        "n": "m", "m": "b", "s": "z",
        "l": "r", "f": "v",
    }

    if consonant in shift_map:
        return shift_map[consonant] + vowel, True

    return symbol, False


def apply_sound_change(
    inventory: list[Phoneme],
    change_type: str | None = None,
    probability: float = 0.2,
) -> tuple[list[Phoneme], list[SoundChange]]:
    """Apply sound changes to a phoneme inventory.

    Returns (new_inventory, changes_applied).
    """
    if change_type is None:
        change_type = random.choice(["lenition", "vowel_harmony", "consonant_shift"])

    changes: list[SoundChange] = []
    new_inventory = list(inventory)

    for phoneme in new_inventory:
        if change_type == "lenition":
            new_symbol, changed = apply_lenition(phoneme.symbol, probability)
            if changed:
                old_symbol = phoneme.symbol
                phoneme.symbol = new_symbol
                changes.append(SoundChange(
                    change_type="lenition",
                    from_phoneme=old_symbol,
                    to_phoneme=new_symbol,
                    generation=0,
                ))
        elif change_type == "consonant_shift":
            new_symbol, changed = apply_consonant_shift(phoneme.symbol, probability)
            if changed:
                old_symbol = phoneme.symbol
                phoneme.symbol = new_symbol
                changes.append(SoundChange(
                    change_type="consonant_shift",
                    from_phoneme=old_symbol,
                    to_phoneme=new_symbol,
                    generation=0,
                ))

    # Vowel harmony applies across the whole inventory
    if change_type == "vowel_harmony":
        symbols = [p.symbol for p in new_inventory]
        new_symbols, changed = apply_vowel_harmony(symbols, probability)
        if changed:
            for i, (old_sym, new_sym) in enumerate(zip(symbols, new_symbols)):
                if old_sym != new_sym:
                    new_inventory[i].symbol = new_sym
                    changes.append(SoundChange(
                        change_type="vowel_harmony",
                        from_phoneme=old_sym,
                        to_phoneme=new_sym,
                        generation=0,
                    ))

    return new_inventory, changes
