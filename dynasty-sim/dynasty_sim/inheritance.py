"""Biological inheritance engine.

Models a simplified but biologically inspired trait inheritance system:
- Dominant / recessive-like trait genes
- Blended traits for polygenic-style features
- Grandparent modifier (10–20 % influence)
- Random variation per trait
- Rare mutation events

Usage::

    child_traits = InheritanceEngine.combine(
        parent_a=mother.traits.inherited,
        parent_b=father.traits.inherited,
        grandparents=[gm_paternal, gf_paternal, gm_maternal, gf_maternal],
    )
"""

from __future__ import annotations

import random
from typing import Sequence

from dynasty_sim.models import InheritedTraitSet, TraitGene


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Probability that a dominant gene wins over a recessive one
_DOMINANT_WIN_PROB = 0.75

# Grandparent influence weight (their average is mixed in at this level)
_GRANDPARENT_WEIGHT = 0.15

# Probability of a "wildcard" mutation event per trait
_MUTATION_PROB = 0.03

# Standard deviation of random variation added to each blended trait
_BLEND_NOISE = 0.06

# Scalar traits that blend continuously (no dominance rule)
_BLEND_TRAITS = {
    "height_tendency",
    "build_tendency",
    "stamina_tendency",
    "health_resilience",
}

# Traits with weak dominance (biased blend)
_POLYGENIC_TRAITS = {
    "temperament_baseline",
    "sociability_tendency",
    "risk_taking_tendency",
    "learning_aptitude",
    "emotional_reactivity",
}

# Traits with stronger dominance expression
_DOMINANT_TRAITS = {
    "hair_darkness",
    "hair_thickness",
    "eye_lightness",
}


def _clamp(value: float) -> float:
    return max(0.0, min(1.0, value))


def _noisy_blend(a: float, b: float, noise: float = _BLEND_NOISE) -> float:
    """Blend two values with random noise."""
    blended = (a + b) / 2.0
    blended += random.gauss(0, noise)
    return _clamp(blended)


def _dominant_blend(a: float, b: float, a_dominant: bool, b_dominant: bool) -> float:
    """Apply dominant/recessive logic to two alleles."""
    if a_dominant and not b_dominant:
        # A dominates, but B has a small influence
        return _clamp(a * _DOMINANT_WIN_PROB + b * (1 - _DOMINANT_WIN_PROB) + random.gauss(0, _BLEND_NOISE))
    if b_dominant and not a_dominant:
        return _clamp(b * _DOMINANT_WIN_PROB + a * (1 - _DOMINANT_WIN_PROB) + random.gauss(0, _BLEND_NOISE))
    # Both dominant or both recessive — blend
    return _noisy_blend(a, b)


def _combine_single_trait(
    name: str,
    val_a: float,
    val_b: float,
    gene_a: TraitGene | None,
    gene_b: TraitGene | None,
    grandparent_avg: float | None,
) -> float:
    """Combine a single trait from two parents plus optional grandparent influence."""
    if name in _BLEND_TRAITS:
        result = _noisy_blend(val_a, val_b)
    elif name in _DOMINANT_TRAITS:
        dom_a = gene_a.dominant if gene_a else random.random() > 0.5
        dom_b = gene_b.dominant if gene_b else random.random() > 0.5
        result = _dominant_blend(val_a, val_b, dom_a, dom_b)
    else:
        # Polygenic — weighted blend with slight parental bias
        weight = random.uniform(0.4, 0.6)
        result = _clamp(val_a * weight + val_b * (1 - weight) + random.gauss(0, _BLEND_NOISE))

    # Mix in grandparent influence
    if grandparent_avg is not None:
        result = _clamp(result * (1 - _GRANDPARENT_WEIGHT) + grandparent_avg * _GRANDPARENT_WEIGHT)

    # Possible mutation
    if random.random() < _MUTATION_PROB:
        result = _clamp(result + random.uniform(-0.25, 0.25))

    return round(result, 3)


class InheritanceEngine:
    """Derives a child's ``InheritedTraitSet`` from parents and grandparents."""

    @staticmethod
    def combine(
        parent_a: InheritedTraitSet,
        parent_b: InheritedTraitSet,
        grandparents: Sequence[InheritedTraitSet] | None = None,
    ) -> InheritedTraitSet:
        """Return a new ``InheritedTraitSet`` for a child.

        Parameters
        ----------
        parent_a:
            Inherited traits of one parent (e.g. mother).
        parent_b:
            Inherited traits of the other parent (e.g. father).
        grandparents:
            Up to four ``InheritedTraitSet`` values (paternal grandfather,
            paternal grandmother, maternal grandfather, maternal grandmother).
            Any subset or ``None`` is accepted.
        """
        grandparents = list(grandparents or [])

        # Build gene lookup maps for dominance info
        gene_map_a: dict[str, TraitGene] = {g.name: g for g in parent_a.raw_genes}
        gene_map_b: dict[str, TraitGene] = {g.name: g for g in parent_b.raw_genes}

        # Grandparent averages per field
        gp_avgs: dict[str, float] = {}
        if grandparents:
            trait_fields = [f for f in InheritedTraitSet.model_fields if f != "raw_genes"]
            for field in trait_fields:
                vals = [getattr(gp, field) for gp in grandparents]
                gp_avgs[field] = sum(vals) / len(vals)

        # Build the child trait set
        kwargs: dict[str, float] = {}
        for field in InheritedTraitSet.model_fields:
            if field == "raw_genes":
                continue
            val_a = getattr(parent_a, field)
            val_b = getattr(parent_b, field)
            gp_avg = gp_avgs.get(field)
            gene_a = gene_map_a.get(field)
            gene_b = gene_map_b.get(field)
            kwargs[field] = _combine_single_trait(field, val_a, val_b, gene_a, gene_b, gp_avg)

        # Inherit a random subset of raw genes, with possible mutations
        child_genes: list[TraitGene] = []
        genes_pool = parent_a.raw_genes + parent_b.raw_genes
        for gene in genes_pool:
            if random.random() < 0.5:
                child_genes.append(gene.mutate())

        return InheritedTraitSet(**kwargs, raw_genes=child_genes)

    @staticmethod
    def derive_appearance(traits: InheritedTraitSet, sex: str) -> dict[str, str]:
        """Derive human-readable appearance descriptors from trait values."""

        def level(value: float, labels: list[str]) -> str:
            idx = int(value * (len(labels) - 1))
            return labels[min(idx, len(labels) - 1)]

        height_label = level(traits.height_tendency, ["short", "average height", "tall", "very tall"])
        build_label = level(traits.build_tendency, ["slight", "lean", "medium build", "sturdy", "heavyset"])
        hair_label = level(traits.hair_darkness, ["platinum", "blonde", "light brown", "brown", "dark brown", "black"])
        eye_label = level(traits.eye_lightness, ["dark brown", "brown", "hazel", "green", "blue", "pale blue"])
        hair_thickness = level(traits.hair_thickness, ["fine", "medium", "thick", "very thick"])

        return {
            "height": height_label,
            "build": build_label,
            "hair_colour": hair_label,
            "hair_texture": hair_thickness,
            "eye_colour": eye_label,
        }
