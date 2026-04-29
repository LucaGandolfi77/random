"""Trait inheritance for children and family dynasties."""

from __future__ import annotations

import random

from sims_ai_city.models import Character, InheritanceRule, TraitProfile

DEFAULT_RULES = [
    InheritanceRule(
        trait_name="temperament",
        inheritance_mode="dominant-like",
        mutation_chance=0.08,
        surprise_pool=[
            "magnificent melodrama engine",
            "accidental prophet of soup disasters",
            "courageous chaos cherub",
        ],
        hidden_pool=["stubborn moonlight romantic", "petty genius with a dimpling smile"],
    ),
    InheritanceRule(
        trait_name="social_style",
        inheritance_mode="blended",
        mutation_chance=0.06,
        surprise_pool=["wins arguments by making everyone laugh first"],
        hidden_pool=["pretends to be calm while inventing scandal internally"],
    ),
    InheritanceRule(
        trait_name="weird_habits",
        inheritance_mode="chaotic mix",
        mutation_chance=0.16,
        surprise_pool=[
            "sleeps clutching a ceremonial spoon",
            "conducts invisible orchestras during breakfast",
            "organizes pebbles by emotional sincerity",
        ],
    ),
]


def create_child_traits(parent_a: Character, parent_b: Character, rng: random.Random) -> TraitProfile:
    """Create a descendant trait profile using playful pseudo-genetics."""

    inherited_from = [parent_a.full_name, parent_b.full_name]
    mutation_notes: list[str] = []
    hidden_traits = list(parent_a.traits.hidden_traits[:1]) + list(parent_b.traits.hidden_traits[:1])

    temperament = _inherit_string(parent_a.traits.temperament, parent_b.traits.temperament, DEFAULT_RULES[0], rng, mutation_notes)
    social_style = _blend_social_style(parent_a.traits.social_style, parent_b.traits.social_style, DEFAULT_RULES[1], rng, mutation_notes)
    ambition = _blend_number(parent_a.traits.ambition, parent_b.traits.ambition, rng)
    humor = _blend_number(parent_a.traits.humor, parent_b.traits.humor, rng)
    patience = _blend_number(parent_a.traits.patience, parent_b.traits.patience, rng)
    romance_style = rng.choice([parent_a.traits.romance_style, parent_b.traits.romance_style])
    quirks = _inherit_list(parent_a.traits.quirks, parent_b.traits.quirks, rng, min_size=2, max_size=4)
    weird_habits = _inherit_list(parent_a.weird_habits, parent_b.weird_habits, rng, min_size=1, max_size=3)
    values = _inherit_list(parent_a.traits.values, parent_b.traits.values, rng, min_size=2, max_size=4)
    talents = _inherit_list(parent_a.traits.talents, parent_b.traits.talents, rng, min_size=2, max_size=4)
    weaknesses = _inherit_list(parent_a.traits.weaknesses, parent_b.traits.weaknesses, rng, min_size=2, max_size=4)
    visual_descriptors = _inherit_list(parent_a.traits.visual_descriptors, parent_b.traits.visual_descriptors, rng, min_size=2, max_size=4)

    if hidden_traits and rng.random() < 0.24:
        resurfaced = rng.choice(hidden_traits)
        mutation_notes.append(f"A hidden family trait resurfaced: {resurfaced}.")
        quirks.append(resurfaced)

    if rng.random() < DEFAULT_RULES[2].mutation_chance:
        surprise = rng.choice(DEFAULT_RULES[2].surprise_pool)
        weird_habits.append(surprise)
        mutation_notes.append(f"A chaotic surprise emerged: {surprise}.")

    return TraitProfile(
        temperament=temperament,
        social_style=social_style,
        ambition=ambition,
        humor=humor,
        patience=patience,
        romance_style=romance_style,
        quirks=_dedupe(quirks),
        weird_habits=_dedupe(weird_habits),
        values=_dedupe(values),
        talents=_dedupe(talents),
        weaknesses=_dedupe(weaknesses),
        visual_descriptors=_dedupe(visual_descriptors),
        hidden_traits=hidden_traits,
        inherited_from=inherited_from,
        mutation_notes=mutation_notes,
    )


def _inherit_string(left: str, right: str, rule: InheritanceRule, rng: random.Random, mutation_notes: list[str]) -> str:
    if rng.random() < rule.mutation_chance and rule.surprise_pool:
        surprise = rng.choice(rule.surprise_pool)
        mutation_notes.append(f"{rule.trait_name} mutated into {surprise}.")
        return surprise
    return left if rng.random() < 0.56 else right


def _blend_social_style(left: str, right: str, rule: InheritanceRule, rng: random.Random, mutation_notes: list[str]) -> str:
    if rng.random() < rule.mutation_chance and rule.surprise_pool:
        surprise = rng.choice(rule.surprise_pool)
        mutation_notes.append(f"{rule.trait_name} developed a surprising twist: {surprise}.")
        return surprise
    if left == right:
        return left
    return f"{left.split()[0]} with a streak of {right.split()[0]}"


def _blend_number(left: float, right: float, rng: random.Random) -> float:
    average = (left + right) / 2
    jitter = rng.uniform(-0.12, 0.12)
    return round(max(0.0, min(1.0, average + jitter)), 2)


def _inherit_list(left: list[str], right: list[str], rng: random.Random, *, min_size: int, max_size: int) -> list[str]:
    pool = list(dict.fromkeys([*left, *right]))
    if not pool:
        return []
    k = min(len(pool), rng.randint(min_size, max_size))
    return rng.sample(pool, k=k)


def _dedupe(values: list[str]) -> list[str]:
    ordered: list[str] = []
    for value in values:
        if value not in ordered:
            ordered.append(value)
    return ordered
