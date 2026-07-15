"""Tests for phonology module."""

from __future__ import annotations

from lingua_evolver.phonology import (
    generate_inventory,
    generate_random_phoneme,
    mutate_inventory,
    find_phoneme_by_symbol,
)


class TestPhonemeGeneration:
    def test_generate_random_phoneme_returns_valid(self) -> None:
        phoneme = generate_random_phoneme()
        assert phoneme.symbol
        assert len(phoneme.symbol) >= 2

    def test_generate_inventory_size(self) -> None:
        inventory = generate_inventory(5)
        assert len(inventory) == 5

    def test_generate_inventory_unique_symbols(self) -> None:
        inventory = generate_inventory(10)
        symbols = [p.symbol for p in inventory]
        assert len(set(symbols)) == len(symbols)


class TestPhonemeMutation:
    def test_mutate_inventory_preserves_size(self) -> None:
        inventory = generate_inventory(8)
        mutated = mutate_inventory(inventory, mutation_rate=0.0)
        assert len(mutated) == len(inventory)

    def test_mutate_inventory_with_high_rate(self) -> None:
        inventory = generate_inventory(8)
        original_symbols = [p.symbol for p in inventory]
        mutated = mutate_inventory(inventory, mutation_rate=1.0)
        # With 100% mutation rate, symbols should change
        mutated_symbols = [p.symbol for p in mutated]
        # At least some should be different
        assert original_symbols != mutated_symbols or len(mutated) > len(inventory)


class TestPhonemeLookup:
    def test_find_phoneme_by_symbol_found(self) -> None:
        inventory = generate_inventory(5)
        target = inventory[0]
        result = find_phoneme_by_symbol(inventory, target.symbol)
        assert result is not None
        assert result.id == target.id

    def test_find_phoneme_by_symbol_not_found(self) -> None:
        inventory = generate_inventory(5)
        result = find_phoneme_by_symbol(inventory, "zz")
        assert result is None
